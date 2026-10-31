import QRCode from "qrcode";
import type { TotpCredential } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor, type AuthContext } from "../auth/types";
import { authorizeAuthAction } from "../policies/auth";
import { assertLoginAllowed } from "../auth/rate-limit";
import { checkMfaRate, mfaRateKeys, recordMfaFailure } from "../auth/mfa-rate";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaKeyVersion,
  matchTotpStep,
  mfaPeriod,
  mfaUri,
  newMfaSecret,
} from "../auth/mfa-crypto";
import { requireFreshActor } from "./auth";
import { consumeTotp, lockCredential, lockUser } from "./mfa";

const QR_TTL_MS = 60_000;
const CHANGE_TTL_MS = 300_000;
const clearedChange = {
  changeEncryptedSecret: null,
  changeKeyVersion: null,
  changeExpiresAt: null,
  changeSessionId: null,
  changeStartedAt: null,
};

function activeLegacyCredential(
  credential: TotpCredential | null,
): TotpCredential {
  if (!credential?.enabledAt)
    throw new AuthError(
      "Cần bật xác thực hai bước trước khi đổi chu kỳ mã.",
      403,
      "MFA_PERIOD_CHANGE_REQUIRED",
    );
  if (mfaPeriod(credential.periodSeconds) === 60)
    throw new AuthError(
      "Tài khoản đang sử dụng mã xác thực chu kỳ 60 giây.",
      409,
      "MFA_PERIOD_ALREADY_60",
    );
  return credential;
}

function changeDeadline(
  credential: TotpCredential,
  sessionExpiresAt: Date,
): Date | null {
  if (!credential.changeStartedAt) return null;
  return new Date(
    Math.min(
      credential.changeStartedAt.getTime() + CHANGE_TTL_MS,
      sessionExpiresAt.getTime(),
    ),
  );
}

function assertOwnedChange(
  credential: TotpCredential,
  actor: AuthActor,
  deadline: Date | null,
  now: Date,
): void {
  if (
    !deadline ||
    deadline <= now ||
    !credential.changeEncryptedSecret ||
    !credential.changeKeyVersion
  )
    throw new AuthError(
      "Phiên chuyển chu kỳ đã hết hạn. Nhập mã xác thực hiện tại để bắt đầu lại.",
      403,
      "MFA_PERIOD_CHANGE_EXPIRED",
    );
  if (credential.changeSessionId !== actor.sessionId)
    throw new AuthError(
      "Yêu cầu chuyển chu kỳ thuộc một phiên đăng nhập khác.",
      403,
      "MFA_PERIOD_CHANGE_SESSION",
    );
}

/** Giữ credential đang dùng cho đến khi mã60 được chủ tài khoản xác nhận. */
export async function startMfaPeriodChange(
  actor: AuthActor,
  input: { code?: string },
  context: AuthContext,
): Promise<{
  secret: string;
  qrDataUrl: string;
  expiresAt: string;
  serverNow: string;
  sessionExpiresAt: string;
  periodSeconds: number;
}> {
  authorizeAuthAction(actor, "mfa-period-change");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const result = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-period-change");
    await lockCredential(tx, actor.userId);
    const credential = activeLegacyCredential(
      await tx.totpCredential.findUnique({ where: { userId: actor.userId } }),
    );
    const session = await tx.userSession.findUnique({
      where: { id: fresh.sessionId },
      select: { expiresAt: true },
    });
    const now = new Date();
    if (!session || session.expiresAt <= now)
      throw new AuthError(
        "Phiên đăng nhập đã hết hạn.",
        401,
        "INVALID_SESSION",
      );
    const existingDeadline = changeDeadline(credential, session.expiresAt);
    const sameFlow =
      credential.changeSessionId === fresh.sessionId &&
      !!existingDeadline &&
      existingDeadline > now;
    if (!sameFlow) {
      if (!input.code)
        throw new AuthError(
          "Nhập mã xác thực hiện tại để chuyển sang chu kỳ 60 giây.",
          403,
          "MFA_PERIOD_CODE_REQUIRED",
        );
      if (!(await consumeTotp(tx, actor.userId, input.code, false)))
        return null;
    }
    const sessionExpiresAt = sameFlow
      ? existingDeadline!
      : new Date(
          Math.min(now.getTime() + CHANGE_TTL_MS, session.expiresAt.getTime()),
        );
    if (
      sameFlow &&
      credential.changeEncryptedSecret &&
      credential.changeKeyVersion &&
      credential.changeExpiresAt &&
      credential.changeExpiresAt > now
    ) {
      return {
        secret: decryptMfaSecret(
          credential.changeEncryptedSecret,
          actor.userId,
          credential.changeKeyVersion,
        ),
        expiresAt: new Date(
          Math.min(
            credential.changeExpiresAt.getTime(),
            sessionExpiresAt.getTime(),
          ),
        ),
        sessionExpiresAt,
      };
    }
    const secret = newMfaSecret();
    const expiresAt = new Date(
      Math.min(now.getTime() + QR_TTL_MS, sessionExpiresAt.getTime()),
    );
    await tx.totpCredential.update({
      where: { userId: actor.userId },
      data: {
        changeEncryptedSecret: encryptMfaSecret(secret, actor.userId),
        changeKeyVersion: getMfaKeyVersion(),
        changeExpiresAt: expiresAt,
        changeSessionId: fresh.sessionId,
        changeStartedAt: sameFlow ? credential.changeStartedAt : now,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: sameFlow
          ? "MFA_PERIOD_CHANGE_QR_RENEWED"
          : "MFA_PERIOD_CHANGE_STARTED",
        objectType: "TotpCredential",
        objectId: actor.userId,
        redactedSummary: { fromPeriodSeconds: 30, toPeriodSeconds: 60 },
      },
    });
    return { secret, expiresAt, sessionExpiresAt };
  });
  if (!result) return recordMfaFailure(keys);
  return {
    secret: result.secret,
    qrDataUrl: await QRCode.toDataURL(
      mfaUri(result.secret, `${actor.loginCode} (60 giây)`, 60),
      { width: 256, margin: 2, errorCorrectionLevel: "M" },
    ),
    expiresAt: result.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
    sessionExpiresAt: result.sessionExpiresAt.toISOString(),
    periodSeconds: 60,
  };
}

