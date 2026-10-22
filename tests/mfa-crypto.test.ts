import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generate } from "otplib";
import { randomUUID } from "node:crypto";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  hashRecoveryCode,
  matchTotpStep,
  mfaUri,
  newMfaSecret,
  newRecoveryCodes,
  normalizeRecoveryCode,
} from "../src/server/auth/mfa-crypto";
import { normalizeRequiredRoles } from "../src/server/auth/mfa-policy";

beforeEach(() => {
  vi.stubEnv("MFA_ENCRYPTION_KEY", "1".repeat(64));
  vi.stubEnv("MFA_KEY_VERSION", "v1");
});
afterEach(() => vi.unstubAllEnvs());

describe("BR-32 / FR-07 — AES-256-GCM và bí mật MFA", () => {
  it("ciphertext có nonce riêng, giải mã đúng và bị ràng buộc user/version", () => {
    const userId = randomUUID();
    const secret = newMfaSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const encrypted = encryptMfaSecret(secret, userId);
    expect(encrypted).not.toContain(secret);
    expect(encryptMfaSecret(secret, userId)).not.toBe(encrypted);
    expect(decryptMfaSecret(encrypted, userId, "v1")).toBe(secret);
    expect(() => decryptMfaSecret(encrypted, randomUUID(), "v1")).toThrow();
    expect(() => decryptMfaSecret(encrypted, userId, "v2")).toThrow();
    const parts = encrypted.split(".");
    parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
    expect(() => decryptMfaSecret(parts.join("."), userId, "v1")).toThrow();
    vi.stubEnv("MFA_ENCRYPTION_KEY", "2".repeat(64));
    expect(() => decryptMfaSecret(encrypted, userId, "v1")).toThrow();
  });
  it("khóa ngắn và envelope hỏng bị từ chối; URI tương thích authenticator", () => {
    expect(() => decryptMfaSecret("invalid", randomUUID(), "v1")).toThrow();
    vi.stubEnv("MFA_ENCRYPTION_KEY", "short");
    expect(() => encryptMfaSecret(newMfaSecret(), randomUUID())).toThrow();
    const uri = new URL(mfaUri(newMfaSecret(), "ADMIN_TEST"));
    expect(uri.protocol).toBe("otpauth:");
    // URI có thể bỏ các tham số mặc định theo chuẩn otpauth.
    expect(uri.searchParams.get("digits") ?? "6").toBe("6");
    expect(uri.searchParams.get("period") ?? "30").toBe("30");
    expect(uri.searchParams.get("algorithm") ?? "SHA1").toBe("SHA1");
  });
  it("RFC6238 SHA1 tại epoch59 (8 số94287082) nhận đúng6số287082", async () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(
      await generate({
        secret,
        epoch: 59,
        digits: 8,
        algorithm: "sha1",
        period: 30,
      }),
    ).toBe("94287082");
    expect(await matchTotpStep(secret, "287082", null, 59)).toBe(BigInt(1));
  });
  it("chỉ nhận6số, ±1bước, chặn mã hết hạn và dùng lại hoặc lùi bước", async () => {
    const secret = newMfaSecret();
    const epoch = 1234567890;
    const step = Math.floor(epoch / 30);
    for (const delta of [-1, 0, 1]) {
      const code = await generate({
        secret,
        epoch: (step + delta) * 30,
        digits: 6,
        period: 30,
      });
      expect(await matchTotpStep(secret, code, null, epoch)).toBe(
        BigInt(step + delta),
      );
      expect(
        await matchTotpStep(secret, code, BigInt(step + delta), epoch),
      ).toBeNull();
    }
    for (const delta of [-2, 2]) {
      const code = await generate({
        secret,
        epoch: (step + delta) * 30,
        digits: 6,
        period: 30,
      });
      expect(await matchTotpStep(secret, code, null, epoch)).toBeNull();
    }
    expect(await matchTotpStep(secret, "12345", null, epoch)).toBeNull();
    expect(await matchTotpStep(secret, "1234567", null, epoch)).toBeNull();
    expect(await matchTotpStep(secret, "12 456", null, epoch)).toBeNull();
  });
  it("10mã khôi phục128bit riêng, hash ràng buộc tài khoản", () => {
    const codes = newRecoveryCodes();
    const user = randomUUID();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(normalizeRecoveryCode(code.toLowerCase())).toBe(code);
      expect(Buffer.from(code.replaceAll("-", ""), "hex")).toHaveLength(16);
      expect(hashRecoveryCode(user, code)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashRecoveryCode(user, code)).not.toBe(
        hashRecoveryCode(randomUUID(), code),
      );
    }
    expect(normalizeRecoveryCode("123456")).toBeNull();
  });
});

describe("FR-08 — cấu hình vai trò bắt buộc MFA", () => {
  it("ADMIN luôn bắt buộc; cấu hình hợp lệ union và loại trùng", () => {
    expect(normalizeRequiredRoles(undefined)).toEqual(["ADMIN"]);
    expect(normalizeRequiredRoles([])).toEqual(["ADMIN"]);
    expect(
      normalizeRequiredRoles(["GIANG_VIEN", "GIANG_VIEN", "ADMIN"]),
    ).toEqual(["ADMIN", "GIANG_VIEN"]);
  });
  it("cấu hình lạ bị từ chối thay vì tắt chính sách", () => {
    expect(() => normalizeRequiredRoles(["ROOT"])).toThrow();
    expect(() => normalizeRequiredRoles("ADMIN")).toThrow();
    expect(() => normalizeRequiredRoles(null)).toThrow();
  });
});
