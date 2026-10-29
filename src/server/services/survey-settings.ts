import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";

export const SURVEY_SETTINGS_KEY = "SURVEY_DEFAULTS";
export const surveySettingsSchema = z
  .object({
    minResponses: z.number().int().min(1).max(1000),
    minRate: z.number().min(0).max(1),
    warningScore: z.number().min(1).max(5),
    explanationDays: z.number().int().min(1).max(365),
    multiTeacherWarningThreshold: z.number().int().min(2).max(20),
  })
  .strict();
export type SurveySettings = z.infer<typeof surveySettingsSchema>;
export interface SurveySettingsDTO extends SurveySettings {
  updatedAt: string | null;
}
export const DEFAULT_SURVEY_SETTINGS: Readonly<SurveySettings> = Object.freeze({
  minResponses: 5,
  minRate: 0.3,
  warningScore: 3,
  explanationDays: 14,
  multiTeacherWarningThreshold: 2,
});
export const updateSurveySettingsSchema = surveySettingsSchema
  .extend({
    expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export type SurveySettingsUpdate = z.infer<typeof updateSurveySettingsSchema>;

/** Chỉ gọi bên trong transaction của service đã kiểm actor hoặc scheduler nội bộ. */
export async function readSurveySettings(
  tx: Prisma.TransactionClient,
): Promise<SurveySettingsDTO> {
  const row = await tx.systemSetting.findUnique({
    where: { key: SURVEY_SETTINGS_KEY },
  });
  if (!row) return { ...DEFAULT_SURVEY_SETTINGS, updatedAt: null };
  if (!row.value || typeof row.value !== "object" || Array.isArray(row.value))
    throw new AuthError(
      "Cấu hình khảo sát chưa hợp lệ. Quản trị viên cần kiểm tra lại.",
      503,
      "INVALID_SURVEY_SETTINGS",
    );
  const parsed = surveySettingsSchema.safeParse({
    ...DEFAULT_SURVEY_SETTINGS,
    ...row.value,
  });
  if (!parsed.success)
    throw new AuthError(
      "Cấu hình khảo sát chưa hợp lệ. Quản trị viên cần kiểm tra lại.",
      503,
      "INVALID_SURVEY_SETTINGS",
    );
  return { ...parsed.data, updatedAt: row.updatedAt.toISOString() };
}

export async function getSurveySettings(
  actor: AuthActor,
): Promise<SurveySettingsDTO> {
  requireCan(actor, "campaign-settings:read");
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "campaign-settings:read");
    return readSurveySettings(tx);
  });
}

export async function setSurveySettings(
  actor: AuthActor,
  input: SurveySettingsUpdate,
): Promise<SurveySettingsDTO> {
  requireCan(actor, "campaign-settings:write");
  const { expectedUpdatedAt, ...settings } = parseInput(
    updateSurveySettingsSchema,
    input,
  );
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "campaign-settings:write");
    const previous = await readSurveySettings(tx);
    const expected =
      expectedUpdatedAt === null ? null : new Date(expectedUpdatedAt).getTime();
    const current =
      previous.updatedAt === null
        ? null
        : new Date(previous.updatedAt).getTime();
    if (expected !== current)
      throw new AuthError(
        "Cấu hình đã thay đổi trong phiên khác. Hãy tải lại trước khi lưu.",
        409,
        "SURVEY_SETTINGS_CONFLICT",
      );
    // Timestamp tăng ngay cả khi hai lượt ghi xảy ra trong cùng một millisecond.
    const updatedAt = new Date(
      Math.max(Date.now(), current === null ? 0 : current + 1),
    );
    const row = await tx.systemSetting.upsert({
      where: { key: SURVEY_SETTINGS_KEY },
      create: {
        key: SURVEY_SETTINGS_KEY,
        value: settings,
        updatedById: fresh.userId,
        updatedAt,
      },
      update: { value: settings, updatedById: fresh.userId, updatedAt },
    });
    const before: SurveySettings = {
      minResponses: previous.minResponses,
      minRate: previous.minRate,
      warningScore: previous.warningScore,
      explanationDays: previous.explanationDays,
      multiTeacherWarningThreshold: previous.multiTeacherWarningThreshold,
    };
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "SURVEY_SETTINGS_CHANGED",
        objectType: "SystemSetting",
        objectId: SURVEY_SETTINGS_KEY,
        redactedSummary: { before, after: settings, success: true },
      },
    });
    return { ...settings, updatedAt: row.updatedAt.toISOString() };
  });
}
