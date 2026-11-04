import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

afterEach(() => vi.unstubAllEnvs());

describe("NFR-14 BR-31 — nonce và header trên ranh giới HTTP", () => {
  it("tạo nonce mới mỗi request và dùng cùng nonce cho Next SSR với trình duyệt", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest(
      "https://survey.example.invalid/dang-nhap",
      {
        headers: {
          "x-nonce": "nonce-do-client-chon",
          "content-security-policy": "script-src * 'unsafe-inline'",
        },
      },
    );
    const first = proxy(request);
    const second = proxy(request);
    const nonce = first.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
    expect(nonce).not.toBe(second.headers.get("x-middleware-request-x-nonce"));
    const policy = first.headers.get("Content-Security-Policy");
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(policy).toBe(
      first.headers.get("x-middleware-request-content-security-policy"),
    );
    expect(policy).not.toContain("nonce-do-client-chon");
    expect(policy).not.toContain("script-src *");
    expect(first.headers.get("Cache-Control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(first.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000",
    );
  });

  it.each(["/api/health", "/api/feedback/abc/attachments/def", "/api"])(
    "API %s giữ chính sách riêng của route tải tệp và có header chung",
    (path) => {
      vi.stubEnv("NODE_ENV", "production");
      const response = proxy(
        new NextRequest(`https://survey.example.invalid${path}`, {
          headers: {
            "x-nonce": "nonce-client",
            "content-security-policy": "script-src *",
          },
        }),
      );
      expect(response.headers.get("Content-Security-Policy")).toBeNull();
      expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
      expect(
        response.headers.get("x-middleware-request-content-security-policy"),
      ).toBeNull();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    },
  );

  it("HTTP phát triển không bị ép HTTPS và vẫn giới hạn script bằng nonce", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = proxy(new NextRequest("http://localhost:3000/dang-nhap"));
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).toContain("'nonce-");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
  });
});
