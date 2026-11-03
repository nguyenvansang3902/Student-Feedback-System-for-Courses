import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { canManageReportSettings } from "../policies/reports";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";
import {
  reportSettingsMutationSchema,
  reportSettingsValueSchema,
  type ReportsSettings,
} from "./reports-types";

export const REPORT_SETTINGS_KEY = "REPORT_SETTINGS";
function authorizeSettings(actor: AuthActor) {
  if (!canManageReportSettings(actor))
    throw new AuthError(
      "Chỉ đơn vị Đảm bảo chất lượng được cấu hình ngưỡng báo cáo.",
      403,
      "REPORT_SETTINGS_FORBIDDEN",
    );
}
export async function readReportSettings(
  tx: Prisma.TransactionClient,
): Promise<ReportsSettings> {
  const row = await tx.systemSetting.findUnique({
    where: { key: REPORT_SETTINGS_KEY },
    select: { value: true },
  });
  const parsed = reportSettingsValueSchema.safeParse(row?.value ?? {});
  if (!parsed.success)
    throw new AuthError(
      "Ngưỡng báo cáo chưa hợp lệ. Liên hệ đơn vị quản lý.",
      503,
      "REPORT_SETTINGS_INVALID",
    );
  return parsed.data;
}
export async function getReportsSettings(
  actor: AuthActor,
): Promise<ReportsSettings> {
  requireCan(actor, "reports:settings:read");
  authorizeSettings(actor);
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "reports:settings:read");
    authorizeSettings(fresh);
    return readReportSettings(tx);
  });
}
export async function updateReportsSettings(
  actor: AuthActor,
  input: unknown,
): Promise<ReportsSettings> {
  requireCan(actor, "reports:settings:write");
  authorizeSettings(actor);
  const data = parseInput(reportSettingsMutationSchema, input),
    requestHash = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "reports:settings:write");
    authorizeSettings(fresh);
    const current = await readReportSettings(tx);
    const prior = await tx.auditLog.findFirst({
      where: { action: "REPORT_SETTINGS_UPDATED", objectId: data.requestId },
      select: { actorId: true, redactedSummary: true },
    });
    if (prior) {
      if (
        prior.actorId !== fresh.userId ||
        (prior.redactedSummary as { requestHash?: unknown })?.requestHash !==
          requestHash
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
        "Ngưỡng báo cáo đã thay đổi. Tải lại trước khi lưu.",
        409,
        "REVISION_CONFLICT",
      );
    const value = {
      minFeedbackRecords: data.minFeedbackRecords,
      minInspectionCases: data.minInspectionCases,
      revision: current.revision + 1,
    };
    await tx.systemSetting.upsert({
      where: { key: REPORT_SETTINGS_KEY },
      create: { key: REPORT_SETTINGS_KEY, value, updatedById: fresh.userId },
      update: { value, updatedById: fresh.userId },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "REPORT_SETTINGS_UPDATED",
        objectType: "ReportSettings",
        objectId: data.requestId,
        redactedSummary: { requestHash, revision: value.revision },
      },
    });
    return value;
  });
}
export const getReportSettings = getReportsSettings;
export const updateReportSettings = updateReportsSettings;
