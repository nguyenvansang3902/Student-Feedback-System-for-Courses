import { describe, expect, it } from "vitest";
import {
  documentContentSecurityPolicy,
  securityHeaders,
} from "../src/lib/security-headers";

const nonce = "yJ8JjCaGkE6bQ7sxbDzV0PV5F03uLUVw";

describe("NFR-14 BR-31 — header bảo vệ trình duyệt", () => {
  it("chặn nhúng trang, MIME sniffing, referrer và quyền thiết bị không dùng", () => {
    const headers = securityHeaders(false);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
  });

  it("chỉ bật HSTS trong production để không ép HTTPS môi trường HTTP cục bộ", () => {
    expect(securityHeaders(false)["Strict-Transport-Security"]).toBeUndefined();
    expect(securityHeaders(true)["Strict-Transport-Security"]).toBe(
      "max-age=31536000",
    );
  });

  it("production yêu cầu nonce cho script, chặn eval và không mở nguồn ngoài", () => {
    const policy = documentContentSecurityPolicy(nonce, true);
    const scripts = policy
      .split("; ")
      .find((item) => item.startsWith("script-src"));
    expect(scripts).toBe(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain(" ws:");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("form-action 'self'");
  });

  it("development giữ HMR hoạt động mà không nới script inline", () => {
    const policy = documentContentSecurityPolicy(nonce, false);
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' ws: wss:");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(
      policy.split("; ").find((item) => item.startsWith("script-src")),
    ).not.toContain("'unsafe-inline'");
  });

  it("chỉ cho phép ảnh nội bộ/data QR và kiểu inline đang dùng trong biểu đồ", () => {
    const policy = documentContentSecurityPolicy(nonce, true);
    expect(policy).toContain("img-src 'self' data: blob:");
    expect(policy).toContain("font-src 'self'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  });

  it.each(["", "client-nonce", nonce + "' https:", nonce + "\r\nX-Test: yes"])(
    "từ chối nonce sai định dạng hoặc cố chèn chỉ thị: %s",
    (value) =>
      expect(() => documentContentSecurityPolicy(value, true)).toThrow(),
  );
});
