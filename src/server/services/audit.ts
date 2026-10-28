import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import type { AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, pageInput, parseInput } from "./access";

const inputSchema = pageInput.extend({
  action: z.string().regex(/^[A-Z0-9_.:-]{1,100}$/i).optional(),
  actorId: z.uuid().optional(), objectType: z.string().regex(/^[A-Za-z0-9_]{1,64}$/).optional(),
  from: z.iso.datetime({ offset: true }).optional(), to: z.iso.datetime({ offset: true }).optional(),
}).strict().refine((input) => !input.from || !input.to || new Date(input.from) <= new Date(input.to));

const safeKeys = new Set([
  "before", "after", "status", "roles", "role", "scopeType", "facultyId", "departmentId",
  "purpose", "mfa", "success", "count", "revokedSessions", "requiredRoles", "enabled",
  "method", "mfaRequired", "usedRecoveryCode", "recoveryCodesGenerated",
  "reasonProvided", "reasonLength", "source", "recoveryCodeCount",
  "kind", "size", "console", "futureModules", "created", "newUsers",
  "familyId", "sourceId", "version", "revision", "groupCount", "questionCount", "previousDefaultCount", "isDefault",
  "notificationStatus", "recipients", "sent", "failed",
]);
const safeText = new Set([
  "ACTIVE", "DISABLED", "PENDING_ACTIVATION", "GLOBAL", "FACULTY", "DEPARTMENT",
  "SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA",
  "FULL", "PASSWORD_CHANGE", "MFA_SETUP", "MFA_VERIFY", "TOTP", "RECOVERY_CODE",
  "totp", "recovery", "password", "server-console",
  "NHAP", "DA_KHOA",
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fieldText = new Map<string, ReadonlySet<string>>([
  ["kind", new Set(["students", "teachers", "sections", "enrollments"])],
  ["size", new Set(["small", "medium", "large"])],
  ["notificationStatus", new Set(["PENDING", "SENT", "FAILED", "NO_RECIPIENT"])],
  ["purpose", new Set(["ACTIVATION", "PASSWORD_RESET", "FULL", "PASSWORD_CHANGE", "MFA_SETUP", "MFA_VERIFY"])],
]);
const fieldBoolean = new Set(["console", "futureModules", "reasonProvided", "isDefault"]);
const fieldNumber = new Set(["created", "newUsers", "reasonLength", "groupCount", "questionCount", "previousDefaultCount", "recipients", "sent", "failed"]);

function redactField(key: string, value: unknown, depth: number): Prisma.InputJsonValue | null {
  if (depth > 4) return null;
  if (key === "familyId" || key === "sourceId") return typeof value === "string" && uuid.test(value) ? value : null;
  if (key === "version" || key === "revision") return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : null;
  const allowed = fieldText.get(key);
  if (allowed) return typeof value === "string" && allowed.has(value) ? value : null;
  if (fieldBoolean.has(key)) return typeof value === "boolean" ? value : null;
  if (fieldNumber.has(key)) return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  return redactAuditSummary(value, depth);
}

/** Lớp bảo vệ đầu ra thứ hai: không phát lại payload/log cũ có trường ngoài allowlist. */
export function redactAuditSummary(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return safeText.has(value) || uuid.test(value) ? value : null;
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => redactAuditSummary(entry, depth + 1));
  if (typeof value !== "object") return null;
  const result: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (safeKeys.has(key)) result[key] = redactField(key, entry, depth + 1);
  }
  return result;
}

export async function listAuditLogs(actor: AuthActor, input: {
  page?: number; pageSize?: number; action?: string; actorId?: string; objectType?: string; from?: string; to?: string;
} = {}) {
  requireCan(actor, "audit:list");
  const { page, pageSize, action, actorId, objectType, from, to } = parseInput(inputSchema, input);
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "audit:list");
    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}), ...(actorId ? { actorId } : {}), ...(objectType ? { objectType } : {}),
      ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    };
    const [records, total] = await Promise.all([
      tx.auditLog.findMany({ where, select: { id: true, actorId: true, action: true, objectType: true, objectId: true, redactedSummary: true, occurredAt: true },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      tx.auditLog.count({ where }),
    ]);
    const items = records.map((record) => ({ ...record, redactedSummary: redactAuditSummary(record.redactedSummary), occurredAt: record.occurredAt.toISOString() }));
    return { items, total, page, pageSize };
  });
}

// Không có API detail theo ID cho AuditLog ở Tuần 4: chỉ danh sách lọc/phân trang.
