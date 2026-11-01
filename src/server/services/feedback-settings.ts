import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";

export const defaultExamNotice =
  "Phản hồi này không thay thế đơn phúc khảo. Để đề nghị xem lại điểm thi, sinh viên cần thực hiện thủ tục phúc khảo theo quy định của trường.";
export const feedbackSettingsSchema = z
  .object({
    examNotice: z.string().trim().min(20).max(1000),
    allowPreviousSemester: z.boolean(),
    revision: z.number().int().min(1),
    requestId: z.uuid(),
  })
  .strict();
export interface FeedbackSettings {
  examNotice: string;
  allowPreviousSemester: boolean;
  revision: number;
}
const defaults: FeedbackSettings = {
  examNotice: defaultExamNotice,
  allowPreviousSemester: true,
  revision: 1,
};
const valueSchema = feedbackSettingsSchema.omit({ requestId: true });
export async function readFeedbackSettings(
  tx: Prisma.TransactionClient,
): Promise<FeedbackSettings> {
  const row = await tx.systemSetting.findUnique({
    where: { key: "FEEDBACK_SETTINGS" },
    select: { value: true },
  });
  if (!row) return { ...defaults };
  const parsed = valueSchema.safeParse(row.value);
  if (!parsed.success)
    throw new AuthError(
      "Cấu hình phản hồi chưa hợp lệ. Liên hệ đơn vị quản lý.",
      503,
      "FEEDBACK_SETTINGS_INVALID",
    );
  return parsed.data;
}
export async function getFeedbackSettings(
  actor: AuthActor,
): Promise<FeedbackSettings> {
  requireCan(actor, "feedback-settings:read");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "feedback-settings:read");
    return readFeedbackSettings(tx);
  });
}
export async function updateFeedbackSettings(
  actor: AuthActor,
  input: unknown,
): Promise<FeedbackSettings> {
  requireCan(actor, "feedback-settings:write");
  const data = parseInput(feedbackSettingsSchema, input);
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "feedback-settings:write");
    const previous = await tx.auditLog.findFirst({
      where: { action: "FEEDBACK_SETTINGS_UPDATED", objectId: data.requestId },
      select: { actorId: true, redactedSummary: true },
    });
    const current = await readFeedbackSettings(tx);
    if (previous) {
      const summary = previous.redactedSummary as {
        requestHash?: unknown;
      } | null;
      if (previous.actorId !== fresh.userId || summary?.requestHash !== hash)
        throw new AuthError(
          "Mã yêu cầu đã được dùng cho dữ liệu khác.",
          409,
          "REQUEST_CONFLICT",
        );
      return current;
    }
    if (data.revision !== current.revision)
      throw new AuthError(
        "Cấu hình đã thay đổi. Tải lại trước khi lưu.",
        409,
        "REVISION_CONFLICT",
      );
    const value = {
      examNotice: data.examNotice,
      allowPreviousSemester: data.allowPreviousSemester,
      revision: current.revision + 1,
    };
    await tx.systemSetting.upsert({
      where: { key: "FEEDBACK_SETTINGS" },
      create: { key: "FEEDBACK_SETTINGS", value, updatedById: fresh.userId },
      update: { value, updatedById: fresh.userId },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "FEEDBACK_SETTINGS_UPDATED",
        objectType: "FeedbackSettings",
        objectId: data.requestId,
        redactedSummary: { requestHash: hash, revision: value.revision },
      },
    });
    return value;
  });
}
