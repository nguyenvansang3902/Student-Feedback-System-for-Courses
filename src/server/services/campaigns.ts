import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan, type PolicyAction } from "../policies/can";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  pageInput,
  parseInput,
} from "./access";
import {
  campaignActionSchema,
  campaignInputSchema,
  campaignListSchema,
  campaignOptionSchema,
  campaignUpdateSchema,
  CAMPAIGN_LIMITS,
  requireCampaignReason,
  type ValidatedCampaignInput,
} from "./campaign-input";
import {
  advanceCampaignState,
  advanceDueCampaignsInTransaction,
} from "./campaign-lifecycle";
import { enqueueCampaignNotice } from "./campaign-notifications";
import {
  assertReadinessConfirmable,
  readCampaignReadiness,
} from "./campaign-readiness";
import { readSurveySettings } from "./survey-settings";
import { parseTemplateInput, templateInputSchema } from "./template-input";
import {
  campaignActions,
  type CampaignAction,
  type CampaignConfirmation,
  type CampaignDetail,
  type CampaignListInput,
  type CampaignOption,
  type CampaignOptionInput,
  type CampaignProgress,
  type CampaignReadinessIssue,
  type CampaignSummary,
} from "./campaign-types";
export type * from "./campaign-types";
export { campaignActions } from "./campaign-types";
export { ensureCampaignState, ensureDueCampaigns } from "./campaign-lifecycle";

const preOpenStatuses = [
  "NHAP",
  "CHO_XAC_NHAN_DL",
  "CHO_DUYET",
  "DA_DUYET",
] as const;
const summaryInclude = {
  semester: { select: { code: true, name: true, lockedAt: true } },
  template: { select: { name: true, version: true } },
  _count: { select: { sections: true } },
  faculty: { select: { name: true } },
  department: { select: { name: true } },
} as const satisfies Prisma.SurveyCampaignInclude;
const detailInclude = {
  ...summaryInclude,
  sections: {
    orderBy: { sectionId: "asc" },
    select: {
      sectionId: true,
      section: { select: { code: true, course: { select: { name: true } } } },
    },
  },
  history: {
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: CAMPAIGN_LIMITS.history,
    include: { actor: { select: { displayName: true } } },
  },
  dataConfirmations: {
    orderBy: { campaignRevision: "desc" },
    take: 1,
    include: { confirmedBy: { select: { displayName: true } } },
  },
} as const satisfies Prisma.SurveyCampaignInclude;
type SummaryRow = Prisma.SurveyCampaignGetPayload<{
  include: typeof summaryInclude;
}>;
type DetailRow = Prisma.SurveyCampaignGetPayload<{
  include: typeof detailInclude;
}>;
function notFound(): never {
  throw new AuthError(
    "Không tìm thấy đợt khảo sát.",
    404,
    "CAMPAIGN_NOT_FOUND",
  );
}
function conflict(): never {
  throw new AuthError(
    "Đợt khảo sát đã thay đổi. Hãy tải lại trước khi tiếp tục.",
    409,
    "CAMPAIGN_REVISION_CONFLICT",
  );
}
function invalidState(): never {
  throw new AuthError(
    "Thao tác không phù hợp với trạng thái hiện tại của đợt khảo sát.",
    409,
    "CAMPAIGN_INVALID_STATE",
  );
}
function requireOpenSemester(lockedAt: Date | null) {
  if (lockedAt)
    throw new AuthError(
      "Học kỳ đã khóa sổ. Dữ liệu chỉ được đọc.",
      409,
      "SEMESTER_LOCKED",
    );
}
function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function futureEnd(endsAt: Date, now: Date) {
  if (endsAt <= now)
    throw new AuthError(
      "Thời điểm kết thúc đợt phải còn ở tương lai.",
      400,
      "CAMPAIGN_TIME_EXPIRED",
    );
}

