import { Role } from "../../generated/prisma/enums";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError } from "./types";

/** FR-08: cấu hình chỉ bổ sung vai trò; ADMIN không thể bị tắt 2FA. */
export function normalizeRequiredRoles(value: unknown): Role[] {
  if (value === undefined) return ["ADMIN"];
  if (
    !Array.isArray(value) ||
    !value.every((role) => Object.values(Role).includes(role))
  ) {
    throw new AuthError(
      "Cấu hình xác thực hai bước không hợp lệ.",
      503,
      "MFA_CONFIGURATION_ERROR",
    );
  }
  return [...new Set<Role>(["ADMIN", ...value])];
}

export async function getRequiredMfaRoles(
  db: Prisma.TransactionClient | PrismaClient = getDb(),
): Promise<Role[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "MFA_REQUIRED_ROLES" },
  });
  return normalizeRequiredRoles(setting?.value);
}

export async function isMfaRequired(
  roles: readonly Role[],
  db: Prisma.TransactionClient | PrismaClient = getDb(),
): Promise<boolean> {
  const required = await getRequiredMfaRoles(db);
  return roles.some((role) => required.includes(role));
}
