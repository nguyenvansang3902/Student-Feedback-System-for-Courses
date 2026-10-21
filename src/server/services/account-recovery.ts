import { createHash, randomBytes, randomInt } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { getDb } from "@/lib/db";
import { sendAccountTokenMail } from "@/lib/mail";
import { hashPassword, validatePassword } from "@/server/auth/password";
import { consumeRateLimit, rateKey } from "@/server/auth/rate-limit";
import { AuthError, type AuthContext } from "@/server/auth/types";
import { authorizeAuthAction } from "@/server/policies/auth";
import { getAuthLimits } from "@/server/auth/limits";

type TokenKind = "ACTIVATION" | "PASSWORD_RESET";
type CompleteInput = { token: string; newPassword: string };
const TOKEN_ERROR =
  "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function requiredStatus(kind: TokenKind) {
  return kind === "ACTIVATION" ? "PENDING_ACTIVATION" : "ACTIVE";
}

function actionName(kind: TokenKind): string {
  return kind === "ACTIVATION" ? "ACCOUNT_ACTIVATION" : "PASSWORD_RESET";
}

async function requestAccountToken(
  actor: null,
  email: string,
  context: AuthContext,
  kind: TokenKind,
): Promise<void> {
  authorizeAuthAction(actor, "recovery");
  const startedAt = Date.now();
  const minimumDuration = 500 + randomInt(100);
  const normalizedEmail = email.trim().toLowerCase();
  const limits = getAuthLimits();
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new AuthError("Địa chỉ email không hợp lệ.");
  }
  await consumeRateLimit(
    rateKey(`${kind}:request:ip`, context.ip),
    limits.RECOVERY_REQUEST_IP_LIMIT,
    limits.RECOVERY_WINDOW_SECONDS,
    limits.RECOVERY_LOCK_SECONDS,
  );
  await consumeRateLimit(
    rateKey(`${kind}:request:account`, normalizedEmail),
    limits.RECOVERY_REQUEST_ACCOUNT_LIMIT,
    limits.RECOVERY_WINDOW_SECONDS,
    limits.RECOVERY_LOCK_SECONDS,
  );
  try {
    const db = getDb();
    // MySQL dùng collation không phân biệt hoa/thường; đầu vào cũng chuẩn hóa.
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || user.status !== requiredStatus(kind)) return;
    const token = randomBytes(32).toString("base64url");
    const digest = tokenHash(token);
    const now = new Date();
    const lifetimeMs =
      (kind === "ACTIVATION"
        ? limits.ACTIVATION_TTL_SECONDS
        : limits.PASSWORD_RESET_TTL_SECONDS) * 1000;
    const issued = await db.$transaction(async (tx) => {
      // Ghi cùng một row User để tuần tự hóa cấp/tiêu thụ token của tài khoản.
      const eligible = await tx.user.updateMany({
        where: { id: user.id, status: requiredStatus(kind) },
        data: { updatedAt: now },
      });
      if (eligible.count !== 1) return false;
      await tx.authToken.updateMany({
        where: { userId: user.id, kind, usedAt: null },
        data: { usedAt: now },
      });
      await tx.authToken.create({
        data: {
          userId: user.id,
          kind,
          tokenHash: digest,
          expiresAt: new Date(now.getTime() + lifetimeMs),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: `${actionName(kind)}_REQUESTED`,
          objectType: "User",
          objectId: user.id,
          redactedSummary: { purpose: kind },
        },
      });
      return true;
    });
    if (!issued) return;
    try {
      await sendAccountTokenMail({ to: user.email, kind, token });
    } catch {
      // Không trả lỗi SMTP riêng cho tài khoản tồn tại; không ghi nội dung thư.
      await db.$transaction(async (tx) => {
        await tx.authToken.updateMany({
          where: { tokenHash: digest, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorId: null,
            action: `${actionName(kind)}_DELIVERY_FAILED`,
            objectType: "User",
            objectId: user.id,
            redactedSummary: { purpose: kind },
          },
        });
      });
    }
  } finally {
    // Giảm khác biệt thời gian phổ biến, không cam kết hằng thời gian qua SMTP.
    const remaining = minimumDuration - (Date.now() - startedAt);
    if (remaining > 0) await delay(remaining);
  }
}

