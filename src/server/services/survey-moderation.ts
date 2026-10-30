import { randomInt } from "node:crypto";
import { z } from "zod";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  pageInput,
  parseInput,
} from "./access";
import { readSurveyResultSettings } from "./survey-results-settings";
import type {
  ModerationInput,
  ModerationItem,
  ResultsPage,
} from "./survey-results-types";

const listSchema = pageInput
  .extend({
    status: z.enum(["CHO_KIEM_DUYET", "HIEN_THI", "DA_AN"]).optional(),
  })
  .strict();
const decisionSchema = z
  .object({
    status: z.enum(["HIEN_THI", "DA_AN"]),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
function missing(): never {
  throw new AuthError(
    "Không tìm thấy góp ý cần kiểm duyệt.",
    404,
    "MODERATION_NOT_FOUND",
  );
}
function writable(status: string, locked: boolean): void {
  if (locked)
    throw new AuthError(
      "Học kỳ đã khóa sổ. Dữ liệu chỉ được đọc.",
      409,
      "SEMESTER_LOCKED",
    );
  if (!["DANG_MO", "DA_DONG", "DA_TONG_HOP"].includes(status))
    throw new AuthError(
      "Không thể kiểm duyệt ở trạng thái hiện tại.",
      409,
      "MODERATION_INVALID_STATE",
    );
}

export async function listSurveyModeration(
  actor: AuthActor,
  campaignId: string,
  input: {
    page?: number;
    pageSize?: number;
    status?: "CHO_KIEM_DUYET" | "HIEN_THI" | "DA_AN";
  } = {},
): Promise<ResultsPage<ModerationItem>> {
  requireCan(actor, "results:moderate");
  const id = parseInput(objectId, campaignId),
    { page, pageSize, status } = parseInput(listSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      requireCan(await assertFreshActor(tx, actor), "results:moderate");
      const campaign = await tx.surveyCampaign.findUnique({
        where: { id },
        select: {
          template: {
            select: {
              groups: {
                select: {
                  questions: {
                    where: { type: "TEXT" },
                    select: { id: true, label: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!campaign) missing();
      const labels = new Map(
        campaign.template.groups
          .flatMap((g) => g.questions)
          .map((q) => [q.id, q.label]),
      );
      // Phiếu chỉ được dùng trong điều kiện truy vấn; DTO không có ID phiếu/ngày nộp.
      const rows = await tx.surveyAnswer.findMany({
        where: {
          questionId: { in: [...labels.keys()] },
          response: { campaignId: id },
          isNotApplicable: false,
          valueText: { not: null },
          ...(status ? { moderationStatus: status } : {}),
        },
        select: {
          id: true,
          questionId: true,
          valueText: true,
          moderationStatus: true,
          moderationReason: true,
        },
        orderBy: { id: "asc" },
      });
      const valid = rows.filter((row) => !!row.valueText?.trim());
      const settings = await readSurveyResultSettings(tx);
      // UUID ngẫu nhiên không biểu diễn thứ tự nộp; trộn thêm trong từng trang hiển thị.
      const items = valid
        .slice((page - 1) * pageSize, page * pageSize)
        .map((row): ModerationItem => ({
          id: row.id,
          questionLabel: labels.get(row.questionId)!,
          text: row.valueText!,
          status: row.moderationStatus,
          reason: row.moderationReason,
          flagged: settings.sensitiveKeywords.some((word) =>
            row
              .valueText!.toLocaleLowerCase("vi")
              .includes(word.toLocaleLowerCase("vi")),
          ),
        }));
      for (let index = items.length - 1; index > 0; index--) {
        const other = randomInt(index + 1);
        [items[index], items[other]] = [items[other], items[index]];
      }
      return { items, total: valid.length, page, pageSize };
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}

export async function moderateSurveyAnswer(
  actor: AuthActor,
  campaignId: string,
  answerId: string,
  input: ModerationInput,
): Promise<ModerationItem> {
  requireCan(actor, "results:moderate");
  const id = parseInput(objectId, campaignId),
    answer = parseInput(objectId, answerId),
    data = parseInput(decisionSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "results:moderate");
      const campaign = await tx.surveyCampaign.findUnique({
        where: { id },
        select: {
          status: true,
          semester: { select: { lockedAt: true } },
          template: {
            select: {
              groups: {
                select: {
                  questions: {
                    where: { type: "TEXT" },
                    select: { id: true, label: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!campaign) missing();
      writable(campaign.status, !!campaign.semester.lockedAt);
      const questions = campaign.template.groups.flatMap(
        (group) => group.questions,
      );
      const row = await tx.surveyAnswer.findFirst({
        where: {
          id: answer,
          response: { campaignId: id },
          questionId: { in: questions.map((q) => q.id) },
          isNotApplicable: false,
        },
        select: {
          id: true,
          questionId: true,
          valueText: true,
          moderationStatus: true,
          moderationReason: true,
        },
      });
      if (!row?.valueText?.trim()) missing();
      if (row.moderationStatus !== "CHO_KIEM_DUYET") {
        if (
          row.moderationStatus !== data.status ||
          row.moderationReason !== data.reason
        )
          throw new AuthError(
            "Góp ý đã được kiểm duyệt. Hãy tải lại danh sách.",
            409,
            "MODERATION_CONFLICT",
          );
      } else {
        const changed = await tx.surveyAnswer.updateMany({
          where: { id: answer, moderationStatus: "CHO_KIEM_DUYET" },
          data: {
            moderationStatus: data.status,
            moderationReason: data.reason,
          },
        });
        if (changed.count !== 1)
          throw new AuthError(
            "Góp ý đã thay đổi. Hãy tải lại danh sách.",
            409,
            "MODERATION_CONFLICT",
          );
        await tx.auditLog.create({
          data: {
            actorId: fresh.userId,
            action: "SURVEY_TEXT_MODERATED",
            objectType: "SurveyAnswer",
            objectId: answer,
            redactedSummary: {
              status: data.status,
              reasonProvided: true,
              success: true,
            },
          },
        });
      }
      const settings = await readSurveyResultSettings(tx);
      return {
        id: answer,
        questionLabel: questions.find((q) => q.id === row.questionId)!.label,
        text: row.valueText!,
        status: data.status,
        reason: data.reason,
        flagged: settings.sensitiveKeywords.some((word) =>
          row
            .valueText!.toLocaleLowerCase("vi")
            .includes(word.toLocaleLowerCase("vi")),
        ),
      };
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
