import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan, type PolicyAction } from "../policies/can";
import { assertFreshActor, lockAdminMutations } from "./access";

export const workflowHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function workflowMissing(): never {
  throw new AuthError(
    "Không tìm thấy hồ sơ trong phạm vi được phép.",
    404,
    "NOT_FOUND",
  );
}
export function workflowConflict(): never {
  throw new AuthError(
    "Dữ liệu đã thay đổi hoặc mã yêu cầu đã được dùng. Tải lại trước khi tiếp tục.",
    409,
    "REVISION_CONFLICT",
  );
}
export function assertWorkflowWritable(lockedAt: Date | null) {
  if (lockedAt)
    throw new AuthError(
      "Học kỳ đã khóa sổ, dữ liệu chỉ được xem.",
      409,
      "SEMESTER_LOCKED",
    );
}
export async function workflowTransaction<T>(
  actor: AuthActor,
  action: PolicyAction,
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
): Promise<T> {
  requireCan(actor, action);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, action);
      return operation(tx, fresh);
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
