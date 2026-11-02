import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import type { Role } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import {
  actorGrants,
  can,
  isValidGrant,
  requireCan,
  type RoleGrant,
} from "../policies/can";
import {
  canReadInspection,
  isInspectionOfficer,
  roleMatchesFeedbackSection,
  initialFeedbackRoles,
} from "../policies/feedback";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  parseInput,
} from "./access";
import { detailDto, lockFeedback, requireFeedbackResource } from "./feedback";
import {
  inspectionAssignmentSchema,
  type FeedbackTarget,
} from "./feedback-types";
import { enqueueDomainNotice } from "./domain-notifications";
import { readWorkflowSettings } from "./workflow-settings";
import { addBusinessDays } from "./feedback-deadlines";
import {
  inspectionActions,
  inspectionNoteSchema,
  inspectionQueueSchema,
  inspectionTransferSchema,
  inspectionTransitionSchema,
  inspectionTransitionTarget,
  type InspectionInternalAttachment,
  type InspectionWorkflowDetail,
  type InspectionWorkflowItem,
  type InspectionWorkflowList,
  type TransferredInspectionSummary,
} from "./inspection-workflow-types";
import {
  attachmentDownloadHeaders,
  safeAttachmentName,
  validateAttachmentBatch,
  type AttachmentUpload,
} from "../feedback/attachment-files";
import {
  readPrivateAttachment,
  removePrivateAttachment,
  writePrivateAttachment,
} from "../feedback/attachment-storage";

