import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import type { Role } from "../../generated/prisma/enums";
import { getRequiredMfaRoles } from "../auth/mfa-policy";
import type { AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";

const policyInput = z.object({ requiredRoles: z.array(z.enum([
  "SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA",
])).min(1).max(10).refine((roles) => roles.includes("ADMIN") && new Set(roles).size === roles.length) }).strict();

export async function getMfaPolicy(actor: AuthActor): Promise<{ requiredRoles: Role[] }> {
  requireCan(actor, "mfa-policy:read");
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "mfa-policy:read");
    return { requiredRoles: await getRequiredMfaRoles(tx) };
  });
}

export async function setMfaPolicy(actor: AuthActor, input: { requiredRoles: Role[] }): Promise<{ requiredRoles: Role[] }> {
  requireCan(actor, "mfa-policy:write");
  const { requiredRoles } = parseInput(policyInput, input);
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "mfa-policy:write");
    const previous = await getRequiredMfaRoles(tx);
    const newlyRequired = requiredRoles.filter((role) => !previous.includes(role));
    const users = newlyRequired.length ? await tx.user.findMany({ where: { roles: { some: { role: { in: newlyRequired } } } }, select: { id: true }, orderBy: { id: "asc" } }) : [];
    if (users.length) await tx.$queryRaw(Prisma.sql`
      SELECT id FROM User WHERE id IN (${Prisma.join(users.map((user) => user.id))}) ORDER BY id FOR UPDATE
    `);
    await tx.systemSetting.upsert({ where: { key: "MFA_REQUIRED_ROLES" },
      create: { key: "MFA_REQUIRED_ROLES", value: requiredRoles, updatedById: fresh.userId },
      update: { value: requiredRoles, updatedById: fresh.userId },
    });
    const revoked = users.length ? await tx.userSession.updateMany({ where: {
      userId: { in: users.map((user) => user.id) }, revokedAt: null, mfaVerifiedAt: null,
    }, data: { revokedAt: new Date() } }) : { count: 0 };
    await tx.auditLog.create({ data: { actorId: fresh.userId, action: "MFA_POLICY_CHANGED", objectType: "SystemSetting",
      redactedSummary: { before: { requiredRoles: previous }, after: { requiredRoles }, revokedSessions: revoked.count } } });
    return { requiredRoles };
  });
}
