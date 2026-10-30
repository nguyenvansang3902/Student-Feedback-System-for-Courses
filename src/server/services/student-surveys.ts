import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan, type PolicyAction } from "../policies/can";
import { assertFreshActor, lockAdminMutations, objectId, pageInput, parseInput } from "./access";
import { advanceCampaignState, advanceDueCampaignsInTransaction } from "./campaign-lifecycle";
import { assertStudentSurveyTemplate, parseStudentSurveyAnswers } from "./student-survey-input";
import type {
  StudentSurveyAvailability, StudentSurveyDetail, StudentSurveyItem, StudentSurveyList,
  StudentSurveyListInput, StudentSurveySubmitResult, StudentSurveyTemplate,
} from "./student-survey-types";

export type {
  StudentSurveyDetail, StudentSurveyItem, StudentSurveyList, StudentSurveyListInput,
  StudentSurveySubmitResult, StudentSurveyTemplate,
} from "./student-survey-types";

const listInput = pageInput.extend({ status: z.enum(["PENDING", "DONE"]).optional() }).strict();
const taskSelect = {
  id: true, campaignId: true, sectionId: true, status: true, doneDate: true,
  cohort: { select: {
    section: { select: { code: true, course: { select: { name: true } } } },
    campaign: { select: {
      title: true, templateId: true, status: true, startsAt: true, endsAt: true,
      semester: { select: { name: true, lockedAt: true } },
    } },
  } },
} as const satisfies Prisma.SurveyTaskSelect;
const templateSelect = {
  id: true, familyId: true, version: true, name: true, status: true, lockedAt: true,
  groups: { orderBy: [{ position: "asc" }, { id: "asc" }], select: {
    id: true, title: true, position: true,
    questions: { orderBy: [{ position: "asc" }, { id: "asc" }], select: {
      id: true, label: true, type: true, position: true, required: true, allowNA: true,
      scaleMin: true, scaleMax: true,
      options: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, label: true, position: true } },
    } },
  } },
} as const satisfies Prisma.SurveyTemplateSelect;
type TaskRow = Prisma.SurveyTaskGetPayload<{ select: typeof taskSelect }>;

function notFound(): never {
  throw new AuthError("Không tìm thấy nhiệm vụ khảo sát.", 404, "STUDENT_SURVEY_NOT_FOUND");
}
function completed(): never {
  throw new AuthError("Sinh viên đã hoàn thành khảo sát này. Phiếu đã nộp không thể sửa hoặc nộp lại.", 409, "STUDENT_SURVEY_COMPLETED");
}
function normalizedError(error: unknown): never {
  if (error instanceof AuthError) throw error;
  // Không để lỗi ORM/driver mang SQL params hay nội dung phiếu ra route hoặc log.
  throw new AuthError("Không thể xử lý khảo sát lúc này. Hãy tải lại trạng thái nhiệm vụ trước khi thử tiếp.", 500, "STUDENT_SURVEY_FAILED");
}

async function transaction<T>(actor: AuthActor, action: PolicyAction,
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>): Promise<T> {
  try {
    return await getDb().$transaction(async (tx) => {
      // Lệnh đầu phải lấy mutex để tránh snapshot quyền/trạng thái cũ sau khi chờ khóa.
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, action);
      return operation(tx, fresh);
    }, { maxWait: 15_000, timeout: 30_000 });
  } catch (error) { normalizedError(error); }
}

function availability(row: TaskRow, now: Date): StudentSurveyAvailability {
  if (row.status === "DONE") return "COMPLETED";
  const campaign = row.cohort.campaign;
  if (campaign.semester.lockedAt) return "SEMESTER_LOCKED";
  if (["DA_DONG", "DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU", "HUY"].includes(campaign.status)) return "CLOSED";
  if (now > campaign.endsAt) return "CLOSED";
  if (now < campaign.startsAt) return "NOT_OPEN";
  if (campaign.status === "DANG_MO") return "AVAILABLE";
  return "NOT_OPEN";
}
function item(row: TaskRow, now: Date): StudentSurveyItem {
  const campaign = row.cohort.campaign;
  const state = availability(row, now);
  return {
    id: row.id, campaignId: row.campaignId, campaignTitle: campaign.title,
    sectionId: row.sectionId, sectionCode: row.cohort.section.code,
    courseName: row.cohort.section.course.name, semesterName: campaign.semester.name,
    status: row.status, doneDate: row.doneDate?.toISOString().slice(0, 10) ?? null,
    startsAt: campaign.startsAt.toISOString(), endsAt: campaign.endsAt.toISOString(),
    campaignStatus: campaign.status, semesterLocked: !!campaign.semester.lockedAt,
    canSubmit: state === "AVAILABLE", availability: state,
  };
}
async function readOwnedTask(tx: Prisma.TransactionClient, userId: string, id: string): Promise<TaskRow> {
  const row = await tx.surveyTask.findFirst({ where: { id, studentId: userId }, select: taskSelect });
  if (!row) notFound();
  return row;
}
async function readTemplate(tx: Prisma.TransactionClient, id: string): Promise<StudentSurveyTemplate> {
  const row = await tx.surveyTemplate.findUnique({ where: { id }, select: templateSelect });
  if (!row || row.status !== "DA_KHOA" || !row.lockedAt)
    throw new AuthError("Mẫu khảo sát chưa sẵn sàng. Vui lòng tải lại hoặc liên hệ Đảm bảo chất lượng.", 409, "SURVEY_TEMPLATE_UNAVAILABLE");
  const dto: StudentSurveyTemplate = {
    id: row.id, familyId: row.familyId, version: row.version, name: row.name,
    groups: row.groups.map((group) => ({ id: group.id, title: group.title, position: group.position,
      questions: group.questions.map((question) => ({
        id: question.id, label: question.label, type: question.type, position: question.position,
        required: question.required, allowNA: question.allowNA, scaleMin: question.scaleMin,
        scaleMax: question.scaleMax,
        options: question.options.map((option) => ({ id: option.id, label: option.label, position: option.position })),
      })),
    })),
  };
  assertStudentSurveyTemplate(dto);
  return dto;
}