const sectionInclude = {
  course: { include: { department: { include: { faculty: true } } } },
  semester: true,
  teaching: { select: { teacherId: true, isLead: true } },
} as const;
const caseInclude = {
  section: { include: sectionInclude },
  feedback: {
    select: {
      id: true,
      title: true,
      authorId: true,
      isAnonymous: true,
      identityLevel: true,
    },
  },
  assignee: { select: { id: true, displayName: true } },
  events: {
    include: { actor: { select: { displayName: true } } },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
  notes: {
    include: { author: { select: { displayName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.InspectionCaseInclude;
type CaseRow = Prisma.InspectionCaseGetPayload<{ include: typeof caseInclude }>;
type SectionRow = CaseRow["section"];
interface StoredFile {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
}

function missing(): never {
  throw new AuthError(
    "Không tìm thấy phản hồi hoặc hồ sơ.",
    404,
    "FEEDBACK_NOT_FOUND",
  );
}
function conflict(): never {
  throw new AuthError(
    "Dữ liệu đã thay đổi. Tải lại trước khi tiếp tục.",
    409,
    "REVISION_CONFLICT",
  );
}
function inputConflict(): never {
  throw new AuthError(
    "Mã yêu cầu đã được dùng cho thao tác khác.",
    409,
    "REQUEST_CONFLICT",
  );
}
function locked(): never {
  throw new AuthError(
    "Học kỳ đã khóa sổ. Dữ liệu liên quan chỉ được đọc.",
    409,
    "SEMESTER_LOCKED",
  );
}
function hash(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
function context(section: SectionRow) {
  return {
    departmentId: section.course.departmentId,
    facultyId: section.course.department.facultyId,
    teacherIds: section.teaching.map((item) => item.teacherId),
  };
}
function candidate(user: { id: string; roles: RoleGrant[] }): AuthActor {
  const assignments = user.roles.filter(isValidGrant).map((grant) => ({
    role: grant.role,
    scopeType: grant.scopeType,
    facultyId: grant.facultyId ?? null,
    departmentId: grant.departmentId ?? null,
  }));
  return {
    userId: user.id,
    loginCode: "",
    email: "",
    displayName: "",
    sessionId: "",
    familyId: "",
    mustChangePassword: false,
    roles: [...new Set(assignments.map((grant) => grant.role))],
    assignments,
    mfa: true,
    purpose: "FULL",
  };
}
async function transaction<T>(
  actor: AuthActor,
  action:
    | "inspection:read"
    | "inspection:list"
    | "inspection:assign"
    | "feedback:process",
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
) {
  requireCan(actor, action);
  try {
    return await getDb().$transaction(
      async (tx) => {
        await lockAdminMutations(tx);
        const fresh = await assertFreshActor(tx, actor);
        requireCan(fresh, action);
        return operation(tx, fresh);
      },
      { maxWait: 15000, timeout: 30000 },
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      "Chưa xử lý được hồ sơ. Tải lại trạng thái trước khi thử tiếp.",
      503,
      "INSPECTION_FAILED",
    );
  }
}
async function readCase(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
  forUpdate = false,
): Promise<CaseRow> {
  if (forUpdate)
    await tx.$queryRaw`SELECT id FROM InspectionCase WHERE id = ${id} FOR UPDATE`;
  const row = await tx.inspectionCase.findUnique({
    where: { id },
    include: caseInclude,
  });
  if (!row || !canReadInspection(actor, context(row.section))) missing();
  return row;
}
async function officers(
  tx: Prisma.TransactionClient,
  section: SectionRow,
): Promise<FeedbackTarget[]> {
  const users = await tx.user.findMany({
    where: { status: "ACTIVE", roles: { some: { role: "THANH_TRA" } } },
    select: { id: true, displayName: true, roles: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
  });
  return users
    .filter((user) => isInspectionOfficer(candidate(user), context(section)))
    .map((user) => ({
      id: user.id,
      displayName: user.displayName,
      roleLabel: "Thanh tra",
    }));
}
export function inspectionOverdue(
  row: {
    status: string;
    acceptDueAt: Date;
    completeDueAt: Date;
    acceptedAt: Date | null;
  },
  now = new Date(),
) {
  return (
    !["DONG", "TU_CHOI", "CHUYEN_LAI"].includes(row.status) &&
    ((!row.acceptedAt && now > row.acceptDueAt) || now > row.completeDueAt)
  );
}
function itemDto(actor: AuthActor, row: CaseRow): InspectionWorkflowItem {
  const full = isInspectionOfficer(actor, context(row.section));
  return {
    id: row.id,
    source: row.source,
    violation: row.violation,
    status: row.status,
    conclusion: row.conclusion,
    revision: row.revision,
    level: full ? "full" : "summary",
    createdAt: row.createdAt.toISOString(),
    feedbackId: full ? row.feedbackId : null,
    isOverdue: inspectionOverdue(row),
    ...(full
      ? {
          title: row.feedback?.title ?? "Hồ sơ Thanh tra",
          assignee: row.assignee,
        }
      : {}),
  };
}
function filesForNote(
  row: CaseRow,
  note: CaseRow["notes"][number],
): InspectionInternalAttachment[] {
  const files = (Array.isArray(note.internalFiles)
    ? note.internalFiles
    : []) as unknown as StoredFile[];
  return files.map((file) => ({
    id: file.id,
    mimeType: file.mimeType,
    byteSize: file.byteSize,
    displayName: safeAttachmentName(file.mimeType),
    downloadUrl: `/api/inspection-cases/${row.id}/notes/${note.id}/attachments/${file.id}`,
  }));
}
async function dto(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  row: CaseRow,
): Promise<InspectionWorkflowDetail> {
  const item = itemDto(actor, row);
  if (item.level === "summary")
    return {
      ...item,
      canAssign: false,
      assignTargets: [],
      allowedActions: [],
      canNote: false,
    };
  const writable =
    !row.section.semester.lockedAt &&
    isInspectionOfficer(actor, context(row.section));
  const canProcess =
    writable &&
    (row.assigneeId === actor.userId ||
      (!row.assigneeId && row.status === "TIEP_NHAN"));
  const access =
    row.feedbackId && row.status !== "CHUYEN_LAI"
      ? await requireFeedbackResource(tx, actor, row.feedbackId)
      : null;
  const feedback = access ? await detailDto(tx, access) : undefined;
  if (feedback)
    feedback.allowedActions = feedback.allowedActions.filter(
      (action) => action === "message",
    );
  return {
    ...item,
    conclusionReason: row.reason,
    canAssign: writable && ["TIEP_NHAN", "XAC_MINH"].includes(row.status),
    assignTargets:
      writable && ["TIEP_NHAN", "XAC_MINH"].includes(row.status)
        ? await officers(tx, row.section)
        : [],
    acceptDueAt: row.acceptDueAt.toISOString(),
    completeDueAt: row.completeDueAt.toISOString(),
    canNote: canProcess && row.status === "XAC_MINH",
    allowedActions: canProcess
      ? inspectionActions.filter(
          (action) => inspectionTransitionTarget(row.status, action) !== null,
        )
      : [],
    ...(feedback ? { feedback } : {}),
    events: row.events.map((event) => ({
      id: event.id,
      actorLabel:
        row.feedback &&
        event.actorId === row.feedback.authorId &&
        row.feedback.identityLevel !== "CHO_THANH_TRA_BIET"
          ? "Sinh viên ẩn danh"
          : event.actor.displayName,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      occurredAt: event.occurredAt.toISOString(),
    })),
    notes: row.notes.map((note) => ({
      id: note.id,
      body: note.body,
      authorLabel: note.author.displayName,
      createdAt: note.createdAt.toISOString(),
      attachments: filesForNote(row, note),
    })),
  };
}
function inspectionScope(actor: AuthActor): Prisma.CourseSectionWhereInput {
  const grants = actorGrants(actor);
  return {
    NOT: [
      { teaching: { some: { teacherId: actor.userId } } },
      {
        course: {
          departmentId: {
            in: grants
              .filter((grant) => grant.role === "TRUONG_BO_MON")
              .map((grant) => grant.departmentId)
              .filter((id): id is string => !!id),
          },
        },
      },
      {
        course: {
          department: {
            facultyId: {
              in: grants
                .filter((grant) => grant.role === "TRUONG_KHOA")
                .map((grant) => grant.facultyId)
                .filter((id): id is string => !!id),
            },
          },
        },
      },
    ],
  };
}
export async function listInspectionCases(
  actor: AuthActor,
  input: unknown = {},
): Promise<InspectionWorkflowList> {
  const data = parseInput(inspectionQueueSchema, input);
  return transaction(actor, "inspection:list", async (tx, fresh) => {
    const where: Prisma.InspectionCaseWhereInput = {
      section: inspectionScope(fresh),
      ...(data.status ? { status: data.status } : {}),
    };
    const [rows, total] = await Promise.all([
      tx.inspectionCase.findMany({
        where,
        include: caseInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
      }),
      tx.inspectionCase.count({ where }),
    ]);
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "INSPECTION_QUEUE_VIEWED",
        objectType: "InspectionCase",
        redactedSummary: {
          itemCount: rows.length,
          summaryOnly: !actorGrants(fresh).some(
            (grant) => grant.role === "THANH_TRA",
          ),
        },
      },
    });
    return {
      items: rows.map((row) => itemDto(fresh, row)),
      total,
      page: data.page,
      pageSize: data.pageSize,
    };
  });
}
export async function getInspectionCase(
  actor: AuthActor,
  id: string,
): Promise<InspectionWorkflowDetail> {
  const caseId = parseInput(objectId, id);
  return transaction(actor, "inspection:read", async (tx, fresh) => {
    const row = await readCase(tx, fresh, caseId);
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "INSPECTION_CASE_VIEWED",
        objectType: "InspectionCase",
        objectId: caseId,
        redactedSummary: {
          summaryOnly: !isInspectionOfficer(fresh, context(row.section)),
          identityVisible:
            !!row.feedback &&
            isInspectionOfficer(fresh, context(row.section)) &&
            row.feedback.identityLevel === "CHO_THANH_TRA_BIET",
        },
      },
    });
    return dto(tx, fresh, row);
  });
}
async function previousMutation(
  tx: Prisma.TransactionClient,
  row: CaseRow,
  actor: AuthActor,
  requestId: string,
  requestHash: string,
) {
  const previous = await tx.inspectionCaseEvent.findUnique({
    where: { caseId_requestId: { caseId: row.id, requestId } },
  });
  if (!previous) return false;
  if (previous.actorId !== actor.userId || previous.requestHash !== requestHash)
    inputConflict();
  return true;
}
function assertOfficerWrite(
  actor: AuthActor,
  row: CaseRow,
  revision: number,
  assigned = true,
) {
  if (!isInspectionOfficer(actor, context(row.section))) missing();
  if (row.section.semester.lockedAt) locked();
  if (row.revision !== revision) conflict();
  if (
    assigned &&
    row.assigneeId !== actor.userId &&
    (row.assigneeId !== null || row.status !== "TIEP_NHAN")
  )
    throw new AuthError(
      "Chỉ cán bộ được giao xử lý được cập nhật hồ sơ.",
      403,
      "INSPECTION_ASSIGNEE_REQUIRED",
    );
}
async function auditMutation(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  row: CaseRow,
  action: string,
  revision: number,
) {
  await tx.auditLog.create({
    data: {
      actorId: actor.userId,
      action,
      objectType: "InspectionCase",
      objectId: row.id,
      redactedSummary: { revision },
    },
  });
}
export async function assignInspectionCase(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<InspectionWorkflowDetail> {
  const caseId = parseInput(objectId, id),
    data = parseInput(inspectionAssignmentSchema, input);
  return transaction(actor, "inspection:assign", async (tx, fresh) => {
    const row = await readCase(tx, fresh, caseId, true);
    if (!isInspectionOfficer(fresh, context(row.section))) missing();
    if (await previousMutation(tx, row, fresh, data.requestId, hash(data)))
      return dto(tx, fresh, row);
    assertOfficerWrite(fresh, row, data.revision, false);
    if (!["TIEP_NHAN", "XAC_MINH"].includes(row.status)) conflict();
    if (
      !(await officers(tx, row.section)).some(
        (target) => target.id === data.assigneeId,
      )
    )
      throw new AuthError(
        "Người được phân công không đủ quyền hoặc có xung đột lợi ích.",
        400,
        "INSPECTION_ASSIGNEE_INVALID",
      );
    const changed = await tx.inspectionCase.updateMany({
      where: { id: caseId, revision: row.revision, status: row.status },
      data: { assigneeId: data.assigneeId, revision: { increment: 1 } },
    });
    if (changed.count !== 1) conflict();
    if (row.feedbackId) {
      await lockFeedback(tx, row.feedbackId);
      await tx.feedback.update({
        where: { id: row.feedbackId },
        data: { assigneeId: data.assigneeId, revision: { increment: 1 } },
      });
    }
    await tx.inspectionCaseEvent.create({
      data: {
        caseId,
        actorId: fresh.userId,
        fromStatus: row.status,
        toStatus: row.status,
        event: "ASSIGNED",
        reason: data.reason,
        requestId: data.requestId,
        requestHash: hash(data),
      },
    });
    await enqueueDomainNotice(tx, {
      key: `inspection:assign:${caseId}:${row.revision + 1}`,
      targetType: "InspectionCase",
      targetId: caseId,
      title: "Hồ sơ Thanh tra được giao xử lý",
      body: "Có hồ sơ cần tiếp nhận hoặc xác minh. Mở hồ sơ để xem thông tin theo quyền truy cập.",
      userIds: [data.assigneeId],
    });
    await auditMutation(
      tx,
      fresh,
      row,
      "INSPECTION_CASE_ASSIGNED",
      row.revision + 1,
    );
    return dto(tx, fresh, await readCase(tx, fresh, caseId));
  });
}

async function ordinaryTargets(
  tx: Prisma.TransactionClient,
  section: SectionRow,
  category: string,
  severity: string,
  authorId: string,
) {
  const routing = initialFeedbackRoles(category, severity);
  const users = await tx.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: authorId },
      roles: {
        some: { role: { in: [...routing.primary, ...routing.copied] } },
      },
    },
    select: { id: true, displayName: true, roles: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
  });
  return users.flatMap((user) => {
    const actor = candidate(user);
    if (!can(actor, "feedback:process")) return [];
    const grants = actorGrants(actor).filter((grant) =>
      roleMatchesFeedbackSection(grant, actor.userId, context(section)),
    );
    const primary = grants.find((grant) =>
      routing.primary.includes(grant.role),
    );
    const copied = grants.find((grant) => routing.copied.includes(grant.role));
    const chosen = primary ?? copied;
    return chosen
      ? [{ userId: user.id, accessRole: chosen.role, isPrimary: !!primary }]
      : [];
  });
}
export async function transitionInspectionCase(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<InspectionWorkflowDetail> {
  const caseId = parseInput(objectId, id),
    data = parseInput(inspectionTransitionSchema, input);
  return transaction(actor, "inspection:assign", async (tx, fresh) => {
    const row = await readCase(tx, fresh, caseId, true);
    if (!isInspectionOfficer(fresh, context(row.section))) missing();
    if (await previousMutation(tx, row, fresh, data.requestId, hash(data)))
      return dto(tx, fresh, row);
    assertOfficerWrite(fresh, row, data.revision);
    const target = inspectionTransitionTarget(row.status, data.action);
    if (!target)
      throw new AuthError(
        "Không thể chuyển hồ sơ từ trạng thái hiện tại.",
        409,
        "INSPECTION_TRANSITION_INVALID",
      );
    if (data.action === "conclude" && row.notes.length === 0)
      throw new AuthError(
        "Cần ghi ít nhất một ghi chú xác minh trước khi kết luận.",
        409,
        "INSPECTION_VERIFICATION_REQUIRED",
      );
    const now = new Date();
    const changed = await tx.inspectionCase.updateMany({
      where: { id: caseId, revision: row.revision, status: row.status },
      data: {
        status: target,
        revision: { increment: 1 },
        ...(data.action === "accept"
          ? { acceptedAt: now, assigneeId: fresh.userId }
          : {}),
        ...(data.action === "conclude"
          ? { conclusion: data.conclusion, reason: data.reason }
          : {}),
        ...(data.action === "notify"
          ? { studentSummary: data.studentSummary }
          : {}),
        ...(["close", "reject", "return"].includes(data.action)
          ? { closedAt: now }
          : {}),
      },
    });
    if (changed.count !== 1) conflict();
    if (row.feedbackId) {
      await lockFeedback(tx, row.feedbackId);
      if (data.action === "return") {
        const returnSettings = await readWorkflowSettings(tx);
        const feedback = await tx.feedback.findUniqueOrThrow({
          where: { id: row.feedbackId },
        });
        const recipients = await ordinaryTargets(
          tx,
          row.section,
          data.returnCategory!,
          feedback.severity,
          feedback.authorId,
        );
        const primary = recipients.find((recipient) => recipient.isPrimary);
        if (!primary)
          throw new AuthError(
            "Chưa có người nhận phản hồi phù hợp. Cần bổ sung phân công trước khi chuyển lại.",
            409,
            "FEEDBACK_RECIPIENT_MISSING",
          );
        await tx.feedbackRecipient.deleteMany({
          where: { feedbackId: row.feedbackId },
        });
        await tx.feedbackRecipient.createMany({
          data: recipients.map((recipient) => ({
            feedbackId: row.feedbackId!,
            ...recipient,
            isActive: true,
          })),
        });
        await tx.feedback.update({
          where: { id: row.feedbackId },
          data: {
            category: data.returnCategory,
            identityLevel: null,
            isAnonymous: true,
            assigneeId: primary.userId,
            status: "MOI",
            isOverdue: false,
            acceptedAt: null,
            answeredAt: null,
            closedAt: null,
            acceptDueAt: addBusinessDays(
              now,
              ["TO_CHUC_LOP_HOC", "THI_KET_THUC_HOC_PHAN"].includes(
                data.returnCategory!,
              )
                ? returnSettings.officeAcceptDays
                : returnSettings.normalAcceptDays,
            ),
            replyDueAt: addBusinessDays(
              now,
              ["TO_CHUC_LOP_HOC", "THI_KET_THUC_HOC_PHAN"].includes(
                data.returnCategory!,
              )
                ? returnSettings.officeReplyDays
                : feedback.severity === "KHIEU_NAI"
                  ? returnSettings.complaintReplyDays
                  : returnSettings.normalReplyDays,
            ),
            revision: { increment: 1 },
          },
        });
        await tx.feedbackHistory.create({
          data: {
            feedbackId: row.feedbackId,
            actorId: fresh.userId,
            event: "CHUYEN_TIEP",
            fromStatus: feedback.status,
            toStatus: "MOI",
            fromAssigneeId: feedback.assigneeId,
            toAssigneeId: primary.userId,
            reason:
              "Chuyển về quy trình phản hồi thường theo quyết định tiếp nhận.",
          },
        });
        await enqueueDomainNotice(tx, {
          key: `inspection:return:${caseId}`,
          targetType: "Feedback",
          targetId: row.feedbackId,
          title: "Phản hồi được chuyển về đơn vị xử lý",
          body: "Phản hồi đã được chuyển về quy trình xử lý thông thường. Mở phản hồi để theo dõi trạng thái.",
          userIds: [
            feedback.authorId,
            ...recipients.map((recipient) => recipient.userId),
          ],
        });
      } else {
        const feedbackStatus =
          target === "XAC_MINH"
            ? "DANG_XU_LY"
            : target === "THONG_BAO"
              ? "DA_TRA_LOI"
              : target === "DONG"
                ? "DA_DONG"
                : target === "TU_CHOI"
                  ? "TU_CHOI"
                  : undefined;
        await tx.feedback.update({
          where: { id: row.feedbackId },
          data: {
            ...(feedbackStatus ? { status: feedbackStatus } : {}),
            ...(target === "XAC_MINH"
              ? { assigneeId: fresh.userId, acceptedAt: now }
              : {}),
            ...(target === "THONG_BAO" ? { answeredAt: now } : {}),
            ...(target === "DONG" ? { closedAt: now } : {}),
            revision: { increment: 1 },
          },
        });
        if (data.action === "notify" || data.action === "reject") {
          await enqueueDomainNotice(tx, {
            key: `inspection:student:${caseId}:${target}`,
            targetType: "Feedback",
            targetId: row.feedbackId,
            title:
              data.action === "notify"
                ? "Hồ sơ đã có kết quả xử lý"
                : "Hồ sơ đã có quyết định tiếp nhận",
            body: "Mở phản hồi để xem kết quả được gửi qua kênh riêng của sinh viên.",
            userIds: row.feedback ? [row.feedback.authorId] : [],
          });
        }
      }
    }
    await tx.inspectionCaseEvent.create({
      data: {
        caseId,
        actorId: fresh.userId,
        fromStatus: row.status,
        toStatus: target,
        event: data.action.toUpperCase(),
        reason: data.reason ?? null,
        requestId: data.requestId,
        requestHash: hash(data),
      },
    });
    if (data.action === "notify" && row.conclusion === "CO_CAN_CU") {
      const leaders = await tx.user.findMany({
        where: { status: "ACTIVE", roles: { some: { role: "LANH_DAO" } } },
        select: { id: true, roles: true },
      });
      await enqueueDomainNotice(tx, {
        key: `inspection:leader:${caseId}:conclusion`,
        targetType: "InspectionCase",
        targetId: caseId,
        title: "Hồ sơ Thanh tra có kết luận",
        body: "Một hồ sơ đã có kết luận có căn cứ. Lãnh đạo có thể xem loại, trạng thái và kết luận tóm tắt.",
        userIds: leaders
          .filter((user) =>
            canReadInspection(candidate(user), context(row.section)),
          )
          .map((user) => user.id),
      });
    }
    await auditMutation(
      tx,
      fresh,
      row,
      `INSPECTION_CASE_${data.action.toUpperCase()}`,
      row.revision + 1,
    );
    return dto(tx, fresh, await readCase(tx, fresh, caseId));
  });
}

export async function addInspectionNote(
  actor: AuthActor,
  id: string,
  input: unknown,
  uploads: readonly AttachmentUpload[] = [],
): Promise<InspectionWorkflowDetail> {
  const caseId = parseInput(objectId, id),
    data = parseInput(inspectionNoteSchema, input);
  const files = uploads.length ? validateAttachmentBatch(uploads, 0) : [];
  const requestHash = hash({
    ...data,
    files: files.map((file) => ({
      sha256: file.sha256,
      byteSize: file.byteSize,
      mimeType: file.mimeType,
    })),
  });
  const written: string[] = [];
  try {
    return await transaction(actor, "inspection:assign", async (tx, fresh) => {
      const row = await readCase(tx, fresh, caseId, true);
      if (!isInspectionOfficer(fresh, context(row.section))) missing();
      if (await previousMutation(tx, row, fresh, data.requestId, requestHash))
        return dto(tx, fresh, row);
      assertOfficerWrite(fresh, row, data.revision);
      if (row.status !== "XAC_MINH")
        throw new AuthError(
          "Chỉ ghi chú xác minh khi hồ sơ đang xác minh.",
          409,
          "INSPECTION_NOTE_UNAVAILABLE",
        );
      const stored: StoredFile[] = [];
      for (const file of files) {
        const key = `${randomUUID()}.${file.extension}`;
        await writePrivateAttachment(key, file.content);
        written.push(key);
        stored.push({
          id: randomUUID(),
          storageKey: key,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          sha256: file.sha256,
        });
      }
      const changed = await tx.inspectionCase.updateMany({
        where: { id: caseId, revision: row.revision, status: "XAC_MINH" },
        data: { revision: { increment: 1 } },
      });
      if (changed.count !== 1) conflict();
      await tx.inspectionCaseNote.create({
        data: {
          caseId,
          authorId: fresh.userId,
          body: data.body,
          internalFiles: stored as unknown as Prisma.InputJsonValue,
          requestId: data.requestId,
          requestHash,
        },
      });
      await tx.inspectionCaseEvent.create({
        data: {
          caseId,
          actorId: fresh.userId,
          fromStatus: row.status,
          toStatus: row.status,
          event: "NOTE_ADDED",
          reason: "Bổ sung ghi chú xác minh và chứng cứ nội bộ.",
          requestId: data.requestId,
          requestHash,
        },
      });
      await auditMutation(
        tx,
        fresh,
        row,
        "INSPECTION_NOTE_ADDED",
        row.revision + 1,
      );
      return dto(tx, fresh, await readCase(tx, fresh, caseId));
    });
  } catch (error) {
    await Promise.allSettled(
      written.map((key) => removePrivateAttachment(key)),
    );
    throw error;
  }
}
export async function downloadInspectionNoteAttachment(
  actor: AuthActor,
  id: string,
  noteId: string,
  attachmentId: string,
) {
  const caseId = parseInput(objectId, id),
    note = parseInput(objectId, noteId),
    fileId = parseInput(objectId, attachmentId);
  return transaction(actor, "inspection:read", async (tx, fresh) => {
    const row = await readCase(tx, fresh, caseId);
    if (!isInspectionOfficer(fresh, context(row.section))) missing();
    const entry = row.notes.find((item) => item.id === note);
    const file = (
      (entry && Array.isArray(entry.internalFiles)
        ? entry.internalFiles
        : []) as unknown as StoredFile[]
    ).find((item) => item.id === fileId);
    if (!file) missing();
    const content = await readPrivateAttachment(file.storageKey);
    if (
      content.length !== file.byteSize ||
      createHash("sha256").update(content).digest("hex") !== file.sha256
    )
      throw new AuthError(
        "Chưa đọc được tệp chứng cứ. Vui lòng thử lại.",
        503,
        "ATTACHMENT_INTEGRITY_ERROR",
      );
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "INSPECTION_INTERNAL_ATTACHMENT_DOWNLOADED",
        objectType: "InspectionCase",
        objectId: caseId,
        redactedSummary: { noteId: note, attachmentId: fileId },
      },
    });
    return {
      content,
      headers: attachmentDownloadHeaders(file.mimeType, file.byteSize),
    };
  });
}

