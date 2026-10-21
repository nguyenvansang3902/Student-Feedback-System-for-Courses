import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { updateMany: vi.fn(), update: vi.fn() },
    authToken: { updateMany: vi.fn(), create: vi.fn() },
    userSession: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    db: {
      user: { findUnique: vi.fn() },
      authToken: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
    sendMail: vi.fn(),
    validatePassword: vi.fn(),
    hashPassword: vi.fn(),
    consumeRateLimit: vi.fn(),
    authorize: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/mail", () => ({ sendAccountTokenMail: mocks.sendMail }));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn(async () => {}) }));
vi.mock("@/server/auth/password", () => ({
  validatePassword: mocks.validatePassword,
  hashPassword: mocks.hashPassword,
}));
vi.mock("@/server/auth/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateKey: (scope: string, value: string) =>
    `${scope}:${createHash("sha256").update(value).digest("hex")}`,
}));
vi.mock("@/server/policies/auth", () => ({
  authorizeAuthAction: mocks.authorize,
}));

import {
  activateAccount,
  requestActivation,
  requestPasswordReset,
  resetPassword,
} from "../src/server/services/account-recovery";

const context = { ip: "192.0.2.20", userAgent: "Bộ kiểm tra" };
const rawToken = "a".repeat(43);
const input = { token: rawToken, newPassword: "MatKhauGia@2026" };
const user = {
  id: "a8ab2824-8e15-43c5-adad-4fb99b05389d",
  email: "sinhvien@example.invalid",
  status: "ACTIVE",
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "98d4fd41-9c8d-44e2-bd7a-7c37a8df5ff7",
    userId: user.id,
    kind: "PASSWORD_RESET",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (callback) =>
    callback(mocks.tx),
  );
  mocks.db.user.findUnique.mockResolvedValue(user);
  mocks.db.authToken.findUnique.mockResolvedValue(candidate());
  mocks.tx.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.user.update.mockResolvedValue(user);
  mocks.tx.authToken.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.authToken.create.mockResolvedValue({ id: "token-fixture" });
  mocks.tx.userSession.updateMany.mockResolvedValue({ count: 2 });
  mocks.tx.auditLog.create.mockResolvedValue({ id: "audit-fixture" });
  mocks.hashPassword.mockResolvedValue("$2b$12$hashed-fixture");
  mocks.sendMail.mockResolvedValue(undefined);
  mocks.consumeRateLimit.mockResolvedValue(undefined);
});

