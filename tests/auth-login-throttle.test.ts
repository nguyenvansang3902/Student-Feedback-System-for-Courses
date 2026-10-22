import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { login } from "../src/server/services/auth";
import { rateKey } from "../src/server/auth/rate-limit";

const { db, compare } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    userSession: { create: vi.fn() },
    rateLimitBucket: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    systemSetting: { findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  compare: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    jwtSecret: "c".repeat(64),
    jwtIssuer: "throttle-tests",
    jwtAudience: "web",
    accessTtlSeconds: 900,
    refreshTtlDays: 30,
    bcryptCost: 12,
  }),
}));
vi.mock("../src/server/auth/password", () => ({
  verifyPassword: compare,
  dummyPasswordHash: "dummy-cost-12-hash",
  hashPassword: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  db.rateLimitBucket.findUnique.mockResolvedValue(null);
  db.$executeRaw.mockResolvedValue(1);
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.userSession.create.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
  db.systemSetting.findUnique.mockResolvedValue(null);
});

describe("BR-33 — khóa đồng thời trong lúc bcrypt đang chạy", () => {
  const ip = "192.0.2.70";
  function user() {
    return {
      id: randomUUID(),
      loginCode: "SV_RACE",
      email: "race@example.invalid",
      displayName: "Sinh viên giả",
      status: "ACTIVE",
      passwordHash: "existing-hash",
      mustChangePassword: false,
      roles: [{ role: "SINH_VIEN" }],
    };
  }

  it.each(["account", "ip"])(
    "khóa %s commit sau precheck nhưng trước mint vẫn chặn, không tạo phiên",
    async (scope) => {
      const account = user();
      db.user.findFirst.mockResolvedValue(account);
      db.user.findUnique.mockResolvedValue(account);
      let committedLock = false;
      const lockedKey =
        scope === "account"
          ? rateKey("login-account", account.id)
          : rateKey("login-ip", ip);
      // Tái hiện lần sai thứ 5 đã commit trong khoảng giữa precheck và bcrypt xong.
      compare.mockImplementation(async () => {
        committedLock = true;
        return true;
      });
      db.$queryRaw.mockImplementation(
        async (strings: TemplateStringsArray, ...values: unknown[]) => {
          if (strings.join("").includes("FROM RateLimitBucket")) {
            return [
              {
                lockedUntil:
                  committedLock && values[0] === lockedKey
                    ? new Date(Date.now() + 900000)
                    : null,
              },
            ];
          }
          return [];
        },
      );

      await expect(
        login(
          null,
          { identifier: account.loginCode, password: "Correct-password!" },
          { ip },
        ),
      ).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
      expect(db.rateLimitBucket.findUnique).toHaveBeenCalledTimes(2);
      expect(compare).toHaveBeenCalledOnce();
      expect(db.userSession.create).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
      expect(db.user.findUnique).not.toHaveBeenCalled();
    },
  );

  it("khóa 2 bucket cùng thứ tự trước User rồi tạo phiên, không tăng số lần sai khi thành công", async () => {
    const account = user();
    db.user.findFirst.mockResolvedValue(account);
    db.user.findUnique.mockResolvedValue(account);
    compare.mockResolvedValue(true);
    db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) =>
      strings.join("").includes("FROM RateLimitBucket")
        ? [{ lockedUntil: null }]
        : [],
    );

    const tokens = await login(
      null,
      { identifier: account.email, password: "Correct-password!" },
      { ip },
    );
    expect(tokens.actor.userId).toBe(account.id);
    expect(db.userSession.create).toHaveBeenCalledOnce();
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
    const queries = db.$queryRaw.mock.calls;
    expect(queries[0][1]).toBe(
      [rateKey("login-account", account.id), rateKey("login-ip", ip)].sort()[0],
    );
    expect(queries[1][1]).toBe(
      [rateKey("login-account", account.id), rateKey("login-ip", ip)].sort()[1],
    );
    expect(queries[2][0].join("")).toContain("FROM User");
  });
  it.each([
    { enabled: false, temporary: false, purpose: "MFA_SETUP" },
    { enabled: true, temporary: false, purpose: "MFA_VERIFY" },
    { enabled: true, temporary: true, purpose: "PASSWORD_CHANGE" },
  ])(
    "BR-32: ADMIN login chỉ cấp mục đích $purpose trong5phút, không refresh",
    async ({ enabled, temporary, purpose }) => {
      const account = {
        ...user(),
        roles: [{ role: "ADMIN" }],
        mustChangePassword: temporary,
        totp: enabled ? { enabledAt: new Date() } : null,
      };
      db.user.findFirst.mockResolvedValue(account);
      db.user.findUnique.mockResolvedValue(account);
      compare.mockResolvedValue(true);
      db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) =>
        strings.join("").includes("FROM RateLimitBucket")
          ? [{ lockedUntil: null }]
          : [],
      );
      const tokens = await login(
        null,
        { identifier: account.loginCode, password: "Correct-password!" },
        { ip },
      );
      expect(tokens.actor).toMatchObject({
        purpose,
        mfa: false,
        mfaRequired: true,
      });
      expect(tokens.refreshToken).toBe("");
      expect(tokens.accessExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
        300000,
      );
      expect(db.userSession.create.mock.calls[0][0].data).toMatchObject({
        purpose,
        mfaVerifiedAt: null,
      });
    },
  );
});
