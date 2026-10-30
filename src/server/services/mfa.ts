import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import {
  AuthError,
  type AuthActor,
  type AuthContext,
  type SessionTokens,
} from "../auth/types";
import { authorizeAuthAction } from "../policies/auth";
import { requireCan } from "../policies/can";
import { assertFreshActor } from "./access";
import { assertLoginAllowed, rateKey } from "../auth/rate-limit";
import { checkMfaRate, mfaRateKeys, recordMfaFailure } from "../auth/mfa-rate";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaKeyVersion,
  hashRecoveryCode,
  matchTotpStep,
  mfaUri,
  newMfaSecret,
  newRecoveryCodes,
  normalizeRecoveryCode,
} from "../auth/mfa-crypto";
import {
  createAuthenticatedSession,
  requireFreshActor,
  tokensFor,
} from "./auth";

function notReady(): AuthError {
  return new AuthError(
    "Yêu cầu xác thực hai bước đã hết hạn. Vui lòng đăng nhập lại.",
    403,
    "MFA_SESSION_REQUIRED",
  );
}
async function lockUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
}
async function lockCredential(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT userId FROM TotpCredential WHERE userId = ${userId} FOR UPDATE`;
}

export async function getMfaStatus(
  actor: AuthActor,
): Promise<{ required: boolean; enabled: boolean; purpose: string }> {
  authorizeAuthAction(actor, "mfa-status");
  const fresh = await requireFreshActor(actor);
  authorizeAuthAction(fresh, "mfa-status");
  const credential = await getDb().totpCredential.findUnique({
    where: { userId: actor.userId },
    select: { enabledAt: true },
  });
  return {
    required: !!fresh.mfaRequired,
    enabled: !!credential?.enabledAt,
    purpose: fresh.purpose ?? "FULL",
  };
}

export async function startMfaSetup(
  actor: AuthActor,
  context: AuthContext,
): Promise<{ secret: string; qrDataUrl: string }> {
  authorizeAuthAction(actor, "mfa-setup");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const secret = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-setup");
    await lockCredential(tx, actor.userId);
    const current = await tx.totpCredential.findUnique({
      where: { userId: actor.userId },
    });
    if (current?.enabledAt) throw notReady();
    if (current?.pendingExpiresAt && current.pendingExpiresAt > new Date()) {
      return decryptMfaSecret(
        current.encryptedSecret,
        actor.userId,
        current.keyVersion,
      );
    }
    const value = newMfaSecret();
    const data = {
      encryptedSecret: encryptMfaSecret(value, actor.userId),
      keyVersion: getMfaKeyVersion(),
      enabledAt: null,
      pendingExpiresAt: new Date(Date.now() + 300000),
      lastUsedStep: null,
      failedAttempts: 0,
      lockedUntil: null,
    };
    await tx.totpCredential.upsert({
      where: { userId: actor.userId },
      create: { userId: actor.userId, ...data },
      update: data,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "MFA_SETUP_STARTED",
        objectType: "TotpCredential",
        objectId: actor.userId,
      },
    });
    return value;
  });
  return {
    secret,
    qrDataUrl: await QRCode.toDataURL(mfaUri(secret, actor.loginCode), {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
    }),
  };
}

async function consumeTotp(
  tx: Prisma.TransactionClient,
  userId: string,
  code: string,
  pending: boolean,
): Promise<boolean> {
  await lockCredential(tx, userId);
  const credential = await tx.totpCredential.findUnique({ where: { userId } });
  if (
    !credential ||
    (pending
      ? !!credential.enabledAt ||
        !credential.pendingExpiresAt ||
        credential.pendingExpiresAt <= new Date()
      : !credential.enabledAt)
  )
    throw notReady();
  const step = await matchTotpStep(
    decryptMfaSecret(credential.encryptedSecret, userId, credential.keyVersion),
    code,
    credential.lastUsedStep,
  );
  if (step === null) return false;
  const changed = await tx.totpCredential.updateMany({
    where: { userId, lastUsedStep: credential.lastUsedStep },
    data: { lastUsedStep: step, failedAttempts: 0, lockedUntil: null },
  });
  return changed.count === 1;
}

export async function confirmMfaSetup(
  actor: AuthActor,
  input: { code: string },
  context: AuthContext,
): Promise<{ tokens: SessionTokens; recoveryCodes: string[] }> {
  authorizeAuthAction(actor, "mfa-confirm");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const recoveryCodes = newRecoveryCodes();
  const created = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-confirm");
    if (!(await consumeTotp(tx, actor.userId, input.code, true))) return null;
    await tx.totpCredential.update({
      where: { userId: actor.userId },
      data: { enabledAt: new Date(), pendingExpiresAt: null },
    });
    await tx.totpRecoveryCode.updateMany({
      where: { userId: actor.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.totpRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({
        userId: actor.userId,
        codeHash: hashRecoveryCode(actor.userId, code),
      })),
    });
    await tx.userSession.updateMany({
      where: { userId: actor.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const user = await tx.user.findUnique({
      where: { id: actor.userId },
      include: { roles: true },
    });
    if (!user) throw notReady();
    const result = await createAuthenticatedSession(
      tx,
      user,
      context,
      "FULL",
      true,
    );
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "MFA_ENABLED",
        objectType: "TotpCredential",
        objectId: actor.userId,
        redactedSummary: { recoveryCodeCount: 10 },
      },
    });
    return result;
  });
  if (!created) return recordMfaFailure(keys);
  return {
    tokens: await tokensFor(
      created.actor,
      created.refreshToken,
      created.refreshExpiresAt,
    ),
    recoveryCodes,
  };
}

export async function verifyMfa(
  actor: AuthActor,
  input: { code: string },
  context: AuthContext,
): Promise<SessionTokens> {
  authorizeAuthAction(actor, "mfa-verify");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const created = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-verify");
    let valid = false;
    const recovery = normalizeRecoveryCode(input.code);
    if (recovery) {
      await lockCredential(tx, actor.userId);
      const credential = await tx.totpCredential.findUnique({
        where: { userId: actor.userId },
        select: { enabledAt: true },
      });
      if (!credential?.enabledAt) throw notReady();
      const used = await tx.totpRecoveryCode.updateMany({
        where: {
          userId: actor.userId,
          codeHash: hashRecoveryCode(actor.userId, recovery),
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
      valid = used.count === 1;
    } else {
      valid = await consumeTotp(tx, actor.userId, input.code, false);
    }
    if (!valid) return null;
    const consumed = await tx.userSession.updateMany({
      where: {
        id: actor.sessionId,
        revokedAt: null,
        purpose: "MFA_VERIFY",
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (consumed.count !== 1) throw notReady();
    const user = await tx.user.findUnique({
      where: { id: actor.userId },
      include: { roles: true },
    });
    if (!user) throw notReady();
    const result = await createAuthenticatedSession(
      tx,
      user,
      context,
      "FULL",
      true,
    );
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: recovery ? "MFA_RECOVERY_USED" : "MFA_VERIFIED",
        objectType: "UserSession",
        objectId: result.actor.sessionId,
      },
    });
    return result;
  });
  if (!created) return recordMfaFailure(keys);
  return tokensFor(
    created.actor,
    created.refreshToken,
    created.refreshExpiresAt,
  );
}

/** Mã mới bắt buộc: không nhận recovery cho thay đổi quyền/đặt lại 2FA. */
export async function assertStepUp(
  actor: AuthActor,
  code: string,
  context: AuthContext,
): Promise<void> {
  authorizeAuthAction(actor, "step-up");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const valid = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "step-up");
    return consumeTotp(tx, actor.userId, code, false);
  });
  if (!valid) return recordMfaFailure(keys);
}

export async function resetUserMfa(
  actor: AuthActor,
  targetUserId: string,
  input: { reason: string },
  context: AuthContext,
): Promise<void> {
  authorizeAuthAction(actor, "admin");
  requireCan(actor, "mfa:reset");
  if (targetUserId === actor.userId)
    throw new AuthError(
      "Cần quản trị viên khác đặt lại 2FA, hoặc dùng script máy chủ.",
      403,
      "FORBIDDEN",
    );
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500)
    throw new AuthError(
      "Lý do phải có từ 10 đến 500 ký tự.",
      400,
      "INVALID_REASON",
    );
  await getDb().$transaction(async (tx) => {
    // Không dùng Prisma upsert(update:{}) ở đây: nó có thể đọc snapshot trước khóa.
    await tx.$executeRaw`INSERT INTO SystemSetting (\`key\`, value, updatedAt)
      VALUES ('ADMIN_MUTATION_LOCK', '0', ${new Date()})
      ON DUPLICATE KEY UPDATE \`key\` = \`key\``;
    await tx.$queryRaw`SELECT \`key\` FROM SystemSetting WHERE \`key\` = 'ADMIN_MUTATION_LOCK' FOR UPDATE`;
    for (const userId of [actor.userId, targetUserId].sort())
      await lockUser(tx, userId);
    const fresh = await assertFreshActor(tx, actor);
    authorizeAuthAction(fresh, "admin");
    requireCan(fresh, "mfa:reset");
    const target = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!target)
      throw new AuthError("Không tìm thấy tài khoản.", 404, "NOT_FOUND");
    await lockCredential(tx, targetUserId);
    // Xóa khả năng giải mã secret cũ mà không xóa lịch sử hoặc hàng khóa.
    await tx.totpCredential.updateMany({
      where: { userId: targetUserId },
      data: {
        encryptedSecret: encryptMfaSecret(
          randomBytes(20).toString("hex"),
          targetUserId,
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
      where: { userId: targetUserId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.userSession.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "MFA_RESET_BY_ADMIN",
        objectType: "User",
        objectId: targetUserId,
        redactedSummary: {
          reasonProvided: true,
          reasonLength: reason.length,
          requestIpHash: rateKey("audit-ip", context.ip),
        },
      },
    });
  });
}