describe("FR-04/FR-05 — yêu cầu liên kết qua email", () => {
  it("BR-31: tạo token 256 bit, chỉ lưu SHA-256 và hết hạn reset sau 30 phút", async () => {
    const before = Date.now();
    await requestPasswordReset(null, " SINHVIEN@EXAMPLE.INVALID ", context);
    expect(mocks.authorize).toHaveBeenCalledWith(null, "recovery");
    expect(mocks.db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "sinhvien@example.invalid" },
    });
    const mail = mocks.sendMail.mock.calls[0][0];
    const persisted = mocks.tx.authToken.create.mock.calls[0][0].data;
    expect(mail.to).toBe(user.email);
    expect(mail.kind).toBe("PASSWORD_RESET");
    expect(mail.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(persisted.tokenHash).toBe(
      createHash("sha256").update(mail.token).digest("hex"),
    );
    expect(persisted).not.toHaveProperty("token");
    expect(persisted.expiresAt.getTime() - before).toBeGreaterThanOrEqual(
      30 * 60_000,
    );
    expect(persisted.expiresAt.getTime() - before).toBeLessThan(
      30 * 60_000 + 1_000,
    );
    expect(mocks.tx.authToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, kind: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(JSON.stringify(mocks.tx.auditLog.create.mock.calls)).not.toContain(
      mail.token,
    );
  });

  it("FR-05: chỉ tài khoản chờ kích hoạt nhận token kích hoạt 24 giờ", async () => {
    mocks.db.user.findUnique.mockResolvedValue({
      ...user,
      status: "PENDING_ACTIVATION",
    });
    const before = Date.now();
    await requestActivation(null, user.email, context);
    const persisted = mocks.tx.authToken.create.mock.calls[0][0].data;
    expect(persisted.kind).toBe("ACTIVATION");
    expect(persisted.expiresAt.getTime() - before).toBeGreaterThanOrEqual(
      24 * 60 * 60_000,
    );
    expect(mocks.tx.user.updateMany.mock.calls[0][0].where.status).toBe(
      "PENDING_ACTIVATION",
    );
  });

  it.each([
    null,
    { ...user, status: "DISABLED" },
    { ...user, status: "PENDING_ACTIVATION" },
  ])(
    "BR-33: không tiết lộ tồn tại/trạng thái tài khoản khi reset (%j)",
    async (value) => {
      mocks.db.user.findUnique.mockResolvedValue(value);
      await expect(
        requestPasswordReset(null, user.email, context),
      ).resolves.toBeUndefined();
      expect(mocks.sendMail).not.toHaveBeenCalled();
      expect(mocks.tx.authToken.create).not.toHaveBeenCalled();
      expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    },
  );

  it("BR-33: lỗi SMTP không đổi phản hồi và vô hiệu token không gửi được", async () => {
    mocks.sendMail.mockRejectedValue(
      new Error("lỗi SMTP chứa dữ liệu nhạy cảm"),
    );
    await expect(
      requestPasswordReset(null, user.email, context),
    ).resolves.toBeUndefined();
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(2);
    const lastAudit = mocks.tx.auditLog.create.mock.calls.at(-1)?.[0].data;
    expect(lastAudit.action).toBe("PASSWORD_RESET_DELIVERY_FAILED");
    expect(JSON.stringify(mocks.tx.auditLog.create.mock.calls)).not.toContain(
      "SMTP chứa",
    );
    expect(mocks.tx.authToken.updateMany.mock.calls.at(-1)?.[0].where).toEqual({
      tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      usedAt: null,
    });
  });

  it("BR-34: policy từ chối trước bất kỳ truy vấn dữ liệu nào", async () => {
    mocks.authorize.mockImplementationOnce(() => {
      throw new Error("Từ chối");
    });
    await expect(requestActivation(null, user.email, context)).rejects.toThrow(
      "Từ chối",
    );
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("FR-04/FR-05 — tiêu thụ token một lần", () => {
  it("BR-30/31: claim token, đổi mật khẩu, thu hồi mọi phiên/token và audit trong cùng transaction", async () => {
    await resetPassword(null, input, context);
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.authToken.updateMany.mock.calls[0][0].where).toMatchObject({
      id: expect.any(String),
      userId: user.id,
      kind: "PASSWORD_RESET",
      usedAt: null,
      expiresAt: { gt: expect.any(Date) },
    });
    expect(mocks.tx.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        passwordHash: "$2b$12$hashed-fixture",
        mustChangePassword: false,
      },
    });
    expect(mocks.tx.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.tx.authToken.updateMany.mock.calls[1][0].where).toEqual({
      userId: user.id,
      usedAt: null,
    });
    const audit = mocks.tx.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      actorId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
    });
    expect(JSON.stringify(audit)).not.toContain(input.newPassword);
    expect(JSON.stringify(audit)).not.toContain(input.token);
  });

  it.each([
    null,
    candidate({ usedAt: new Date() }),
    candidate({ expiresAt: new Date(0) }),
    candidate({ kind: "ACTIVATION" }),
    candidate({ user: { ...user, status: "DISABLED" } }),
    candidate({ user: { ...user, status: "PENDING_ACTIVATION" } }),
  ])(
    "BR-31: từ chối token sai/hết hạn/đã dùng hoặc trạng thái không hợp lệ (%j)",
    async (value) => {
      mocks.db.authToken.findUnique.mockResolvedValue(value);
      await expect(resetPassword(null, input, context)).rejects.toMatchObject({
        code: "INVALID_ACCOUNT_TOKEN",
      });
      expect(mocks.hashPassword).not.toHaveBeenCalled();
      expect(mocks.db.$transaction).not.toHaveBeenCalled();
    },
  );

  it("BR-31: mất CAS do token vừa được dùng không đổi mật khẩu hay cấp lại phiên", async () => {
    mocks.tx.authToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(resetPassword(null, input, context)).rejects.toMatchObject({
      code: "INVALID_ACCOUNT_TOKEN",
    });
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
    expect(mocks.tx.userSession.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("FR-05: kích hoạt đổi PENDING_ACTIVATION thành ACTIVE sau khi claim", async () => {
    mocks.db.authToken.findUnique.mockResolvedValue(
      candidate({
        kind: "ACTIVATION",
        user: { ...user, status: "PENDING_ACTIVATION" },
      }),
    );
    await activateAccount(null, input, context);
    expect(mocks.tx.user.update.mock.calls[0][0].data).toMatchObject({
      status: "ACTIVE",
      mustChangePassword: false,
    });
    expect(mocks.tx.auditLog.create.mock.calls[0][0].data.action).toBe(
      "ACCOUNT_ACTIVATION_COMPLETED",
    );
  });

  it("BR-31: tài khoản bị khóa ngay trước transaction không được mở khóa bởi liên kết", async () => {
    mocks.tx.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(resetPassword(null, input, context)).rejects.toMatchObject({
      code: "INVALID_ACCOUNT_TOKEN",
    });
    expect(mocks.tx.authToken.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
  });

  it("FR-06: token sai định dạng vẫn bị giới hạn theo IP và token", async () => {
    await expect(
      resetPassword(null, { ...input, token: "khong-hop-le" }, context),
    ).rejects.toMatchObject({ code: "INVALID_ACCOUNT_TOKEN" });
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.db.authToken.findUnique).not.toHaveBeenCalled();
  });
});
