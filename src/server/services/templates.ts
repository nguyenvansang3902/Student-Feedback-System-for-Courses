import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import type { QuestionType, TemplateStatus } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, objectId, pageInput, parseInput } from "./access";
import { copyInputSchema, parseTemplateInput, revisionInputSchema, templateInputSchema, updateTemplateInputSchema, type ValidatedTemplateInput } from "./template-input";
export { TEMPLATE_LIMITS, questionTypes } from "./template-input";
export type { TemplateInput } from "./template-input";

export interface TemplateOption { id: string; label: string; position: number }
export interface TemplateQuestion {
  id: string; label: string; type: QuestionType; position: number; required: boolean; allowNA: boolean; weight: number;
  scaleMin: number | null; scaleMax: number | null; options: TemplateOption[];
}
export interface TemplateGroup { id: string; title: string; position: number; weight: number; questions: TemplateQuestion[] }
export interface TemplateSummary {
  id: string; familyId: string; version: number; revision: number; name: string; status: TemplateStatus; isDefault: boolean;
  createdAt: string; updatedAt: string; lockedAt: string | null; isLocked: boolean; lockReason: string | null;
  groupCount: number; questionCount: number;
}
export interface TemplateDetail extends TemplateSummary { groups: TemplateGroup[] }
export interface TemplateListInput { page?: number; pageSize?: number; search?: string; status?: TemplateStatus; isDefault?: boolean }

const listInput = pageInput.extend({ search: z.string().trim().max(100).optional(), status: z.enum(["NHAP", "DA_KHOA"]).optional(), isDefault: z.boolean().optional() }).strict();
const approvedCampaignWhere = {
  OR: [{ approvedAt: { not: null } }, { status: { in: ["DA_DUYET", "DANG_MO", "DA_DONG", "DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"] } }],
} satisfies Prisma.SurveyCampaignWhereInput;
const baseSelect = {
  id: true, familyId: true, version: true, revision: true, name: true, status: true, isDefault: true,
  createdAt: true, updatedAt: true, lockedAt: true,
  campaigns: { where: approvedCampaignWhere, take: 1, select: { id: true } },
} as const satisfies Prisma.SurveyTemplateSelect;
const summarySelect = { ...baseSelect, groups: { select: { _count: { select: { questions: true } } } } } as const satisfies Prisma.SurveyTemplateSelect;
const detailSelect = {
  ...baseSelect, groups: { orderBy: [{ position: "asc" }, { id: "asc" }], select: {
    id: true, title: true, position: true, weight: true, questions: { orderBy: [{ position: "asc" }, { id: "asc" }], select: {
      id: true, label: true, type: true, position: true, required: true, allowNA: true, weight: true, scaleMin: true, scaleMax: true,
      options: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, label: true, position: true } },
    } },
  } },
} as const satisfies Prisma.SurveyTemplateSelect;
type SummaryRow = Prisma.SurveyTemplateGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.SurveyTemplateGetPayload<{ select: typeof detailSelect }>;

