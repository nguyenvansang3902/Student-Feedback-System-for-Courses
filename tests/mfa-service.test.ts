import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { generate } from "otplib";
import type { AuthActor } from "../src/server/auth/types";
import {
  encryptMfaSecret,
  hashRecoveryCode,
  newMfaSecret,
  newRecoveryCodes,
} from "../src/server/auth/mfa-crypto";
import {
  assertStepUp,
  confirmMfaSetup,
  getMfaStatus,
  resetUserMfa,
  startMfaSetup,
  verifyMfa,
} from "../src/server/services/mfa";

const { db } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    userSession: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    totpCredential: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    totpRecoveryCode: { updateMany: vi.fn(), createMany: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    rateLimitBucket: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
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

function actor(
  purpose: NonNullable<AuthActor["purpose"]> = "MFA_VERIFY",
): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "ADMIN_UNIT",
    email: "admin@example.invalid",
    displayName: "Quản trị viên giả",
    roles: ["ADMIN"],
    mustChangePassword: false,
    purpose,
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
  expiresAt = new Date(Date.now() + 300000),
) {
  const user = {
    id: identity.userId,
    loginCode: identity.loginCode,
    email: identity.email,
    displayName: identity.displayName,
    status: "ACTIVE",
    mustChangePassword: false,
    roles: identity.assignments!,
  };
  db.userSession.findUnique.mockResolvedValue({
    id: identity.sessionId,
    userId: identity.userId,
    familyId: identity.familyId,
    purpose: identity.purpose,
    mfaVerifiedAt: identity.mfa ? new Date() : null,
    revokedAt: null,
    expiresAt,
    user,
  });
  db.user.findUnique.mockResolvedValue(user);
  return user;
}
function credential(identity: AuthActor, pending = false) {
  const secret = newMfaSecret();
  const row = {
    userId: identity.userId,
    encryptedSecret: encryptMfaSecret(secret, identity.userId),
    keyVersion: "v1",
    enabledAt: pending ? null : new Date(),
    pendingExpiresAt: pending ? new Date(Date.now() + 60000) : null,
    lastUsedStep: null,
  };
  db.totpCredential.findUnique.mockResolvedValue(row);
  return { secret, row };
}
const context = { ip: "192.0.2.90", userAgent: "Vitest fixture" };

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
  db.totpCredential.updateMany.mockResolvedValue({ count: 1 });
  db.totpRecoveryCode.updateMany.mockResolvedValue({ count: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("BR-32 / FR-07 — service MFA có policy và CAS", () => {
  it("không actor hoặc sai mục đích bị chặn trước truy cập dữ liệu", async () => {
    await expect(
      startMfaSetup(null as unknown as AuthActor, context),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(
      verifyMfa(actor("MFA_SETUP"), { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "MFA_REQUIRED" });
    await expect(
      confirmMfaSetup(actor("FULL"), { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
  });
  it("setup chỉ lưu secret mã hóa, QR hạn60giây và trả hạn phiên5phút; chưa bật", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    db.totpCredential.findUnique.mockResolvedValue(null);
    const result = await startMfaSetup(identity, context);
    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const saved = db.totpCredential.upsert.mock.calls[0][0].create;
    expect(saved.encryptedSecret).not.toContain(result.secret);
    expect(saved.enabledAt).toBeNull();
    expect(saved.pendingExpiresAt.getTime() - Date.now()).toBe(60000);
    expect(result.expiresAt).toBe("2026-10-31T06:01:00.000Z");
    expect(result.serverNow).toBe("2026-10-31T06:00:00.000Z");
    expect(result.sessionExpiresAt).toBe("2026-10-31T06:05:00.000Z");
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      result.secret,
    );
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("QR còn hạn được dùng lại; gọi lại hoặc tải trang không gia hạn60giây", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { secret, row } = credential(identity, true);
    vi.setSystemTime(new Date("2026-10-31T06:00:59.999Z"));
    const result = await startMfaSetup(identity, context);
    expect(result.secret).toBe(secret);
    expect(result.expiresAt).toBe(row.pendingExpiresAt!.toISOString());
    expect(db.totpCredential.upsert).not.toHaveBeenCalled();
    expect(db.totpCredential.update).not.toHaveBeenCalled();
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
  });
  it("đúng mốc60giây tạo QR/secret mới, không gia hạn phiên đăng nhập", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { secret } = credential(identity, true);
    vi.setSystemTime(new Date("2026-10-31T06:01:00.000Z"));
    const result = await startMfaSetup(identity, context);
    expect(result.secret).not.toBe(secret);
    expect(result.expiresAt).toBe("2026-10-31T06:02:00.000Z");
    expect(result.sessionExpiresAt).toBe("2026-10-31T06:05:00.000Z");
    expect(db.totpCredential.upsert).toHaveBeenCalledOnce();
    expect(db.userSession.create).not.toHaveBeenCalled();
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
  });
  it("hai yêu cầu cấp lại cùng thời điểm chỉ tạo một khóa mới trong giao dịch tuần tự", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { row } = credential(identity, true);
    vi.setSystemTime(new Date("2026-10-31T06:01:00.000Z"));
    let transactionTail: Promise<unknown> = Promise.resolve();
    // Model khóa transaction hiện có; kiểm cạnh tranh MySQL thật ở bộ HTTP.
    db.$transaction.mockImplementation((fn) => {
      const result = transactionTail.then(() => fn(db));
      transactionTail = result.catch(() => undefined);
      return result;
    });
    db.totpCredential.upsert.mockImplementation(async ({ create }) => {
      Object.assign(row, create);
      return row;
    });
    const [first, second] = await Promise.all([
      startMfaSetup(identity, context),
      startMfaSetup(identity, context),
    ]);
    expect(first.secret).toBe(second.secret);
    expect(first.expiresAt).toBe(second.expiresAt);
    expect(first.qrDataUrl).toBe(second.qrDataUrl);
    expect(db.totpCredential.upsert).toHaveBeenCalledOnce();
    expect(db.userSession.updateMany).not.toHaveBeenCalled();
  });
  it("QR cũ hạn5phút được rút về60giây một lần, không kéo dài ở lần gọi sau", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { secret, row } = credential(identity, true);
    row.pendingExpiresAt = new Date("2026-10-31T06:05:00.000Z");
    db.totpCredential.update.mockImplementation(async ({ data }) => {
      Object.assign(row, data);
      return row;
    });
    const first = await startMfaSetup(identity, context);
    expect(first.secret).toBe(secret);
    expect(first.expiresAt).toBe("2026-10-31T06:01:00.000Z");
    vi.setSystemTime(new Date("2026-10-31T06:00:59.000Z"));
    const second = await startMfaSetup(identity, context);
    expect(second.expiresAt).toBe(first.expiresAt);
    expect(second.secret).toBe(secret);
    expect(db.totpCredential.update).toHaveBeenCalledOnce();
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "MFA_SETUP_EXPIRY_CAPPED" }),
    });
  });
  it("QR không sống vượt hạn phiên tạm và không cấp lại khi phiên hết hạn", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity, new Date("2026-10-31T06:00:15.000Z"));
    db.totpCredential.findUnique.mockResolvedValue(null);
    const result = await startMfaSetup(identity, context);
    expect(result.expiresAt).toBe("2026-10-31T06:00:15.000Z");
    expect(result.sessionExpiresAt).toBe(result.expiresAt);
    db.totpCredential.upsert.mockClear();
    vi.setSystemTime(new Date(result.sessionExpiresAt));
    await expect(startMfaSetup(identity, context)).rejects.toMatchObject({
      code: "INVALID_SESSION",
    });
    expect(db.totpCredential.upsert).not.toHaveBeenCalled();
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("credential đã bật không bị đổi secret hoặc thời hạn bởi chức năng tạo QR", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    credential(identity);
    await expect(startMfaSetup(identity, context)).rejects.toMatchObject({
      code: "MFA_SESSION_REQUIRED",
    });
    expect(db.totpCredential.upsert).not.toHaveBeenCalled();
    expect(db.totpCredential.update).not.toHaveBeenCalled();
  });
  it("xác nhận mã đầu tiên mới bật, lưu10hash, revokephiên cũ và cấpFULL+mfa", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { secret } = credential(identity, true);
    const code = await generate({ secret, digits: 6, period: 30 });
    const result = await confirmMfaSetup(identity, { code }, context);
    expect(result.recoveryCodes).toHaveLength(10);
    expect(result.tokens.actor).toMatchObject({
      purpose: "FULL",
      mfa: true,
      mfaRequired: true,
    });
    expect(result.tokens.refreshToken).toMatch(/^[\w-]{43}$/);
    const rows = db.totpRecoveryCode.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(10);
    expect(rows[0].codeHash).toBe(
      hashRecoveryCode(identity.userId, result.recoveryCodes[0]),
    );
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: identity.userId, revokedAt: null },
      }),
    );
    expect(db.userSession.create.mock.calls[0][0].data).toMatchObject({
      purpose: "FULL",
      mfaVerifiedAt: expect.any(Date),
    });
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      result.recoveryCodes[0],
    );
  });
  it("pending enrollment hết hạn không bật hoặc cấp phiên", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { row } = credential(identity, true);
    db.totpCredential.findUnique.mockResolvedValue({
      ...row,
      pendingExpiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      confirmMfaSetup(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "MFA_SETUP_EXPIRED" });
    expect(db.totpCredential.update).not.toHaveBeenCalled();
    expect(db.userSession.create).not.toHaveBeenCalled();
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
  });
  it("đúng mốc hết hạn QR từ chối ngay cả mã OTP đang đúng, không tính sai mã", async () => {
    const identity = actor("MFA_SETUP");
    useActor(identity);
    const { secret } = credential(identity, true);
    vi.setSystemTime(new Date("2026-10-31T06:01:00.000Z"));
    const code = await generate({ secret, digits: 6, period: 30 });
    await expect(
      confirmMfaSetup(identity, { code }, context),
    ).rejects.toMatchObject({
      code: "MFA_SETUP_EXPIRED",
    });
    expect(db.totpCredential.updateMany).not.toHaveBeenCalled();
    expect(db.rateLimitBucket.update).not.toHaveBeenCalled();
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("sai mã ghi cảaccount/IP ngoài transaction xác minh, không cấp refresh", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    await expect(
      verifyMfa(identity, { code: "invalid" }, context),
    ).rejects.toMatchObject({ code: "INVALID_MFA_CODE" });
    expect(db.$transaction).toHaveBeenCalledTimes(3);
    expect(db.rateLimitBucket.update).toHaveBeenCalledTimes(2);
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("bucketđãkhóa chặn OTPđúng trước truy cập phiên", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    db.rateLimitBucket.findUnique.mockResolvedValue({
      lockedUntil: new Date(Date.now() + 900000),
    });
    await expect(
      verifyMfa(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
  });
  it("CAS TOTPthua race không mintphiên và vẫn ghinhậnsai", async () => {
    const identity = actor();
    useActor(identity);
    const { secret } = credential(identity);
    db.totpCredential.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      verifyMfa(
        identity,
        { code: await generate({ secret, digits: 6, period: 30 }) },
        context,
      ),
    ).rejects.toMatchObject({ code: "INVALID_MFA_CODE" });
    expect(db.userSession.create).not.toHaveBeenCalled();
    expect(db.rateLimitBucket.update).toHaveBeenCalledTimes(2);
  });
  it("mãkhôi phục chỉ mộtlầnCAS: lầnđầuFULL,lầnsauthấpbị từchối", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    const code = newRecoveryCodes()[0];
    db.totpRecoveryCode.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    expect((await verifyMfa(identity, { code }, context)).actor.mfa).toBe(true);
    await expect(verifyMfa(identity, { code }, context)).rejects.toMatchObject({
      code: "INVALID_MFA_CODE",
    });
    expect(db.userSession.create).toHaveBeenCalledOnce();
    expect(db.totpRecoveryCode.updateMany.mock.calls[0][0].where).toEqual({
      userId: identity.userId,
      codeHash: hashRecoveryCode(identity.userId, code),
      usedAt: null,
    });
  });
  it("actor giảpurpose hoặc chủsession không qua freshguard", async () => {
    const identity = actor();
    useActor(identity);
    credential(identity);
    db.userSession.findUnique.mockResolvedValueOnce({ userId: randomUUID() });
    await expect(
      verifyMfa(identity, { code: "123456" }, context),
    ).rejects.toMatchObject({ code: "INVALID_SESSION" });
    expect(db.userSession.create).not.toHaveBeenCalled();
  });
  it("step-up chỉ nhậnTOTP mới, khôngnhậnrecovery; ownresetbịchặn", async () => {
    const identity = actor("FULL");
    useActor(identity);
    credential(identity);
    await expect(
      assertStepUp(identity, newRecoveryCodes()[0], context),
    ).rejects.toMatchObject({ code: "INVALID_MFA_CODE" });
    await expect(
      resetUserMfa(
        identity,
        identity.userId,
        { reason: "Lý do đặt lại 2FA giả" },
        context,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.totpCredential.update).not.toHaveBeenCalled();
  });
  it("getstatus đọcDB; giảADMINnhưngDBđãmấtrolekhôngresetngườikhác", async () => {
    const identity = actor("FULL");
    const user = useActor(identity);
    credential(identity);
    expect(await getMfaStatus(identity)).toEqual({
      required: true,
      enabled: true,
      purpose: "FULL",
    });
    db.userSession.findUnique.mockResolvedValue({
      id: identity.sessionId,
      userId: identity.userId,
      familyId: identity.familyId,
      purpose: "FULL",
      mfaVerifiedAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 300000),
      user: {
        ...user,
        roles: [
          {
            role: "SINH_VIEN",
            scopeType: "GLOBAL",
            facultyId: null,
            departmentId: null,
          },
        ],
      },
    });
    await expect(
      resetUserMfa(
        identity,
        randomUUID(),
        { reason: "Lý do đặt lại 2FA giả" },
        context,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.totpCredential.updateMany).not.toHaveBeenCalled();
  });
  it("BR-34: reset 2FA từ chối gán ADMIN sai phạm vi trước truy cập dữ liệu", async () => {
    const identity: AuthActor = {
      ...actor("FULL"),
      assignments: [
        {
          role: "ADMIN",
          scopeType: "FACULTY",
          facultyId: randomUUID(),
          departmentId: null,
        },
      ],
    };
    await expect(
      resetUserMfa(
        identity,
        randomUUID(),
        { reason: "Lý do kiểm thử phạm vi giả" },
        context,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.userSession.findUnique).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
});
