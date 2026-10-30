import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getRequiredMfaRoles } from "../auth/mfa-policy";
import { AuthError, type AuthActor } from "../auth/types";
import { isValidGrant } from "../policies/can";

export const pageInput = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const objectId = z.uuid();

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AuthError("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", 400, "INVALID_INPUT");
  return parsed.data;
}

/** Kiểm lại phiên, quyền và chính sách đang lưu, không tin actor.mfa từ đối số. */
export async function assertFreshActor(tx: Prisma.TransactionClient, actor: AuthActor): Promise<AuthActor> {
  const session = await tx.userSession.findUnique({
    where: { id: actor.sessionId }, include: { user: { include: { roles: true } } },
  });
  if (!session || session.userId !== actor.userId || session.familyId !== actor.familyId ||
    session.revokedAt || session.expiresAt.getTime() <= Date.now() ||
    session.purpose !== "FULL" || session.user.status !== "ACTIVE" || session.user.mustChangePassword)
    throw new AuthError("Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.", 401, "INVALID_SESSION");
  const assignments: NonNullable<AuthActor["assignments"]> = [];
  for (const grant of session.user.roles) {
    if (!isValidGrant(grant)) continue;
    if (grant.departmentId && !(await tx.department.findFirst({ where: {
      id: grant.departmentId, isActive: true, faculty: { isActive: true },
    }, select: { id: true } }))) continue;
    if (grant.facultyId && !(await tx.faculty.findFirst({
      where: { id: grant.facultyId, isActive: true }, select: { id: true },
    }))) continue;
    assignments.push(grant);
  }
  const roles = [...new Set(assignments.map((grant) => grant.role))];
  const requiredRoles = await getRequiredMfaRoles(tx);
  const mfaRequired = roles.some((role) => requiredRoles.includes(role));
  const mfa = !!session.mfaVerifiedAt;
  if (mfaRequired && !mfa)
    throw new AuthError("Cần hoàn tất xác thực hai bước.", 403, "MFA_REQUIRED");
  return {
    ...actor, roles, assignments, mfa, mfaRequired, purpose: "FULL",
    mustChangePassword: false,
    loginCode: session.user.loginCode, email: session.user.email, displayName: session.user.displayName,
  };
}

/** Mọi thay đổi quyền/chính sách cùng khóa một hàng ổn định trước khi đọc lại actor. */
export async function lockAdminMutations(tx: Prisma.TransactionClient): Promise<void> {
  // INSERT/ON DUPLICATE KEY là locking current read. Không dùng ORM upsert với
  // update rỗng: Prisma có thể SELECT trước, tạo snapshot REPEATABLE READ cũ
  // trước khi chờ mutex, rồi đọc quyền/số ADMIN đã lỗi thời sau khi được khóa.
  await tx.$executeRaw`
    INSERT INTO SystemSetting (\`key\`, value, updatedAt)
    VALUES ('ADMIN_MUTATION_LOCK', JSON_OBJECT(), NOW(3))
    ON DUPLICATE KEY UPDATE \`key\` = \`key\`
  `;
  await tx.$queryRaw`SELECT \`key\` FROM SystemSetting WHERE \`key\` = 'ADMIN_MUTATION_LOCK' FOR UPDATE`;
}

export async function revokeUserAccess(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const now = new Date();
  await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  await tx.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
}