const transferRoles: Role[] = [
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
];
function canTransferInSection(actor: AuthActor, section: SectionRow) {
  return (
    can(actor, "feedback:process") &&
    actorGrants(actor).some(
      (grant) =>
        transferRoles.includes(grant.role) &&
        roleMatchesFeedbackSection(grant, actor.userId, context(section)),
    )
  );
}
export async function transferFeedbackToInspection(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<TransferredInspectionSummary> {
  const feedbackId = parseInput(objectId, id),
    data = parseInput(inspectionTransferSchema, input);
  return transaction(actor, "feedback:process", async (tx, fresh) => {
    await lockFeedback(tx, feedbackId);
    const existing = await tx.inspectionCase.findUnique({
      where: { feedbackId },
      include: caseInclude,
    });
    if (existing) {
      if (
        existing.source !== "CHUYEN_PHAN_HOI" ||
        existing.createdById !== fresh.userId ||
        !canTransferInSection(fresh, existing.section)
      )
        missing();
      if (
        !(await previousMutation(
          tx,
          existing,
          fresh,
          data.requestId,
          hash(data),
        ))
      )
        throw new AuthError(
          "Phản hồi đã được chuyển sang Thanh tra.",
          409,
          "INSPECTION_ALREADY_TRANSFERRED",
        );
      return transferredSummary(existing);
    }
    const access = await requireFeedbackResource(tx, fresh, feedbackId);
    const row = access.feedback;
    if (
      access.isAuthor ||
      !canTransferInSection(fresh, row.section) ||
      row.inspectionCase ||
      !["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(row.status)
    )
      throw new AuthError(
        "Không thể chuyển phản hồi này sang Thanh tra.",
        403,
        "INSPECTION_TRANSFER_FORBIDDEN",
      );
    if (row.section.semester.lockedAt) locked();
    if (row.revision !== data.revision) conflict();
    const targets = await officers(tx, row.section);
    if (!targets.length)
      throw new AuthError(
        "Chưa có cán bộ Thanh tra không xung đột để tiếp nhận.",
        409,
        "INSPECTION_RECIPIENT_MISSING",
      );
    const now = new Date();
    const settings = await readWorkflowSettings(tx);
    const created = await tx.inspectionCase.create({
      data: {
        feedbackId,
        sectionId: row.sectionId,
        source: "CHUYEN_PHAN_HOI",
        violation: data.violation,
        assigneeId: targets[0].id,
        createdById: fresh.userId,
        acceptDueAt: addBusinessDays(now, settings.inspectionAcceptDays),
        completeDueAt: addBusinessDays(now, settings.inspectionCompleteDays),
      },
      include: caseInclude,
    });
    const changed = await tx.feedback.updateMany({
      where: { id: feedbackId, revision: row.revision, status: row.status },
      data: {
        status: "MOI",
        assigneeId: targets[0].id,
        isOverdue: false,
        acceptedAt: null,
        answeredAt: null,
        closedAt: null,
        acceptDueAt: created.acceptDueAt,
        replyDueAt: created.completeDueAt,
        identityLevel: row.isAnonymous
          ? "AN_DANH_HOAN_TOAN"
          : "CHO_THANH_TRA_BIET",
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) conflict();
    await tx.feedbackRecipient.deleteMany({ where: { feedbackId } });
    await tx.feedbackRecipient.createMany({
      data: targets.map((target) => ({
        feedbackId,
        userId: target.id,
        isPrimary: true,
        isActive: true,
        accessRole: "THANH_TRA" as const,
      })),
    });
    await tx.inspectionCaseEvent.create({
      data: {
        caseId: created.id,
        actorId: fresh.userId,
        fromStatus: null,
        toStatus: "TIEP_NHAN",
        event: "TRANSFERRED",
        reason: data.reason,
        requestId: data.requestId,
        requestHash: hash(data),
      },
    });
    await tx.feedbackHistory.create({
      data: {
        feedbackId,
        actorId: fresh.userId,
        event: "CHUYEN_TIEP",
        fromStatus: row.status,
        toStatus: "MOI",
        fromAssigneeId: row.assigneeId,
        toAssigneeId: targets[0].id,
        reason:
          "Chuyển sang quy trình Thanh tra. Người chuyển chỉ theo dõi trạng thái và kết luận tóm tắt.",
      },
    });
    await auditMutation(
      tx,
      fresh,
      created,
      "FEEDBACK_TRANSFERRED_TO_INSPECTION",
      1,
    );
    await enqueueDomainNotice(tx, {
      key: `inspection:transfer:${created.id}`,
      targetType: "InspectionCase",
      targetId: created.id,
      title: "Hồ sơ được chuyển tới Thanh tra",
      body: "Có hồ sơ cần tiếp nhận. Mở hồ sơ để xem thông tin theo quyền truy cập.",
      userIds: targets.map((target) => target.id),
    });
    await enqueueDomainNotice(tx, {
      key: `inspection:transfer-student:${created.id}`,
      targetType: "Feedback",
      targetId: feedbackId,
      title: "Phản hồi được chuyển sang Thanh tra",
      body: "Phản hồi đang được xử lý theo quy trình Thanh tra. Trạng thái được cập nhật tại phản hồi đã gửi.",
      userIds: [row.authorId],
    });
    return transferredSummary(created);
  });
}
function transferredSummary(
  row: Pick<CaseRow, "id" | "feedbackId" | "status" | "conclusion">,
): TransferredInspectionSummary & { feedbackId: string; caseId: string } {
  return {
    id: row.id,
    caseId: row.id,
    feedbackId: row.feedbackId!,
    source: "CHUYEN_PHAN_HOI",
    status: row.status,
    conclusion: row.conclusion,
  };
}
export async function getTransferredFeedbackSummary(
  actor: AuthActor,
  id: string,
) {
  const feedbackId = parseInput(objectId, id);
  return transaction(actor, "feedback:process", async (tx, fresh) => {
    const row = await tx.inspectionCase.findUnique({
      where: { feedbackId },
      include: caseInclude,
    });
    if (
      !row ||
      row.source !== "CHUYEN_PHAN_HOI" ||
      row.createdById !== fresh.userId ||
      !canTransferInSection(fresh, row.section)
    )
      missing();
    return transferredSummary(row);
  });
}
export async function listTransferredFeedbackSummaries(actor: AuthActor) {
  return transaction(actor, "feedback:process", async (tx, fresh) => {
    const rows = await tx.inspectionCase.findMany({
      where: { createdById: fresh.userId, source: "CHUYEN_PHAN_HOI" },
      include: caseInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 100,
    });
    return rows
      .filter((row) => canTransferInSection(fresh, row.section))
      .map(transferredSummary);
  });
}
export async function getStudentInspectionResult(actor: AuthActor, id: string) {
  const feedbackId = parseInput(objectId, id);
  requireCan(actor, "feedback:read");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    const access = await requireFeedbackResource(tx, fresh, feedbackId);
    if (!access.isAuthor || !access.inspectionId) missing();
    const row = await tx.inspectionCase.findUnique({
      where: { id: access.inspectionId },
    });
    if (!row) missing();
    return {
      status: row.status,
      conclusion: ["THONG_BAO", "DONG"].includes(row.status)
        ? row.conclusion
        : null,
      summary: ["THONG_BAO", "DONG"].includes(row.status)
        ? row.studentSummary
        : row.status === "TU_CHOI"
          ? "Hồ sơ không được tiếp nhận. Sinh viên có thể liên hệ đơn vị quản lý để được hướng dẫn bổ sung thông tin."
          : null,
    };
  });
}
