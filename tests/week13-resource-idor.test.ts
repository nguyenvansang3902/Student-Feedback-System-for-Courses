import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  canReadInspection,
  isInspectionOfficer,
} from "../src/server/policies/feedback";
import {
  canReadImprovement,
  canSubmitImprovement,
  canReviewImprovement,
  canReadRecommendation,
  canRespondRecommendation,
} from "../src/server/policies/improvement-workflows";
import {
  canReadSurveyAnomaly,
  canReviewSurveyAnomaly,
} from "../src/server/policies/survey-anomalies";
import {
  reportRolesForActor,
  selectReportRole,
  reportSectionScope,
} from "../src/server/policies/reports";
import { canReadNoticeTarget } from "../src/server/services/notification-access";

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
const departmentId = "22000000-0000-4000-8000-000000000001";
const facultyId = "33000000-0000-4000-8000-000000000001";
const foreignDepartmentId = "22000000-0000-4000-8000-000000000002";
const foreignFacultyId = "33000000-0000-4000-8000-000000000002";
const authorId = "11000000-0000-4000-8000-000000000001";
const teacherId = "11000000-0000-4000-8000-000000000002";
const staffId = "11000000-0000-4000-8000-000000000003";
const foreignUserId = "11000000-0000-4000-8000-000000000004";
const targetId = "44000000-0000-4000-8000-000000000001";
function actor(...assigned: Role[]): AuthActor {
  return {
    userId: assigned.includes("GIANG_VIEN")
      ? teacherId
      : assigned.includes("SINH_VIEN")
        ? authorId
        : staffId,
    loginCode: "IDOR_FAKE",
    email: "idor@example.invalid",
    displayName: "Kiểm quyền giả",
    sessionId: "session",
    familyId: "family",
    roles: assigned,
    assignments: assigned.map((role) => ({
      role,
      scopeType:
        role === "TRUONG_BO_MON"
          ? "DEPARTMENT"
          : role === "TRUONG_KHOA"
            ? "FACULTY"
            : "GLOBAL",
      departmentId: role === "TRUONG_BO_MON" ? departmentId : null,
      facultyId: role === "TRUONG_KHOA" ? facultyId : null,
    })),
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
  };
}
const own = { departmentId, facultyId, teacherIds: [teacherId] };
const other = {
  departmentId: foreignDepartmentId,
  facultyId: foreignFacultyId,
  teacherIds: [foreignUserId],
};
const ownImprovement = {
  teacherId,
  departmentId,
  facultyId,
  currentTeacherIds: [teacherId],
};
const otherImprovement = {
  teacherId: foreignUserId,
  departmentId: foreignDepartmentId,
  facultyId: foreignFacultyId,
  currentTeacherIds: [foreignUserId],
};
const ownRecommendation = {
  senderId: foreignUserId,
  recipientId: staffId,
  departmentId,
  facultyId,
};
const otherRecommendation = {
  senderId: foreignUserId,
  recipientId: foreignUserId,
  departmentId: foreignDepartmentId,
  facultyId: foreignFacultyId,
};

