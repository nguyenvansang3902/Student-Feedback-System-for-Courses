import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import type { Role } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { getAuthConfig } from "../../lib/env";
import {
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from "../auth/password";
import {
  assertLoginAllowed,
  checkRateLimit,
  rateKey,
  recordLoginFailure,
} from "../auth/rate-limit";
import {
  hashRefreshToken,
  isRefreshToken,
  mintAccessToken,
  newRefreshToken,
  verifyAccessToken,
} from "../auth/session";
import {
  AuthError,
  type AuthActor,
  type AuthContext,
  type SessionTokens,
} from "../auth/types";
import { authorizeAuthAction } from "../policies/auth";

interface UserIdentity {
  id: string;
  loginCode: string;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  roles: { role: Role }[];
}

function actorFrom(
  user: UserIdentity,
  sessionId: string,
  familyId: string,
): AuthActor {
  return {
    userId: user.id,
    loginCode: user.loginCode,
    email: user.email,
    displayName: user.displayName,
    roles: [...new Set(user.roles.map((assignment) => assignment.role))],
    sessionId,
    familyId,
    mustChangePassword: user.mustChangePassword,
    mfa: false,
  };
}

function invalidLogin(): AuthError {
  return new AuthError(
    "Thông tin đăng nhập không hợp lệ.",
    401,
    "INVALID_CREDENTIALS",
  );
}

function invalidSession(): AuthError {
  return new AuthError(
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    401,
    "INVALID_SESSION",
  );
}

async function lockFamily(
  tx: Prisma.TransactionClient,
  familyId: string,
): Promise<void> {
  // Hàng gốc không bị xóa: mọi rotation/replay/logout cùng khóa một hàng ổn định.
  // Sau khi chờ khóa, phải đọc lại phiên hiện tại, tránh tạo con sau revoke.
  await tx.$queryRaw`
    SELECT id FROM UserSession
    WHERE familyId = ${familyId} AND rotatedFromId IS NULL FOR UPDATE
  `;
}

async function tokensFor(
  actor: AuthActor,
  refreshToken: string,
  refreshExpiresAt: Date,
): Promise<SessionTokens> {
  const ttl =
    actor.mustChangePassword || actor.roles.includes("ADMIN")
      ? Math.min(getAuthConfig().accessTtlSeconds, 300)
      : getAuthConfig().accessTtlSeconds;
  const accessExpiresAt = new Date(
    Math.min(Date.now() + ttl * 1000, refreshExpiresAt.getTime()),
  );
  return {
    actor,
    accessToken: await mintAccessToken(actor, accessExpiresAt),
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

export async function login(
  actor: null,
  input: { identifier: string; password: string },
  context: AuthContext,
): Promise<SessionTokens> {
  authorizeAuthAction(actor, "login");
  const identifier = input.identifier.trim().toLowerCase();
  if (!identifier || identifier.length > 254 || input.password.length > 4096)
    throw invalidLogin();
  const ipKey = rateKey("login-ip", context.ip);
  await checkRateLimit(ipKey);
  const user = await getDb().user.findFirst({
    where: { OR: [{ loginCode: identifier }, { email: identifier }] },
    include: { roles: true },
  });
  // Dùng user ID sau lookup để mã SV và email chia sẻ cùng một bộ đếm.
  const accountKey = rateKey(
    "login-account",
    user?.id ?? `unknown:${identifier}`,
  );
  await checkRateLimit(accountKey);
  const matches = await verifyPassword(
    input.password,
    user?.passwordHash ?? dummyPasswordHash,
  );
  const blockedDemo =
    process.env.NODE_ENV === "production" &&
    user?.email.toLowerCase().endsWith("@demo.invalid");
  if (
    !user ||
    !user.passwordHash ||
    !matches ||
    user.status !== "ACTIVE" ||
    blockedDemo
  ) {
    // Cả hai bộ đếm được commit; không ném lỗi bên trong transaction làm rollback.
    await recordLoginFailure(accountKey);
    await recordLoginFailure(ipKey);
    await getDb().auditLog.create({
      data: {
        actorId: user?.id ?? null,
        action: "AUTH_LOGIN_FAILED",
        objectType: "User",
        objectId: user?.id ?? null,
        redactedSummary: { outcome: "denied" },
      },
    });
    throw invalidLogin();
  }
  const sessionId = randomUUID();
  const familyId = randomUUID();
  const refreshToken = newRefreshToken();
  const refreshExpiresAt = new Date(
    Date.now() + getAuthConfig().refreshTtlDays * 86400 * 1000,
  );
  const activeUser = await getDb().$transaction(async (tx) => {
    await assertLoginAllowed(tx, [accountKey, ipKey]);
    // Lần kiểm trạng thái cuối ngay trước tạo phiên. getActor còn kiểm lại mỗi request.
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
    const active = await tx.user.findUnique({
      where: { id: user.id },
      include: { roles: true },
    });
    if (
      active?.status !== "ACTIVE" ||
      active.passwordHash !== user.passwordHash
    )
      throw invalidLogin();
    await tx.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        familyId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: context.userAgent?.slice(0, 512),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "AUTH_LOGIN",
        objectType: "UserSession",
        objectId: sessionId,
      },
    });
    return active;
  });
  return tokensFor(
    actorFrom(activeUser, sessionId, familyId),
    refreshToken,
    refreshExpiresAt,
  );
}