/** Chỉ task đã chốt xác định đối tượng; không suy lại quyền từ đăng ký hiện tại. */
export async function listStudentSurveys(actor: AuthActor, input: StudentSurveyListInput = {}): Promise<StudentSurveyList> {
  requireCan(actor, "student-surveys:list");
  const { page, pageSize, status } = parseInput(listInput, input);
  return transaction(actor, "student-surveys:list", async (tx, fresh) => {
    const now = new Date();
    await advanceDueCampaignsInTransaction(tx, now);
    const where: Prisma.SurveyTaskWhereInput = { studentId: fresh.userId, ...(status ? { status } : {}) };
    const [rows, total] = await Promise.all([
      tx.surveyTask.findMany({ where, select: taskSelect, orderBy: [{ cohort: { campaign: { endsAt: "asc" } } }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      tx.surveyTask.count({ where }),
    ]);
    return { items: rows.map((row) => item(row, now)), total, page, pageSize };
  });
}

/** Commit chuyển trạng thái đến hạn riêng, kể cả khi lần nộp sau bị từ chối. */
async function prepareOwnedCampaign(actor: AuthActor, id: string, action: PolicyAction): Promise<void> {
  await transaction(actor, action, async (tx, fresh) => {
    const owned = await tx.surveyTask.findFirst({ where: { id, studentId: fresh.userId }, select: { campaignId: true } });
    // ID lạ và task người khác có cùng lỗi, không kích hoạt chuyển trạng thái đợt.
    if (!owned) notFound();
    await advanceCampaignState(tx, owned.campaignId, new Date());
  });
}

export async function getStudentSurvey(actor: AuthActor, taskId: string): Promise<StudentSurveyDetail> {
  requireCan(actor, "student-surveys:read");
  const id = parseInput(objectId, taskId);
  await prepareOwnedCampaign(actor, id, "student-surveys:read");
  return transaction(actor, "student-surveys:read", async (tx, fresh) => {
    const row = await readOwnedTask(tx, fresh.userId, id);
    const summary = item(row, new Date());
    return { ...summary, template: summary.canSubmit ? await readTemplate(tx, row.cohort.campaign.templateId) : null };
  });
}

function businessDate(now: Date): { date: Date; text: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((value) => value.type === name)!.value;
  const text = `${part("year")}-${part("month")}-${part("day")}`;
  return { text, date: new Date(`${text}T00:00:00.000Z`) };
}

export async function submitStudentSurvey(actor: AuthActor, taskId: string, input: unknown): Promise<StudentSurveySubmitResult> {
  requireCan(actor, "student-surveys:submit");
  const id = parseInput(objectId, taskId);
  await prepareOwnedCampaign(actor, id, "student-surveys:submit");
  return transaction(actor, "student-surveys:submit", async (tx, fresh) => {
    const row = await readOwnedTask(tx, fresh.userId, id);
    if (row.status === "DONE") completed();
    if (availability(row, new Date()) !== "AVAILABLE")
      throw new AuthError("Khảo sát hiện không nhận phiếu. Vui lòng kiểm tra thời hạn và trạng thái học kỳ.", 409, "STUDENT_SURVEY_UNAVAILABLE");
    const template = await readTemplate(tx, row.cohort.campaign.templateId);
    const answers = parseStudentSurveyAnswers(input, template);
    const now = new Date();
    if (availability(row, now) !== "AVAILABLE")
      throw new AuthError("Khảo sát hiện không nhận phiếu. Vui lòng kiểm tra thời hạn và trạng thái học kỳ.", 409, "STUDENT_SURVEY_UNAVAILABLE");
    const day = businessDate(now);
    const changed = await tx.surveyTask.updateMany({
      where: { id, studentId: fresh.userId, campaignId: row.campaignId, sectionId: row.sectionId, status: "PENDING",
        cohort: { campaign: { status: "DANG_MO", startsAt: { lte: now }, endsAt: { gte: now },
          semester: { lockedAt: null }, template: { id: template.id, status: "DA_KHOA", lockedAt: { not: null } } } },
      },
      data: { status: "DONE", doneDate: day.date },
    });
    if (changed.count !== 1) completed();
    const responseId = randomUUID();
    await tx.surveyResponse.create({ data: {
      id: responseId, campaignId: row.campaignId, sectionId: row.sectionId, submittedDate: day.date,
    }, select: { id: true } });
    if (answers.length) await tx.surveyAnswer.createMany({ data: answers.map((answer) => ({
      id: randomUUID(), responseId, ...answer, moderationStatus: "CHO_KIEM_DUYET",
    })) });
    return { status: "DONE", doneDate: day.text };
  });
}