export async function confirmMfaPeriodChange(
  actor: AuthActor,
  input: { code: string },
  context: AuthContext,
): Promise<{ periodSeconds: number }> {
  authorizeAuthAction(actor, "mfa-period-change");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  const changed = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-period-change");
    await lockCredential(tx, actor.userId);
    const credential = activeLegacyCredential(
      await tx.totpCredential.findUnique({ where: { userId: actor.userId } }),
    );
    const session = await tx.userSession.findUnique({
      where: { id: fresh.sessionId },
      select: { expiresAt: true },
    });
    const now = new Date();
    if (!session || session.expiresAt <= now)
      throw new AuthError(
        "Phiên đăng nhập đã hết hạn.",
        401,
        "INVALID_SESSION",
      );
    assertOwnedChange(
      credential,
      fresh,
      changeDeadline(credential, session.expiresAt),
      now,
    );
    if (!credential.changeExpiresAt || credential.changeExpiresAt <= now)
      throw new AuthError(
        "Mã QR đã hết hạn. Quét QR mới để tiếp tục.",
        403,
        "MFA_SETUP_EXPIRED",
      );
    const step = await matchTotpStep(
      decryptMfaSecret(
        credential.changeEncryptedSecret!,
        actor.userId,
        credential.changeKeyVersion!,
      ),
      input.code,
      null,
      undefined,
      60,
    );
    if (step === null) return false;
    const consumed = await tx.totpCredential.updateMany({
      where: {
        userId: actor.userId,
        periodSeconds: 30,
        encryptedSecret: credential.encryptedSecret,
        changeEncryptedSecret: credential.changeEncryptedSecret,
        changeSessionId: fresh.sessionId,
        changeStartedAt: credential.changeStartedAt,
        changeExpiresAt: { gt: now },
      },
      data: {
        encryptedSecret: credential.changeEncryptedSecret!,
        keyVersion: credential.changeKeyVersion!,
        periodSeconds: 60,
        lastUsedStep: step,
        pendingExpiresAt: null,
        failedAttempts: 0,
        lockedUntil: null,
        ...clearedChange,
      },
    });
    if (consumed.count !== 1)
      throw new AuthError(
        "Thiết lập vừa thay đổi. Tải lại trạng thái để tiếp tục.",
        409,
        "MFA_PERIOD_CHANGE_CONFLICT",
      );
    await tx.userSession.updateMany({
      where: {
        userId: actor.userId,
        id: { not: fresh.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "MFA_PERIOD_CHANGED",
        objectType: "TotpCredential",
        objectId: actor.userId,
        redactedSummary: { fromPeriodSeconds: 30, toPeriodSeconds: 60 },
      },
    });
    return true;
  });
  if (!changed) return recordMfaFailure(keys);
  return { periodSeconds: 60 };
}

export async function cancelMfaPeriodChange(
  actor: AuthActor,
  context: AuthContext,
): Promise<void> {
  authorizeAuthAction(actor, "mfa-period-change");
  const keys = mfaRateKeys(actor.userId, context.ip);
  await checkMfaRate(keys);
  await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, keys);
    await lockUser(tx, actor.userId);
    const fresh = await requireFreshActor(actor, tx);
    authorizeAuthAction(fresh, "mfa-period-change");
    await lockCredential(tx, actor.userId);
    const credential = await tx.totpCredential.findUnique({
      where: { userId: actor.userId },
    });
    if (!credential?.changeSessionId) return;
    if (credential.changeSessionId !== fresh.sessionId)
      throw new AuthError(
        "Yêu cầu chuyển chu kỳ thuộc một phiên đăng nhập khác.",
        403,
        "MFA_PERIOD_CHANGE_SESSION",
      );
    await tx.totpCredential.updateMany({
      where: { userId: actor.userId, changeSessionId: fresh.sessionId },
      data: clearedChange,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "MFA_PERIOD_CHANGE_CANCELLED",
        objectType: "TotpCredential",
        objectId: actor.userId,
      },
    });
  });
}
