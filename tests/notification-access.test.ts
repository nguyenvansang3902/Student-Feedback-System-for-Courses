import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import type { AuthActor } from "../src/server/auth/types";
import type { RoleGrant } from "../src/server/policies/can";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canReadNoticeTarget,
  noticeRecipientActor,
  notificationTargetHref,
} from "../src/server/services/notification-access";
const facultyId = randomUUID(),
  departmentId = randomUUID(),
  authorId = randomUUID(),
  teacherId = randomUUID();
const section = {
  teaching: [{ teacherId }],
  course: {
    departmentId,
    department: { facultyId, isActive: true, faculty: { isActive: true } },
  },
};
function actor(
  role: RoleGrant["role"],
  userId = randomUUID(),
  extra: RoleGrant[] = [],
): AuthActor {
  const base: RoleGrant =
    role === "TRUONG_BO_MON"
      ? { role, scopeType: "DEPARTMENT", departmentId }
      : role === "TRUONG_KHOA"
        ? { role, scopeType: "FACULTY", facultyId }
        : { role, scopeType: "GLOBAL" };
  const grants = [base, ...extra];
  return {
    userId,
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    displayName: "Giả",
    email: "fixture@example.invalid",
    roles: [...new Set(grants.map((g) => g.role))],
    assignments: grants.map((g) => ({
      ...g,
      departmentId: g.departmentId ?? null,
      facultyId: g.facultyId ?? null,
    })),
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
  };
}
const tx = {
  feedback: { findUnique: vi.fn() },
  inspectionCase: { findUnique: vi.fn() },
  improvementPlan: { findUnique: vi.fn() },
  examReviewRecommendation: { findUnique: vi.fn() },
  surveyCampaign: { findUnique: vi.fn() },
  surveyTask: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  department: { findFirst: vi.fn() },
  faculty: { findFirst: vi.fn() },
};
const client = tx as unknown as Prisma.TransactionClient;
beforeEach(() => {
  vi.resetAllMocks();
  tx.department.findFirst.mockResolvedValue({ id: departmentId });
  tx.faculty.findFirst.mockResolvedValue({ id: facultyId });
});
describe("FR-80/81, BR-18/24/34/61/62 — thông báo không vượt quyền tài nguyên", () => {
  const row = () => ({
    authorId,
    category: "GIANG_DAY",
    section,
    inspectionCase: null,
    recipients: [] as {
      userId: string;
      isActive: boolean;
      accessRole: string | null;
    }[],
  });
  it("SV thấy cập nhật phản hồi của mình nhưng không của SV khác", async () => {
    tx.feedback.findUnique.mockResolvedValue(row());
    expect(
      await canReadNoticeTarget(
        client,
        actor("SINH_VIEN", authorId),
        "Feedback",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("SINH_VIEN"),
        "Feedback",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it("người xử lý mất quyền ngay khi recipient bị thu hồi", async () => {
    const current = actor("GIANG_VIEN", teacherId),
      feedback = row();
    feedback.recipients = [
      { userId: teacherId, isActive: true, accessRole: "GIANG_VIEN" },
    ];
    tx.feedback.findUnique.mockResolvedValue(feedback);
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(true);
    feedback.recipients[0].isActive = false;
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(false);
  });
  it("TBM chuyển phạm vi không xem lại thông báo cũ", async () => {
    const current = actor("TRUONG_BO_MON"),
      feedback = row();
    feedback.recipients = [
      { userId: current.userId, isActive: true, accessRole: "TRUONG_BO_MON" },
    ];
    tx.feedback.findUnique.mockResolvedValue(feedback);
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(true);
    current.assignments![0].departmentId = randomUUID();
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(false);
  });
  it("TK không nhận thông báo của lớp thuộc bộ môn đã ngừng hoạt động dù khoa vẫn hoạt động", async () => {
    const current = actor("TRUONG_KHOA");
    const feedback = row();
    feedback.recipients = [
      { userId: current.userId, isActive: true, accessRole: "TRUONG_KHOA" },
    ];
    tx.feedback.findUnique.mockResolvedValue(feedback);
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(true);
    tx.feedback.findUnique.mockResolvedValue({
      ...feedback,
      section: {
        ...section,
        course: {
          ...section.course,
          department: { ...section.course.department, isActive: false },
        },
      },
    });
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(false);
  });
  it("TT kiêm giảng viên bị phản ánh không đọc notification hồ sơ", async () => {
    tx.inspectionCase.findUnique.mockResolvedValue({ section });
    expect(
      await canReadNoticeTarget(
        client,
        actor("THANH_TRA", teacherId),
        "InspectionCase",
        randomUUID(),
      ),
    ).toBe(false);
    expect(
      await canReadNoticeTarget(
        client,
        actor("THANH_TRA"),
        "InspectionCase",
        randomUUID(),
      ),
    ).toBe(true);
  });
  it("TT kiêm TBM cùng bộ môn vẫn bị chặn xung đột", async () => {
    tx.inspectionCase.findUnique.mockResolvedValue({ section });
    const current = actor("THANH_TRA", randomUUID(), [
      { role: "TRUONG_BO_MON", scopeType: "DEPARTMENT", departmentId },
    ]);
    expect(
      await canReadNoticeTarget(
        client,
        current,
        "InspectionCase",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it.each(["ADMIN", "CAN_BO_DBCL"] as const)(
    "%s không đọc notification hồ sơ Thanh tra",
    async (role) => {
      tx.inspectionCase.findUnique.mockResolvedValue({ section });
      expect(
        await canReadNoticeTarget(
          client,
          actor(role),
          "InspectionCase",
          randomUUID(),
        ),
      ).toBe(false);
    },
  );
  it("lãnh đạo có thể nhận link tóm tắt hồ sơ nhưng SV không có link nội bộ", async () => {
    tx.inspectionCase.findUnique.mockResolvedValue({ section });
    expect(
      await canReadNoticeTarget(
        client,
        actor("LANH_DAO"),
        "InspectionCase",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("SINH_VIEN", authorId),
        "InspectionCase",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it("phản hồi đã chuyển Thanh tra không cho người xử lý thường đọc notification cũ", async () => {
    const current = actor("PHONG_DAO_TAO"),
      feedback = {
        ...row(),
        inspectionCase: { id: randomUUID(), status: "TIEP_NHAN" },
      };
    feedback.recipients = [
      { userId: current.userId, isActive: true, accessRole: "PHONG_DAO_TAO" },
    ];
    tx.feedback.findUnique.mockResolvedValue(feedback);
    expect(
      await canReadNoticeTarget(client, current, "Feedback", randomUUID()),
    ).toBe(false);
  });
  it("giải trình chỉ gửi cho GV hiện còn phân công và người quản lý đúng phạm vi", async () => {
    tx.improvementPlan.findUnique.mockResolvedValue({
      teacherId,
      cohort: { campaign: { status: "DA_CONG_BO" }, section },
    });
    expect(
      await canReadNoticeTarget(
        client,
        actor("GIANG_VIEN", teacherId),
        "ImprovementPlan",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("GIANG_VIEN"),
        "ImprovementPlan",
        randomUUID(),
      ),
    ).toBe(false);
    expect(
      await canReadNoticeTarget(
        client,
        actor("TRUONG_BO_MON"),
        "ImprovementPlan",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("ADMIN"),
        "ImprovementPlan",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it("không lộ sự tồn tại giải trình trước công bố", async () => {
    tx.improvementPlan.findUnique.mockResolvedValue({
      teacherId,
      cohort: { campaign: { status: "DA_TONG_HOP" }, section },
    });
    expect(
      await canReadNoticeTarget(
        client,
        actor("GIANG_VIEN", teacherId),
        "ImprovementPlan",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it("kiến nghị chỉ Khảo thí hoặc TBM/TK đúng phạm vi đọc", async () => {
    tx.examReviewRecommendation.findUnique.mockResolvedValue({
      senderId: randomUUID(),
      recipientId: randomUUID(),
      course: section.course,
    });
    expect(
      await canReadNoticeTarget(
        client,
        actor("PHONG_KHAO_THI"),
        "ExamReviewRecommendation",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("TRUONG_BO_MON"),
        "ExamReviewRecommendation",
        randomUUID(),
      ),
    ).toBe(true);
    expect(
      await canReadNoticeTarget(
        client,
        actor("GIANG_VIEN"),
        "ExamReviewRecommendation",
        randomUUID(),
      ),
    ).toBe(false);
  });
  it("đợt khảo sát của SV phải có task của chính SV", async () => {
    const current = actor("SINH_VIEN");
    tx.surveyCampaign.findUnique.mockResolvedValue({ id: randomUUID() });
    tx.surveyTask.findFirst.mockResolvedValue(null);
    expect(
      await canReadNoticeTarget(
        client,
        current,
        "SurveyCampaign",
        randomUUID(),
      ),
    ).toBe(false);
    tx.surveyTask.findFirst.mockResolvedValue({ id: randomUUID() });
    expect(
      await canReadNoticeTarget(
        client,
        current,
        "SurveyCampaign",
        randomUUID(),
      ),
    ).toBe(true);
    expect(tx.surveyTask.findFirst.mock.calls.at(-1)?.[0].where.studentId).toBe(
      current.userId,
    );
  });
  it("không nhận target tùy ý hoặc URL ngoài hệ thống", async () => {
    expect(
      await canReadNoticeTarget(client, actor("ADMIN"), "User", randomUUID()),
    ).toBe(false);
    expect(
      notificationTargetHref("Feedback", "https://evil.invalid"),
    ).toBeNull();
    expect(notificationTargetHref("Unknown", randomUUID())).toBeNull();
  });
  it("worker đọc lại user và bỏ các grant sai hoặc phạm vi đã ngừng hoạt động", async () => {
    const current = actor("TRUONG_BO_MON");
    tx.user.findUnique.mockResolvedValue({
      ...current,
      id: current.userId,
      status: "ACTIVE",
      roles: [
        ...current.assignments!,
        {
          role: "THANH_TRA",
          scopeType: "FACULTY",
          facultyId,
          departmentId: null,
        },
      ],
    });
    tx.department.findFirst.mockResolvedValue(null);
    expect(await noticeRecipientActor(client, current.userId)).toMatchObject({
      roles: [],
      assignments: [],
    });
  });
  it("worker không nhận tài khoản bị khóa hoặc còn phải đổi mật khẩu", async () => {
    tx.user.findUnique.mockResolvedValue({ status: "DISABLED" });
    expect(await noticeRecipientActor(client, randomUUID())).toBeNull();
    tx.user.findUnique.mockResolvedValue({
      status: "ACTIVE",
      mustChangePassword: true,
    });
    expect(await noticeRecipientActor(client, randomUUID())).toBeNull();
  });
});
