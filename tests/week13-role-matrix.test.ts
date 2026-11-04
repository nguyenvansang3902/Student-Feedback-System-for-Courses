import { describe, expect, it } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role } from "../src/generated/prisma/enums";
import {
  can,
  type PolicyAction,
  type SectionResource,
} from "../src/server/policies/can";

// Oracle lấy từ DAC_TA_NGHIEP_VU và MA_TRAN_QUYEN, không sinh từ nhánh của can().
const roles = [
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
] as const satisfies readonly Role[];
const admin = ["ADMIN"] as const;
const quality = ["CAN_BO_DBCL"] as const;
const training = ["PHONG_DAO_TAO"] as const;
const exam = ["PHONG_KHAO_THI"] as const;
const inspection = ["THANH_TRA"] as const;
const student = ["SINH_VIEN"] as const;
const teacher = ["GIANG_VIEN"] as const;
const department = ["TRUONG_BO_MON"] as const;
const campaignReaders = ["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"] as const;
const resultReaders = [
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
] as const;
const staffFeedback = [
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
  "THANH_TRA",
] as const;
const ordinaryFeedback = ["SINH_VIEN", ...staffFeedback] as const;
const sectionReaders = [
  "SINH_VIEN",
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "PHONG_DAO_TAO",
] as const;
const recommendationReaders = [
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "PHONG_KHAO_THI",
] as const;

// Record buộc mọi PolicyAction mới phải có quyết định nghiệm thu tường minh.
const expectedRoles = {
  "reports:read": roles,
  "reports:export": roles,
  "reports:settings:read": quality,
  "reports:settings:write": quality,
  "anomalies:list": inspection,
  "anomalies:read": inspection,
  "anomalies:review": inspection,
  "anomalies:settings:read": quality,
  "anomalies:settings:write": quality,
  "notifications:list": roles,
  "notifications:read": roles,
  "notifications:mutate": roles,
  "improvements:list": resultReaders,
  "improvements:read": resultReaders,
  "improvements:submit": teacher,
  "improvements:review": department,
  "exam-recommendations:list": recommendationReaders,
  "exam-recommendations:read": recommendationReaders,
  "exam-recommendations:create": exam,
  "exam-recommendations:respond": department,
  "feedback:access": ordinaryFeedback,
  "feedback:list": ordinaryFeedback,
  "feedback:read": ordinaryFeedback,
  "feedback:create": student,
  "feedback:attach": student,
  "feedback:process": staffFeedback,
  "feedback-settings:read": quality,
  "feedback-settings:write": quality,
  "inspection:list": ["LANH_DAO", "THANH_TRA"],
  "inspection:read": ["LANH_DAO", "THANH_TRA"],
  "inspection:assign": inspection,
  "workspace:view": roles,
  "sections:list": sectionReaders,
  "sections:read": sectionReaders,
  "users:list": admin,
  "users:read": admin,
  "users:create": admin,
  "users:status": admin,
  "users:roles": admin,
  "catalog:list": ["ADMIN", "CAN_BO_DBCL", "PHONG_DAO_TAO"],
  "catalog:read": ["ADMIN", "CAN_BO_DBCL", "PHONG_DAO_TAO"],
  "catalog:write": training,
  "imports:manage": training,
  "templates:list": quality,
  "templates:read": quality,
  "templates:write": quality,
  "campaigns:list": campaignReaders,
  "campaigns:read": campaignReaders,
  "campaigns:write": quality,
  "campaigns:submit": quality,
  "campaigns:confirm": training,
  "campaigns:approve": ["LANH_DAO"],
  "campaigns:operate": quality,
  "campaigns:progress": ["CAN_BO_DBCL", "LANH_DAO"],
  "student-surveys:list": student,
  "student-surveys:read": student,
  "student-surveys:submit": student,
  "results:read": resultReaders,
  "results:assessment": exam,
  "results:aggregate": quality,
  "results:publish": quality,
  "results:moderate": quality,
  "results:incomplete": ["TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL"],
  "results:remind": ["TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL"],
  "campaign-settings:read": ["ADMIN", ...campaignReaders],
  "campaign-settings:write": admin,
  "audit:list": admin,
  "mfa-policy:read": admin,
  "mfa-policy:write": admin,
  "mfa:reset": admin,
} satisfies Record<PolicyAction, readonly Role[]>;