describe("W13 TC-ALL-01 BR-10/34/58/61/62/65 — IDOR trên tài nguyên thay vì chỉ quyền mở chức năng", () => {
  it.each(roles)(
    "%s: giải trình own/foreign, người nộp và người xác nhận",
    (role) => {
      const current = actor(role);
      expect(canReadImprovement(current, ownImprovement)).toBe(
        [
          "GIANG_VIEN",
          "TRUONG_BO_MON",
          "TRUONG_KHOA",
          "CAN_BO_DBCL",
          "LANH_DAO",
        ].includes(role),
      );
      expect(canReadImprovement(current, otherImprovement)).toBe(
        ["CAN_BO_DBCL", "LANH_DAO"].includes(role),
      );
      expect(canSubmitImprovement(current, ownImprovement)).toBe(
        role === "GIANG_VIEN",
      );
      expect(canSubmitImprovement(current, otherImprovement)).toBe(false);
      expect(canReviewImprovement(current, ownImprovement)).toBe(
        role === "TRUONG_BO_MON",
      );
      expect(canReviewImprovement(current, otherImprovement)).toBe(false);
    },
  );
  it.each(roles)(
    "%s: kiến nghị đúng phạm vi, trả lời phải đúng người nhận",
    (role) => {
      const current = actor(role);
      expect(canReadRecommendation(current, ownRecommendation)).toBe(
        ["PHONG_KHAO_THI", "TRUONG_BO_MON", "TRUONG_KHOA"].includes(role),
      );
      expect(canReadRecommendation(current, otherRecommendation)).toBe(
        role === "PHONG_KHAO_THI",
      );
      expect(canRespondRecommendation(current, ownRecommendation)).toBe(
        role === "TRUONG_BO_MON",
      );
      expect(
        canRespondRecommendation(current, {
          ...ownRecommendation,
          recipientId: foreignUserId,
        }),
      ).toBe(false);
      expect(canRespondRecommendation(current, otherRecommendation)).toBe(
        false,
      );
    },
  );
  it.each(roles)(
    "TC-TT-01/02 %s: hồ sơ và chỉ số bất thường có quyền độc lập",
    (role) => {
      const current = actor(role);
      expect(canReadInspection(current, own)).toBe(
        ["LANH_DAO", "THANH_TRA"].includes(role),
      );
      expect(isInspectionOfficer(current, own)).toBe(role === "THANH_TRA");
      expect(canReadSurveyAnomaly(current, own)).toBe(role === "THANH_TRA");
      expect(canReviewSurveyAnomaly(current, own)).toBe(role === "THANH_TRA");
    },
  );
  it.each(["GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA"] as const)(
    "TC-TT-01: TT ghép %s không đọc/giao/xem chỉ số cùng lớp xung đột",
    (role) => {
      const current = actor("THANH_TRA", role);
      expect(canReadInspection(current, own)).toBe(false);
      expect(isInspectionOfficer(current, own)).toBe(false);
      expect(canReadSurveyAnomaly(current, own)).toBe(false);
      expect(canReviewSurveyAnomaly(current, own)).toBe(false);
      expect(canReadInspection(current, other)).toBe(true);
      expect(isInspectionOfficer(current, other)).toBe(true);
      expect(canReadSurveyAnomaly(current, other)).toBe(true);
    },
  );
  it("BR-10: GV kiêm TBM không tự xác nhận; mất phân công không gửi lại giải trình", () => {
    expect(
      canReviewImprovement(
        actor("GIANG_VIEN", "TRUONG_BO_MON"),
        ownImprovement,
      ),
    ).toBe(false);
    expect(
      canSubmitImprovement(actor("GIANG_VIEN"), {
        ...ownImprovement,
        currentTeacherIds: [],
      }),
    ).toBe(false);
    expect(
      canReadImprovement(actor("GIANG_VIEN"), {
        ...ownImprovement,
        currentTeacherIds: [],
      }),
    ).toBe(false);
  });
  it("BR-67/68: thêm ADMIN không mở báo cáo nghiệp vụ; thêm ĐBCL không mở hồ sơ TT", () => {
    const all = actor(...roles);
    expect(reportRolesForActor(all)).toEqual(["ADMIN"]);
    for (const role of roles) expect(selectReportRole(all, role)).toBe("ADMIN");
    for (const current of [
      actor("ADMIN", "THANH_TRA"),
      actor("CAN_BO_DBCL", "THANH_TRA"),
    ]) {
      expect(canReadInspection(current, own)).toBe(false);
      expect(canReadSurveyAnomaly(current, own)).toBe(false);
    }
  });
  it("BR-34/67: chọn báo cáo GV trong tài khoản đa vai trò giữ đúng teacherId", () => {
    const current = actor("GIANG_VIEN", "CAN_BO_DBCL", "LANH_DAO");
    expect(selectReportRole(current, "GIANG_VIEN")).toBe("GIANG_VIEN");
    expect(reportSectionScope(current, "GIANG_VIEN")).toEqual({
      teaching: { some: { teacherId } },
    });
    expect(() => selectReportRole(actor("GIANG_VIEN"), "LANH_DAO")).toThrow();
  });
});