function summary(
  row: SummaryRow,
  sectionCount = row._count.sections,
): CampaignSummary {
  return {
    id: row.id,
    title: row.title,
    revision: row.revision,
    status: row.status,
    scope: row.scope,
    semesterId: row.semesterId,
    semesterCode: row.semester.code,
    semesterName: row.semester.name,
    semesterLocked: !!row.semester.lockedAt,
    templateId: row.templateId,
    templateName: row.template.name,
    templateVersion: row.template.version,
    facultyId: row.facultyId,
    departmentId: row.departmentId,
    facultyName: row.faculty?.name ?? null,
    departmentName: row.department?.name ?? null,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    minResponses: row.minResponses,
    minRate: Number(row.minRate),
    warningScore: Number(row.warningScore),
    explanationDays: row.explanationDays,
    mandatory: row.mandatory,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    openedAt: row.openedAt?.toISOString() ?? null,
    openedSnapshotHash: row.openedSnapshotHash,
    dataDriftDetected: row.dataDriftDetected,
    sectionCount,
  };
}
function confirmation(
  row: DetailRow["dataConfirmations"][number],
): CampaignConfirmation {
  return {
    id: row.id,
    status: row.status,
    occurredAt: row.occurredAt.toISOString(),
    campaignRevision: row.campaignRevision,
    snapshotHash: row.snapshotHash,
    sectionCount: row.sectionCount,
    pairCount: row.pairCount,
    warnings: Array.isArray(row.warnings)
      ? (row.warnings as unknown as CampaignReadinessIssue[])
      : [],
    reason: row.reason,
    confirmedByName: row.confirmedBy.displayName,
  };
}
async function countsForSummaries(
  tx: Prisma.TransactionClient,
  rows: SummaryRow[],
): Promise<Map<string, number>> {
  const dynamic = rows.filter(
    (row) =>
      preOpenStatuses.includes(
        row.status as (typeof preOpenStatuses)[number],
      ) && row.scope !== "SECTIONS",
  );
  const counts = new Map(rows.map((row) => [row.id, row._count.sections]));
  if (!dynamic.length) return counts;
  const sections = await tx.courseSection.findMany({
    where: {
      semesterId: { in: [...new Set(dynamic.map((row) => row.semesterId))] },
    },
    select: {
      semesterId: true,
      course: {
        select: {
          departmentId: true,
          department: { select: { facultyId: true } },
        },
      },
    },
  });
  for (const row of dynamic)
    counts.set(
      row.id,
      sections.filter(
        (section) =>
          section.semesterId === row.semesterId &&
          (row.scope === "GLOBAL" ||
            (row.scope === "FACULTY" &&
              section.course.department.facultyId === row.facultyId) ||
            (row.scope === "DEPARTMENT" &&
              section.course.departmentId === row.departmentId)),
      ).length,
    );
  return counts;
}
async function detail(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<CampaignDetail> {
  const row = await tx.surveyCampaign.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!row) notFound();
  const counts = await countsForSummaries(tx, [row]);
  return {
    ...summary(row, counts.get(id)),
    sectionIds: row.sections.map((section) => section.sectionId),
    selectedSections:
      row.scope === "SECTIONS"
        ? row.sections.map((section) => ({
            id: section.sectionId,
            code: section.section.code,
            name: section.section.course.name,
          }))
        : [],
    history: [...row.history].reverse().map((history) => ({
      id: history.id,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      action: history.action,
      reason: history.reason,
      occurredAt: history.occurredAt.toISOString(),
      campaignRevision: history.campaignRevision,
      actorName: history.actor?.displayName ?? null,
    })),
    latestConfirmation: row.dataConfirmations[0]
      ? confirmation(row.dataConfirmations[0])
      : null,
  };
}
async function authorized<T>(
  actor: AuthActor,
  action: PolicyAction,
  callback: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
  ensureId?: string,
): Promise<T> {
  requireCan(actor, action);
  // Advancing time commits independently: an invalid/stale user command cannot
  // roll back an opening/closing that was already due on the first access.
  if (ensureId)
    await getDb().$transaction(
      async (tx) => {
        await lockAdminMutations(tx);
        const fresh = await assertFreshActor(tx, actor);
        requireCan(fresh, action);
        await advanceCampaignState(tx, ensureId);
      },
      { maxWait: 15000, timeout: 30000 },
    );
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, action);
      return callback(tx, fresh);
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
async function readRow(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.surveyCampaign.findUnique({
    where: { id },
    include: { semester: { select: { lockedAt: true } } },
  });
  if (!row) notFound();
  return row;
}
async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  id: string,
  data: Prisma.InputJsonObject,
) {
  await tx.auditLog.create({
    data: {
      actorId,
      action,
      objectType: "SurveyCampaign",
      objectId: id,
      redactedSummary: { success: true, ...data },
    },
  });
}
async function validateReferences(
  tx: Prisma.TransactionClient,
  input: ValidatedCampaignInput,
) {
  const semester = await tx.semester.findUnique({
    where: { id: input.semesterId },
    select: { lockedAt: true },
  });
  if (!semester)
    throw new AuthError("Học kỳ không tồn tại.", 400, "INVALID_SEMESTER");
  requireOpenSemester(semester.lockedAt);
  if (
    !(await tx.surveyTemplate.findUnique({
      where: { id: input.templateId },
      select: { id: true },
    }))
  )
    throw new AuthError("Mẫu phiếu không tồn tại.", 400, "INVALID_TEMPLATE");
  if (
    input.scope === "FACULTY" &&
    !(await tx.faculty.findFirst({
      where: { id: input.facultyId!, isActive: true },
      select: { id: true },
    }))
  )
    throw new AuthError(
      "Khoa không tồn tại hoặc đã ngừng hoạt động.",
      400,
      "INVALID_SCOPE",
    );
  if (
    input.scope === "DEPARTMENT" &&
    !(await tx.department.findFirst({
      where: {
        id: input.departmentId!,
        isActive: true,
        faculty: { isActive: true },
      },
      select: { id: true },
    }))
  )
    throw new AuthError(
      "Bộ môn không tồn tại hoặc đã ngừng hoạt động.",
      400,
      "INVALID_SCOPE",
    );
  if (input.scope === "SECTIONS") {
    const count = await tx.courseSection.count({
      where: { id: { in: input.sectionIds }, semesterId: input.semesterId },
    });
    if (count !== input.sectionIds.length)
      throw new AuthError(
        "Danh sách lớp có dữ liệu không tồn tại hoặc khác học kỳ.",
        400,
        "INVALID_SCOPE",
      );
  }
  futureEnd(new Date(input.endsAt), new Date());
}
function data(input: ValidatedCampaignInput) {
  return {
    title: input.title,
    semesterId: input.semesterId,
    templateId: input.templateId,
    scope: input.scope,
    facultyId: input.scope === "FACULTY" ? input.facultyId! : null,
    departmentId: input.scope === "DEPARTMENT" ? input.departmentId! : null,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    minResponses: input.minResponses,
    minRate: input.minRate,
    warningScore: input.warningScore,
    explanationDays: input.explanationDays,
    mandatory: input.mandatory,
  };
}
function inputObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new AuthError("Dữ liệu không hợp lệ.", 400, "INVALID_INPUT");
  return input as Record<string, unknown>;
}
async function parsedInput(tx: Prisma.TransactionClient, input: unknown) {
  const defaults = await readSurveySettings(tx);
  return parseInput(campaignInputSchema, {
    minResponses: defaults.minResponses,
    minRate: defaults.minRate,
    warningScore: defaults.warningScore,
    explanationDays: defaults.explanationDays,
    ...inputObject(input),
  });
}

