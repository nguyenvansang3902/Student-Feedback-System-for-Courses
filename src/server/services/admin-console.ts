import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getDb } from "../../lib/db";
import { AuthError } from "../auth/types";
import { hashPassword } from "../auth/password";
import { encryptMfaSecret, getMfaKeyVersion } from "../auth/mfa-crypto";
import { lockAdminMutations, revokeUserAccess } from "./access";

import { authorizeConsole, type ServerConsoleActor } from "../policies/console";

export async function createConsoleAdmin(
  actor: ServerConsoleActor | null,
  input: unknown,
) {
  authorizeConsole(actor);
  const data = z
    .object({
      loginCode: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_.-]{3,32}$/),
      email: z.email().max(254),
      displayName: z.string().trim().min(1).max(160),
      password: z.string().min(10).max(4096),
    })
    .strict()
    .parse(input);
  const passwordHash = await hashPassword(data.password);
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    if (
      await tx.user.findFirst({
        where: { OR: [{ loginCode: data.loginCode }, { email: data.email }] },
        select: { id: true },
      })
    )
      throw new AuthError(
        "Mã định danh hoặc email đã được sử dụng.",
        409,
        "CONFLICT",
      );
    const user = await tx.user.create({
      data: {
        loginCode: data.loginCode,
        email: data.email.toLowerCase(),
        displayName: data.displayName,
        passwordHash,
        mustChangePassword: false,
        status: "ACTIVE",
        roles: {
          create: { role: "ADMIN", scopeType: "GLOBAL", scopeKey: "GLOBAL" },
        },
      },
      select: { id: true, loginCode: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "ADMIN_CREATED_BY_CONSOLE",
        objectType: "User",
        objectId: user.id,
        redactedSummary: {
          reasonProvided: true,
          reasonLength: actor.reason.length,
          source: "server-console",
        },
      },
    });
    return user;
  });
}

export async function resetConsoleAdminMfa(
  actor: ServerConsoleActor | null,
  input: unknown,
) {
  authorizeConsole(actor);
  const data = z
    .object({
      loginCode: z.string().trim().min(1).max(32),
      confirmation: z.string().min(1).max(32),
    })
    .strict()
    .parse(input);
  if (data.loginCode !== data.confirmation)
    throw new AuthError("Mã xác nhận không khớp tài khoản cần đặt lại.");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const user = await tx.user.findUnique({
      where: { loginCode: data.loginCode },
      include: { roles: true },
    });
    if (
      !user ||
      !user.roles.some(
        (grant) => grant.role === "ADMIN" && grant.scopeType === "GLOBAL",
      )
    )
      throw new AuthError("Không tìm thấy tài khoản ADMIN.", 404, "NOT_FOUND");
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
    await tx.totpCredential.updateMany({
      where: { userId: user.id },
      data: {
        encryptedSecret: encryptMfaSecret(
          randomBytes(20).toString("hex"),
          user.id,
        ),
        keyVersion: getMfaKeyVersion(),
        enabledAt: null,
        pendingExpiresAt: null,
        lastUsedStep: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.totpRecoveryCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await revokeUserAccess(tx, user.id);
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "MFA_RESET_BY_CONSOLE",
        objectType: "User",
        objectId: user.id,
        redactedSummary: {
          reasonProvided: true,
          reasonLength: actor.reason.length,
          source: "server-console",
        },
      },
    });
    return { id: user.id, loginCode: user.loginCode };
  });
}
