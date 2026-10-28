import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthActor } from "../src/server/auth/types";
import {
  assertAdminCsrf,
  assertCatalogCsrf,
  assertTemplatesCsrf,
  issueAdminCsrf,
  issueCatalogCsrf,
  issueTemplatesCsrf,
} from "../src/server/auth/csrf";
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({ jwtSecret: "c".repeat(64) }),
}));
const dbcl = (): AuthActor => ({
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "DBCL_CSRF",
  email: "template-csrf@example.invalid",
  displayName: "ĐBCL giả",
  roles: ["CAN_BO_DBCL"],
  mfa: false,
  purpose: "FULL",
  mustChangePassword: false,
  assignments: [
    {
      role: "CAN_BO_DBCL",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
  ],
});
const request = (token?: string) =>
  new NextRequest("http://localhost/api/templates", {
    headers: token ? { "x-csrf-token": token } : {},
  });
afterEach(() => vi.useRealTimers());
describe("W6 FR-30/32 BR-32/34 — CSRF mẫu phiếu", () => {
  it("chỉ cấp cho ĐBCL GLOBAL phiên đầy đủ", () => {
    const actor = dbcl();
    expect(() =>
      assertTemplatesCsrf(request(issueTemplatesCsrf(actor)), actor),
    ).not.toThrow();
    for (const other of [
      {
        ...actor,
        roles: ["ADMIN" as const],
        mfa: true,
        assignments: [
          {
            role: "ADMIN" as const,
            scopeType: "GLOBAL" as const,
            facultyId: null,
            departmentId: null,
          },
        ],
      },
      { ...actor, assignments: [] },
      {
        ...actor,
        assignments: [
          {
            role: "CAN_BO_DBCL" as const,
            scopeType: "FACULTY" as const,
            facultyId: randomUUID(),
            departmentId: null,
          },
        ],
      },
      { ...actor, purpose: "MFA_SETUP" as const },
      { ...actor, mustChangePassword: true },
      { ...actor, mfaRequired: true },
    ])
      expect(() => issueTemplatesCsrf(other)).toThrow();
  });
  it("từ chối thiếu, quá dài, chữ ký sửa và phiên/người khác", () => {
    const actor = dbcl(),
      token = issueTemplatesCsrf(actor);
    for (const value of [undefined, "x".repeat(1025), `${token.slice(0, -1)}!`])
      expect(() => assertTemplatesCsrf(request(value), actor)).toThrow();
    for (const other of [
      { ...actor, sessionId: randomUUID() },
      { ...actor, userId: randomUUID() },
    ])
      expect(() => assertTemplatesCsrf(request(token), other)).toThrow();
  });
  it("không nhận token admin/catalog và không dùng token mẫu phiếu ở hai miền kia", () => {
    const actor: AuthActor = {
      ...dbcl(),
      roles: ["ADMIN", "CAN_BO_DBCL"],
      mfa: true,
      assignments: [
        {
          role: "ADMIN",
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
        ...dbcl().assignments!,
      ],
    };
    for (const token of [issueAdminCsrf(actor), issueCatalogCsrf(actor)])
      expect(() => assertTemplatesCsrf(request(token), actor)).toThrow();
    const token = issueTemplatesCsrf(actor);
    expect(() => assertAdminCsrf(request(token), actor)).toThrow();
    expect(() => assertCatalogCsrf(request(token), actor)).toThrow();
  });
  it("từ chối hết hạn hoặc token tương lai", () => {
    vi.useFakeTimers();
    const actor = dbcl(),
      now = Date.now(),
      token = issueTemplatesCsrf(actor);
    vi.setSystemTime(now + 900001);
    expect(() => assertTemplatesCsrf(request(token), actor)).toThrow();
    vi.setSystemTime(now - 1001);
    expect(() => assertTemplatesCsrf(request(token), actor)).toThrow();
  });
});
