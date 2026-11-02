import { describe, expect, it } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { can } from "../src/server/policies/can";
import {
  canReadInspection,
  feedbackTransitionTarget,
  hasInspectionConflict,
  initialFeedbackRoles,
  isInspectionOfficer,
  roleMatchesFeedbackSection,
} from "../src/server/policies/feedback";

const studentId = "11000000-0000-4000-8000-000000000001";
const teacherId = "11000000-0000-4000-8000-000000000002";
const otherId = "11000000-0000-4000-8000-000000000003";
const departmentId = "22000000-0000-4000-8000-000000000001";
const otherDepartmentId = "22000000-0000-4000-8000-000000000002";
const facultyId = "33000000-0000-4000-8000-000000000001";
const otherFacultyId = "33000000-0000-4000-8000-000000000002";
const section = { departmentId, facultyId, teacherIds: [teacherId] };
function grant(
  role: Role,
  id?: string,
): NonNullable<AuthActor["assignments"]>[number] {
  return {
    role,
    scopeType:
      role === "TRUONG_BO_MON"
        ? "DEPARTMENT"
        : role === "TRUONG_KHOA"
          ? "FACULTY"
          : "GLOBAL",
    departmentId: role === "TRUONG_BO_MON" ? (id ?? departmentId) : null,
    facultyId: role === "TRUONG_KHOA" ? (id ?? facultyId) : null,
  };
}
function actor(
  roles: Role[],
  userId = otherId,
  assignments = roles.map((role) => grant(role)),
): AuthActor {
  return {
    userId,
    loginCode: "FIXTURE",
    email: "fixture@example.invalid",
    displayName: "Tài khoản giả",
    sessionId: "44000000-0000-4000-8000-000000000001",
    familyId: "44000000-0000-4000-8000-000000000002",
    roles,
    assignments,
    purpose: "FULL",
    mustChangePassword: false,
    mfa: true,
    mfaRequired: roles.includes("ADMIN"),
  };
}

describe("BR-21 / FR-71 / FR-146 / FR-149 — tám loại phản hồi", () => {
  it.each([
    ["GIANG_DAY", "GOP_Y", ["GIANG_VIEN"], []],
    ["GIANG_DAY", "KHIEU_NAI", ["GIANG_VIEN"], ["TRUONG_BO_MON"]],
    ["NOI_DUNG_DE_CUONG", "DE_XUAT", ["TRUONG_BO_MON"], []],
    ["TAI_LIEU", "GOP_Y", ["GIANG_VIEN"], []],
    ["TAI_LIEU", "KHIEU_NAI", ["GIANG_VIEN"], ["TRUONG_BO_MON"]],
    ["KIEM_TRA_DANH_GIA", "GOP_Y", ["GIANG_VIEN"], ["TRUONG_BO_MON"]],
    ["THI_KET_THUC_HOC_PHAN", "KHIEU_NAI", ["PHONG_KHAO_THI"], []],
    ["TO_CHUC_LOP_HOC", "DE_XUAT", ["PHONG_DAO_TAO"], []],
    ["KHIEU_NAI_NGHIEM_TRONG", "KHIEU_NAI", ["THANH_TRA"], []],
    ["KHAC", "GOP_Y", ["CAN_BO_DBCL"], []],
  ] as const)(
    "%s/%s đến đúng người nhận chính và đồng gửi",
    (category, severity, primary, copied) => {
      expect(initialFeedbackRoles(category, severity)).toEqual({
        primary,
        copied,
      });
    },
  );
  it("TC-KT-02: kiểm tra thành phần không tự chuyển sang Khảo thí; loại lạ không có người nhận", () => {
    expect(
      initialFeedbackRoles("KIEM_TRA_DANH_GIA", "KHIEU_NAI").primary,
    ).not.toContain("PHONG_KHAO_THI");
    expect(initialFeedbackRoles("CSVC_LICH_HOC", "GOP_Y")).toEqual({
      primary: [],
      copied: [],
    });
    expect(initialFeedbackRoles("__UNKNOWN__", "GOP_Y")).toEqual({
      primary: [],
      copied: [],
    });
  });
});