const section = {
  teaching: [{ teacherId }],
  course: {
    departmentId,
    department: { facultyId, isActive: true, faculty: { isActive: true } },
  },
};
const tx = {
  feedback: { findUnique: vi.fn() },
  inspectionCase: { findUnique: vi.fn() },
  improvementPlan: { findUnique: vi.fn() },
  examReviewRecommendation: { findUnique: vi.fn() },
  surveyAnomalyFlag: { findUnique: vi.fn() },
  surveyCampaign: { findUnique: vi.fn() },
  surveyTask: { findFirst: vi.fn() },
};
const client = tx as unknown as Prisma.TransactionClient;
beforeEach(() => vi.resetAllMocks());
describe("W13 TC-ALL-01 BR-24/34/61/62 — thông báo và email không mở cửa hậu IDOR", () => {
  it.each(roles)(
    "%s: liên kết thông báo giữ quyền tài nguyên và quyền hiện tại",
    async (role) => {
      const current = actor(role);
      tx.feedback.findUnique.mockResolvedValue({
        authorId,
        category: "GIANG_DAY",
        section,
        inspectionCase: null,
        recipients: [
          { userId: current.userId, isActive: true, accessRole: role },
        ],
      });
      expect(
        await canReadNoticeTarget(client, current, "Feedback", targetId),
      ).toBe(!["ADMIN", "THANH_TRA"].includes(role));
      tx.inspectionCase.findUnique.mockResolvedValue({ section });
      expect(
        await canReadNoticeTarget(client, current, "InspectionCase", targetId),
      ).toBe(["LANH_DAO", "THANH_TRA"].includes(role));
      tx.improvementPlan.findUnique.mockResolvedValue({
        teacherId,
        cohort: { section, campaign: { status: "DA_CONG_BO" } },
      });
      expect(
        await canReadNoticeTarget(client, current, "ImprovementPlan", targetId),
      ).toBe(
        [
          "GIANG_VIEN",
          "TRUONG_BO_MON",
          "TRUONG_KHOA",
          "CAN_BO_DBCL",
          "LANH_DAO",
        ].includes(role),
      );
      tx.examReviewRecommendation.findUnique.mockResolvedValue({
        ...ownRecommendation,
        course: section.course,
      });
      expect(
        await canReadNoticeTarget(
          client,
          current,
          "ExamReviewRecommendation",
          targetId,
        ),
      ).toBe(["PHONG_KHAO_THI", "TRUONG_BO_MON", "TRUONG_KHOA"].includes(role));
      tx.surveyAnomalyFlag.findUnique.mockResolvedValue({
        section,
        status: "CAN_LUU_Y",
        campaign: { status: "DA_TONG_HOP" },
      });
      expect(
        await canReadNoticeTarget(
          client,
          current,
          "SurveyAnomalyFlag",
          targetId,
        ),
      ).toBe(role === "THANH_TRA");
      expect(
        await canReadNoticeTarget(
          client,
          current,
          "SurveyAnomalyAttention",
          targetId,
        ),
      ).toBe(role === "CAN_BO_DBCL");
      expect(
        await canReadNoticeTarget(client, current, "Unknown", targetId),
      ).toBe(false);
      expect(await canReadNoticeTarget(client, current, "Feedback", null)).toBe(
        false,
      );
    },
  );
  it.each(roles)(
    "%s: ID lạ không tồn tại không có quyền qua thông báo",
    async (role) => {
      for (const model of Object.values(tx)) {
        if ("findUnique" in model) model.findUnique.mockResolvedValue(null);
      }
      for (const targetType of [
        "Feedback",
        "InspectionCase",
        "ImprovementPlan",
        "ExamReviewRecommendation",
        "SurveyAnomalyFlag",
        "SurveyAnomalyAttention",
        "SurveyCampaign",
      ])
        expect(
          await canReadNoticeTarget(client, actor(role), targetType, targetId),
        ).toBe(false);
    },
  );
  it("SV đổi tài khoản không đọc thông báo phản hồi/nhiệm vụ của SV cũ", async () => {
    const current = { ...actor("SINH_VIEN"), userId: foreignUserId };
    tx.feedback.findUnique.mockResolvedValue({
      authorId,
      category: "GIANG_DAY",
      section,
      inspectionCase: null,
      recipients: [],
    });
    tx.surveyCampaign.findUnique.mockResolvedValue({ id: targetId });
    tx.surveyTask.findFirst.mockResolvedValue(null);
    expect(
      await canReadNoticeTarget(client, current, "Feedback", targetId),
    ).toBe(false);
    expect(
      await canReadNoticeTarget(client, current, "SurveyCampaign", targetId),
    ).toBe(false);
    expect(tx.surveyTask.findFirst).toHaveBeenCalledWith({
      where: { campaignId: targetId, studentId: foreignUserId },
      select: { id: true },
    });
  });
  it.each(["GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA"] as const)(
    "TC-TT-01: TT ghép %s cũng mất thông báo hồ sơ và bất thường xung đột",
    async (role) => {
      tx.inspectionCase.findUnique.mockResolvedValue({ section });
      tx.surveyAnomalyFlag.findUnique.mockResolvedValue({
        section,
        campaign: { status: "DA_TONG_HOP" },
      });
      const current = actor("THANH_TRA", role);
      for (const targetType of ["InspectionCase", "SurveyAnomalyFlag"])
        expect(
          await canReadNoticeTarget(client, current, targetType, targetId),
        ).toBe(false);
    },
  );
});