function summary(row: SummaryRow | DetailRow): TemplateSummary {
  const linked = row.campaigns.length > 0;
  const isLocked = row.status === "DA_KHOA" || !!row.lockedAt || linked;
  return { id: row.id, familyId: row.familyId, version: row.version, revision: row.revision, name: row.name,
    status: row.status, isDefault: row.isDefault, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), lockedAt: row.lockedAt?.toISOString() ?? null,
    isLocked, lockReason: linked ? "Mẫu đã gắn vào đợt khảo sát được duyệt; muốn thay đổi phải tạo phiên bản mới." : isLocked ? "Mẫu đã khóa; muốn thay đổi phải tạo phiên bản mới." : null,
    groupCount: row.groups.length, questionCount: row.groups.reduce((count, group) => count + ("questions" in group ? group.questions.length : group._count.questions), 0) };
}
function detail(row: DetailRow): TemplateDetail {
  return { ...summary(row), groups: row.groups.map((group) => ({ id: group.id, title: group.title, position: group.position, weight: Number(group.weight),
    questions: group.questions.map((question) => ({ ...question, weight: Number(question.weight) })) })) };
}
function conflict(): never { throw new AuthError("Mẫu đã thay đổi trong một phiên khác. Hãy tải lại trước khi tiếp tục.", 409, "TEMPLATE_REVISION_CONFLICT"); }
function assertRevision(row: DetailRow, revision: number) { if (row.revision !== revision) conflict(); }
function assertEditable(row: DetailRow) {
  if (summary(row).isLocked || row.isDefault) throw new AuthError("Mẫu đã khóa hoặc đang là mẫu mặc định. Hãy tạo phiên bản mới để chỉnh sửa.", 409, "TEMPLATE_LOCKED");
}
async function readTemplate(tx: Prisma.TransactionClient, id: string): Promise<DetailRow> {
  const row = await tx.surveyTemplate.findUnique({ where: { id }, select: detailSelect });
  if (!row) throw new AuthError("Không tìm thấy mẫu phiếu.", 404, "TEMPLATE_NOT_FOUND");
  return row;
}
function content(row: DetailRow, name = row.name): ValidatedTemplateInput {
  return parseTemplateInput(templateInputSchema, { name, groups: row.groups.map((group) => ({ title: group.title, position: group.position, weight: Number(group.weight),
    questions: group.questions.map((question) => ({ label: question.label, type: question.type, position: question.position,
      required: question.required, allowNA: question.allowNA, weight: Number(question.weight),
      ...(question.type === "LIKERT" ? { scaleMin: question.scaleMin ?? 1, scaleMax: question.scaleMax ?? 5 } : {}),
      options: question.options.map((option) => ({ label: option.label, position: option.position })),
    })),
  })) });
}
function tree(input: ValidatedTemplateInput) {
  return { create: [...input.groups].sort((a, b) => a.position - b.position).map((group) => ({
    id: randomUUID(), title: group.title, position: group.position, weight: group.weight,
    questions: { create: [...group.questions].sort((a, b) => a.position - b.position).map((question) => ({
      id: randomUUID(), label: question.label, type: question.type, position: question.position, required: question.required,
      allowNA: question.allowNA, weight: question.weight,
      scaleMin: question.type === "LIKERT" ? question.scaleMin ?? 1 : null,
      scaleMax: question.type === "LIKERT" ? question.scaleMax ?? 5 : null,
      options: { create: [...question.options].sort((a, b) => a.position - b.position).map((option) => ({ id: randomUUID(), label: option.label, position: option.position })) },
    })) },
  })) };
}
async function audit(tx: Prisma.TransactionClient, actor: AuthActor, action: string, row: DetailRow, extra: Prisma.InputJsonObject = {}) {
  const counts = summary(row);
  await tx.auditLog.create({ data: { actorId: actor.userId, action, objectType: "SurveyTemplate", objectId: row.id,
    redactedSummary: { success: true, familyId: row.familyId, version: row.version, revision: row.revision, status: row.status,
      groupCount: counts.groupCount, questionCount: counts.questionCount, ...extra } } });
}
function normalizeError(error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? error.code : null;
  if (code === "P2002") throw new AuthError("Phiên bản mẫu đã tồn tại. Vui lòng tải lại và thử lại.", 409, "TEMPLATE_VERSION_CONFLICT");
  if (code === "P2003") throw new AuthError("Mẫu đang được dữ liệu nghiệp vụ tham chiếu. Hãy tạo phiên bản mới.", 409, "TEMPLATE_IN_USE");
  throw error;
}
async function write<T>(actor: AuthActor, operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>): Promise<T> {
  try {
    return await getDb().$transaction(async (tx) => {
      // Khóa là câu lệnh đầu: không tạo snapshot REPEATABLE READ trước lúc chờ đổi quyền/mẫu.
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "templates:write");
      return operation(tx, fresh);
    }, { timeout: 30_000, maxWait: 10_000 });
  } catch (error) { normalizeError(error); }
}

