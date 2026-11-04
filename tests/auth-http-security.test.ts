import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  authContext,
  clearSessionCookies,
  readAuthBody,
  setSessionCookies,
} from "../src/server/auth/http";
import type { SessionTokens } from "../src/server/auth/types";

const config = vi.hoisted(() => ({
  appUrl: "https://survey.example.invalid",
  trustProxy: false,
}));
vi.mock("../src/lib/env", () => ({ getAuthConfig: () => config }));
vi.mock("../src/server/services/auth", () => ({ getActor: vi.fn() }));

const tokens: SessionTokens = {
  accessToken: "fixture-access-token",
  refreshToken: "fixture-refresh-token",
  accessExpiresAt: new Date("2030-01-01T00:15:00Z"),
  refreshExpiresAt: new Date("2030-01-31T00:00:00Z"),
  actor: {
    userId: "10000000-0000-4000-8000-000000000001",
    sessionId: "10000000-0000-4000-8000-000000000002",
    familyId: "10000000-0000-4000-8000-000000000003",
    loginCode: "FIXTURE",
    displayName: "Tài khoản giả",
    email: "fixture@example.invalid",
    roles: ["SINH_VIEN"],
    purpose: "FULL",
    mustChangePassword: false,
    mfa: false,
  },
};
afterEach(() => {
  vi.unstubAllEnvs();
  config.trustProxy = false;
});

describe("NFR-06 BR-31 — cookie và Origin/Host thực tế", () => {
  it.each(["production", "development"])(
    "Set-Cookie %s có phạm vi và cờ bảo vệ đúng",
    (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const response = NextResponse.json({ ok: true });
      setSessionCookies(response, tokens);
      const cookies = response.headers.getSetCookie();
      expect(cookies).toHaveLength(2);
      const access = cookies.find((value) => value.startsWith("sfs_access="))!;
      const refresh = cookies.find((value) =>
        value.startsWith("sfs_refresh="),
      )!;
      for (const cookie of [access, refresh]) {
        expect(cookie).toContain("; HttpOnly");
        expect(cookie).toContain("; SameSite=lax");
        expect(cookie.includes("; Secure")).toBe(environment === "production");
        expect(cookie).not.toContain("Domain=");
      }
      expect(access.split("; ")).toContain("Path=/");
      expect(refresh.split("; ")).toContain("Path=/api/auth");
    },
  );

  it("phiên MFA hạn chế xóa refresh và logout xóa đúng cả hai path", () => {
    vi.stubEnv("NODE_ENV", "production");
    const limited = NextResponse.json({ ok: true });
    setSessionCookies(limited, { ...tokens, refreshToken: "" });
    const refresh = limited.headers
      .getSetCookie()
      .find((value) => value.startsWith("sfs_refresh="))!;
    expect(refresh).toContain("Max-Age=0");
    expect(refresh).toContain("Path=/api/auth");
    const logout = NextResponse.json({ ok: true });
    clearSessionCookies(logout);
    for (const cookie of logout.headers.getSetCookie()) {
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).toContain("; Secure");
      expect(cookie).toContain("; HttpOnly");
      expect(cookie).not.toContain("fixture-");
    }
  });

  it("chỉ Origin và Host khớp cấu hình được chấp nhận", () => {
    const request = (origin: string | null, host: string | null) =>
      new NextRequest(config.appUrl + "/api/auth/login", {
        method: "POST",
        headers: { ...(origin ? { origin } : {}), ...(host ? { host } : {}) },
      });
    expect(() =>
      assertSameOrigin(request(config.appUrl, "survey.example.invalid")),
    ).not.toThrow();
    for (const bad of [
      request(null, "survey.example.invalid"),
      request("null", "survey.example.invalid"),
      request(
        "https://survey.example.invalid.evil.invalid",
        "survey.example.invalid",
      ),
      request(config.appUrl, "evil.invalid"),
      request(config.appUrl, null),
    ])
      expect(() => assertSameOrigin(bad)).toThrow();
  });

  it("không tin X-Forwarded-For mặc định; chế độ proxy chỉ nhận IP hợp lệ", () => {
    const request = new NextRequest(config.appUrl, {
      headers: {
        "x-forwarded-for": "192.0.2.12, 192.0.2.13",
        "user-agent": "x".repeat(600),
      },
    });
    expect(authContext(request)).toEqual({
      ip: "untrusted-client",
      userAgent: "x".repeat(512),
    });
    config.trustProxy = true;
    expect(authContext(request).ip).toBe("192.0.2.12");
    expect(
      authContext(
        new NextRequest(config.appUrl, {
          headers: { "x-forwarded-for": "not-an-ip" },
        }),
      ).ip,
    ).toBe("untrusted-client");
  });
});

describe("NFR-14 — JSON auth được giới hạn theo byte thực", () => {
  const request = (body: string, contentType = "application/json") =>
    new NextRequest(config.appUrl + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": contentType, "content-length": "1" },
      body,
    });
  it("từ chối body vượt 8192 byte kể cả Content-Length khai nhỏ", async () => {
    await expect(readAuthBody(request("ộ".repeat(2731)))).rejects.toMatchObject(
      { status: 413 },
    );
  });
  it("JSON sai và MIME khác trả lỗi đã chuẩn hóa", async () => {
    await expect(
      readAuthBody(request("{payload-bi-mat")),
    ).rejects.toMatchObject({
      status: 400,
      message: "Dữ liệu yêu cầu không hợp lệ.",
    });
    await expect(
      readAuthBody(request("{}", "text/plain")),
    ).rejects.toMatchObject({ status: 415 });
    expect(await readAuthBody(request('{"ok":true}'))).toEqual({ ok: true });
  });
});
