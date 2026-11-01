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
  type PolicyAction,
  type RoleGrant,
} from "../policies/can";
import {
  canReadInspection,
  feedbackTransitionTarget,
  initialFeedbackRoles,
  isInspectionOfficer,
  roleMatchesFeedbackSection,
  type FeedbackSectionContext,
} from "../policies/feedback";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  parseInput,
} from "./access";
import { readFeedbackSettings } from "./feedback-settings";
import { safeAttachmentName } from "../feedback/attachment-files";
import {
  createFeedbackSchema,
  feedbackCategories,
  feedbackIdentityLevels,
  feedbackListSchema,
  feedbackMessageSchema,
  feedbackSeverities,
  feedbackTransitionSchema,
  inspectionAssignmentSchema,
  inspectionListSchema,
  inspectionViolations,
  type FeedbackAction,
  type FeedbackDetail,
  type FeedbackList,
  type FeedbackListItem,
  type FeedbackOptions,
  type FeedbackSection,
  type FeedbackStatus,
  type FeedbackTarget,
  type InspectionCaseDetail,
  type InspectionCaseItem,
  type InspectionCaseList,
} from "./feedback-types";
export type * from "./feedback-types";

const sectionInclude = {
  course: { include: { department: { include: { faculty: true } } } },
  semester: true,
  teaching: { select: { teacherId: true, isLead: true } },
} as const;
const feedbackInclude = {
  section: { include: sectionInclude },
  author: { select: { displayName: true, loginCode: true, email: true } },
  assignee: { select: { id: true, displayName: true } },
  recipients: true,
  inspectionCase: true,
  messages: {
    include: { author: { select: { displayName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  history: {
    include: { actor: { select: { displayName: true } } },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
  attachments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} as const satisfies Prisma.FeedbackInclude;
type FeedbackRow = Prisma.FeedbackGetPayload<{
  include: typeof feedbackInclude;
}>;
type SectionRow = Prisma.CourseSectionGetPayload<{
  include: typeof sectionInclude;
}>;
const roleLabels: Partial<Record<Role, string>> = {
  GIANG_VIEN: "Giảng viên",
  TRUONG_BO_MON: "Trưởng bộ môn",
  TRUONG_KHOA: "Trưởng khoa",
  CAN_BO_DBCL: "Đảm bảo chất lượng",
  PHONG_DAO_TAO: "Phòng Đào tạo",
  PHONG_KHAO_THI: "Phòng Khảo thí",
  THANH_TRA: "Thanh tra",
};

function notFound(): never {
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
function locked(): never {
  throw new AuthError(
    "Học kỳ đã khóa sổ. Dữ liệu liên quan chỉ được đọc.",
    409,
    "SEMESTER_LOCKED",
  );
}
function requestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
function sectionContext(section: SectionRow): FeedbackSectionContext {
  return {
    departmentId: section.course.departmentId,
    facultyId: section.course.department.facultyId,
    teacherIds: section.teaching.map((item) => item.teacherId),
  };
}
function sectionDto(section: SectionRow): FeedbackSection {
  return {
    id: section.id,
    code: section.code,
    courseName: section.course.name,
    semesterName: section.semester.name,
    semesterLocked: !!section.semester.lockedAt,
  };
}
function serious(row: Pick<FeedbackRow, "category">): boolean {
  return row.category === "KHIEU_NAI_NGHIEM_TRONG";
}
function contextGrant(
  grant: RoleGrant,
  actor: AuthActor,
  section: SectionRow,
): boolean {
  if (
    (grant.role === "TRUONG_BO_MON" || grant.role === "TRUONG_KHOA") &&
    (!section.course.department.isActive ||
      !section.course.department.faculty.isActive)
  )
    return false;
  return roleMatchesFeedbackSection(
    grant,
    actor.userId,
    sectionContext(section),
  );
}
function normalRecipient(
  actor: AuthActor,
  row: FeedbackRow,
  primaryOnly = false,
): boolean {
  return (
    can(actor, "feedback:read") &&
    row.recipients.some(
      (recipient) =>
        recipient.isActive &&
        recipient.userId === actor.userId &&
        (!primaryOnly || recipient.isPrimary) &&
        actorGrants(actor).some(
          (grant) =>
            (!recipient.accessRole || grant.role === recipient.accessRole) &&
            (!primaryOnly ||
              recipient.accessRole !== null ||
              initialFeedbackRoles(row.category, row.severity).primary.includes(
                grant.role,
              )) &&
            contextGrant(grant, actor, row.section),
        ),
    )
  );
}
function ownFeedback(actor: AuthActor, row: FeedbackRow): boolean {
  return row.authorId === actor.userId && can(actor, "feedback:create");
}

export interface FeedbackAccess {
  actor: AuthActor;
  feedback: FeedbackRow;
  isAuthor: boolean;
  inspectionId: string | null;
  canSeeIdentity: boolean;
}
/** Caller takes ADMIN_MUTATION_LOCK before this helper; it rechecks the session and object policy. */
export async function requireFeedbackResource(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
  mode: "read" | "attach" = "read",
): Promise<FeedbackAccess> {
  requireCan(actor, mode === "attach" ? "feedback:attach" : "feedback:read");
  const fresh = await assertFreshActor(tx, actor);
  requireCan(fresh, mode === "attach" ? "feedback:attach" : "feedback:read");
  const row = await tx.feedback.findUnique({
    where: { id: parseInput(objectId, id) },
    include: feedbackInclude,
  });
  if (!row) notFound();
  const isAuthor = ownFeedback(fresh, row);
  const officer =
    serious(row) && isInspectionOfficer(fresh, sectionContext(row.section));
  if (!isAuthor && !(serious(row) ? officer : normalRecipient(fresh, row)))
    notFound();
  if (mode === "attach") {
    if (
      !isAuthor ||
      !["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(row.status) ||
      row.isLocked
    )
      throw new AuthError(
        "Không thể thêm tệp ở trạng thái hiện tại.",
        403,
        "FEEDBACK_ATTACHMENT_FORBIDDEN",
      );
    if (row.section.semester.lockedAt) locked();
  }
  return {
    actor: fresh,
    feedback: row,
    isAuthor,
    inspectionId: row.inspectionCase?.id ?? null,
    canSeeIdentity:
      isAuthor ||
      (serious(row)
        ? officer && row.identityLevel === "CHO_THANH_TRA_BIET"
        : !row.isAnonymous),
  };
}
export async function lockFeedback(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM Feedback WHERE id = ${id} FOR UPDATE`;
}
async function transaction<T>(
  actor: AuthActor,
  action: PolicyAction,
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
): Promise<T> {
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
      "Chưa xử lý được phản hồi. Tải lại trạng thái trước khi thử tiếp.",
      503,
      "FEEDBACK_FAILED",
    );
  }
}
async function feedbackWindow(tx: Prisma.TransactionClient): Promise<string[]> {
  const settings = await readFeedbackSettings(tx);
  const today = new Date(
    `${new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const current = await tx.semester.findMany({
    where: { startsOn: { lte: today }, endsOn: { gte: today } },
    select: { id: true, startsOn: true },
  });
  if (!current.length) return [];
  const ids = current.map((item) => item.id);
  if (settings.allowPreviousSemester) {
    const start = new Date(
      Math.min(...current.map((item) => item.startsOn.getTime())),
    );
    const previous = await tx.semester.findFirst({
      where: { startsOn: { lt: start } },
      orderBy: [{ startsOn: "desc" }, { id: "asc" }],
      select: { startsOn: true },
    });
    if (previous)
      ids.push(
        ...(
          await tx.semester.findMany({
            where: { startsOn: previous.startsOn },
            select: { id: true },
          })
        ).map((item) => item.id),
      );
  }
  return ids;
}
function candidateActor(user: { id: string; roles: RoleGrant[] }): AuthActor {
  const assignments = user.roles
    .filter(isValidGrant)
    .map((grant) => ({
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
    mfa: true,
    purpose: "FULL",
    roles: [...new Set(assignments.map((item) => item.role))],
    assignments,
  };
}
async function recipientsFor(
  tx: Prisma.TransactionClient,
  section: SectionRow,
  category: string,
  severity: string,
  excludeUserId?: string,
) {
  const routing = initialFeedbackRoles(category, severity);
  const users = await tx.user.findMany({
    where: {
      status: "ACTIVE",
      roles: {
        some: {
          role: {
            in: serious({ category } as FeedbackRow)
              ? ["THANH_TRA"]
              : [
                  "GIANG_VIEN",
                  "TRUONG_BO_MON",
                  "TRUONG_KHOA",
                  "CAN_BO_DBCL",
                  "PHONG_DAO_TAO",
                  "PHONG_KHAO_THI",
                ],
          },
        },
      },
    },
    select: { id: true, displayName: true, roles: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
  });
  const result: {
    id: string;
    displayName: string;
    role: Role;
    isPrimary: boolean;
  }[] = [];
  for (const user of users) {
    if (user.id === excludeUserId) continue;
    const identity = candidateActor(user);
    if (identity.roles.includes("ADMIN")) continue;
    if (category === "KHIEU_NAI_NGHIEM_TRONG") {
      if (isInspectionOfficer(identity, sectionContext(section)))
        result.push({
          id: user.id,
          displayName: user.displayName,
          role: "THANH_TRA",
          isPrimary: true,
        });
      continue;
    }
    const eligible = actorGrants(identity).filter((grant) =>
      contextGrant(grant, identity, section),
    );
    const main = eligible.find((grant) => routing.primary.includes(grant.role));
    const copy = eligible.find((grant) => routing.copied.includes(grant.role));
    const grant = main ?? copy;
    if (grant)
      result.push({
        id: user.id,
        displayName: user.displayName,
        role: grant.role,
        isPrimary: !!main,
      });
  }
  return result;
}
async function forwardingTargets(
  tx: Prisma.TransactionClient,
  access: FeedbackAccess,
): Promise<FeedbackTarget[]> {
  if (access.isAuthor || serious(access.feedback)) return [];
  const row = access.feedback;
  const possible = await tx.user.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: [access.actor.userId, row.authorId] },
      roles: {
        some: {
          role: {
            in: [
              "GIANG_VIEN",
              "TRUONG_BO_MON",
              "TRUONG_KHOA",
              "CAN_BO_DBCL",
              "PHONG_DAO_TAO",
              "PHONG_KHAO_THI",
            ],
          },
        },
      },
    },
    select: { id: true, displayName: true, roles: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
  });
  return possible.flatMap((user) => {
    const identity = candidateActor(user);
    if (identity.roles.includes("ADMIN")) return [];
    const grant = actorGrants(identity).find((grant) =>
      contextGrant(grant, identity, row.section),
    );
    return grant
      ? [
          {
            id: user.id,
            displayName: user.displayName,
            roleLabel: roleLabels[grant.role] ?? grant.role,
          },
        ]
      : [];
  });
}
function allowedActions(access: FeedbackAccess): FeedbackAction[] {
  const { actor, feedback: row, isAuthor } = access;
  if (row.section.semester.lockedAt || row.isLocked) return [];
  const actions: FeedbackAction[] = [];
  if (
    !["DA_DONG", "TU_CHOI"].includes(row.status) &&
    (isAuthor ||
      (serious(row)
        ? isInspectionOfficer(actor, sectionContext(row.section)) &&
          (!row.inspectionCase?.assigneeId ||
            row.inspectionCase.assigneeId === actor.userId)
        : normalRecipient(actor, row, true) &&
          (!row.assigneeId || row.assigneeId === actor.userId)))
  )
    actions.push("message");
  if (serious(row)) return actions;
  for (const action of [
    "accept",
    "start",
    "answer",
    "close",
    "reject",
    "forward",
  ] as const)
    if (
      feedbackTransitionTarget(
        row.status,
        action,
        isAuthor,
        !isAuthor &&
          normalRecipient(actor, row, true) &&
          (!row.assigneeId || row.assigneeId === actor.userId),
        !isAuthor &&
          row.assigneeId === actor.userId &&
          normalRecipient(actor, row, true),
      )
    )
      actions.push(action);
  return actions;
}
function listItem(access: FeedbackAccess): FeedbackListItem {
  const row = access.feedback;
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    title: row.title,
    status: row.status,
    revision: row.revision,
    isAnonymous: serious(row)
      ? row.identityLevel !== "CHO_THANH_TRA_BIET"
      : row.isAnonymous,
    section: sectionDto(row.section),
    authorLabel: access.canSeeIdentity
      ? row.author.displayName
      : "Sinh viên ẩn danh",
    assignee: row.assignee,
    createdAt: row.createdAt.toISOString(),
    inspectionId: row.inspectionCase?.id ?? null,
  };
}
async function detailDto(
  tx: Prisma.TransactionClient,
  access: FeedbackAccess,
): Promise<FeedbackDetail> {
  await auditCaseRead(tx, access);
  const row = access.feedback;
  const actions = allowedActions(access);
  const label = (id: string | null, name?: string) =>
    id === row.authorId
      ? access.canSeeIdentity
        ? row.author.displayName
        : "Sinh viên ẩn danh"
      : (name ?? "Hệ thống");
  return {
    ...listItem(access),
    body: row.isHidden ? "Nội dung đã được ẩn." : row.body,
    identityLevel: row.identityLevel,
    author: access.canSeeIdentity ? row.author : null,
    isAuthor: access.isAuthor,
    canAttach:
      access.isAuthor &&
      !row.section.semester.lockedAt &&
      !row.isLocked &&
      ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(row.status),
    allowedActions: actions,
    forwardTargets: actions.includes("forward")
      ? await forwardingTargets(tx, access)
      : [],
    examNotice:
      row.category === "THI_KET_THUC_HOC_PHAN"
        ? (await readFeedbackSettings(tx)).examNotice
        : null,
    attachments: row.attachments.map((item) => ({
      id: item.id,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      createdAt: item.createdAt.toISOString(),
      displayName: safeAttachmentName(item.mimeType),
      downloadUrl: `/api/feedback/${row.id}/attachments/${item.id}`,
    })),
    messages: row.messages.map((item) => ({
      id: item.id,
      body: item.isHidden ? "Nội dung đã được ẩn." : item.body,
      authorLabel: label(item.authorId, item.author.displayName),
      isOwn: item.authorId === access.actor.userId,
      createdAt: item.createdAt.toISOString(),
    })),
    history: row.history.map((item) => ({
      id: item.id,
      event: item.event,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      actorLabel: label(item.actorId, item.actor?.displayName),
      reason: item.reason,
      occurredAt: item.occurredAt.toISOString(),
    })),
  };
}
function inspectionScope(actor: AuthActor): Prisma.CourseSectionWhereInput {
  const grants = actorGrants(actor);
  return {
    teaching: { none: { teacherId: actor.userId } },
    course: {
      departmentId: {
        notIn: grants
          .filter((grant) => grant.role === "TRUONG_BO_MON")
          .map((grant) => grant.departmentId!),
      },
      department: {
        facultyId: {
          notIn: grants
            .filter((grant) => grant.role === "TRUONG_KHOA")
            .map((grant) => grant.facultyId!),
        },
      },
    },
  };
}
function queueWhere(actor: AuthActor): Prisma.FeedbackWhereInput {
  const OR: Prisma.FeedbackWhereInput[] = [];
  for (const grant of actorGrants(actor)) {
    const recipient = {
      recipients: {
        some: {
          userId: actor.userId,
          isActive: true,
          OR: [{ accessRole: grant.role }, { accessRole: null }],
        },
      },
      category: { not: "KHIEU_NAI_NGHIEM_TRONG" as const },
    };
    if (grant.role === "GIANG_VIEN")
      OR.push({
        ...recipient,
        section: { teaching: { some: { teacherId: actor.userId } } },
      });
    if (grant.role === "TRUONG_BO_MON")
      OR.push({
        ...recipient,
        section: { course: { departmentId: grant.departmentId! } },
      });
    if (grant.role === "TRUONG_KHOA")
      OR.push({
        ...recipient,
        section: { course: { department: { facultyId: grant.facultyId! } } },
      });
    if (["CAN_BO_DBCL", "PHONG_DAO_TAO", "PHONG_KHAO_THI"].includes(grant.role))
      OR.push(recipient);
    if (grant.role === "THANH_TRA" && can(actor, "inspection:read"))
      OR.push({
        category: "KHIEU_NAI_NGHIEM_TRONG",
        inspectionCase: { isNot: null },
        section: inspectionScope(actor),
      });
  }
  return OR.length ? { OR } : { id: { in: [] } };
}
async function auditCaseRead(
  tx: Prisma.TransactionClient,
  access: FeedbackAccess,
): Promise<void> {
  if (!access.inspectionId || access.isAuthor) return;
  await tx.auditLog.create({
    data: {
      actorId: access.actor.userId,
      action: "INSPECTION_CASE_VIEWED",
      objectType: "InspectionCase",
      objectId: access.inspectionId,
      redactedSummary: { identityVisible: access.canSeeIdentity },
    },
  });
}

export async function getFeedbackOptions(
  actor: AuthActor,
): Promise<FeedbackOptions> {
  return transaction(actor, "feedback:create", async (tx, fresh) => {
    const window = await feedbackWindow(tx);
    const sections = await tx.courseSection.findMany({
      where: {
        semesterId: { in: window },
        enrollments: {
          some: { studentId: fresh.userId, registeredAt: { lte: new Date() } },
        },
      },
      include: sectionInclude,
      orderBy: [
        { semester: { startsOn: "desc" } },
        { code: "asc" },
        { id: "asc" },
      ],
    });
    return {
      sections: sections.map(sectionDto),
      categories: feedbackCategories,
      severities: feedbackSeverities,
      violations: inspectionViolations,
      identityLevels: feedbackIdentityLevels,
      examNotice: (await readFeedbackSettings(tx)).examNotice,
    };
  });
}
export async function listFeedback(
  actor: AuthActor,
  input: unknown = {},
): Promise<FeedbackList> {
  requireCan(actor, "feedback:list");
  const data = parseInput(feedbackListSchema, input);
  return transaction(
    actor,
    data.view === "mine" ? "feedback:create" : "feedback:process",
    async (tx, fresh) => {
      const where: Prisma.FeedbackWhereInput = {
        AND: [
          data.view === "mine" ? { authorId: fresh.userId } : queueWhere(fresh),
          ...(data.status ? [{ status: data.status }] : []),
          ...(data.category ? [{ category: data.category }] : []),
        ],
      };
      const [rows, total] = await Promise.all([
        tx.feedback.findMany({
          where,
          include: feedbackInclude,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
        }),
        tx.feedback.count({ where }),
      ]);
      const items = rows.map((row) => {
        const isAuthor = ownFeedback(fresh, row);
        const canSeeIdentity = isAuthor || (!serious(row) && !row.isAnonymous);
        return listItem({
          actor: fresh,
          feedback: row,
          isAuthor,
          canSeeIdentity,
          inspectionId: row.inspectionCase?.id ?? null,
        });
      });
      if (data.view === "queue" && rows.some(serious))
        await tx.auditLog.create({
          data: {
            actorId: fresh.userId,
            action: "INSPECTION_QUEUE_VIEWED",
            objectType: "InspectionCase",
            redactedSummary: { itemCount: rows.filter(serious).length },
          },
        });
      return { items, total, page: data.page, pageSize: data.pageSize };
    },
  );
}
export async function getFeedback(
  actor: AuthActor,
  id: string,
): Promise<FeedbackDetail> {
  return transaction(actor, "feedback:read", async (tx, fresh) => {
    const access = await requireFeedbackResource(tx, fresh, id);
    return detailDto(tx, access);
  });
}

function addBusinessDays(from: Date, count: number): Date {
  const result = new Date(from);
  while (count > 0) {
    result.setTime(result.getTime() + 86400000);
    if (![0, 6].includes(new Date(result.getTime() + 7 * 3600000).getUTCDay()))
      count--;
  }
  return result;
}
export async function createFeedback(
  actor: AuthActor,
  input: unknown,
): Promise<FeedbackDetail> {
  requireCan(actor, "feedback:create");
  const data = parseInput(createFeedbackSchema, input);
  const hash = requestHash(data);
  return transaction(actor, "feedback:create", async (tx, fresh) => {
    const previous = await tx.feedback.findUnique({
      where: {
        authorId_requestId: {
          authorId: fresh.userId,
          requestId: data.requestId,
        },
      },
      select: { id: true, requestHash: true },
    });
    if (previous) {
      if (previous.requestHash !== hash)
        throw new AuthError(
          "Mã yêu cầu đã được dùng cho nội dung khác.",
          409,
          "REQUEST_CONFLICT",
        );
      return detailDto(
        tx,
        await requireFeedbackResource(tx, fresh, previous.id),
      );
    }
    const section = await tx.courseSection.findUnique({
      where: { id: data.sectionId },
      include: sectionInclude,
    });
    const enrollment = await tx.enrollment.findUnique({
      where: {
        sectionId_studentId: {
          sectionId: data.sectionId,
          studentId: fresh.userId,
        },
      },
      select: { registeredAt: true },
    });
    if (
      !section ||
      !enrollment ||
      enrollment.registeredAt > new Date() ||
      !(await feedbackWindow(tx)).includes(section.semesterId)
    )
      throw new AuthError(
        "Sinh viên chỉ gửi phản hồi cho lớp đã đăng ký trong học kỳ được phép.",
        403,
        "FEEDBACK_INELIGIBLE",
      );
    if (section.semester.lockedAt) locked();
    const isSerious = data.category === "KHIEU_NAI_NGHIEM_TRONG";
    if (isSerious) {
      const day = new Date(
        `${new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)}T00:00:00+07:00`,
      );
      if (
        (await tx.feedback.count({
          where: {
            authorId: fresh.userId,
            createdAt: { gte: day, lt: new Date(day.getTime() + 86400000) },
          },
        })) >= 5
      )
        throw new AuthError(
          "Đã đạt giới hạn gửi phản hồi trong ngày. Vui lòng thử lại vào ngày tiếp theo.",
          429,
          "FEEDBACK_DAILY_LIMIT",
        );
    }
    const recipients = await recipientsFor(
      tx,
      section,
      data.category,
      data.severity,
      fresh.userId,
    );
    if (!recipients.some((recipient) => recipient.isPrimary))
      throw new AuthError(
        "Chưa có người xử lý phù hợp. Liên hệ đơn vị quản lý để bổ sung phân công.",
        409,
        "FEEDBACK_ROUTING_UNAVAILABLE",
      );
    const now = new Date();
    const id = randomUUID();
    await tx.feedback.create({
      data: {
        id,
        sectionId: section.id,
        authorId: fresh.userId,
        category: data.category,
        severity: data.severity,
        title: data.title,
        body: data.body,
        isAnonymous: isSerious ? true : data.isAnonymous,
        identityLevel: isSerious
          ? (data.identityLevel ?? "AN_DANH_HOAN_TOAN")
          : null,
        status: "MOI",
        revision: 1,
        requestId: data.requestId,
        requestHash: hash,
        acceptDueAt: addBusinessDays(now, isSerious ? 3 : 2),
        replyDueAt: addBusinessDays(
          now,
          isSerious
            ? 30
            : ["THI_KET_THUC_HOC_PHAN", "TO_CHUC_LOP_HOC"].includes(
                  data.category,
                ) || data.severity === "KHIEU_NAI"
              ? 5
              : 7,
        ),
        recipients: {
          create: recipients.map((recipient) => ({
            userId: recipient.id,
            isPrimary: recipient.isPrimary,
            accessRole: recipient.role,
          })),
        },
        history: {
          create: {
            actorId: fresh.userId,
            event: "GUI",
            fromStatus: "MOI",
            toStatus: "MOI",
          },
        },
      },
    });
    if (isSerious)
      await tx.inspectionCase.create({
        data: {
          feedbackId: id,
          sectionId: section.id,
          source: "PHAN_HOI_NGHIEM_TRONG",
          violation: data.violation!,
          status: "TIEP_NHAN",
          createdById: fresh.userId,
          acceptDueAt: addBusinessDays(now, 3),
          completeDueAt: addBusinessDays(now, 30),
          events: {
            create: {
              actorId: fresh.userId,
              event: "CREATED",
              fromStatus: null,
              toStatus: "TIEP_NHAN",
            },
          },
        },
      });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "FEEDBACK_CREATED",
        objectType: "Feedback",
        objectId: id,
        redactedSummary: {
          category: data.category,
          anonymous: isSerious || data.isAnonymous,
          recipientCount: recipients.length,
        },
      },
    });
    return detailDto(tx, await requireFeedbackResource(tx, fresh, id));
  });
}
async function mutationAlreadyDone(
  tx: Prisma.TransactionClient,
  fresh: AuthActor,
  id: string,
  requestId: string,
  hash: string,
): Promise<boolean> {
  const previous = await tx.feedbackHistory.findUnique({
    where: { feedbackId_requestId: { feedbackId: id, requestId } },
    select: { actorId: true, requestHash: true },
  });
  if (!previous) return false;
  if (previous.actorId !== fresh.userId || previous.requestHash !== hash)
    throw new AuthError(
      "Mã yêu cầu đã được dùng cho thao tác khác.",
      409,
      "REQUEST_CONFLICT",
    );
  return true;
}
function assertWritable(access: FeedbackAccess): void {
  if (access.feedback.section.semester.lockedAt) locked();
  if (access.feedback.isLocked)
    throw new AuthError(
      "Nội dung đã khóa và chỉ được đọc.",
      409,
      "FEEDBACK_LOCKED",
    );
}
export async function addFeedbackMessage(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<FeedbackDetail> {
  requireCan(actor, "feedback:read");
  const data = parseInput(feedbackMessageSchema, input);
  const feedbackId = parseInput(objectId, id);
  const hash = requestHash({ action: "message", data });
  return transaction(actor, "feedback:read", async (tx, fresh) => {
    await lockFeedback(tx, feedbackId);
    const access = await requireFeedbackResource(tx, fresh, feedbackId);
    if (await mutationAlreadyDone(tx, fresh, feedbackId, data.requestId, hash))
      return detailDto(tx, access);
    assertWritable(access);
    const row = access.feedback;
    if (row.revision !== data.revision) conflict();
    if (!allowedActions(access).includes("message"))
      throw new AuthError(
        "Không thể trao đổi ở trạng thái hiện tại.",
        403,
        "FEEDBACK_ACTION_FORBIDDEN",
      );
    const changed = await tx.feedback.updateMany({
      where: { id: feedbackId, revision: data.revision, status: row.status },
      data: { revision: { increment: 1 } },
    });
    if (changed.count !== 1) conflict();
    await tx.feedbackMessage.create({
      data: {
        feedbackId,
        authorId: fresh.userId,
        body: data.body,
        requestId: data.requestId,
      },
    });
    await tx.feedbackHistory.create({
      data: {
        feedbackId,
        actorId: fresh.userId,
        event: "TRAO_DOI",
        fromStatus: row.status,
        toStatus: row.status,
        requestId: data.requestId,
        requestHash: hash,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "FEEDBACK_MESSAGE_SENT",
        objectType: "Feedback",
        objectId: feedbackId,
      },
    });
    return detailDto(tx, await requireFeedbackResource(tx, fresh, feedbackId));
  });
}
export async function transitionFeedback(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<
  | FeedbackDetail
  | { id: string; status: "MOI"; revision: number; forwarded: true }
> {
  requireCan(actor, "feedback:read");
  const data = parseInput(feedbackTransitionSchema, input);
  const feedbackId = parseInput(objectId, id);
  const hash = requestHash(data);
  return transaction(actor, "feedback:read", async (tx, fresh) => {
    await lockFeedback(tx, feedbackId);
    // Sau chuyển, người cũ chỉ được nhận lại biên nhận của chính lệnh đã lưu.
    if (data.action === "forward") {
      const previous = await tx.feedbackHistory.findUnique({
        where: {
          feedbackId_requestId: { feedbackId, requestId: data.requestId },
        },
        select: { actorId: true, event: true, requestHash: true },
      });
      if (
        previous?.actorId === fresh.userId &&
        previous.event === "CHUYEN_TIEP"
      ) {
        if (previous.requestHash !== hash)
          throw new AuthError(
            "Mã yêu cầu đã được dùng cho thao tác khác.",
            409,
            "REQUEST_CONFLICT",
          );
        return {
          id: feedbackId,
          status: "MOI" as const,
          revision: data.revision + 1,
          forwarded: true as const,
        };
      }
    }
    const access = await requireFeedbackResource(tx, fresh, feedbackId);
    if (await mutationAlreadyDone(tx, fresh, feedbackId, data.requestId, hash))
      return detailDto(tx, access);
    assertWritable(access);
    const row = access.feedback;
    if (row.revision !== data.revision) conflict();
    const mayAct =
      !serious(row) &&
      (data.action === "close"
        ? access.isAuthor
        : !access.isAuthor &&
          normalRecipient(fresh, row, true) &&
          ((row.status === "MOI" && !row.assigneeId) ||
            row.assigneeId === fresh.userId));
    if (!mayAct)
      throw new AuthError(
        "Không có quyền xử lý phản hồi này.",
        403,
        "FEEDBACK_ACTION_FORBIDDEN",
      );
    const status = feedbackTransitionTarget(
      row.status,
      data.action,
      access.isAuthor,
      normalRecipient(fresh, row, true),
      row.assigneeId === fresh.userId,
    ) as FeedbackStatus | null;
    if (!status)
      throw new AuthError(
        "Không thể chuyển trạng thái này.",
        409,
        "FEEDBACK_TRANSITION_INVALID",
      );
    let assigneeId = row.assigneeId;
    if (data.action === "accept" || (data.action === "reject" && !assigneeId))
      assigneeId = fresh.userId;
    if (data.action === "forward") {
      const targets = await forwardingTargets(tx, access);
      if (!targets.some((target) => target.id === data.targetUserId))
        throw new AuthError(
          "Người nhận chuyển tiếp không thuộc phạm vi phù hợp.",
          400,
          "FEEDBACK_TARGET_INVALID",
        );
      const target = await tx.user.findUnique({
        where: { id: data.targetUserId! },
        select: { id: true, roles: true },
      });
      const identity = target ? candidateActor(target) : null;
      const grant =
        identity &&
        actorGrants(identity).find((grant) =>
          contextGrant(grant, identity, row.section),
        );
      if (!grant)
        throw new AuthError(
          "Người nhận chuyển tiếp không còn phù hợp.",
          409,
          "FEEDBACK_TARGET_INVALID",
        );
      await tx.feedbackRecipient.updateMany({
        where: { feedbackId },
        data: { isPrimary: false, isActive: false },
      });
      await tx.feedbackRecipient.upsert({
        where: { feedbackId_userId: { feedbackId, userId: target!.id } },
        create: {
          feedbackId,
          userId: target!.id,
          accessRole: grant.role,
          isPrimary: true,
          isActive: true,
        },
        update: { accessRole: grant.role, isPrimary: true, isActive: true },
      });
      assigneeId = target!.id;
    }
    const changed = await tx.feedback.updateMany({
      where: { id: feedbackId, revision: data.revision, status: row.status },
      data: {
        status,
        assigneeId,
        revision: { increment: 1 },
        ...(data.action === "answer" ? { answeredAt: new Date() } : {}),
        ...(data.action === "close" ? { closedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) conflict();
    if (data.action === "answer")
      await tx.feedbackMessage.create({
        data: {
          feedbackId,
          authorId: fresh.userId,
          body: data.body!,
          requestId: data.requestId,
        },
      });
    const events = {
      accept: "TIEP_NHAN",
      start: "BAT_DAU_XU_LY",
      answer: "TRA_LOI",
      close: "DONG",
      reject: "TU_CHOI",
      forward: "CHUYEN_TIEP",
    } as const;
    await tx.feedbackHistory.create({
      data: {
        feedbackId,
        actorId: fresh.userId,
        event: events[data.action],
        fromStatus: row.status,
        toStatus: status,
        fromAssigneeId: row.assigneeId,
        toAssigneeId: assigneeId,
        reason: data.reason ?? null,
        requestId: data.requestId,
        requestHash: hash,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: `FEEDBACK_${events[data.action]}`,
        objectType: "Feedback",
        objectId: feedbackId,
        redactedSummary: {
          fromStatus: row.status,
          toStatus: status,
          revision: data.revision + 1,
        },
      },
    });
    if (data.action === "forward")
      return {
        id: feedbackId,
        status: "MOI" as const,
        revision: data.revision + 1,
        forwarded: true as const,
      };
    return detailDto(tx, await requireFeedbackResource(tx, fresh, feedbackId));
  });
}

const caseInclude = {
  section: { include: sectionInclude },
  assignee: { select: { id: true, displayName: true } },
  feedback: { include: feedbackInclude },
  events: {
    include: { actor: { select: { displayName: true } } },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.InspectionCaseInclude;
type CaseRow = Prisma.InspectionCaseGetPayload<{ include: typeof caseInclude }>;
function caseItem(actor: AuthActor, row: CaseRow): InspectionCaseItem {
  const full = isInspectionOfficer(actor, sectionContext(row.section));
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
    ...(full
      ? {
          title: row.feedback?.title ?? "Hồ sơ khiếu nại",
          assignee: row.assignee,
        }
      : {}),
  };
}
async function readCase(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
): Promise<CaseRow> {
  requireCan(actor, "inspection:read");
  const row = await tx.inspectionCase.findUnique({
    where: { id },
    include: caseInclude,
  });
  if (!row || !canReadInspection(actor, sectionContext(row.section)))
    notFound();
  return row;
}
async function inspectionTargets(
  tx: Prisma.TransactionClient,
  section: SectionRow,
): Promise<FeedbackTarget[]> {
  return (
    await recipientsFor(tx, section, "KHIEU_NAI_NGHIEM_TRONG", "KHIEU_NAI")
  ).map((target) => ({
    id: target.id,
    displayName: target.displayName,
    roleLabel: "Thanh tra",
  }));
}
async function caseDetail(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  row: CaseRow,
): Promise<InspectionCaseDetail> {
  const item = caseItem(actor, row);
  if (item.level === "summary")
    return { ...item, canAssign: false, assignTargets: [] };
  const canAssign =
    can(actor, "inspection:assign") &&
    !row.section.semester.lockedAt &&
    row.status === "TIEP_NHAN";
  const access = row.feedback
    ? await requireFeedbackResource(tx, actor, row.feedback.id)
    : null;
  return {
    ...item,
    canAssign,
    assignTargets: canAssign ? await inspectionTargets(tx, row.section) : [],
    ...(access ? { feedback: await detailDto(tx, access) } : {}),
    events: row.events.map((event) => ({
      id: event.id,
      actorLabel:
        access &&
        event.actorId === access.feedback.authorId &&
        !access.canSeeIdentity
          ? "Sinh viên ẩn danh"
          : event.actor.displayName,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
export async function listInspectionCases(
  actor: AuthActor,
  input: unknown = {},
): Promise<InspectionCaseList> {
  requireCan(actor, "inspection:list");
  const data = parseInput(inspectionListSchema, input);
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
      items: rows.map((row) => caseItem(fresh, row)),
      total,
      page: data.page,
      pageSize: data.pageSize,
    };
  });
}
export async function getInspectionCase(
  actor: AuthActor,
  id: string,
): Promise<InspectionCaseDetail> {
  requireCan(actor, "inspection:read");
  const caseId = parseInput(objectId, id);
  return transaction(actor, "inspection:read", async (tx, fresh) => {
    const row = await readCase(tx, fresh, caseId);
    const full = isInspectionOfficer(fresh, sectionContext(row.section));
    if (!full || !row.feedback)
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "INSPECTION_CASE_VIEWED",
          objectType: "InspectionCase",
          objectId: row.id,
          redactedSummary: { summaryOnly: !full, identityVisible: false },
        },
      });
    return caseDetail(tx, fresh, row);
  });
}
export async function assignInspectionCase(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<InspectionCaseDetail> {
  requireCan(actor, "inspection:assign");
  const caseId = parseInput(objectId, id);
  const data = parseInput(inspectionAssignmentSchema, input);
  const hash = requestHash(data);
  return transaction(actor, "inspection:assign", async (tx, fresh) => {
    await tx.$queryRaw`SELECT id FROM InspectionCase WHERE id = ${caseId} FOR UPDATE`;
    const row = await readCase(tx, fresh, caseId);
    if (!isInspectionOfficer(fresh, sectionContext(row.section))) notFound();
    const previous = await tx.inspectionCaseEvent.findUnique({
      where: { caseId_requestId: { caseId, requestId: data.requestId } },
      select: { actorId: true, requestHash: true },
    });
    if (previous) {
      if (previous.actorId !== fresh.userId || previous.requestHash !== hash)
        throw new AuthError(
          "Mã yêu cầu đã được dùng cho thao tác khác.",
          409,
          "REQUEST_CONFLICT",
        );
      return caseDetail(tx, fresh, row);
    }
    if (row.section.semester.lockedAt) locked();
    if (row.status !== "TIEP_NHAN")
      throw new AuthError(
        "Tuần này chỉ cho phép phân công hồ sơ đang tiếp nhận.",
        409,
        "INSPECTION_TRANSITION_UNAVAILABLE",
      );
    if (row.revision !== data.revision) conflict();
    const targets = await inspectionTargets(tx, row.section);
    if (!targets.some((target) => target.id === data.assigneeId))
      throw new AuthError(
        "Người được phân công không đủ quyền hoặc có xung đột lợi ích.",
        400,
        "INSPECTION_ASSIGNEE_INVALID",
      );
    const changed = await tx.inspectionCase.updateMany({
      where: { id: caseId, revision: data.revision, status: "TIEP_NHAN" },
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
        fromStatus: "TIEP_NHAN",
        toStatus: "TIEP_NHAN",
        event: "ASSIGNED",
        reason: data.reason,
        requestId: data.requestId,
        requestHash: hash,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "INSPECTION_CASE_ASSIGNED",
        objectType: "InspectionCase",
        objectId: caseId,
        redactedSummary: { revision: data.revision + 1 },
      },
    });
    return caseDetail(tx, fresh, await readCase(tx, fresh, caseId));
  });
}