export async function refreshSession(
  actor: null,
  rawRefresh: string,
  context: AuthContext,
): Promise<SessionTokens> {
  authorizeAuthAction(actor, "refresh");
  if (!isRefreshToken(rawRefresh)) throw invalidSession();
  const session = await getDb().userSession.findUnique({
    where: { refreshTokenHash: hashRefreshToken(rawRefresh) },
    include: { user: { include: { roles: true } } },
  });
  if (!session) throw invalidSession();
  const revokeFamily = async (action: string) => {
    await getDb().$transaction(async (tx) => {
      await lockFamily(tx, session.familyId);
      await tx.userSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action,
          objectType: "UserSession",
          objectId: session.id,
        },
      });
    });
  };
  if (session.revokedAt) {
    // Nằm ngoài transaction đã rollback của rotation: replay phải thu hồi thật.
    await revokeFamily("AUTH_REFRESH_REUSE");
    throw invalidSession();
  }
  if (session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    await revokeFamily("AUTH_REFRESH_DENIED");
    throw invalidSession();
  }
  const nextId = randomUUID();
  const refreshToken = newRefreshToken();
  const rotated = await getDb().$transaction(async (tx) => {
    await lockFamily(tx, session.familyId);
    const current = await tx.userSession.findUnique({
      where: { id: session.id },
    });
    if (!current || current.revokedAt || current.expiresAt <= new Date())
      return false;
    const changed = await tx.userSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (changed.count !== 1) return false;
    await tx.userSession.create({
      data: {
        id: nextId,
        userId: session.userId,
        familyId: session.familyId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        // Hạn tuyệt đối của chuỗi, không kéo dài vô hạn bằng refresh.
        expiresAt: session.expiresAt,
        rotatedFromId: session.id,
        userAgent: context.userAgent?.slice(0, 512),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: session.userId,
        action: "AUTH_REFRESH",
        objectType: "UserSession",
        objectId: nextId,
      },
    });
    return true;
  });
  if (!rotated) {
    await revokeFamily("AUTH_REFRESH_REUSE");
    throw invalidSession();
  }
  return tokensFor(
    actorFrom(session.user, nextId, session.familyId),
    refreshToken,
    session.expiresAt,
  );
}

