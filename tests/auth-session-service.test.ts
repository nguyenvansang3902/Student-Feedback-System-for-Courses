import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { AuthActor } from "../src/server/auth/types";
import { mintAccessToken, newRefreshToken } from "../src/server/auth/session";
import {
  changePassword,
  getActor,
  logout,
  refreshSession,
} from "../src/server/services/auth";

const { db, config } = vi.hoisted(() => {
  const db = {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    userSession: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    authToken: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return {
    db,
    config: {
      jwtSecret: "b".repeat(64),
      jwtIssuer: "service-tests",
      jwtAudience: "web",
      accessTtlSeconds: 900,
      refreshTtlDays: 30,
      bcryptCost: 12,
    },
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/lib/env", () => ({ getAuthConfig: () => config }));

function identity(): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "SV_UNIT",
    email: "unit@example.invalid",
    displayName: "Tài khoản giả",
    roles: ["SINH_VIEN"],
    mustChangePassword: false,
    mfa: false,
  };
}

function record(actor: AuthActor) {
  return {
    id: actor.sessionId,
    userId: actor.userId,
    familyId: actor.familyId,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    user: {
      id: actor.userId,
      loginCode: actor.loginCode,
      email: actor.email,
      displayName: actor.displayName,
      mustChangePassword: actor.mustChangePassword,
      roles: actor.roles.map((role) => ({ role })),
      status: "ACTIVE",
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.userSession.updateMany.mockResolvedValue({ count: 1 });
  db.userSession.create.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
});

describe("BR-31/BR-34 — guard kiểm phiên và dữ liệu hiện tại", () => {
  it("token hỏng bị chặn trước khi truy cập DB", async () => {
    expect(await getActor("invalid.jwt.token")).toBeNull();
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
  });
  it("thu hồi, hết hạn, khóa tài khoản hoặc sai chủ sở hữu đều vô hiệu access", async () => {
    const actor = identity();
    const token = await mintAccessToken(actor, new Date(Date.now() + 60000));
    const active = record(actor);
    for (const changed of [
      { ...active, revokedAt: new Date() },
      { ...active, expiresAt: new Date(Date.now() - 1000) },
      { ...active, userId: randomUUID() },
      { ...active, familyId: randomUUID() },
      { ...active, user: { ...active.user, status: "DISABLED" } },
    ]) {
      db.userSession.findUnique.mockResolvedValue(changed);
      expect(await getActor(token)).toBeNull();
    }
    db.userSession.findUnique.mockResolvedValue(active);
    expect(await getActor(token)).toMatchObject({
      userId: actor.userId,
      mfa: false,
    });
  });
  it("lấy vai trò hiện tại từ DB, không dùng vai trò cũ trong JWT", async () => {
    const actor = identity();
    const token = await mintAccessToken(actor, new Date(Date.now() + 60000));
    const active = record(actor);
    db.userSession.findUnique.mockResolvedValue({
      ...active,
      user: { ...active.user, roles: [{ role: "GIANG_VIEN" }] },
    });
    expect(await getActor(token)).toMatchObject({ roles: ["GIANG_VIEN"] });
  });
  it("mật khẩu tạm và ADMIN chỉ được resolve rõ mục đích, không thành phiên đầy đủ", async () => {
    for (const actor of [
      { ...identity(), mustChangePassword: true },
      { ...identity(), roles: ["ADMIN"] as AuthActor["roles"] },
    ]) {
      const token = await mintAccessToken(actor, new Date(Date.now() + 60000));
      db.userSession.findUnique.mockResolvedValue(record(actor));
      expect(await getActor(token)).toBeNull();
      expect(await getActor(token, true)).toMatchObject({
        userId: actor.userId,
        mfa: false,
      });
    }
  });
  it("token hạn chế vẫn hạn chế nếu flag DB vô tình được gỡ mà chưa revoke", async () => {
    const actor = { ...identity(), mustChangePassword: true };
    const token = await mintAccessToken(actor, new Date(Date.now() + 60000));
    const active = record(actor);
    db.userSession.findUnique.mockResolvedValue({
      ...active,
      user: { ...active.user, mustChangePassword: false },
    });
    expect(await getActor(token)).toBeNull();
    expect(await getActor(token, true)).toMatchObject({
      mustChangePassword: true,
    });
  });
});

describe("BR-31 — rotation, replay và đăng xuất", () => {
  it("xoay vòng bằng CAS, lưu hash mới, giữ hạn tuyệt đối và revoke access cha", async () => {
    const actor = identity();
    const active = record(actor);
    db.userSession.findUnique.mockResolvedValue(active);
    const tokens = await refreshSession(null, newRefreshToken(), {
      ip: "127.0.0.1",
      userAgent: "Unit test",
    });
    expect(tokens.refreshExpiresAt).toEqual(active.expiresAt);
    expect(tokens.actor.sessionId).not.toBe(actor.sessionId);
    expect(tokens.actor.familyId).toBe(actor.familyId);
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: actor.sessionId,
          revokedAt: null,
        }),
      }),
    );
    const stored = db.userSession.create.mock.calls[0][0].data;
    expect(stored.rotatedFromId).toBe(actor.sessionId);
    expect(stored.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.refreshTokenHash).not.toBe(tokens.refreshToken);
  });
  it("replay thu hồi cả chuỗi trong transaction riêng và không tạo phiên con", async () => {
    const actor = identity();
    db.userSession.findUnique.mockResolvedValue({
      ...record(actor),
      revokedAt: new Date(),
    });
    await expect(
      refreshSession(null, newRefreshToken(), { ip: "127.0.0.1" }),
    ).rejects.toMatchObject({ code: "INVALID_SESSION" });
    expect(db.userSession.updateMany).toHaveBeenCalledWith({
      where: { familyId: actor.familyId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "AUTH_REFRESH_REUSE" }),
      }),
    );
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("CAS thất bại do race vẫn commit revoke family ngoài transaction rotation", async () => {
    const actor = identity();
    db.userSession.findUnique.mockResolvedValue(record(actor));
    db.userSession.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    await expect(
      refreshSession(null, newRefreshToken(), { ip: "127.0.0.1" }),
    ).rejects.toMatchObject({ code: "INVALID_SESSION" });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(db.userSession.create).not.toHaveBeenCalled();
    expect(db.userSession.updateMany.mock.calls[1][0].where.familyId).toBe(
      actor.familyId,
    );
  });
  it("đăng xuất được bằng refresh khi access đã hết hạn; không cho ghép phiên người khác", async () => {
    const actor = identity();
    db.userSession.findUnique.mockResolvedValue(record(actor));
    await logout(null, newRefreshToken());
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          familyId: actor.familyId,
          userId: actor.userId,
          revokedAt: null,
        },
      }),
    );
    db.userSession.updateMany.mockClear();
    await expect(logout(identity(), newRefreshToken())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
  });
  it("đổi mật khẩu thiếu actor bị policy chặn trước query", async () => {
    await expect(
      changePassword(null as unknown as AuthActor, {
        currentPassword: "x",
        newPassword: "y",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
