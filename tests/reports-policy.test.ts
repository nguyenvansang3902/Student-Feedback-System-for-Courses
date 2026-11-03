import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role, ScopeType } from "../src/generated/prisma/enums";
import {
  canManageReportSettings,
  reportRolesForActor,
  reportSectionScope,
  reportSurveyStages,
  selectReportRole,
} from "../src/server/policies/reports";
import {
  reportRoles,
  reportsQuerySchema,
  reportSettingsMutationSchema,
} from "../src/server/services/reports-types";
const departmentId = randomUUID(),
  facultyId = randomUUID();
function actor(roles: Role[]): AuthActor {
  return {
    userId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Giả",
    sessionId: randomUUID(),
    familyId: randomUUID(),
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
    roles,
    assignments: roles.map((role) => ({
      role,
      scopeType: (role === "TRUONG_BO_MON"
        ? "DEPARTMENT"
        : role === "TRUONG_KHOA"
          ? "FACULTY"
          : "GLOBAL") as ScopeType,
      departmentId: role === "TRUONG_BO_MON" ? departmentId : null,
      facultyId: role === "TRUONG_KHOA" ? facultyId : null,
    })),
  };
}
describe("W12 FR-90 BR-18/34/61/62/67 — báo cáo mười vai trò", () => {
  it.each(reportRoles)("%s chỉ chọn được vai trò có grant hợp lệ", (role) => {
    const current = actor([role]);
    expect(reportRolesForActor(current)).toEqual([role]);
    expect(selectReportRole(current, role)).toBe(role);
  });
  it("ADMIN ghép mọi vai trò vẫn chỉ dashboard kỹ thuật", () => {
    const current = actor([...reportRoles]);
    expect(reportRolesForActor(current)).toEqual(["ADMIN"]);
    expect(selectReportRole(current, "THANH_TRA")).toBe("ADMIN");
    expect(canManageReportSettings(current)).toBe(false);
  });
  it("ĐBCL ghép Thanh tra không vượt quyền hồ sơ", () => {
    const current = actor(["CAN_BO_DBCL", "THANH_TRA"]);
    expect(reportRolesForActor(current)).toEqual(["CAN_BO_DBCL"]);
    expect(() => selectReportRole(current, "THANH_TRA")).toThrow();
  });
  it("không nhận vai trò giả hoặc phiên chưa hoàn tất", () => {
    expect(() => selectReportRole(actor(["GIANG_VIEN"]), "LANH_DAO")).toThrow();
    expect(reportRolesForActor({ ...actor(["ADMIN"]), mfa: false })).toEqual(
      [],
    );
    expect(
      reportRolesForActor({ ...actor(["SINH_VIEN"]), purpose: "MFA_VERIFY" }),
    ).toEqual([]);
  });
  it("SV/GV dùng chủ sở hữu, TBM/TK dùng đúng các ID phạm vi", () => {
    const sv = actor(["SINH_VIEN"]),
      gv = actor(["GIANG_VIEN"]);
    expect(JSON.stringify(reportSectionScope(sv, "SINH_VIEN"))).toContain(
      sv.userId,
    );
    expect(reportSectionScope(gv, "GIANG_VIEN")).toEqual({
      teaching: { some: { teacherId: gv.userId } },
    });
    expect(
      JSON.stringify(
        reportSectionScope(actor(["TRUONG_BO_MON"]), "TRUONG_BO_MON"),
      ),
    ).toContain(departmentId);
    expect(
      JSON.stringify(reportSectionScope(actor(["TRUONG_KHOA"]), "TRUONG_KHOA")),
    ).toContain(facultyId);
  });
  it("vai trò được chọn giữ scope hẹp dù tài khoản đồng thời là ĐBCL", () => {
    const current = actor(["CAN_BO_DBCL", "GIANG_VIEN"]);
    expect(reportSectionScope(current, "GIANG_VIEN")).toEqual({
      teaching: { some: { teacherId: current.userId } },
    });
  });
  it("TT loại mọi xung đột từ phân công và phạm vi vai trò ghép", () => {
    const current = actor([
        "THANH_TRA",
        "GIANG_VIEN",
        "TRUONG_BO_MON",
        "TRUONG_KHOA",
      ]),
      where = reportSectionScope(current, "THANH_TRA");
    expect(where).toMatchObject({
      teaching: { none: { teacherId: current.userId } },
      course: {
        departmentId: { notIn: [departmentId] },
        department: { facultyId: { notIn: [facultyId] } },
      },
    });
  });
  it("stage KT/GV/TBM/TK chỉ công bố; ĐBCL/LĐ từ tổng hợp", () => {
    for (const role of [
      "PHONG_KHAO_THI",
      "GIANG_VIEN",
      "TRUONG_BO_MON",
      "TRUONG_KHOA",
    ] as const)
      expect(reportSurveyStages(role)).toEqual(["DA_CONG_BO", "LUU_TRU"]);
    for (const role of ["CAN_BO_DBCL", "LANH_DAO"] as const)
      expect(reportSurveyStages(role)).toContain("DA_TONG_HOP");
  });
  it("query strict không nhận định danh SV, range thời gian hoặc payload vượt scope", () => {
    for (const extra of [
      { studentId: randomUUID() },
      { email: "canary@example.invalid" },
      { from: "2026-01-01" },
      { role: "UNKNOWN" },
      { courseId: "invalid" },
    ])
      expect(reportsQuerySchema.safeParse(extra).success).toBe(false);
  });
  it("ngưỡng gộp 5 mặc định, không cho giảm xuống 1 hoặc mất mã yêu cầu", () => {
    expect(
      reportSettingsMutationSchema.safeParse({
        minFeedbackRecords: 1,
        minInspectionCases: 5,
        revision: 1,
        requestId: randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      reportSettingsMutationSchema.safeParse({
        minFeedbackRecords: 5,
        minInspectionCases: 5,
        revision: 1,
      }).success,
    ).toBe(false);
  });
});