const userId = "11000000-0000-4000-8000-000000000001";
const departmentId = "22000000-0000-4000-8000-000000000001";
const facultyId = "33000000-0000-4000-8000-000000000001";
const own = {
  departmentId,
  facultyId,
  studentIds: [userId],
  teacherIds: [userId],
};
const foreign = {
  departmentId: "22000000-0000-4000-8000-000000000002",
  facultyId: "33000000-0000-4000-8000-000000000002",
  studentIds: ["11000000-0000-4000-8000-000000000002"],
  teacherIds: ["11000000-0000-4000-8000-000000000002"],
};
function actor(role: Role): AuthActor {
  return {
    userId,
    loginCode: "MATRIX_FAKE",
    email: "matrix@example.invalid",
    displayName: "Ma trận giả",
    sessionId: "session",
    familyId: "family",
    roles: [role],
    assignments: [
      {
        role,
        scopeType:
          role === "TRUONG_BO_MON"
            ? "DEPARTMENT"
            : role === "TRUONG_KHOA"
              ? "FACULTY"
              : "GLOBAL",
        departmentId: role === "TRUONG_BO_MON" ? departmentId : null,
        facultyId: role === "TRUONG_KHOA" ? facultyId : null,
      },
    ],
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
  };
}
function resource(action: PolicyAction): SectionResource | undefined {
  if (action === "catalog:write") return { catalogEntity: "sections" };
  if (
    [
      "sections:read",
      "sections:list",
      "results:read",
      "results:incomplete",
      "results:remind",
    ].includes(action)
  )
    return own;
  return undefined;
}
const cells = (
  Object.entries(expectedRoles) as [PolicyAction, readonly Role[]][]
).flatMap(([action, allowed]) =>
  roles.map((role) => ({ action, role, allowed: allowed.includes(role) })),
);

describe("W13 FR-160 TC-ALL-01 BR-18/34/50/61/62/67/68 — mọi action × mười vai trò", () => {
  it.each(cells)("$role / $action = $allowed", ({ role, action, allowed }) => {
    expect(can(actor(role), action, resource(action))).toBe(allowed);
  });

  it.each(roles)(
    "%s: mất grant, grant thừa ID, scope sai và phiên tạm không cấp bất kỳ action",
    (role) => {
      const current = actor(role);
      const invalidActors: AuthActor[] = [
        { ...current, assignments: [] },
        {
          ...current,
          assignments: current.assignments!.map((grant) => ({
            ...grant,
            scopeType:
              role === "TRUONG_BO_MON" || role === "TRUONG_KHOA"
                ? "GLOBAL"
                : "FACULTY",
          })),
        },
        {
          ...current,
          assignments: current.assignments!.map((grant) => ({
            ...grant,
            facultyId,
            departmentId,
          })),
        },
        { ...current, roles: [] },
        { ...current, purpose: "MFA_SETUP" },
        { ...current, purpose: "MFA_VERIFY" },
        { ...current, purpose: "PASSWORD_CHANGE" },
        { ...current, purpose: undefined },
        { ...current, mustChangePassword: true },
        { ...current, mfaRequired: true, mfa: false },
      ];
      for (const invalid of invalidActors)
        for (const action of Object.keys(expectedRoles) as PolicyAction[])
          expect(
            can(invalid, action, resource(action)),
            `${role}/${action}/${invalid.purpose}`,
          ).toBe(false);
    },
  );

  it.each(roles)(
    "%s: ID/phạm vi lớp và kết quả không được suy từ quyền mở menu",
    (role) => {
      const current = actor(role);
      expect(can(current, "sections:read", foreign)).toBe(
        ["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(role),
      );
      expect(can(current, "results:read", foreign)).toBe(
        ["CAN_BO_DBCL", "LANH_DAO"].includes(role),
      );
      expect(can(current, "results:incomplete", foreign)).toBe(
        role === "CAN_BO_DBCL",
      );
      expect(can(current, "results:remind", foreign)).toBe(
        role === "CAN_BO_DBCL",
      );
      for (const requested of roles)
        expect(can(current, "workspace:view", { role: requested })).toBe(
          requested === role,
        );
    },
  );

  it.each(roles)(
    "TC-PDT-01 %s: phân biệt dữ liệu đào tạo và tổ chức trên cùng API danh mục",
    (role) => {
      for (const catalogEntity of ["faculties", "departments"] as const)
        expect(can(actor(role), "catalog:write", { catalogEntity })).toBe(
          role === "ADMIN",
        );
      for (const catalogEntity of [
        "semesters",
        "courses",
        "sections",
        "teaching",
      ] as const)
        expect(can(actor(role), "catalog:write", { catalogEntity })).toBe(
          role === "PHONG_DAO_TAO",
        );
      expect(can(actor(role), "catalog:write")).toBe(false);
      expect(
        can(actor(role), "catalog:write", { catalogEntity: "teachers" }),
      ).toBe(false);
    },
  );

  it.each(roles)(
    "%s: hành động chưa công bố bị từ chối, không nhận tiền tố hợp lệ",
    (role) => {
      for (const prefix of [
        "reports",
        "anomalies",
        "notifications",
        "improvements",
        "exam-recommendations",
        "feedback",
        "inspection",
        "feedback-settings",
        "users",
        "catalog",
        "templates",
        "campaigns",
        "student-surveys",
        "results",
        "mfa-policy",
      ])
        expect(can(actor(role), `${prefix}:undefined-action`)).toBe(false);
    },
  );

  it("khách không có quyền dù đã biết mọi action hợp lệ", () => {
    for (const action of Object.keys(expectedRoles) as PolicyAction[])
      expect(can(null, action, resource(action))).toBe(false);
  });
});
