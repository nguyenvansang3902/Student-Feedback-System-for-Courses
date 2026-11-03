import type { Prisma } from "../../generated/prisma/client";
import type { AuthActor } from "../auth/types";
import { AuthError } from "../auth/types";
import { parseInput } from "./access";
import { workflowHash, workflowTransaction } from "./workflow-access";
import {
  anomalySettingsSchema,
  anomalySettingsValueSchema,
} from "./survey-anomaly-types";
import type { AnomalySettings } from "../survey-anomaly-contract";
export async function readAnomalySettings(
  tx: Prisma.TransactionClient,
): Promise<AnomalySettings> {
  const row = await tx.systemSetting.findUnique({
    where: { key: "SURVEY_ANOMALY_SETTINGS" },
    select: { value: true },
  });
  const parsed = anomalySettingsValueSchema.safeParse(row?.value ?? {});
  if (!parsed.success)
    throw new AuthError(
      "Cấu hình cảnh báo bất thường chưa hợp lệ.",
      503,
      "ANOMALY_SETTINGS_INVALID",
    );
  return parsed.data;
}
export async function getAnomalySettings(actor: AuthActor) {
  return workflowTransaction(actor, "anomalies:settings:read", (tx) =>
    readAnomalySettings(tx),
  );
}
export async function updateAnomalySettings(actor: AuthActor, input: unknown) {
  const data = parseInput(anomalySettingsSchema, input),
    requestHash = workflowHash(data);
  return workflowTransaction(
    actor,
    "anomalies:settings:write",
    async (tx, fresh) => {
      const current = await readAnomalySettings(tx),
        previous = await tx.auditLog.findFirst({
          where: {
            action: "ANOMALY_SETTINGS_UPDATED",
            objectId: data.requestId,
          },
        });
      if (previous) {
        if (
          previous.actorId !== fresh.userId ||
          (previous.redactedSummary as { requestHash?: unknown })
            ?.requestHash !== requestHash
        )
          throw new AuthError(
            "Mã yêu cầu đã dùng cho dữ liệu khác.",
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
        minResponses: data.minResponses,
        uniformRate: data.uniformRate,
        scoreDelta: data.scoreDelta,
        revision: current.revision + 1,
      };
      await tx.systemSetting.upsert({
        where: { key: "SURVEY_ANOMALY_SETTINGS" },
        create: {
          key: "SURVEY_ANOMALY_SETTINGS",
          value,
          updatedById: fresh.userId,
        },
        update: { value, updatedById: fresh.userId },
      });
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "ANOMALY_SETTINGS_UPDATED",
          objectType: "SurveyAnomalySettings",
          objectId: data.requestId,
          redactedSummary: { requestHash, revision: value.revision },
        },
      });
      return value;
    },
  );
}