describe("BR-18/61/62/68 / TC-ALL-01 — quyền đầu vào của mười vai trò", () => {
  it("BR-34 từ chối hành động chưa định nghĩa dù có tiền tố đúng module", () => {
    for (const role of [
      "GIANG_VIEN",
      "CAN_BO_DBCL",
      "THANH_TRA",
      "PHONG_KHAO_THI",
    ] as const)
      for (const action of [
        "feedback:delete",
        "inspection:export-all",
        "feedback-settings:reset",
        "improvements:remove",
        "exam-recommendations:remove",
      ])
        expect(can(actor([role]), action)).toBe(false);
  });
  it.each([
    ["SINH_VIEN", true, true, false, false, false, false],
    ["GIANG_VIEN", false, true, true, false, false, false],
    ["TRUONG_BO_MON", false, true, true, false, false, false],
    ["TRUONG_KHOA", false, true, true, false, false, false],
    ["CAN_BO_DBCL", false, true, true, false, false, true],
    ["LANH_DAO", false, true, true, true, false, false],
    ["ADMIN", false, false, false, false, false, false],
    ["PHONG_DAO_TAO", false, true, true, false, false, false],
    ["PHONG_KHAO_THI", false, true, true, false, false, false],
    ["THANH_TRA", false, true, true, true, true, false],
  ] as const)(
    "%s có đúng quyền tạo/đọc/xử lý/hồ sơ/phân công/cấu hình",
    (role, create, read, process, inspection, assign, settings) => {
      const identity = actor([role]);
      expect(can(identity, "feedback:create")).toBe(create);
      expect(can(identity, "feedback:attach")).toBe(create);
      expect(can(identity, "feedback:list")).toBe(read);
      expect(can(identity, "feedback:read")).toBe(read);
      expect(can(identity, "feedback:process")).toBe(process);
      expect(can(identity, "inspection:list")).toBe(inspection);
      expect(can(identity, "inspection:read")).toBe(inspection);
      expect(can(identity, "inspection:assign")).toBe(assign);
      expect(can(identity, "feedback-settings:read")).toBe(settings);
      expect(can(identity, "feedback-settings:write")).toBe(settings);
    },
  );
  it("chưa đăng nhập, phiên chưa hoàn tất hoặc chưaMFA bắt buộc đều bị chặn", () => {
    for (const identity of [
      null,
      { ...actor(["SINH_VIEN"], studentId), purpose: "MFA_VERIFY" as const },
      { ...actor(["GIANG_VIEN"]), mustChangePassword: true },
      { ...actor(["THANH_TRA"]), mfaRequired: true, mfa: false },
    ]) {
      for (const action of [
        "feedback:access",
        "feedback:read",
        "feedback:create",
        "inspection:read",
        "inspection:assign",
      ])
        expect(can(identity, action), action).toBe(false);
    }
  });
  it("ADMIN không nhận quyền nghiệp vụ nhạy cảm từ vai trò ghép", () => {
    const identity = actor([
      "ADMIN",
      "SINH_VIEN",
      "THANH_TRA",
      "CAN_BO_DBCL",
      "PHONG_DAO_TAO",
    ]);
    for (const action of [
      "feedback:access",
      "feedback:create",
      "feedback:read",
      "feedback:process",
      "feedback-settings:write",
      "inspection:list",
      "inspection:read",
      "inspection:assign",
    ])
      expect(can(identity, action), action).toBe(false);
  });
  it("ĐBCL ghépThanhtra không được mở hoặc phân công hồ sơ", () => {
    const identity = actor(["CAN_BO_DBCL", "THANH_TRA"]);
    expect(can(identity, "feedback:read")).toBe(true);
    expect(canReadInspection(identity, section)).toBe(false);
    expect(isInspectionOfficer(identity, section)).toBe(false);
    expect(can(identity, "inspection:assign")).toBe(false);
  });
  it("Lãnh đạo chỉ có quyền tóm tắt, không phải cán bộ xử lý hồ sơ", () => {
    const identity = actor(["LANH_DAO"]);
    expect(canReadInspection(identity, section)).toBe(true);
    expect(isInspectionOfficer(identity, section)).toBe(false);
    expect(can(identity, "feedback:read")).toBe(true);
    expect(can(identity, "inspection:assign")).toBe(false);
  });
  it("không tin tên vai trò nếu phạm vi cấp quyền không hợp lệ", () => {
    const identity = actor(["THANH_TRA"], otherId, [
      {
        role: "THANH_TRA",
        scopeType: "DEPARTMENT",
        departmentId,
        facultyId: null,
      },
    ]);
    expect(can(identity, "inspection:read")).toBe(false);
    expect(isInspectionOfficer(identity, section)).toBe(false);
  });
});

