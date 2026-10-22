import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthActor } from "../src/server/auth/types";
import { issueAdminCsrf, assertAdminCsrf } from "../src/server/auth/csrf";
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({ jwtSecret: "c".repeat(64) }),
}));
const admin = (): AuthActor => ({
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "ADMIN_TEST",
  email: "csrf@example.invalid",
  displayName: "Quản trị giả",
  roles: ["ADMIN"],
  mfa: true,
  mustChangePassword: false,
  purpose: "FULL",
});
const request = (token?: string) =>
  new NextRequest("http://localhost/api/admin/users", {
    headers: token ? { "x-csrf-token": token } : {},
  });
afterEach(() => vi.useRealTimers());
describe("W4 BR-32/34 — CSRF quản trị gắn phiên", () => {
  it("chấp nhận token đúng phiên ADMIN đầy đủ", () => {
    const actor = admin();
    expect(() =>
      assertAdminCsrf(request(issueAdminCsrf(actor)), actor),
    ).not.toThrow();
  });
  it("từ chối thiếu, sai chữ ký và token quá dài", () => {
    const actor = admin();
    const token = issueAdminCsrf(actor);
    for (const value of [
      undefined,
      token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"),
      "x".repeat(1025),
    ])
      expect(() => assertAdminCsrf(request(value), actor)).toThrow();
  });
  it("không chuyển token sang phiên xoay vòng hoặc người khác", () => {
    const actor = admin();
    const token = issueAdminCsrf(actor);
    for (const other of [
      { ...actor, sessionId: randomUUID() },
      { ...actor, userId: randomUUID() },
    ])
      expect(() => assertAdminCsrf(request(token), other)).toThrow();
  });
  it("từ chối sau 15 phút và không nhận token từ tương lai", () => {
    vi.useFakeTimers();
    const actor = admin();
    const now = Date.now();
    const token = issueAdminCsrf(actor);
    vi.setSystemTime(now + 900001);
    expect(() => assertAdminCsrf(request(token), actor)).toThrow();
    vi.setSystemTime(now - 1001);
    expect(() => assertAdminCsrf(request(token), actor)).toThrow();
  });
  it("không cấp CSRF cho ADMIN chưa MFA hoặc người dùng khác", () => {
    const actor = admin();
    for (const other of [
      { ...actor, mfa: false, purpose: "MFA_VERIFY" as const },
      { ...actor, roles: ["SINH_VIEN" as const] },
    ])
      expect(() => issueAdminCsrf(other)).toThrow();
  });
});
