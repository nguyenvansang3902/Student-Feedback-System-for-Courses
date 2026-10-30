import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan, resultSectionScopeWhere } from "../policies/can";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  pageInput,
  parseInput,
} from "./access";
import { enqueueCampaignNotice } from "./campaign-notifications";
import type {
  IncompleteItem,
  ReminderResult,
  ResultsPage,
} from "./survey-results-types";

const listSchema = pageInput
  .extend({ sectionId: objectId.optional() })
  .strict();
const remindSchema = z.object({ sectionId: objectId.optional() }).strict();
export function surveyReminderDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
async function campaignScope(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
  sectionId: string | undefined,
  action: "results:incomplete" | "results:remind",
) {
  const where: Prisma.CampaignSectionWhereInput = {
    campaignId: id,
    ...(sectionId ? { sectionId } : {}),
    section: resultSectionScopeWhere(actor, action),
  };
  const campaign = await tx.surveyCampaign.findFirst({
    where: {
      id,
      status: {
        in: ["DANG_MO", "DA_DONG", "DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"],
      },
      sections: { some: where },
    },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      semester: { select: { lockedAt: true } },
    },
  });
  if (!campaign)
    throw new AuthError(
      "Không tìm thấy đợt khảo sát trong phạm vi được giao.",
      404,
      "INCOMPLETE_NOT_FOUND",
    );
  return { campaign, where };
}
export async function listIncompleteStudents(
  actor: AuthActor,
  campaignId: string,
  input: { page?: number; pageSize?: number; sectionId?: string } = {},
): Promise<ResultsPage<IncompleteItem>> {
  requireCan(actor, "results:incomplete");
  const id = parseInput(objectId, campaignId),
    { page, pageSize, sectionId } = parseInput(listSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "results:incomplete");
      const { where: cohort } = await campaignScope(
        tx,
        fresh,
        id,
        sectionId,
        "results:incomplete",
      );
      const where: Prisma.SurveyTaskWhereInput = {
        campaignId: id,
        status: "PENDING",
        cohort,
      };
      const [rows, total] = await Promise.all([
        tx.surveyTask.findMany({
          where,
          orderBy: [{ student: { loginCode: "asc" } }, { sectionId: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            studentId: true,
            sectionId: true,
            student: { select: { loginCode: true, displayName: true } },
            cohort: { select: { section: { select: { code: true } } } },
          },
        }),
        tx.surveyTask.count({ where }),
      ]);
      // Mọi lần đọc, kể cả trang rỗng, đều có nhật ký; không nối tới câu trả lời.
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "SURVEY_INCOMPLETE_VIEWED",
          objectType: "SurveyCampaign",
          objectId: id,
          redactedSummary: {
            page,
            pageSize,
            count: rows.length,
            sectionFiltered: !!sectionId,
            success: true,
          },
        },
      });
      return {
        items: rows.map((row) => ({
          studentId: row.studentId,
          sectionId: row.sectionId,
          loginCode: row.student.loginCode,
          displayName: row.student.displayName,
          sectionCode: row.cohort.section.code,
        })),
        total,
        page,
        pageSize,
      };
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
async function queue(
  tx: Prisma.TransactionClient,
  campaign: { id: string; title: string },
  where: Prisma.SurveyTaskWhereInput,
  now: Date,
): Promise<ReminderResult> {
  const students = await tx.surveyTask.findMany({
    where: { ...where, status: "PENDING", student: { status: "ACTIVE" } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const day = surveyReminderDay(now);
  const { queued } = await enqueueCampaignNotice(tx, {
    key: `survey-reminder:${campaign.id}:${day}`,
    campaignId: campaign.id,
    title: "Nhắc hoàn thành khảo sát",
    body: `Bạn còn khảo sát chưa hoàn thành trong đợt “${campaign.title}”. Vui lòng mở mục Khảo sát để xem thời hạn.`,
    userIds: students.map((s) => s.studentId),
  });
  return { campaignId: campaign.id, day, queued };
}
export async function remindIncompleteStudents(
  actor: AuthActor,
  campaignId: string,
  input: { sectionId?: string } = {},
): Promise<ReminderResult> {
  requireCan(actor, "results:remind");
  const id = parseInput(objectId, campaignId),
    { sectionId } = parseInput(remindSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "results:remind");
      const { campaign, where: cohort } = await campaignScope(
        tx,
        fresh,
        id,
        sectionId,
        "results:remind",
      );
      if (campaign.semester.lockedAt)
        throw new AuthError(
          "Học kỳ đã khóa sổ. Dữ liệu chỉ được đọc.",
          409,
          "SEMESTER_LOCKED",
        );
      const now = new Date();
      if (
        campaign.status !== "DANG_MO" ||
        campaign.startsAt > now ||
        campaign.endsAt < now
      )
        throw new AuthError(
          "Chỉ nhắc khi đợt khảo sát đang mở và còn hạn.",
          409,
          "REMINDER_INVALID_STATE",
        );
      const result = await queue(tx, campaign, { campaignId: id, cohort }, now);
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "SURVEY_INCOMPLETE_REMINDED",
          objectType: "SurveyCampaign",
          objectId: id,
          redactedSummary: {
            day: result.day,
            queued: result.queued,
            sectionFiltered: !!sectionId,
            success: true,
          },
        },
      });
      return result;
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
/** Nhắc tự động dùng cùng khóa theo ngày với thao tác thủ công, không gửi trùng. */
export async function remindDueSurveyStudents(
  actor: ServerConsoleActor | null,
  input: { limit?: number } = {},
) {
  authorizeConsole(actor);
  const { limit } = parseInput(
    z.object({ limit: z.number().int().min(1).max(100).default(50) }).strict(),
    input,
  );
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const now = new Date();
      const cursorKey = "SURVEY_REMINDER_CURSOR";
      const cursorRow = await tx.systemSetting.findUnique({
        where: { key: cursorKey },
      });
      const cursor =
        cursorRow?.value &&
        typeof cursorRow.value === "object" &&
        !Array.isArray(cursorRow.value) &&
        typeof cursorRow.value.lastId === "string" &&
        objectId.safeParse(cursorRow.value.lastId).success
          ? cursorRow.value.lastId
          : null;
      const where = {
        status: "DANG_MO" as const,
        startsAt: { lte: now },
        endsAt: { gte: now },
        semester: { lockedAt: null },
      };
      let campaigns = await tx.surveyCampaign.findMany({
        where: { ...where, ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, title: true },
        orderBy: { id: "asc" },
        take: limit,
      });
      if (!campaigns.length && cursor)
        campaigns = await tx.surveyCampaign.findMany({
          where,
          select: { id: true, title: true },
          orderBy: { id: "asc" },
          take: limit,
        });
      let queued = 0;
      for (const campaign of campaigns)
        queued += (await queue(tx, campaign, { campaignId: campaign.id }, now))
          .queued;
      if (campaigns.length)
        await tx.systemSetting.upsert({
          where: { key: cursorKey },
          create: {
            key: cursorKey,
            value: { lastId: campaigns[campaigns.length - 1].id },
          },
          update: { value: { lastId: campaigns[campaigns.length - 1].id } },
        });
      return { checked: campaigns.length, queued };
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
