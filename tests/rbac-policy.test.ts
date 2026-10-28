import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role } from "../src/generated/prisma/enums";
import {
  can,
  isValidGrant,
  sectionScopeWhere,
  type RoleGrant,
} from "../src/server/policies/can";

const userId = randomUUID(),
  departmentId = randomUUID(),
  facultyId = randomUUID();
function grant(role: Role): RoleGrant {
  return role === "TRUONG_BO_MON"
    ? { role, scopeType: "DEPARTMENT", departmentId }
    : role === "TRUONG_KHOA"
      ? { role, scopeType: "FACULTY", facultyId }
      : { role, scopeType: "GLOBAL" };
}
function actor(...roles: Role[]): AuthActor {
  return {
    userId,
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Giả",
    roles,
    assignments: roles.map((role) => ({
      ...grant(role),
      facultyId: grant(role).facultyId ?? null,
      departmentId: grant(role).departmentId ?? null,
    })),
    purpose: "FULL",
    mustChangePassword: false,
    mfa: roles.includes("ADMIN"),
    mfaRequired: roles.includes("ADMIN"),
  };
}
const own = {
  departmentId,
  facultyId,
  studentIds: [userId],
  teacherIds: [userId],
};
const other = {
  departmentId: randomUUID(),
  facultyId: randomUUID(),
  studentIds: [randomUUID()],
  teacherIds: [randomUUID()],
};

describe("FR-11/BR-34 — ma trận vai trò/phạm vi tập trung", () => {
  it.each<Role>([
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "ADMIN",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])("TC-ALL-01 một phần: %s own/other và quản trị độc lập", (role) => {
    const current = actor(role);
    expect(can(current, "workspace:view", { role })).toBe(true);
    expect(can(current, "users:list")).toBe(role === "ADMIN");
    expect(can(current, "audit:list")).toBe(role === "ADMIN");
    expect(can(current, "sections:read", own)).toBe(
      !["ADMIN", "PHONG_KHAO_THI", "THANH_TRA"].includes(role),
    );
    expect(can(current, "sections:read", other)).toBe(
      ["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(role),
    );
    expect(can(current, "feedback:read")).toBe(false);
    expect(can(current, "unknown")).toBe(false);
  });
  it("TBM không mở bộ môn khác cùng khoa; TK mở bộ môn khác trong khoa mình", () => {
    const sameFaculty = { ...other, facultyId };
    expect(can(actor("TRUONG_BO_MON"), "sections:read", sameFaculty)).toBe(
      false,
    );
    expect(can(actor("TRUONG_KHOA"), "sections:read", sameFaculty)).toBe(true);
  });
  it("ADMIN đơn vai trò không có quyền kết quả, phản hồi hoặc lớp nghiệp vụ", () => {
    for (const action of [
      "results:read",
      "feedback:read",
      "sections:list",
      "unknown",
      "users:delete",
    ])
      expect(can(actor("ADMIN"), action)).toBe(false);
    expect(sectionScopeWhere(actor("ADMIN"))).toEqual({ id: { in: [] } });
  });
  it("ADMIN+GV chỉ hưởng gán GV và phạm vi riêng, không mở lớp khác", () => {
    const combined = actor("ADMIN", "GIANG_VIEN");
    expect(can(combined, "sections:read", own)).toBe(true);
    expect(can(combined, "sections:read", other)).toBe(false);
    expect(sectionScopeWhere(combined)).toEqual({
      OR: [{ teaching: { some: { teacherId: userId } } }],
    });
  });
  it("vai trò mới GLOBAL hợp lệ, từ chối mọi scope thừa/sai; KT/TT không có raw lớp", () => {
    for (const role of [
      "PHONG_DAO_TAO",
      "PHONG_KHAO_THI",
      "THANH_TRA",
    ] as const) {
      expect(isValidGrant({ role, scopeType: "GLOBAL" })).toBe(true);
      for (const invalid of [
        { role, scopeType: "FACULTY", facultyId },
        { role, scopeType: "GLOBAL", departmentId },
      ] as RoleGrant[])
        expect(isValidGrant(invalid)).toBe(false);
    }
    expect(sectionScopeWhere(actor("PHONG_DAO_TAO"))).toEqual({});
    for (const role of ["PHONG_KHAO_THI", "THANH_TRA"] as const)
      expect(sectionScopeWhere(actor(role))).toEqual({ id: { in: [] } });
  });
  it("ADMIN kết hợp vai trò mới luôn cần MFA; hợp quyền không vượt scope riêng", () => {
    for (const role of [
      "PHONG_DAO_TAO",
      "PHONG_KHAO_THI",
      "THANH_TRA",
    ] as const) {
      const current = actor("ADMIN", role);
      expect(
        can({ ...current, mfa: false, mfaRequired: false }, "workspace:view"),
      ).toBe(false);
      expect(
        can({ ...current, mfa: false, mfaRequired: false }, "catalog:write", {
          catalogEntity: "semesters",
        }),
      ).toBe(false);
      expect(can(current, "sections:read", other)).toBe(
        role === "PHONG_DAO_TAO",
      );
    }
  });
  it("hợp nhiều gán khoa/bộ môn; cùng một filter phục vụ list/detail/count", () => {
    const combined = actor("TRUONG_BO_MON", "TRUONG_KHOA");
    expect(sectionScopeWhere(combined)).toEqual({
      OR: [
        { course: { departmentId } },
        { course: { department: { facultyId } } },
      ],
    });
    expect(can(combined, "sections:read", { ...other, departmentId })).toBe(
      true,
    );
    expect(can(combined, "sections:read", { ...other, facultyId })).toBe(true);
  });
  it("token tạm, mật khẩu tạm, MFA thiếu và phiên chưa có purpose bị từ chối", () => {
    for (const current of [
      { ...actor("ADMIN"), mfa: false },
      { ...actor("ADMIN"), purpose: "MFA_SETUP" as const },
      { ...actor("ADMIN"), purpose: "MFA_VERIFY" as const },
      { ...actor("SINH_VIEN"), purpose: "PASSWORD_CHANGE" as const },
      { ...actor("SINH_VIEN"), mustChangePassword: true },
      { ...actor("SINH_VIEN"), mfaRequired: true, mfa: false },
      { ...actor("SINH_VIEN"), purpose: undefined },
    ])
      expect(can(current, "workspace:view")).toBe(false);
  });
  it("gán sai scope/null/phạm vi thừa không cấp quyền; role URL phải được gán", () => {
    for (const invalid of [
      { role: "ADMIN", scopeType: "FACULTY", facultyId },
      { role: "TRUONG_BO_MON", scopeType: "GLOBAL" },
      { role: "TRUONG_KHOA", scopeType: "FACULTY" },
      {
        role: "TRUONG_BO_MON",
        scopeType: "DEPARTMENT",
        departmentId,
        facultyId,
      },
    ] as RoleGrant[])
      expect(isValidGrant(invalid)).toBe(false);
    expect(
      can(actor("SINH_VIEN"), "workspace:view", { role: "GIANG_VIEN" }),
    ).toBe(false);
    expect(can({ ...actor("ADMIN"), assignments: [] }, "users:list")).toBe(
      false,
    );
    expect(can(null, "workspace:view")).toBe(false);
  });
});
