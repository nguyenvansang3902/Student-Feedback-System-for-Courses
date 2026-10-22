import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { AuthError, type AuthActor } from "../src/server/auth/types";
import {
  dummyPasswordHash,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "../src/server/auth/password";
import {
  hashRefreshToken,
  isRefreshToken,
  mintAccessToken,
  newRefreshToken,
  verifyAccessToken,
} from "../src/server/auth/session";
import { authorizeAuthAction } from "../src/server/policies/auth";

const { config } = vi.hoisted(() => ({
  config: {
    jwtSecret: "a".repeat(64),
    jwtIssuer: "test-issuer",
    jwtAudience: "test-web",
    bcryptCost: 12,
  },
}));
vi.mock("../src/lib/env", () => ({ getAuthConfig: () => config }));

function actor(): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "SV_TEST",
    email: "test@example.invalid",
    displayName: "Sinh viên giả",
    roles: ["SINH_VIEN"],
    mustChangePassword: false,
    mfa: false,
  };
}

describe("BR-31 — chính sách mật khẩu bcrypt", () => {
  it("đếm ký tự Unicode nhưng chặn tại 72 byte UTF-8, không cắt ngầm", () => {
    expect(() => validatePassword("a".repeat(9))).toThrow("ít nhất 10");
    expect(() => validatePassword("ộ".repeat(24))).not.toThrow();
    expect(() => validatePassword("ộ".repeat(25))).toThrow("72 byte");
    expect(() => validatePassword("a".repeat(72))).not.toThrow();
    expect(() => validatePassword("a".repeat(73))).toThrow("72 byte");
  });
  it("từ chối danh sách phổ biến không phân biệt hoa thường", () => {
    expect(() => validatePassword("Password123")).toThrow("quá phổ biến");
  });
  it("băm cost 12, so sánh đúng/sai và không nhận phần đuôi bị bcrypt cắt", async () => {
    const password = "Tuần-3-Học-Tập!";
    const hashed = await hashPassword(password);
    expect(bcrypt.getRounds(hashed)).toBe(12);
    expect(bcrypt.getRounds(dummyPasswordHash)).toBe(12);
    expect(hashed).not.toContain(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
    expect(await verifyPassword("Sai-mật-khẩu!", hashed)).toBe(false);
    expect(await verifyPassword("a".repeat(73), hashed)).toBe(false);
  });
});

describe("BR-31 — JWT và refresh", () => {
  beforeEach(() => {
    config.jwtIssuer = "test-issuer";
    config.jwtAudience = "test-web";
  });
  it("JWT có định danh, vai trò, mfa:false và mục đích access; sửa chữ ký bị từ chối", async () => {
    const identity = actor();
    const token = await mintAccessToken(identity, new Date(Date.now() + 60000));
    expect(await verifyAccessToken(token)).toMatchObject({
      sub: identity.userId,
      sid: identity.sessionId,
      fid: identity.familyId,
      roles: ["SINH_VIEN"],
      mfa: false,
      pwd: false,
      tokenUse: "access",
    });
    const [header, payload, signature] = token.split(".");
    const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    expect(
      await verifyAccessToken(`${header}.${payload}.${changedSignature}`),
    ).toBeNull();
  });
  it("từ chối token hết hạn, sai issuer hoặc sai audience", async () => {
    const identity = actor();
    expect(
      await verifyAccessToken(
        await mintAccessToken(identity, new Date(Date.now() - 60000)),
      ),
    ).toBeNull();
    const token = await mintAccessToken(identity, new Date(Date.now() + 60000));
    config.jwtIssuer = "other-issuer";
    expect(await verifyAccessToken(token)).toBeNull();
    config.jwtIssuer = "test-issuer";
    config.jwtAudience = "other-audience";
    expect(await verifyAccessToken(token)).toBeNull();
  });
  it("không nhận HS384, thiếu claims hoặc mfa:true sai mục đích", async () => {
    const identity = actor();
    const make = (alg: string, extra: Record<string, unknown> = {}) =>
      new SignJWT({
        sid: identity.sessionId,
        fid: identity.familyId,
        roles: identity.roles,
        mfa: false,
        pwd: false,
        tokenUse: "access",
        purpose: "FULL",
        ...extra,
      })
        .setProtectedHeader({ alg, typ: "JWT" })
        .setSubject(identity.userId)
        .setIssuer(config.jwtIssuer)
        .setAudience(config.jwtAudience)
        .setIssuedAt()
        .setJti(randomUUID())
        .setExpirationTime("1m")
        .sign(new TextEncoder().encode(config.jwtSecret));
    expect(await verifyAccessToken(await make("HS384"))).toBeNull();
    expect(
      await verifyAccessToken(
        await make("HS256", { mfa: true, purpose: "MFA_VERIFY" }),
      ),
    ).toBeNull();
    expect(
      await verifyAccessToken(await make("HS256", { sid: "không-phải-uuid" })),
    ).toBeNull();
    expect(
      await verifyAccessToken(await make("HS256", { roles: ["UNKNOWN_ROLE"] })),
    ).toBeNull();
    expect(
      await verifyAccessToken(
        await make("HS256", { tokenUse: "password-reset" }),
      ),
    ).toBeNull();
  });
  it("refresh là 256 bit ngẫu nhiên và chỉ hash SHA-256 dùng để lưu DB", () => {
    const first = newRefreshToken();
    expect(isRefreshToken(first)).toBe(true);
    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(newRefreshToken()).not.toBe(first);
    expect(hashRefreshToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken(first)).not.toBe(first);
    expect(isRefreshToken("a".repeat(42))).toBe(false);
    expect(isRefreshToken("a".repeat(43) + "=")).toBe(false);
  });
});

describe("BR-32/BR-34 — policy xác thực từ chối mặc định", () => {
  it("chỉ công khai hành động xác thực có chủ đích", () => {
    expect(() => authorizeAuthAction(null, "login")).not.toThrow();
    expect(() => authorizeAuthAction(actor(), "login")).toThrow(AuthError);
    expect(() => authorizeAuthAction(null, "change-password")).toThrow(
      AuthError,
    );
    expect(() => authorizeAuthAction(null, "workspace")).toThrow(AuthError);
  });
  it("mật khẩu tạm chỉ đổi mật khẩu/đăng xuất; không vào workspace", () => {
    const limited = { ...actor(), mustChangePassword: true };
    expect(() => authorizeAuthAction(limited, "change-password")).not.toThrow();
    expect(() => authorizeAuthAction(limited, "logout")).not.toThrow();
    expect(() => authorizeAuthAction(limited, "workspace")).toThrow(
      "đổi mật khẩu tạm",
    );
  });
  it("ADMIN và tài khoản nhiều vai trò không bỏ qua MFA; người không có vai trò bị chặn", () => {
    const admin: AuthActor = { ...actor(), roles: ["ADMIN", "SINH_VIEN"] };
    expect(() => authorizeAuthAction(admin, "workspace")).toThrow("hai bước");
    expect(() => authorizeAuthAction(admin, "admin")).toThrow("hai bước");
    expect(() => authorizeAuthAction(actor(), "admin")).toThrow(AuthError);
    expect(() =>
      authorizeAuthAction({ ...actor(), roles: [] }, "workspace"),
    ).toThrow(AuthError);
    expect(() => authorizeAuthAction(actor(), "workspace")).not.toThrow();
  });
});