describe("BR-61 / FR-155 — xung đột tính động, kể cả đa vai trò", () => {
  it.each([
    actor(["THANH_TRA", "GIANG_VIEN"], teacherId),
    actor(["THANH_TRA", "TRUONG_BO_MON"]),
    actor(["THANH_TRA", "TRUONG_KHOA"]),
    actor(["THANH_TRA", "LANH_DAO", "TRUONG_BO_MON"]),
  ])(
    "người thuộc giảng viên/bộ môn/khoa liên quan không thấy hồ sơ",
    (identity) => {
      expect(hasInspectionConflict(identity, section)).toBe(true);
      expect(canReadInspection(identity, section)).toBe(false);
      expect(isInspectionOfficer(identity, section)).toBe(false);
    },
  );
  it("đổi phân công giảng viên làm thay đổi quyền ngay, không dựa vào snapshot người nhận", () => {
    const identity = actor(["THANH_TRA", "GIANG_VIEN"]);
    expect(isInspectionOfficer(identity, section)).toBe(true);
    expect(
      isInspectionOfficer(identity, {
        ...section,
        teacherIds: [...section.teacherIds, identity.userId],
      }),
    ).toBe(false);
    expect(isInspectionOfficer(identity, { ...section, teacherIds: [] })).toBe(
      true,
    );
  });
  it("trưởng đơn vị khác không bị nhầm thành xung đột của đơn vị đang xét", () => {
    const identity = actor(
      ["THANH_TRA", "TRUONG_BO_MON", "TRUONG_KHOA"],
      otherId,
      [
        grant("THANH_TRA"),
        grant("TRUONG_BO_MON", otherDepartmentId),
        grant("TRUONG_KHOA", otherFacultyId),
      ],
    );
    expect(hasInspectionConflict(identity, section)).toBe(false);
    expect(isInspectionOfficer(identity, section)).toBe(true);
  });
  it("không bỏ qua người đang được ghi phân công giảng dạy chỉ vì tài khoản mất nhãn GIANG_VIEN", () => {
    const identity = actor(["THANH_TRA"], teacherId);
    expect(hasInspectionConflict(identity, section)).toBe(true);
    expect(canReadInspection(identity, section)).toBe(false);
  });
});

