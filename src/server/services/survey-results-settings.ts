import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";
import { DEFAULT_SURVEY_RATING_BANDS } from "./survey-score";

export const SURVEY_RESULT_SETTINGS_KEY = "SURVEY_RESULT_SETTINGS";
export const surveyResultSettingsSchema = z
  .object({
    ratingBands: z
      .array(
        z
          .object({
            minScore: z.number().min(0).max(5).multipleOf(0.0001),
            label: z.string().trim().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    sensitiveKeywords: z.array(z.string().trim().min(1).max(100)).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.ratingBands[value.ratingBands.length - 1]?.minScore !== 0 ||
      value.ratingBands.some(
        (band, index) =>
          index > 0 && value.ratingBands[index - 1].minScore <= band.minScore,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["ratingBands"],
        message: "Ngưỡng phải giảm dần và kết thúc bằng 0.",
      });
    if (
      new Set(
        value.sensitiveKeywords.map((keyword) =>
          keyword.toLocaleLowerCase("vi"),
        ),
      ).size !== value.sensitiveKeywords.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["sensitiveKeywords"],
        message: "Từ khóa không được trùng nhau.",
      });
  });
export type SurveyResultSettings = z.infer<typeof surveyResultSettingsSchema>;
export interface SurveyResultSettingsDTO extends SurveyResultSettings {
  updatedAt: string | null;
}
export const DEFAULT_SURVEY_RESULT_SETTINGS: SurveyResultSettings = {
  ratingBands: DEFAULT_SURVEY_RATING_BANDS.map((band) => ({
    minScore: Number(band.minScore),
    label: band.label,
  })),
  sensitiveKeywords: [],
};
export const updateSurveyResultSettingsSchema =
  surveyResultSettingsSchema.safeExtend({
    expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
  });
export type SurveyResultSettingsUpdate = z.infer<
  typeof updateSurveyResultSettingsSchema
>;

/** Chỉ dùng trong transaction đã kiểm quyền, hoặc khi tạo ảnh chụp tổng hợp. */
export async function readSurveyResultSettings(
  tx: Prisma.TransactionClient,
): Promise<SurveyResultSettingsDTO> {
  const row = await tx.systemSetting.findUnique({
    where: { key: SURVEY_RESULT_SETTINGS_KEY },
  });
  if (!row) return { ...DEFAULT_SURVEY_RESULT_SETTINGS, updatedAt: null };
  const parsed = surveyResultSettingsSchema.safeParse(row.value);
  if (!parsed.success)
    throw new AuthError(
      "Cấu hình kết quả chưa hợp lệ. Quản trị viên cần kiểm tra lại.",
      503,
      "INVALID_RESULT_SETTINGS",
    );
  return { ...parsed.data, updatedAt: row.updatedAt.toISOString() };
}

export async function getSurveyResultSettings(
  actor: AuthActor,
): Promise<SurveyResultSettingsDTO> {
  requireCan(actor, "campaign-settings:read");
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "campaign-settings:read");
    return readSurveyResultSettings(tx);
  });
}

export async function setSurveyResultSettings(
  actor: AuthActor,
  input: SurveyResultSettingsUpdate,
): Promise<SurveyResultSettingsDTO> {
  requireCan(actor, "campaign-settings:write");
  const { expectedUpdatedAt, ...settings } = parseInput(
    updateSurveyResultSettingsSchema,
    input,
  );
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "campaign-settings:write");
    const previous = await readSurveyResultSettings(tx);
    const expected =
      expectedUpdatedAt === null ? null : new Date(expectedUpdatedAt).getTime();
    const current =
      previous.updatedAt === null
        ? null
        : new Date(previous.updatedAt).getTime();
    if (expected !== current)
      throw new AuthError(
        "Cấu hình đã thay đổi. Hãy tải lại trước khi lưu.",
        409,
        "RESULT_SETTINGS_CONFLICT",
      );
    const updatedAt = new Date(
      Math.max(Date.now(), current === null ? 0 : current + 1),
    );
    const row = await tx.systemSetting.upsert({
      where: { key: SURVEY_RESULT_SETTINGS_KEY },
      create: {
        key: SURVEY_RESULT_SETTINGS_KEY,
        value: settings,
        updatedAt,
        updatedById: fresh.userId,
      },
      update: { value: settings, updatedAt, updatedById: fresh.userId },
    });
    // Không chép danh sách từ khóa vào log; quản trị viên xem qua cấu hình có quyền.
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "SURVEY_RESULT_SETTINGS_CHANGED",
        objectType: "SystemSetting",
        objectId: SURVEY_RESULT_SETTINGS_KEY,
        redactedSummary: {
          ratingBands: settings.ratingBands,
          keywordCount: settings.sensitiveKeywords.length,
          success: true,
        },
      },
    });
    return { ...settings, updatedAt: row.updatedAt.toISOString() };
  });
}
