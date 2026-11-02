import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";

const days = z.number().int().min(1).max(365);
export const workflowValueSchema = z
  .object({
    normalAcceptDays: days.default(2),
    normalReplyDays: days.default(7),
    complaintReplyDays: days.default(5),
    officeAcceptDays: days.default(2),
    officeReplyDays: days.default(5),
    inspectionAcceptDays: days.default(3),
    inspectionCompleteDays: days.default(30),
    escalationDays: days.default(2),
    dailyFeedbackLimit: z.number().int().min(1).max(100).default(5),
    duplicateHours: z.number().int().min(1).max(168).default(24),
    satisfactionDays: days.default(7),
    reopenDays: days.default(7),
    examReviewDays: days.default(14),
    revision: z.number().int().min(1).default(1),
  })
  .strict();
export const workflowSettingsSchema = workflowValueSchema
  .extend({ requestId: z.uuid() })
  .strict();
export type WorkflowSettings = z.infer<typeof workflowValueSchema>;
export async function readWorkflowSettings(
  tx: Prisma.TransactionClient,
): Promise<WorkflowSettings> {
  const row = await tx.systemSetting.findUnique({
    where: { key: "WORKFLOW_SETTINGS" },
    select: { value: true },
  });
  const value = workflowValueSchema.safeParse(row?.value ?? {});
  if (!value.success)
    throw new AuthError(
      "Cấu hình thời hạn chưa hợp lệ. Liên hệ đơn vị quản lý.",
      503,
      "WORKFLOW_SETTINGS_INVALID",
    );
  return value.data;
}
export async function getWorkflowSettings(actor: AuthActor) {
  requireCan(actor, "feedback-settings:read");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "feedback-settings:read");
    return readWorkflowSettings(tx);
  });
}
export async function updateWorkflowSettings(actor: AuthActor, input: unknown) {
  requireCan(actor, "feedback-settings:write");
  const data = parseInput(workflowSettingsSchema, input);
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "feedback-settings:write");
    const current = await readWorkflowSettings(tx);
    const prior = await tx.auditLog.findFirst({
      where: { action: "WORKFLOW_SETTINGS_UPDATED", objectId: data.requestId },
      select: { actorId: true, redactedSummary: true },
    });
    if (prior) {
      if (
        prior.actorId !== fresh.userId ||
        (prior.redactedSummary as { requestHash?: unknown })?.requestHash !==
          hash
      )
        throw new AuthError(
          "Mã yêu cầu đã dùng cho dữ liệu khác.",
          409,
          "REQUEST_CONFLICT",
        );
      return current;
    }
    if (current.revision !== data.revision)
      throw new AuthError(
        "Cấu hình đã thay đổi. Tải lại trước khi lưu.",
        409,
        "REVISION_CONFLICT",
      );
    const value = workflowValueSchema.parse(
      Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== "requestId"),
      ),
    );
    value.revision++;
    await tx.systemSetting.upsert({
      where: { key: "WORKFLOW_SETTINGS" },
      create: { key: "WORKFLOW_SETTINGS", value, updatedById: fresh.userId },
      update: { value, updatedById: fresh.userId },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "WORKFLOW_SETTINGS_UPDATED",
        objectType: "WorkflowSettings",
        objectId: data.requestId,
        redactedSummary: { requestHash: hash, revision: value.revision },
      },
    });
    return value;
  });
}