export async function getActor(
  rawAccess: string,
  allowPasswordChange = false,
): Promise<AuthActor | null> {
  authorizeAuthAction(null, "session");
  const claims = await verifyAccessToken(rawAccess);
  if (!claims) return null;
  const session = await getDb().userSession.findUnique({
    where: { id: claims.sid },
    include: { user: { include: { roles: true } } },
  });
  if (
    !session ||
    session.userId !== claims.sub ||
    session.familyId !== claims.fid ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  )
    return null;
  const resolved = actorFrom(session.user, session.id, session.familyId);
  resolved.mustChangePassword = resolved.mustChangePassword || claims.pwd;
  // Cả flag JWT và flag hiện tại được kiểm; token hạn chế không tự trở thành đầy đủ.
  if (
    !allowPasswordChange &&
    (resolved.mustChangePassword ||
      claims.pwd ||
      resolved.roles.includes("ADMIN"))
  )
    return null;
  return resolved;
}

export async function logout(
  actor: AuthActor | null,
  rawRefresh?: string,
): Promise<void> {
  authorizeAuthAction(actor, "logout");
  const session =
    rawRefresh && isRefreshToken(rawRefresh)
      ? await getDb().userSession.findUnique({
          where: { refreshTokenHash: hashRefreshToken(rawRefresh) },
        })
      : null;
  if (
    actor &&
    session &&
    (session.userId !== actor.userId || session.familyId !== actor.familyId)
  ) {
    throw new AuthError("Phiên đăng xuất không hợp lệ.", 403, "FORBIDDEN");
  }
  const familyId = actor?.familyId ?? session?.familyId;
  const userId = actor?.userId ?? session?.userId;
  if (!familyId || !userId) return;
  await getDb().$transaction(async (tx) => {
    await lockFamily(tx, familyId);
    await tx.userSession.updateMany({
      where: { familyId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "AUTH_LOGOUT",
        objectType: "UserSession",
        objectId: actor?.sessionId ?? session?.id,
      },
    });
  });
}

export async function changePassword(
  actor: AuthActor,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  authorizeAuthAction(actor, "change-password");
  // Kiểm phiên trong service; không chỉ tin dữ liệu actor từ route.
  const user = await getDb().user.findUnique({ where: { id: actor.userId } });
  const session = await getDb().userSession.findUnique({
    where: { id: actor.sessionId },
  });
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !session ||
    session.userId !== actor.userId ||
    session.familyId !== actor.familyId ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  )
    throw invalidSession();
  const passwordKey = rateKey("change-password", actor.userId);
  await checkRateLimit(passwordKey);
  const matches = await verifyPassword(
    input.currentPassword,
    user.passwordHash ?? dummyPasswordHash,
  );
  if (!user.passwordHash || !matches) {
    await recordLoginFailure(passwordKey);
    throw invalidLogin();
  }
  if (input.currentPassword === input.newPassword) {
    throw new AuthError(
      "Mật khẩu mới phải khác mật khẩu hiện tại.",
      400,
      "PASSWORD_UNCHANGED",
    );
  }
  const passwordHash = await hashPassword(input.newPassword);
  await getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${actor.userId} FOR UPDATE`;
    await lockFamily(tx, actor.familyId);
    const currentSession = await tx.userSession.findUnique({
      where: { id: actor.sessionId },
    });
    if (
      !currentSession ||
      currentSession.revokedAt ||
      currentSession.expiresAt <= new Date()
    )
      throw invalidSession();
    // Compare-and-swap chống hai yêu cầu đổi/reset mật khẩu ghi đè nhau.
    const changed = await tx.user.updateMany({
      where: {
        id: actor.userId,
        status: "ACTIVE",
        passwordHash: user.passwordHash,
      },
      data: { passwordHash, mustChangePassword: false },
    });
    if (changed.count !== 1) throw invalidSession();
    await tx.userSession.updateMany({
      where: { userId: actor.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.authToken.updateMany({
      where: { userId: actor.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: "AUTH_PASSWORD_CHANGED",
        objectType: "User",
        objectId: actor.userId,
      },
    });
  });
}