async function completeAccountToken(
  actor: null,
  input: CompleteInput,
  context: AuthContext,
  kind: TokenKind,
): Promise<void> {
  authorizeAuthAction(actor, "recovery");
  const limits = getAuthLimits();
  await consumeRateLimit(
    rateKey(`${kind}:complete:ip`, context.ip),
    limits.RECOVERY_COMPLETE_IP_LIMIT,
    limits.RECOVERY_WINDOW_SECONDS,
    limits.RECOVERY_LOCK_SECONDS,
  );
  await consumeRateLimit(
    rateKey(`${kind}:complete:token`, input.token),
    limits.RECOVERY_COMPLETE_TOKEN_LIMIT,
    limits.RECOVERY_WINDOW_SECONDS,
    limits.RECOVERY_LOCK_SECONDS,
  );
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) {
    throw new AuthError(TOKEN_ERROR, 400, "INVALID_ACCOUNT_TOKEN");
  }
  validatePassword(input.newPassword);
  const db = getDb();
  const digest = tokenHash(input.token);
  const candidate = await db.authToken.findUnique({
    where: { tokenHash: digest },
    include: { user: true },
  });
  if (
    !candidate ||
    candidate.kind !== kind ||
    candidate.usedAt ||
    candidate.expiresAt.getTime() <= Date.now() ||
    candidate.user.status !== requiredStatus(kind)
  ) {
    throw new AuthError(TOKEN_ERROR, 400, "INVALID_ACCOUNT_TOKEN");
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction(async (tx) => {
    const now = new Date();
    const eligible = await tx.user.updateMany({
      where: { id: candidate.userId, status: requiredStatus(kind) },
      data: { updatedAt: now },
    });
    if (eligible.count !== 1) {
      throw new AuthError(TOKEN_ERROR, 400, "INVALID_ACCOUNT_TOKEN");
    }
    // CAS + cùng transaction với password, session và audit: chỉ một lần thắng.
    const consumed = await tx.authToken.updateMany({
      where: {
        id: candidate.id,
        userId: candidate.userId,
        kind,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new AuthError(TOKEN_ERROR, 400, "INVALID_ACCOUNT_TOKEN");
    }
    await tx.user.update({
      where: { id: candidate.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        ...(kind === "ACTIVATION" ? { status: "ACTIVE" as const } : {}),
      },
    });
    await tx.userSession.updateMany({
      where: { userId: candidate.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.authToken.updateMany({
      where: { userId: candidate.userId, usedAt: null },
      data: { usedAt: now },
    });
    await tx.auditLog.create({
      data: {
        actorId: candidate.userId,
        action: `${actionName(kind)}_COMPLETED`,
        objectType: "User",
        objectId: candidate.userId,
        redactedSummary: { revokedAllSessions: true },
      },
    });
  });
}

export async function requestPasswordReset(
  actor: null,
  email: string,
  context: AuthContext,
): Promise<void> {
  return requestAccountToken(actor, email, context, "PASSWORD_RESET");
}

export async function requestActivation(
  actor: null,
  email: string,
  context: AuthContext,
): Promise<void> {
  return requestAccountToken(actor, email, context, "ACTIVATION");
}

export async function resetPassword(
  actor: null,
  input: CompleteInput,
  context: AuthContext,
): Promise<void> {
  return completeAccountToken(actor, input, context, "PASSWORD_RESET");
}

export async function activateAccount(
  actor: null,
  input: CompleteInput,
  context: AuthContext,
): Promise<void> {
  return completeAccountToken(actor, input, context, "ACTIVATION");
}