export async function listCampaigns(
  actor: AuthActor,
  input: CampaignListInput = {},
) {
  requireCan(actor, "campaigns:list");
  const query = parseInput(campaignListSchema, input);
  return authorized(actor, "campaigns:list", async (tx) => {
    await advanceDueCampaignsInTransaction(tx);
    const where: Prisma.SurveyCampaignWhereInput = {
      ...(query.search ? { title: { contains: query.search } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    };
    const [rows, total] = await Promise.all([
      tx.surveyCampaign.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.surveyCampaign.count({ where }),
    ]);
    const counts = await countsForSummaries(tx, rows);
    return {
      items: rows.map((row) => summary(row, counts.get(row.id))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  });
}
export async function getCampaign(
  actor: AuthActor,
  id: string,
): Promise<CampaignDetail> {
  requireCan(actor, "campaigns:read");
  const key = parseInput(objectId, id);
  return authorized(actor, "campaigns:read", (tx) => detail(tx, key), key);
}
export async function getCampaignReadiness(actor: AuthActor, id: string) {
  requireCan(actor, "campaigns:read");
  const key = parseInput(objectId, id);
  return authorized(
    actor,
    "campaigns:read",
    async (tx) =>
      (await readCampaignReadiness(tx, await readRow(tx, key))).readiness,
    key,
  );
}
export async function getCampaignOptions(
  actor: AuthActor,
  input: CampaignOptionInput,
) {
  requireCan(actor, "campaigns:read");
  const query = parseInput(campaignOptionSchema, input);
  return authorized(actor, "campaigns:read", async (tx) => {
    const paging = {
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    };
    let items: CampaignOption[] = [],
      total = 0;
    const search = query.search;
    if (query.kind === "semesters") {
      const where: Prisma.SemesterWhereInput = search
        ? {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : {};
      const [rows, count] = await Promise.all([
        tx.semester.findMany({
          where,
          ...paging,
          orderBy: { code: "desc" },
          select: { id: true, code: true, name: true },
        }),
        tx.semester.count({ where }),
      ]);
      items = rows;
      total = count;
    } else if (query.kind === "templates") {
      const where: Prisma.SurveyTemplateWhereInput = search
        ? { name: { contains: search } }
        : {};
      const [rows, count] = await Promise.all([
        tx.surveyTemplate.findMany({
          where,
          ...paging,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, name: true, version: true },
        }),
        tx.surveyTemplate.count({ where }),
      ]);
      items = rows.map((row) => ({
        id: row.id,
        name: `${row.name} · phiên bản ${row.version}`,
      }));
      total = count;
    } else if (query.kind === "faculties") {
      const where: Prisma.FacultyWhereInput = {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
              ],
            }
          : {}),
      };
      const [rows, count] = await Promise.all([
        tx.faculty.findMany({
          where,
          ...paging,
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true },
        }),
        tx.faculty.count({ where }),
      ]);
      items = rows;
      total = count;
    } else if (query.kind === "departments") {
      const where: Prisma.DepartmentWhereInput = {
        isActive: true,
        faculty: { isActive: true },
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
              ],
            }
          : {}),
      };
      const [rows, count] = await Promise.all([
        tx.department.findMany({
          where,
          ...paging,
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true },
        }),
        tx.department.count({ where }),
      ]);
      items = rows;
      total = count;
    } else {
      if (!query.semesterId)
        throw new AuthError(
          "Hãy chọn học kỳ trước khi chọn lớp học phần.",
          400,
          "SEMESTER_REQUIRED",
        );
      const where: Prisma.CourseSectionWhereInput = {
        semesterId: query.semesterId,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { course: { name: { contains: search } } },
              ],
            }
          : {}),
      };
      const [rows, count] = await Promise.all([
        tx.courseSection.findMany({
          where,
          ...paging,
          orderBy: { code: "asc" },
          select: { id: true, code: true, course: { select: { name: true } } },
        }),
        tx.courseSection.count({ where }),
      ]);
      items = rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.course.name,
      }));
      total = count;
    }
    return { items, total, page: query.page, pageSize: query.pageSize };
  });
}
export async function createCampaign(
  actor: AuthActor,
  input: unknown,
): Promise<CampaignDetail> {
  return authorized(actor, "campaigns:write", async (tx, fresh) => {
    const parsed = await parsedInput(tx, input);
    await validateReferences(tx, parsed);
    const row = await tx.surveyCampaign.create({
      data: {
        ...data(parsed),
        createdById: fresh.userId,
        status: "NHAP",
        ...(parsed.scope === "SECTIONS"
          ? {
              sections: {
                create: parsed.sectionIds.map((sectionId) => ({ sectionId })),
              },
            }
          : {}),
      },
    });
    await audit(tx, fresh.userId, "CAMPAIGN_CREATED", row.id, {
      revision: row.revision,
      status: row.status,
    });
    return detail(tx, row.id);
  });
}
export async function updateCampaign(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<CampaignDetail> {
  requireCan(actor, "campaigns:write");
  const key = parseInput(objectId, id);
  return authorized(actor, "campaigns:write", async (tx, fresh) => {
    const defaults = await readSurveySettings(tx);
    const parsed = parseInput(campaignUpdateSchema, {
      minResponses: defaults.minResponses,
      minRate: defaults.minRate,
      warningScore: defaults.warningScore,
      explanationDays: defaults.explanationDays,
      ...inputObject(input),
    });
    const { expectedRevision, requestId, ...content } = parsed;
    const requestHash = digest({ action: "UPDATE", ...parsed });
    if (
      requestId &&
      (await replay(tx, key, fresh, "UPDATE", requestId, requestHash))
    )
      return detail(tx, key);
    const previous = await readRow(tx, key);
    if (previous.revision !== expectedRevision) conflict();
    if (previous.status !== "NHAP") invalidState();
    requireOpenSemester(previous.semester.lockedAt);
    await validateReferences(tx, content);
    const changed = await tx.surveyCampaign.updateMany({
      where: { id: key, revision: expectedRevision, status: "NHAP" },
      data: {
        ...data(content),
        approvedAt: null,
        approvedById: null,
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) conflict();
    await tx.campaignSection.deleteMany({ where: { campaignId: key } });
    if (content.scope === "SECTIONS")
      await tx.campaignSection.createMany({
        data: content.sectionIds.map((sectionId) => ({
          campaignId: key,
          sectionId,
        })),
      });
    if (requestId)
      await tx.campaignHistory.create({
        data: {
          campaignId: key,
          actorId: fresh.userId,
          action: "UPDATE",
          fromStatus: "NHAP",
          toStatus: "NHAP",
          campaignRevision: expectedRevision + 1,
          requestId,
          requestHash,
        },
      });
    await audit(tx, fresh.userId, "CAMPAIGN_UPDATED", key, {
      revision: expectedRevision + 1,
      status: "NHAP",
    });
    return detail(tx, key);
  });
}

async function replay(
  tx: Prisma.TransactionClient,
  id: string,
  actor: AuthActor,
  action: string,
  requestId: string,
  requestHash: string,
): Promise<boolean> {
  const previous = await tx.campaignHistory.findUnique({
    where: { campaignId_requestId: { campaignId: id, requestId } },
  });
  if (!previous) return false;
  if (
    previous.actorId !== actor.userId ||
    previous.action !== action ||
    previous.requestHash !== requestHash
  )
    throw new AuthError(
      "Mã yêu cầu đã được dùng cho một thao tác khác. Hãy tải lại trang.",
      409,
      "CAMPAIGN_REQUEST_CONFLICT",
    );
  return true;
}
const actionPermission: Record<CampaignAction, PolicyAction> = {
  submit: "campaigns:submit",
  confirm: "campaigns:confirm",
  return: "campaigns:confirm",
  approve: "campaigns:approve",
  reject: "campaigns:approve",
  withdraw: "campaigns:operate",
  cancel: "campaigns:operate",
  extend: "campaigns:operate",
  close: "campaigns:operate",
};
async function validateTemplateForApproval(
  tx: Prisma.TransactionClient,
  templateId: string,
  now: Date,
) {
  const template = await tx.surveyTemplate.findUnique({
    where: { id: templateId },
    include: {
      groups: { include: { questions: { include: { options: true } } } },
    },
  });
  if (!template)
    throw new AuthError("Mẫu phiếu không tồn tại.", 400, "INVALID_TEMPLATE");
  parseTemplateInput(templateInputSchema, {
    name: template.name,
    groups: template.groups.map((group) => ({
      title: group.title,
      position: group.position,
      weight: Number(group.weight),
      isAssessmentGroup: group.isAssessmentGroup,
      questions: group.questions.map((question) => ({
        label: question.label,
        type: question.type,
        position: question.position,
        required: question.required,
        allowNA: question.allowNA,
        weight: Number(question.weight),
        ...(question.type === "LIKERT"
          ? {
              scaleMin: question.scaleMin ?? 1,
              scaleMax: question.scaleMax ?? 5,
            }
          : {}),
        options: question.options.map((option) => ({
          label: option.label,
          position: option.position,
        })),
      })),
    })),
  });
  if (template.status !== "DA_KHOA" || !template.lockedAt) {
    const changed = await tx.surveyTemplate.updateMany({
      where: { id: templateId, revision: template.revision },
      data: {
        status: "DA_KHOA",
        lockedAt: template.lockedAt ?? now,
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) conflict();
  }
}
export async function performCampaignAction(
  actor: AuthActor,
  id: string,
  action: CampaignAction,
  input: unknown,
): Promise<CampaignDetail> {
  if (!campaignActions.includes(action))
    throw new AuthError(
      "Thao tác đợt khảo sát không hợp lệ.",
      400,
      "INVALID_ACTION",
    );
  requireCan(actor, actionPermission[action]);
  const key = parseInput(objectId, id),
    parsed = parseInput(campaignActionSchema, input);
  if (action !== "extend" && parsed.endsAt)
    throw new AuthError(
      "Chỉ gia hạn mới được đổi thời điểm kết thúc.",
      400,
      "INVALID_ACTION_INPUT",
    );
  return authorized(
    actor,
    actionPermission[action],
    async (tx, fresh) => {
      const code = action.toUpperCase(),
        requestHash = digest({ action, ...parsed });
      if (await replay(tx, key, fresh, code, parsed.requestId, requestHash))
        return detail(tx, key);
      const previous = await readRow(tx, key),
        now = new Date();
      if (previous.revision !== parsed.expectedRevision) conflict();
      requireOpenSemester(previous.semester.lockedAt);
      let target = previous.status;
      const extra: Prisma.SurveyCampaignUncheckedUpdateManyInput = {};
      let reason = parsed.reason;
      if (action === "submit") {
        if (previous.status !== "NHAP") invalidState();
        futureEnd(previous.endsAt, now);
        await validateTemplateForSubmission(tx, previous.templateId);
        const { readiness } = await readCampaignReadiness(tx, previous, now);
        if (!readiness.sectionCount)
          throw new AuthError(
            "Phạm vi chưa có lớp học phần để trình.",
            409,
            "CAMPAIGN_EMPTY_SCOPE",
          );
        target = "CHO_XAC_NHAN_DL";
      } else if (action === "confirm" || action === "return") {
        if (previous.status !== "CHO_XAC_NHAN_DL") invalidState();
        const { readiness } = await readCampaignReadiness(tx, previous, now);
        if (action === "confirm") {
          futureEnd(previous.endsAt, now);
          assertReadinessConfirmable(readiness, reason);
          target = "CHO_DUYET";
        } else {
          reason = requireCampaignReason(reason);
          target = "NHAP";
        }
        await tx.campaignDataConfirmation.create({
          data: {
            campaignId: key,
            campaignRevision: previous.revision + 1,
            confirmedById: fresh.userId,
            status: action === "confirm" ? "DA_XAC_NHAN" : "TRA_VE",
            occurredAt: now,
            snapshotHash: readiness.snapshotHash,
            sectionCount: readiness.sectionCount,
            pairCount: readiness.pairCount,
            warnings: readiness.warnings as unknown as Prisma.InputJsonValue,
            reason: reason ?? null,
          },
        });
      } else if (action === "approve" || action === "reject") {
        if (previous.status !== "CHO_DUYET") invalidState();
        if (action === "approve") {
          futureEnd(previous.endsAt, now);
          const latest = await tx.campaignDataConfirmation.findFirst({
            where: { campaignId: key },
            orderBy: { campaignRevision: "desc" },
          });
          if (
            !latest ||
            latest.status !== "DA_XAC_NHAN" ||
            latest.campaignRevision !== previous.revision
          )
            throw new AuthError(
              "Dữ liệu của lần trình hiện tại chưa được PĐT xác nhận.",
              409,
              "MISSING_CONFIRMATION",
            );
          await validateTemplateForApproval(tx, previous.templateId, now);
          target = "DA_DUYET";
          extra.approvedAt = now;
          extra.approvedById = fresh.userId;
        } else {
          reason = requireCampaignReason(reason);
          target = "NHAP";
          extra.approvedAt = null;
          extra.approvedById = null;
        }
      } else if (action === "withdraw") {
        if (previous.status !== "DA_DUYET") invalidState();
        reason = requireCampaignReason(reason);
        target = "NHAP";
        extra.approvedAt = null;
        extra.approvedById = null;
      } else if (action === "cancel") {
        if (
          !preOpenStatuses.includes(
            previous.status as (typeof preOpenStatuses)[number],
          )
        )
          invalidState();
        reason = requireCampaignReason(reason);
        target = "HUY";
      } else if (action === "extend") {
        if (previous.status !== "DANG_MO") invalidState();
        reason = requireCampaignReason(reason);
        if (!parsed.endsAt || new Date(parsed.endsAt) <= previous.endsAt)
          throw new AuthError(
            "Thời gian gia hạn phải sau hạn kết thúc hiện tại.",
            400,
            "INVALID_EXTENSION",
          );
        extra.endsAt = new Date(parsed.endsAt);
        const students = await tx.surveyTask.findMany({
          where: { campaignId: key },
          distinct: ["studentId"],
          select: { studentId: true },
        });
        await enqueueCampaignNotice(tx, {
          key: `campaign-extension:${key}:${parsed.requestId}`,
          campaignId: key,
          title: "Gia hạn thời gian khảo sát",
          body: `Đợt “${previous.title}” được gia hạn tới ${new Date(parsed.endsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Lý do: ${reason}`,
          userIds: students.map((student) => student.studentId),
        });
      } else {
        if (previous.status !== "DANG_MO") invalidState();
        reason = requireCampaignReason(reason);
        target = "DA_DONG";
      }
      const changed = await tx.surveyCampaign.updateMany({
        where: {
          id: key,
          status: previous.status,
          revision: parsed.expectedRevision,
        },
        data: { ...extra, status: target, revision: { increment: 1 } },
      });
      if (changed.count !== 1) conflict();
      await tx.campaignHistory.create({
        data: {
          campaignId: key,
          actorId: fresh.userId,
          fromStatus: previous.status,
          toStatus: target,
          action: code,
          campaignRevision: previous.revision + 1,
          requestId: parsed.requestId,
          requestHash,
          reason: reason ?? null,
          occurredAt: now,
        },
      });
      await audit(tx, fresh.userId, `CAMPAIGN_${code}`, key, {
        revision: previous.revision + 1,
        status: target,
        reasonProvided: !!reason,
        reasonLength: reason?.length ?? 0,
      });
      // A late approval is itself the first access after startsAt. Open immediately
      // under the same lock, after preserving the approval transition in history.
      if (action === "approve") await advanceCampaignState(tx, key, now);
      return detail(tx, key);
    },
    key,
  );
}
async function validateTemplateForSubmission(
  tx: Prisma.TransactionClient,
  templateId: string,
) {
  const template = await tx.surveyTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      groups: { select: { _count: { select: { questions: true } } } },
    },
  });
  if (
    !template ||
    !template.groups.length ||
    !template.groups.every((group) => group._count.questions > 0)
  )
    throw new AuthError(
      "Mẫu phiếu chưa có nhóm hoặc câu hỏi hợp lệ.",
      400,
      "INVALID_TEMPLATE",
    );
}
export async function getCampaignProgress(
  actor: AuthActor,
  id: string,
  input: { page?: number; pageSize?: number } = {},
): Promise<CampaignProgress> {
  requireCan(actor, "campaigns:progress");
  const key = parseInput(objectId, id),
    paging = parseInput(pageInput.strict(), input);
  return authorized(
    actor,
    "campaigns:progress",
    async (tx) => {
      await readRow(tx, key);
      const [counts, sections, totalSections] = await Promise.all([
        tx.surveyTask.groupBy({
          by: ["sectionId", "status"],
          where: { campaignId: key },
          _count: { _all: true },
        }),
        tx.campaignSection.findMany({
          where: { campaignId: key },
          orderBy: { section: { code: "asc" } },
          skip: (paging.page - 1) * paging.pageSize,
          take: paging.pageSize,
          select: {
            sectionId: true,
            section: {
              select: { code: true, course: { select: { name: true } } },
            },
          },
        }),
        tx.campaignSection.count({ where: { campaignId: key } }),
      ]);
      const total = counts.reduce((sum, item) => sum + item._count._all, 0),
        done = counts
          .filter((item) => item.status === "DONE")
          .reduce((sum, item) => sum + item._count._all, 0);
      return {
        campaignId: key,
        total,
        done,
        pending: total - done,
        participationRate: total ? done / total : 0,
        totalSections,
        page: paging.page,
        pageSize: paging.pageSize,
        items: sections.map((section) => {
          const own = counts.filter(
            (item) => item.sectionId === section.sectionId,
          );
          const sectionTotal = own.reduce(
              (sum, item) => sum + item._count._all,
              0,
            ),
            sectionDone = own
              .filter((item) => item.status === "DONE")
              .reduce((sum, item) => sum + item._count._all, 0);
          return {
            sectionId: section.sectionId,
            sectionCode: section.section.code,
            courseName: section.section.course.name,
            total: sectionTotal,
            done: sectionDone,
            pending: sectionTotal - sectionDone,
            participationRate: sectionTotal ? sectionDone / sectionTotal : 0,
          };
        }),
      };
    },
    key,
  );
}