export async function listTemplates(actor: AuthActor, input: TemplateListInput = {}) {
  requireCan(actor, "templates:list");
  const filter = parseInput(listInput, input), { page, pageSize, search, status, isDefault } = filter;
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "templates:list");
    const where: Prisma.SurveyTemplateWhereInput = { ...(search ? { name: { contains: search } } : {}), ...(status ? { status } : {}), ...(isDefault === undefined ? {} : { isDefault }) };
    const [rows, total] = await Promise.all([tx.surveyTemplate.findMany({ where, select: summarySelect, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }), tx.surveyTemplate.count({ where })]);
    return { items: rows.map(summary), total, page, pageSize };
  });
}
export async function getTemplate(actor: AuthActor, id: string): Promise<TemplateDetail> {
  requireCan(actor, "templates:read"); const key = parseInput(objectId, id);
  return getDb().$transaction(async (tx) => { requireCan(await assertFreshActor(tx, actor), "templates:read"); return detail(await readTemplate(tx, key)); });
}
export async function getDefaultTemplate(actor: AuthActor): Promise<TemplateDetail | null> {
  requireCan(actor, "templates:read");
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "templates:read");
    const row = await tx.surveyTemplate.findFirst({ where: { isDefault: true }, select: detailSelect, orderBy: { id: "asc" } });
    return row ? detail(row) : null;
  });
}
export async function createTemplate(actor: AuthActor, input: unknown): Promise<TemplateDetail> {
  requireCan(actor, "templates:write"); const data = parseTemplateInput(templateInputSchema, input);
  return write(actor, async (tx, fresh) => {
    const row = await tx.surveyTemplate.create({ data: { id: randomUUID(), familyId: randomUUID(), version: 1, name: data.name, createdById: fresh.userId, groups: tree(data) }, select: detailSelect });
    await audit(tx, fresh, "TEMPLATE_CREATED", row); return detail(row);
  });
}
export async function updateTemplate(actor: AuthActor, id: string, input: unknown): Promise<TemplateDetail> {
  requireCan(actor, "templates:write"); const key = parseInput(objectId, id), data = parseTemplateInput(updateTemplateInputSchema, input);
  return write(actor, async (tx, fresh) => {
    const previous = await readTemplate(tx, key); assertRevision(previous, data.expectedRevision); assertEditable(previous);
    const questionIds = previous.groups.flatMap((group) => group.questions.map((question) => question.id));
    if (questionIds.length && await tx.surveyAnswer.count({ where: { questionId: { in: questionIds } } }))
      throw new AuthError("Mẫu đã có dữ liệu trả lời. Hãy tạo phiên bản mới.", 409, "TEMPLATE_IN_USE");
    const changed = await tx.surveyTemplate.updateMany({ where: { id: key, revision: data.expectedRevision, status: "NHAP", lockedAt: null, isDefault: false }, data: { name: data.name, revision: { increment: 1 } } });
    if (changed.count !== 1) conflict();
    await tx.questionOption.deleteMany({ where: { question: { group: { templateId: key } } } });
    await tx.question.deleteMany({ where: { group: { templateId: key } } });
    await tx.criterionGroup.deleteMany({ where: { templateId: key } });
    const row = await tx.surveyTemplate.update({ where: { id: key }, data: { groups: tree(data) }, select: detailSelect });
    await audit(tx, fresh, "TEMPLATE_UPDATED", row); return detail(row);
  });
}
export async function lockTemplate(actor: AuthActor, id: string, input: unknown): Promise<TemplateDetail> {
  requireCan(actor, "templates:write"); const key = parseInput(objectId, id), data = parseTemplateInput(revisionInputSchema, input);
  return write(actor, async (tx, fresh) => {
    const previous = await readTemplate(tx, key); assertRevision(previous, data.expectedRevision); assertEditable(previous); content(previous);
    const changed = await tx.surveyTemplate.updateMany({ where: { id: key, revision: data.expectedRevision, status: "NHAP", lockedAt: null }, data: { status: "DA_KHOA", lockedAt: new Date(), revision: { increment: 1 } } });
    if (changed.count !== 1) conflict();
    const row = await readTemplate(tx, key); await audit(tx, fresh, "TEMPLATE_LOCKED", row); return detail(row);
  });
}
async function copyTemplate(actor: AuthActor, id: string, input: unknown, versioning: boolean): Promise<TemplateDetail> {
  requireCan(actor, "templates:write"); const key = parseInput(objectId, id), data = parseTemplateInput(copyInputSchema, input);
  return write(actor, async (tx, fresh) => {
    const source = await readTemplate(tx, key); assertRevision(source, data.expectedRevision);
    const snapshot = content(source, data.name ?? source.name);
    const max = versioning ? await tx.surveyTemplate.aggregate({ where: { familyId: source.familyId }, _max: { version: true } }) : null;
    const version = versioning ? (max?._max.version ?? source.version) + 1 : 1;
    if (version > 2_147_483_647) throw new AuthError("Họ mẫu đã đạt giới hạn số phiên bản.", 409, "TEMPLATE_VERSION_LIMIT");
    const row = await tx.surveyTemplate.create({ data: { id: randomUUID(), familyId: versioning ? source.familyId : randomUUID(), version, name: snapshot.name,
      status: "NHAP", lockedAt: null, isDefault: false, createdById: fresh.userId, groups: tree(snapshot) }, select: detailSelect });
    await audit(tx, fresh, versioning ? "TEMPLATE_VERSION_CREATED" : "TEMPLATE_CLONED", row, { sourceId: source.id }); return detail(row);
  });
}
export async function cloneTemplate(actor: AuthActor, id: string, input: unknown): Promise<TemplateDetail> { return copyTemplate(actor, id, input, false); }
export async function createTemplateVersion(actor: AuthActor, id: string, input: unknown): Promise<TemplateDetail> { return copyTemplate(actor, id, input, true); }
export async function setDefaultTemplate(actor: AuthActor, id: string, input: unknown): Promise<TemplateDetail> {
  requireCan(actor, "templates:write"); const key = parseInput(objectId, id), data = parseTemplateInput(revisionInputSchema, input);
  return write(actor, async (tx, fresh) => {
    const previous = await readTemplate(tx, key); assertRevision(previous, data.expectedRevision); content(previous);
    if (previous.status !== "DA_KHOA" || !previous.lockedAt)
      throw new AuthError("Hãy khóa mẫu hợp lệ trước khi chọn làm mặc định.", 409, "TEMPLATE_NOT_LOCKED");
    if (previous.isDefault) return detail(previous);
    const cleared = await tx.surveyTemplate.updateMany({ where: { isDefault: true, id: { not: key } }, data: { isDefault: false, revision: { increment: 1 } } });
    const changed = await tx.surveyTemplate.updateMany({ where: { id: key, revision: data.expectedRevision, status: "DA_KHOA", lockedAt: { not: null } }, data: { isDefault: true, revision: { increment: 1 } } });
    if (changed.count !== 1) conflict();
    const row = await readTemplate(tx, key); await audit(tx, fresh, "TEMPLATE_DEFAULT_SET", row, { previousDefaultCount: cleared.count }); return detail(row);
  });
}
