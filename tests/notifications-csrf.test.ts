import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import {
  assertFeedbackCsrf,
  assertNotificationsCsrf,
  issueFeedbackCsrf,
  issueNotificationsCsrf,
} from "../src/server/auth/csrf";
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({ jwtSecret: "z".repeat(64) }),
}));
const actor = (admin = false): AuthActor => ({
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "FAKE",
  displayName: "Giả",
  email: "fixture@example.invalid",
  purpose: "FULL",
  mfa: admin,
  mustChangePassword: false,
  roles: admin ? ["ADMIN"] : ["SINH_VIEN"],
  assignments: [
    {
      role: admin ? "ADMIN" : "SINH_VIEN",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
  ],
});
const request = (token?: string) =>
  new NextRequest("http://localhost:3000/api/notifications/read", {
    headers: token ? { "x-csrf-token": token } : {},
  });
afterEach(() => vi.useRealTimers());
describe("FR-80, BR-32/34 — CSRF hộp thông báo", () => {
  it.each([false, true])(
    "SV và ADMIN dùng token thông báo riêng %#",
    (admin) => {
      const current = actor(admin);
      expect(() =>
        assertNotificationsCsrf(
          request(issueNotificationsCsrf(current)),
          current,
        ),
      ).not.toThrow();
    },
  );
  it("không dùng token phản hồi cho thông báo hoặc ngược lại", () => {
    const current = actor();
    expect(() =>
      assertNotificationsCsrf(request(issueFeedbackCsrf(current)), current),
    ).toThrow();
    expect(() =>
      assertFeedbackCsrf(request(issueNotificationsCsrf(current)), current),
    ).toThrow();
  });
  it("từ chối thiếu token, đổi chữ ký hoặc đổi phiên", () => {
    const current = actor(),
      token = issueNotificationsCsrf(current);
    expect(() => assertNotificationsCsrf(request(), current)).toThrow();
    expect(() =>
      assertNotificationsCsrf(request(token.slice(0, -1) + "!"), current),
    ).toThrow();
    expect(() =>
      assertNotificationsCsrf(request(token), {
        ...current,
        sessionId: randomUUID(),
      }),
    ).toThrow();
  });
  it("token hết 15 phút không còn dùng được", () => {
    vi.useFakeTimers();
    const current = actor(),
      token = issueNotificationsCsrf(current);
    vi.setSystemTime(Date.now() + 900001);
    expect(() => assertNotificationsCsrf(request(token), current)).toThrow();
  });
});
