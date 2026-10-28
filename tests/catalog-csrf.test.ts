import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthActor } from "../src/server/auth/types";
import {
  assertAdminCsrf,
  assertCatalogCsrf,
  issueAdminCsrf,
  issueCatalogCsrf,
} from "../src/server/auth/csrf";
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({ jwtSecret: "c".repeat(64) }),
}));
const dbcl = (): AuthActor => ({
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "DBCL_CSRF",
  email: "dbcl-csrf@example.invalid",
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
  new NextRequest("http://localhost/api/catalog/courses", {
    headers: token ? { "x-csrf-token": token } : {},
  });
afterEach(() => vi.useRealTimers());
describe("W5 FR-20/21 BR-32/34 — CSRF danh mục", () => {
  it("ĐBCL GLOBAL có phiên đầy đủ lấy token bảo vệ phiên; token không tự cấp quyền ghi", () => {
    const actor = dbcl();
    expect(() =>
      assertCatalogCsrf(request(issueCatalogCsrf(actor)), actor),
    ).not.toThrow();
  });
  it("PĐT và ADMIN MFA lấy token danh mục; từ chối người dùng sai vai trò/phạm vi", () => {
    const actor = dbcl();
    for (const role of ["PHONG_DAO_TAO", "ADMIN"] as const) {
      const current = {
        ...actor,
        roles: [role],
        mfa: role === "ADMIN",
        assignments: [
          {
            role,
            scopeType: "GLOBAL" as const,
            facultyId: null,
            departmentId: null,
          },
        ],
      };
      expect(() =>
        assertCatalogCsrf(request(issueCatalogCsrf(current)), current),
      ).not.toThrow();
      if (role === "ADMIN")
        expect(() => issueCatalogCsrf({ ...current, mfa: false })).toThrow();
    }
    for (const other of [
      {
        ...actor,
        roles: ["PHONG_KHAO_THI" as const],
        assignments: [
          {
            role: "PHONG_KHAO_THI" as const,
            scopeType: "GLOBAL" as const,
            facultyId: null,
            departmentId: null,
          },
        ],
      },
      {
        ...actor,
        roles: ["THANH_TRA" as const],
        assignments: [
          {
            role: "THANH_TRA" as const,
            scopeType: "GLOBAL" as const,
            facultyId: null,
            departmentId: null,
          },
        ],
      },
      { ...actor, roles: ["SINH_VIEN" as const] },
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
    ])
      expect(() => issueCatalogCsrf(other)).toThrow();
  });
  it("không nhận phiên hạn chế hay tài khoản phải đổi mật khẩu", () => {
    const actor = dbcl();
    for (const other of [
      { ...actor, purpose: "PASSWORD_CHANGE" as const },
      { ...actor, mustChangePassword: true },
      { ...actor, mfaRequired: true },
    ])
      expect(() => issueCatalogCsrf(other)).toThrow();
  });
  it("từ chối token thiếu, sửa chữ ký, token phiên khác và quá dài", () => {
    const actor = dbcl(),
      token = issueCatalogCsrf(actor);
    for (const value of [undefined, "x".repeat(1025), `${token.slice(0, -1)}!`])
      expect(() => assertCatalogCsrf(request(value), actor)).toThrow();
    expect(() =>
      assertCatalogCsrf(request(token), { ...actor, sessionId: randomUUID() }),
    ).toThrow();
    expect(() =>
      assertCatalogCsrf(request(token), { ...actor, userId: randomUUID() }),
    ).toThrow();
  });
  it("không dùng chéo token quản trị và danh mục dù có cả hai vai trò", () => {
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
        {
          role: "CAN_BO_DBCL",
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
      ],
    };
    expect(() =>
      assertCatalogCsrf(request(issueAdminCsrf(actor)), actor),
    ).toThrow();
    expect(() =>
      assertAdminCsrf(request(issueCatalogCsrf(actor)), actor),
    ).toThrow();
  });
  it("từ chối sau 15 phút hoặc đồng hồ lùi vượt khoảng hiệu lực", () => {
    vi.useFakeTimers();
    const actor = dbcl(),
      now = Date.now(),
      token = issueCatalogCsrf(actor);
    vi.setSystemTime(now + 900001);
    expect(() => assertCatalogCsrf(request(token), actor)).toThrow();
    vi.setSystemTime(now - 1001);
    expect(() => assertCatalogCsrf(request(token), actor)).toThrow();
  });
});
