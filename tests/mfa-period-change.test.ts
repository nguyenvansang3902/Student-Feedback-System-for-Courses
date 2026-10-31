import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { generate } from "otplib";
import type { AuthActor } from "../src/server/auth/types";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  newMfaSecret,
} from "../src/server/auth/mfa-crypto";
import {
  cancelMfaPeriodChange,
  confirmMfaPeriodChange,
  startMfaPeriodChange,
} from "../src/server/services/mfa-period-change";
import { assertStepUp, verifyMfa } from "../src/server/services/mfa";

const { db } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    userSession: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    totpCredential: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    totpRecoveryCode: { updateMany: vi.fn(), createMany: vi.fn() },
    systemSetting: { findUnique: vi.fn() },
    rateLimitBucket: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    jwtSecret: "d".repeat(64),
    jwtIssuer: "mfa-tests",
    jwtAudience: "web",
    accessTtlSeconds: 900,
    refreshTtlDays: 30,
  }),
}));

function actor(purpose: NonNullable<AuthActor["purpose"]> = "FULL"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "ADMIN_UNIT",
    email: "admin@example.invalid",
    displayName: "Tài khoản giả",
    roles: ["ADMIN"],
    purpose,
    mustChangePassword: false,
    mfa: purpose === "FULL",
    mfaRequired: true,
    assignments: [
      {
        role: "ADMIN",
        scopeType: "GLOBAL",
        facultyId: null,
        departmentId: null,
      },
    ],
  };
}
function useActor(
  identity: AuthActor,
  expiresAt = new Date(Date.now() + 3_600_000),
) {
  const user = {
    id: identity.userId,
    loginCode: identity.loginCode,
    email: identity.email,
    displayName: identity.displayName,
    status: "ACTIVE",
    mustChangePassword: false,
    roles: identity.assignments,
  };
  const session = {
    id: identity.sessionId,
    userId: identity.userId,
    familyId: identity.familyId,
    purpose: identity.purpose,
    mfaVerifiedAt: identity.mfa ? new Date() : null,
    revokedAt: null,
    expiresAt,
    user,
  };
  db.userSession.findUnique.mockResolvedValue(session);
  db.user.findUnique.mockResolvedValue(user);
  return session;
}
function credential(identity: AuthActor, periodSeconds = 30) {
  const secret = newMfaSecret();
  const row = {
    userId: identity.userId,
    encryptedSecret: encryptMfaSecret(secret, identity.userId),
    keyVersion: "v1",
    periodSeconds,
    enabledAt: new Date() as Date | null,
    pendingExpiresAt: null,
    lastUsedStep: null as bigint | null,
    failedAttempts: 0,
    lockedUntil: null,
    changeEncryptedSecret: null as string | null,
    changeKeyVersion: null as string | null,
    changeExpiresAt: null as Date | null,
    changeSessionId: null as string | null,
    changeStartedAt: null as Date | null,
  };
  db.totpCredential.findUnique.mockResolvedValue(row);
  db.totpCredential.update.mockImplementation(async ({ data }) =>
    Object.assign(row, data),
  );
  db.totpCredential.updateMany.mockImplementation(async ({ data }) => {
    Object.assign(row, data);
    return { count: 1 };
  });
  return { secret, row };
}
const context = { ip: "192.0.2.118", userAgent: "Vitest isolated fixture" };
const otp = (
  secret: string,
  period = 30,
  epoch = Math.floor(Date.now() / 1000),
) => generate({ secret, period, digits: 6, epoch });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-31T06:00:00.000Z"));
  vi.stubEnv("MFA_ENCRYPTION_KEY", "3".repeat(64));
  vi.stubEnv("MFA_KEY_VERSION", "v1");
  db.systemSetting.findUnique.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) =>
    strings.join("").includes("RateLimitBucket")
      ? [{ attempts: 0, windowStart: new Date(), lockedUntil: null }]
      : [],
  );
  db.$executeRaw.mockResolvedValue(1);
  db.rateLimitBucket.findUnique.mockResolvedValue(null);
  db.userSession.updateMany.mockResolvedValue({ count: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("BR-32 / FR-07 — chuyển TOTP30 sang60 sau xác nhận", () => {
  it("từ chối guest, phiên tạm hoặc FULL chưaMFA trước khi truy cậpDB", async () => {
    for (const identity of [
      null,
      actor("MFA_VERIFY"),
      actor("MFA_SETUP"),
      { ...actor(), mfa: false },
    ]) {
      await expect(
        startMfaPeriodChange(identity as AuthActor, {}, context),
      ).rejects.toBeDefined();
      await expect(
        confirmMfaPeriodChange(
          identity as AuthActor,
          { code: "123456" },
          context,
        ),
      ).rejects.toBeDefined();
      await expect(
        cancelMfaPeriodChange(identity as AuthActor, context),
      ).rejects.toBeDefined();
    }
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
  });
  it("fresh guard chặn phiên bị thu hồi hoặc actor sửa danh tính", async () => {
    const identity = actor();
    const session = useActor(identity);
    credential(identity);
    db.userSession.findUnique.mockResolvedValue({
      ...session,
      revokedAt: new Date(),
    });
    await expect(
      startMfaPeriodChange(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "INVALID_SESSION" });
    expect(db.totpCredential.update).not.toHaveBeenCalled();
  });
  it("cần mã hiện tại để bắt đầu và không đếm mã sai khi chưa nhập", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    await expect(
      startMfaPeriodChange(identity, {}, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CODE_REQUIRED" });
    expect(db.totpCredential.update).not.toHaveBeenCalled();
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
  });
  it("mã hiện tại sai ghi account/IP, không tạo khóa mới và không cấp phiên", async () => {
    const identity = actor();
    useActor(identity);
    const { row } = credential(identity);
    const oldCipher = row.encryptedSecret;
    await expect(
      startMfaPeriodChange(identity, { code: "invalid" }, context),
    ).rejects.toMatchObject({ code: "INVALID_MFA_CODE" });
    expect(row.encryptedSecret).toBe(oldCipher);
    expect(row.periodSeconds).toBe(30);
    expect(db.rateLimitBucket.update).toHaveBeenCalledTimes(2);
    expect(db.totpCredential.update).not.toHaveBeenCalled();
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("ratebucket đã khóa chặn trước đọc phiên/credential dù mã đúng", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    db.rateLimitBucket.findUnique.mockResolvedValue({
      lockedUntil: new Date(Date.now() + 900000),
    });
    await expect(
      startMfaPeriodChange(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
    expect(db.totpCredential.findUnique).not.toHaveBeenCalled();
  });
  it("start kiểm mã30 mới, giữactive/recovery, lưu pending mã hóa/QR60s/flow5m", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const activeCipher = row.encryptedSecret;
    const result = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    expect(result.secret).not.toBe(secret);
    expect(result.periodSeconds).toBe(60);
    expect(result.expiresAt).toBe("2026-10-31T06:01:00.000Z");
    expect(result.sessionExpiresAt).toBe("2026-10-31T06:05:00.000Z");
    expect(row.changeEncryptedSecret).not.toContain(result.secret);
    expect(
      decryptMfaSecret(
        row.changeEncryptedSecret!,
        identity.userId,
        row.changeKeyVersion!,
      ),
    ).toBe(result.secret);
    expect(row.encryptedSecret).toBe(activeCipher);
    expect(row.periodSeconds).toBe(30);
    expect(row.lastUsedStep).toBe(BigInt(Math.floor(Date.now() / 30000)));
    expect(row.changeSessionId).toBe(identity.sessionId);
    expect(db.totpRecoveryCode.updateMany).not.toHaveBeenCalled();
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
    const audit = JSON.stringify(db.auditLog.create.mock.calls);
    expect(audit).not.toContain(secret);
    expect(audit).not.toContain(result.secret);
  });
  it("gọi lại cùngphiên dùng lại khóa và hạn, không cần hoặc dùng lại mã30", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const first = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    const oldStep = row.lastUsedStep;
    vi.setSystemTime(new Date("2026-10-31T06:00:59.999Z"));
    const second = await startMfaPeriodChange(identity, {}, context);
    expect(second.secret).toBe(first.secret);
    expect(second.expiresAt).toBe(first.expiresAt);
    expect(second.sessionExpiresAt).toBe(first.sessionExpiresAt);
    expect(row.lastUsedStep).toBe(oldStep);
    expect(db.totpCredential.update).toHaveBeenCalledOnce();
  });
  it("hếtQR đúngmốc cấp khóa mới nhưng không kéo dài flow5phút", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const first = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    vi.setSystemTime(new Date("2026-10-31T06:01:00.000Z"));
    const next = await startMfaPeriodChange(identity, {}, context);
    expect(next.secret).not.toBe(first.secret);
    expect(next.sessionExpiresAt).toBe(first.sessionExpiresAt);
    expect(row.changeStartedAt?.toISOString()).toBe("2026-10-31T06:00:00.000Z");
    vi.setSystemTime(new Date("2026-10-31T06:04:40.000Z"));
    const last = await startMfaPeriodChange(identity, {}, context);
    expect(last.expiresAt).toBe("2026-10-31T06:05:00.000Z");
    expect(last.sessionExpiresAt).toBe(first.sessionExpiresAt);
    vi.setSystemTime(new Date(last.expiresAt));
    await expect(
      startMfaPeriodChange(identity, {}, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CODE_REQUIRED" });
  });
  it("QR và flow không sống vượt hạn phiên đang dùng", async () => {
    const identity = actor();
    useActor(identity, new Date("2026-10-31T06:00:20.000Z"));
    const { secret } = credential(identity);
    const result = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    expect(result.expiresAt).toBe("2026-10-31T06:00:20.000Z");
    expect(result.sessionExpiresAt).toBe(result.expiresAt);
  });
  it("phiên khác không đọc/autorenew hoặc xác nhậnpending của phiên trước", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const first = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    const other = {
      ...identity,
      sessionId: randomUUID(),
      familyId: randomUUID(),
    };
    useActor(other);
    await expect(
      startMfaPeriodChange(other, {}, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CODE_REQUIRED" });
    await expect(
      confirmMfaPeriodChange(
        other,
        { code: await otp(first.secret, 60) },
        context,
      ),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CHANGE_SESSION" });
    await expect(cancelMfaPeriodChange(other, context)).rejects.toMatchObject({
      code: "MFA_PERIOD_CHANGE_SESSION",
    });
    expect(row.changeSessionId).toBe(identity.sessionId);
    expect(row.periodSeconds).toBe(30);
  });
  it("phiên khác được bắt đầu riêng sau khi đưa mã30 mới, flow trước bị thay", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const first = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    vi.setSystemTime(new Date("2026-10-31T06:00:30.000Z"));
    const other = {
      ...identity,
      sessionId: randomUUID(),
      familyId: randomUUID(),
    };
    useActor(other);
    const second = await startMfaPeriodChange(
      other,
      { code: await otp(secret) },
      context,
    );
    expect(second.secret).not.toBe(first.secret);
    expect(row.changeSessionId).toBe(other.sessionId);
    expect(row.periodSeconds).toBe(30);
  });
  it("QR hết hạn không đếm mã sai hoặc thayactive, flow hết5phút bắt đầu lại", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const activeCipher = row.encryptedSecret;
    const setup = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    db.totpCredential.updateMany.mockClear();
    vi.setSystemTime(new Date(setup.expiresAt));
    await expect(
      confirmMfaPeriodChange(
        identity,
        { code: await otp(setup.secret, 60) },
        context,
      ),
    ).rejects.toMatchObject({ code: "MFA_SETUP_EXPIRED" });
    expect(db.totpCredential.updateMany).not.toHaveBeenCalled();
    vi.setSystemTime(new Date(setup.sessionExpiresAt));
    await expect(
      confirmMfaPeriodChange(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CHANGE_EXPIRED" });
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
    expect(row.encryptedSecret).toBe(activeCipher);
    expect(row.periodSeconds).toBe(30);
  });
  it("sai mã60 giữactive/recovery và tăng giới hạn account/IP", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    await startMfaPeriodChange(identity, { code: await otp(secret) }, context);
    const activeCipher = row.encryptedSecret;
    await expect(
      confirmMfaPeriodChange(identity, { code: "not-an-otp" }, context),
    ).rejects.toMatchObject({ code: "INVALID_MFA_CODE" });
    expect(row.encryptedSecret).toBe(activeCipher);
    expect(row.periodSeconds).toBe(30);
    expect(db.rateLimitBucket.update).toHaveBeenCalledTimes(2);
    expect(db.totpRecoveryCode.updateMany).not.toHaveBeenCalled();
  });
  it("confirm mã60 đổiactive atomically, lastUsedStep60, giữrecovery và chỉ thu hồi phiênkhác", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const setup = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    const oldStep = row.lastUsedStep;
    const result = await confirmMfaPeriodChange(
      identity,
      { code: await otp(setup.secret, 60) },
      context,
    );
    expect(result).toEqual({ periodSeconds: 60 });
    expect(
      decryptMfaSecret(row.encryptedSecret, identity.userId, row.keyVersion),
    ).toBe(setup.secret);
    expect(row.periodSeconds).toBe(60);
    expect(row.lastUsedStep).toBe(BigInt(Math.floor(Date.now() / 60000)));
    expect(row.lastUsedStep! < oldStep!).toBe(true);
    expect(row.changeEncryptedSecret).toBeNull();
    expect(row.changeSessionId).toBeNull();
    expect(db.totpRecoveryCode.updateMany).not.toHaveBeenCalled();
    expect(db.totpRecoveryCode.createMany).not.toHaveBeenCalled();
    expect(db.userSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: identity.userId,
        id: { not: identity.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(db.userSession.create).not.toHaveBeenCalled();
    const audit = JSON.stringify(db.auditLog.create.mock.calls);
    expect(audit).not.toContain(setup.secret);
  });
  it("mã xác nhận không thể dùng lại cho step-up; mã60 tiếp theo được dùng", async () => {
    const identity = actor();
    useActor(identity);
    const { secret } = credential(identity);
    const setup = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    const code = await otp(setup.secret, 60);
    await confirmMfaPeriodChange(identity, { code }, context);
    await expect(assertStepUp(identity, code, context)).rejects.toMatchObject({
      code: "INVALID_MFA_CODE",
    });
    vi.setSystemTime(new Date("2026-10-31T06:01:00.000Z"));
    await expect(
      assertStepUp(identity, await otp(setup.secret, 60), context),
    ).resolves.toBeUndefined();
  });
  it("CAS thua không revokephiên hoặc auditthànhcông", async () => {
    const identity = actor();
    useActor(identity);
    const { secret } = credential(identity);
    const setup = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    db.totpCredential.updateMany.mockResolvedValueOnce({ count: 0 });
    db.auditLog.create.mockClear();
    await expect(
      confirmMfaPeriodChange(
        identity,
        { code: await otp(setup.secret, 60) },
        context,
      ),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CHANGE_CONFLICT" });
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
  });
  it("request start đồng thời cùngphiên chỉ tạo pendingmộtlần", async () => {
    const identity = actor();
    useActor(identity);
    const { secret } = credential(identity);
    const code = await otp(secret);
    let tail: Promise<unknown> = Promise.resolve();
    db.$transaction.mockImplementation((fn) => {
      const result = tail.then(() => fn(db));
      tail = result.catch(() => undefined);
      return result;
    });
    const [first, second] = await Promise.all([
      startMfaPeriodChange(identity, { code }, context),
      startMfaPeriodChange(identity, { code }, context),
    ]);
    expect(first.secret).toBe(second.secret);
    expect(first.expiresAt).toBe(second.expiresAt);
    expect(db.totpCredential.update).toHaveBeenCalledOnce();
  });
  it("confirm đồngthời chỉ một lần thànhcông, không thaylastUsedStep60 đã xác nhận", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    const setup = await startMfaPeriodChange(
      identity,
      { code: await otp(secret) },
      context,
    );
    const code = await otp(setup.secret, 60);
    let tail: Promise<unknown> = Promise.resolve();
    db.$transaction.mockImplementation((fn) => {
      const result = tail.then(() => fn(db));
      tail = result.catch(() => undefined);
      return result;
    });
    const results = await Promise.allSettled([
      confirmMfaPeriodChange(identity, { code }, context),
      confirmMfaPeriodChange(identity, { code }, context),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(row.periodSeconds).toBe(60);
    expect(db.userSession.updateMany).toHaveBeenCalledOnce();
  });
  it("cancel chỉ xóa pending, giữ mã30/mãkhôi phục/phiên đang dùng", async () => {
    const identity = actor();
    useActor(identity);
    const { secret, row } = credential(identity);
    await startMfaPeriodChange(identity, { code: await otp(secret) }, context);
    const activeCipher = row.encryptedSecret;
    const oldStep = row.lastUsedStep;
    await cancelMfaPeriodChange(identity, context);
    expect(row.changeEncryptedSecret).toBeNull();
    expect(row.changeStartedAt).toBeNull();
    expect(row.encryptedSecret).toBe(activeCipher);
    expect(row.periodSeconds).toBe(30);
    expect(row.lastUsedStep).toBe(oldStep);
    expect(db.totpRecoveryCode.updateMany).not.toHaveBeenCalled();
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
  });
  it("tài khoản60 hoặc chưa bậtMFA không được đổi lại hay tạo pendingmới", async () => {
    const identity = actor();
    useActor(identity);
    const { row } = credential(identity, 60);
    await expect(
      startMfaPeriodChange(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_ALREADY_60" });
    row.enabledAt = null;
    await expect(
      startMfaPeriodChange(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "MFA_PERIOD_CHANGE_REQUIRED" });
    expect(db.totpCredential.update).not.toHaveBeenCalled();
  });
  it("credential60 đã chuyển vẫn đăngnhập bằng mã mới, recoverykhôngbị thay", async () => {
    const identity = actor("MFA_VERIFY");
    useActor(identity);
    const { secret } = credential(identity, 60);
    expect(
      (await verifyMfa(identity, { code: await otp(secret, 60) }, context))
        .actor,
    ).toMatchObject({ purpose: "FULL", mfa: true });
    expect(db.totpRecoveryCode.updateMany).not.toHaveBeenCalled();
  });
});