describe("BR-21/34 — người nhận thường đúng phạm vi", () => {
  it("giảng viên chỉ khớp lớp đang phụ trách; trưởng đơn vị phải đúng bộ môn hoặc khoa", () => {
    expect(
      roleMatchesFeedbackSection(grant("GIANG_VIEN"), teacherId, section),
    ).toBe(true);
    expect(
      roleMatchesFeedbackSection(grant("GIANG_VIEN"), otherId, section),
    ).toBe(false);
    expect(
      roleMatchesFeedbackSection(grant("TRUONG_BO_MON"), otherId, section),
    ).toBe(true);
    expect(
      roleMatchesFeedbackSection(
        grant("TRUONG_BO_MON", otherDepartmentId),
        otherId,
        section,
      ),
    ).toBe(false);
    expect(
      roleMatchesFeedbackSection(grant("TRUONG_KHOA"), otherId, section),
    ).toBe(true);
    expect(
      roleMatchesFeedbackSection(
        grant("TRUONG_KHOA", otherFacultyId),
        otherId,
        section,
      ),
    ).toBe(false);
  });
  it("PĐT/Khảo thí/ĐBCL là các đơn vị nhận toàn trường, Lãnh đạo là tầng leo thang; không mở rộng sang ADMIN/Thanhtra", () => {
    for (const role of [
      "PHONG_DAO_TAO",
      "PHONG_KHAO_THI",
      "CAN_BO_DBCL",
      "LANH_DAO",
    ] as const)
      expect(roleMatchesFeedbackSection(grant(role), otherId, section)).toBe(
        true,
      );
    for (const role of ["SINH_VIEN", "ADMIN", "THANH_TRA"] as const)
      expect(roleMatchesFeedbackSection(grant(role), otherId, section)).toBe(
        false,
      );
  });
});

describe("BR-22 / FR-72/76 — toàn bộ cạnh máy trạng thái Tuần10", () => {
  const states = [
    "MOI",
    "DA_TIEP_NHAN",
    "DANG_XU_LY",
    "DA_TRA_LOI",
    "DA_DONG",
    "TU_CHOI",
  ];
  const actions = ["accept", "start", "answer", "close", "reject", "forward"];
  it("người được giao xử lý đi đúng chuỗi và chỉ chuyển tiếp/từ chối ở ba trạng thái đầu", () => {
    const edges: Record<string, Record<string, string>> = {
      MOI: { accept: "DA_TIEP_NHAN", reject: "TU_CHOI", forward: "MOI" },
      DA_TIEP_NHAN: { start: "DANG_XU_LY", reject: "TU_CHOI", forward: "MOI" },
      DANG_XU_LY: { answer: "DA_TRA_LOI", reject: "TU_CHOI", forward: "MOI" },
      DA_TRA_LOI: {},
      DA_DONG: {},
      TU_CHOI: {},
    };
    for (const status of states)
      for (const action of actions)
        expect(
          feedbackTransitionTarget(status, action, false, true, true),
          `${status}/${action}`,
        ).toBe(edges[status][action] ?? null);
  });
  it("sinh viên chỉ đóng sau khi đã trả lời, không tự xử lý/chuyển tiếp/từ chối", () => {
    for (const status of states)
      for (const action of actions)
        expect(
          feedbackTransitionTarget(status, action, true, false, false),
          `${status}/${action}`,
        ).toBe(
          status === "DA_TRA_LOI" && action === "close" ? "DA_DONG" : null,
        );
  });
  it("người nhận chính chưa nhận việc chỉ được tiếp nhận/chuyển tiếp/từ chối MOI", () => {
    for (const status of states)
      for (const action of actions) {
        const expected =
          status === "MOI"
            ? ((
                {
                  accept: "DA_TIEP_NHAN",
                  reject: "TU_CHOI",
                  forward: "MOI",
                } as Record<string, string>
              )[action] ?? null)
            : null;
        expect(
          feedbackTransitionTarget(status, action, false, true, false),
          `${status}/${action}`,
        ).toBe(expected);
      }
  });
  it("người chỉ đồng gửi không có cạnh ghi; không mở lại, leo thang hoặc nhảy trạng thái", () => {
    for (const status of states)
      for (const action of [
        ...actions,
        "reopen",
        "escalate",
        "XAC_MINH",
        "message",
        "__UNKNOWN__",
      ])
        expect(
          feedbackTransitionTarget(status, action, false, false, false),
          `${status}/${action}`,
        ).toBeNull();
    expect(
      feedbackTransitionTarget("DA_DONG", "reopen", true, false, false),
    ).toBeNull();
    expect(
      feedbackTransitionTarget("DANG_XU_LY", "close", true, false, false),
    ).toBeNull();
  });
});
