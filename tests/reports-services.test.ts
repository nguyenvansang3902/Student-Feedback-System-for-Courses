import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role, ScopeType } from "../src/generated/prisma/enums";
const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    user: { count: vi.fn() },
    userSession: { count: vi.fn() },
    surveyTask: { count: vi.fn() },
    feedback: { findMany: vi.fn(), count: vi.fn() },
    inspectionCase: { findMany: vi.fn() },
    courseSection: { findMany: vi.fn(), findFirst: vi.fn() },
    surveyCampaign: { findMany: vi.fn(), findFirst: vi.fn() },
    campaignSection: { findMany: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn() },
  },
  fresh: vi.fn(),
  readiness: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/services/access")>()),
  assertFreshActor: mocks.fresh,
}));
vi.mock("../src/server/services/campaign-readiness", () => ({
  readCampaignReadiness: mocks.readiness,
}));
import {
  getReportOptions,
  getReportsDashboard,
  prepareReportsExport,
} from "../src/server/services/reports";
import {
  getReportsSettings,
  updateReportsSettings,
} from "../src/server/services/reports-settings";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyScoreTemplate,
} from "../src/server/services/survey-score";
const semesterId = randomUUID(),
  departmentId = randomUUID(),
  facultyId = randomUUID(),
  courseId = randomUUID();
function actor(roles: Role[]): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "CANARY_LOGIN",
    displayName: "CANARY_NAME",
    email: "canary@example.invalid",
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
      facultyId: role === "TRUONG_KHOA" ? facultyId : null,
      departmentId: role === "TRUONG_BO_MON" ? departmentId : null,
    })),
  };
}
const meta = {
  id: randomUUID(),
  semesterId,
  semester: {
    id: semesterId,
    name: "Học kỳ giả",
    startsOn: new Date("2026-09-01"),
  },
  course: {
    id: courseId,
    name: "Môn giả",
    code: "MON_GIA",
    departmentId,
    department: {
      id: departmentId,
      name: "Bộ môn giả",
      facultyId,
      faculty: { id: facultyId, name: "Khoa giả" },
    },
  },
};
const now = new Date(),
  before = new Date(Date.now() - 2 * 86400000),
  future = new Date(Date.now() + 86400000);
function feedback() {
  return {
    category: "TO_CHUC_LOP_HOC",
    status: "DA_DONG",
    createdAt: before,
    acceptDueAt: future,
    replyDueAt: future,
    acceptedAt: before,
    answeredAt: now,
    closedAt: now,
    rating: { score: 4 },
    section: meta,
    authorId: "CANARY_STUDENT_ID",
    body: "CANARY_PRIVATE_BODY",
    author: { displayName: "CANARY_NAME", email: "canary@example.invalid" },
  };
}
function scoredCohort(
  campaignId: string,
  n: number,
  value: number,
  teacherId: string,
  course = meta.course,
  allNA = false,
) {
  const template: SurveyScoreTemplate = {
    groups: [
      {
        id: "assessment-group",
        title: "Đánh giá",
        position: 1,
        weight: 1,
        isAssessmentGroup: true,
        questions: [
          {
            id: "assessment-q",
            label: "Nội dung kiểm tra",
            position: 1,
            type: "LIKERT",
            weight: 1,
            scaleMin: 1,
            scaleMax: 5,
            options: [],
          },
        ],
      },
    ],
  };
  return {
    sectionId: randomUUID(),
    section: { ...meta, course, code: "LỚP_GIẢ" },
    campaign: {
      id: campaignId,
      title: "Đợt giả",
      minResponses: 5,
      minRate: 0.3,
      semester: { name: "Học kỳ giả" },
    },
    result: {
      details: {
        version: 2,
        templateId: "template",
        template,
        teacherIds: [teacherId],
        bands: [...DEFAULT_SURVEY_RATING_BANDS],
        score: calculateSurveyScore(
          template,
          [
            allNA
              ? { questionId: "assessment-q", isNotApplicable: true, count: n }
              : { questionId: "assessment-q", valueNumber: value, count: n },
          ],
          {
            responseCount: n,
            taskCount: n,
            doneTaskCount: n,
            minResponses: 5,
            minRate: 0.3,
          },
        ),
      },
    },
  };
}
let inside = false;
beforeEach(() => {
  vi.resetAllMocks();
  inside = false;
  mocks.db.$transaction.mockImplementation(async (operation) => {
    inside = true;
    try {
      return await operation(mocks.db);
    } finally {
      inside = false;
    }
  });
  mocks.db.$executeRaw.mockResolvedValue(1);
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.fresh.mockImplementation(async (_tx, current) => current);
  mocks.db.systemSetting.findUnique.mockResolvedValue(null);
  mocks.db.user.count.mockResolvedValue(3);
  mocks.db.userSession.count.mockResolvedValue(1);
  mocks.db.surveyTask.count.mockResolvedValue(0);
  mocks.db.feedback.count.mockResolvedValue(0);
  mocks.db.feedback.findMany.mockResolvedValue([]);
  mocks.db.inspectionCase.findMany.mockResolvedValue([]);
  mocks.db.courseSection.findFirst.mockResolvedValue({ id: meta.id });
  mocks.db.courseSection.findMany.mockResolvedValue([meta]);
  mocks.db.surveyCampaign.findMany.mockResolvedValue([]);
  mocks.db.surveyCampaign.findFirst.mockResolvedValue({ semesterId });
  mocks.db.campaignSection.findMany.mockResolvedValue([]);
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.db.auditLog.findFirst.mockResolvedValue(null);
  mocks.db.systemSetting.upsert.mockResolvedValue({});
});
describe("W12 FR-90/94/147/151/159 BR-18/34/61/67 — projection service", () => {
  it("BR-67 lớp A 5phiếu5 và B 1phiếu1: che B cùng tổng bộ môn/khoa để không suy B bằng phép trừ", async () => {
    const campaignId = randomUUID();
    mocks.db.campaignSection.findMany.mockResolvedValue([
      scoredCohort(campaignId, 5, 5, "T-A"),
      scoredCohort(campaignId, 1, 1, "T-B"),
    ]);
    const dto = await getReportsDashboard(actor(["TRUONG_BO_MON"]), {});
    const classes = dto.sections.find(
      (section) => section.key === "survey-class",
    )!.rows;
    expect(classes.some((row) => row.cells.overallScore === 5)).toBe(true);
    expect(classes.some((row) => row.suppressed)).toBe(true);
    for (const key of ["survey-department", "survey-faculty"])
      expect(
        dto.sections
          .find((section) => section.key === key)!
          .rows.every(
            (row) =>
              row.suppressed &&
              Object.values(row.cells).every((value) => value === null),
          ),
      ).toBe(true);
  });
  it("BR-57/67 môn A đủ2GV, môn B chỉ1GV: che B kéo theo tổng bộ môn/khoa", async () => {
    const campaignId = randomUUID(),
      otherCourse = { ...meta.course, id: randomUUID(), name: "Môn B" };
    mocks.db.campaignSection.findMany.mockResolvedValue([
      scoredCohort(campaignId, 5, 5, "T-A"),
      scoredCohort(campaignId, 5, 5, "T-B"),
      scoredCohort(campaignId, 5, 1, "T-C", otherCourse),
    ]);
    const dto = await getReportsDashboard(actor(["PHONG_KHAO_THI"]), {});
    expect(
      dto.sections
        .find((section) => section.key === "assessment-course")!
        .rows.some((row) => row.cells.overallScore === 5),
    ).toBe(true);
    for (const key of ["assessment-department", "assessment-faculty"])
      expect(
        dto.sections
          .find((section) => section.key === key)!
          .rows.every(
            (row) => row.suppressed && row.cells.responseCount === null,
          ),
      ).toBe(true);
  });
  it("BR-57 GV-B có10phiếu nhưng nhóm đánh giá toàn NA không vượt được ngưỡng2GV", async () => {
    const campaignId = randomUUID();
    mocks.db.campaignSection.findMany.mockResolvedValue([
      scoredCohort(campaignId, 5, 5, "T-A"),
      scoredCohort(campaignId, 10, 1, "T-B", meta.course, true),
    ]);
    const dto = await getReportsDashboard(actor(["PHONG_KHAO_THI"]), {});
    expect(
      dto.sections
        .find((section) => section.key === "assessment-course")!
        .rows.every((row) => row.suppressed && row.cells.overallScore === null),
    ).toBe(true);
  });
  it("snapshot thiếu ở một lớp không bị bỏ qua để làm lộ tổng các lớp còn lại", async () => {
    const campaignId = randomUUID();
    mocks.db.campaignSection.findMany.mockResolvedValue([
      scoredCohort(campaignId, 5, 5, "T-A"),
      { ...scoredCohort(campaignId, 5, 1, "T-B"), result: null },
    ]);
    const dto = await getReportsDashboard(actor(["TRUONG_BO_MON"]), {});
    expect(
      dto.sections.find((section) => section.key === "survey-department")!
        .rows[0].suppressed,
    ).toBe(true);
  });
  it("BR-57 Khảo thí pool điểm gốc theo số phiếu, không lấy trung bình điểm lớp hoặc lộ GV/lớp", async () => {
    const template: SurveyScoreTemplate = {
      groups: [
        {
          id: "group",
          title: "Kiểm tra",
          position: 1,
          weight: 1,
          isAssessmentGroup: true,
          questions: [
            {
              id: "q",
              label: "Đánh giá",
              type: "LIKERT",
              position: 1,
              weight: 1,
              scaleMin: 1,
              scaleMax: 5,
              options: [],
            },
          ],
        },
      ],
    };
    const campaign = {
      id: randomUUID(),
      title: "Đợt giả công bố",
      minResponses: 5,
      minRate: 0.3,
      semester: { name: "Học kỳ giả" },
    };
    const cohort = (n: number, value: number, teacherId: string) => ({
      sectionId: randomUUID(),
      section: { ...meta, code: "CANARY_CLASS" },
      campaign,
      result: {
        details: {
          version: 2,
          templateId: "template",
          template,
          teacherIds: [teacherId],
          bands: [...DEFAULT_SURVEY_RATING_BANDS],
          score: calculateSurveyScore(
            template,
            [{ questionId: "q", valueNumber: value, count: n }],
            {
              responseCount: n,
              taskCount: n,
              doneTaskCount: n,
              minResponses: 5,
              minRate: 0.3,
            },
          ),
        },
      },
    });
    mocks.db.campaignSection.findMany.mockResolvedValue([
      cohort(5, 5, "CANARY_TEACHER_A"),
      cohort(10, 3, "CANARY_TEACHER_B"),
    ]);
    const dto = await getReportsDashboard(actor(["PHONG_KHAO_THI"]), {});
    const row = dto.sections.find((s) => s.key === "assessment-course")!
      .rows[0];
    expect(row.suppressed).toBe(false);
    expect(row.cells.overallScore).toBe(3.67);
    expect(row.cells.responseCount).toBe(15);
    expect(JSON.stringify(dto)).not.toMatch(
      /CANARY_TEACHER|CANARY_CLASS|questionId/,
    );
    mocks.db.campaignSection.findMany.mockResolvedValue([
      cohort(10, 5, "CANARY_TEACHER_A"),
    ]);
    const insufficient = await getReportsDashboard(
      actor(["PHONG_KHAO_THI"]),
      {},
    );
    expect(
      insufficient.sections.find((s) => s.key === "assessment-course")!.rows[0]
        .cells.overallScore,
    ).toBeNull();
  });
  it("ADMIN đa vai trò chỉ chạm dữ liệu tài khoản, bỏ mọi filter nghiệp vụ", async () => {
    const current = actor(["ADMIN", "CAN_BO_DBCL", "THANH_TRA"]);
    const result = await getReportsDashboard(current, {
      role: "THANH_TRA",
      semesterId: randomUUID(),
    });
    expect(result.role).toBe("ADMIN");
    expect(result.filters).toEqual({ role: "ADMIN" });
    expect(result.sections.map((s) => s.key)).toEqual([
      "technical-administration",
    ]);
    for (const fn of [
      mocks.db.feedback.findMany,
      mocks.db.inspectionCase.findMany,
      mocks.db.campaignSection.findMany,
      mocks.db.courseSection.findFirst,
      mocks.db.systemSetting.findUnique,
    ])
      expect(fn).not.toHaveBeenCalled();
  });
  it("SV chỉ đếm task/phản hồi của chính chủ và không đọc kết quả", async () => {
    const current = actor(["SINH_VIEN"]);
    await getReportsDashboard(current, {});
    for (const [input] of mocks.db.surveyTask.count.mock.calls)
      expect(input.where.studentId).toBe(current.userId);
    for (const [input] of mocks.db.feedback.count.mock.calls)
      expect(input.where.authorId).toBe(current.userId);
    expect(mocks.db.campaignSection.findMany).not.toHaveBeenCalled();
  });
  it("ĐBCL/GV chọn GV giữ đúng lớp, stage công bố, không lấy quyền toàn trường", async () => {
    const current = actor(["CAN_BO_DBCL", "GIANG_VIEN"]);
    await getReportsDashboard(current, { role: "GIANG_VIEN" });
    const where = mocks.db.campaignSection.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where.section)).toContain(current.userId);
    expect(where.campaign.status.in).toEqual(["DA_CONG_BO", "LUU_TRU"]);
    expect(mocks.db.inspectionCase.findMany).not.toHaveBeenCalled();
  });
  it("Khảo thí chỉ query phản hồi thi và không có lớp/giảng viên trong projection", async () => {
    await getReportsDashboard(actor(["PHONG_KHAO_THI"]), {});
    expect(mocks.db.feedback.findMany.mock.calls[0][0].where.category).toBe(
      "THI_KET_THUC_HOC_PHAN",
    );
    expect(
      mocks.db.feedback.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty("authorId");
  });
  it.each(["PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"] as const)(
    "BR-67 %s export DTO không có định danh hoặc nội dung canary",
    async (role) => {
      const current = actor([role]);
      mocks.db.feedback.findMany.mockResolvedValue(
        Array.from({ length: 5 }, () => feedback()),
      );
      mocks.db.inspectionCase.findMany.mockResolvedValue(
        Array.from({ length: 5 }, () => ({
          ...feedback(),
          source: "PHAN_HOI_NGHIEM_TRONG",
          violation: "HANH_VI_KHONG_PHU_HOP",
          status: "DONG",
          conclusion: "CO_CAN_CU",
          completeDueAt: future,
          studentId: "CANARY_STUDENT_ID",
          reason: "CANARY_PRIVATE_BODY",
          section: { semesterId, semester: { name: "Học kỳ giả" } },
        })),
      );
      const dto = await prepareReportsExport(current, { role, format: "csv" });
      const text = JSON.stringify(dto);
      expect(text).not.toMatch(/CANARY|canary@example/);
      expect(mocks.db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "REPORT_EXPORTED",
          actorId: current.userId,
        }),
      });
    },
  );
  it("TT đa vai trò gắn tất cả điều kiện loại trừ xung đột trước khi gộp", async () => {
    const current = actor([
      "THANH_TRA",
      "GIANG_VIEN",
      "TRUONG_BO_MON",
      "TRUONG_KHOA",
    ]);
    await getReportsDashboard(current, { role: "THANH_TRA" });
    const where = JSON.stringify(
      mocks.db.inspectionCase.findMany.mock.calls[0][0].where,
    );
    expect(where).toContain(current.userId);
    expect(where).toContain(departmentId);
    expect(where).toContain(facultyId);
    expect(where).toContain("notIn");
  });
  it("PĐT readiness không đưa cohort/pairs/student/email/hash vào dashboard", async () => {
    mocks.db.surveyCampaign.findMany.mockResolvedValue([
      {
        id: randomUUID(),
        title: "Đợt giả",
        status: "CHO_XAC_NHAN_DL",
        semester: { lockedAt: null },
      },
    ]);
    mocks.readiness.mockResolvedValue({
      cohort: {
        sections: [
          { studentId: "CANARY_STUDENT_ID", email: "canary@example.invalid" },
        ],
        pairs: [{ studentId: "CANARY_STUDENT_ID" }],
      },
      readiness: {
        sectionCount: 1,
        canConfirm: false,
        snapshotHash: "CANARY_HASH",
        pairCount: 1,
        blockers: [{ sectionId: meta.id, code: "RS-01" }],
        warnings: [],
      },
    });
    const dto = await getReportsDashboard(actor(["PHONG_DAO_TAO"]), {});
    expect(JSON.stringify(dto)).not.toMatch(
      /CANARY|canary@example|snapshotHash|pairCount/,
    );
    expect(
      dto.sections.find((s) => s.key === "training-readiness")?.rows[0].cells
        .blockedSections,
    ).toBe(1);
  });
  it("quyền bị thu hồi trước transaction không được đọc báo cáo theo actor cũ", async () => {
    const current = actor(["PHONG_DAO_TAO"]);
    mocks.fresh.mockResolvedValue(actor(["SINH_VIEN"]));
    await expect(
      getReportsDashboard(current, { role: "PHONG_DAO_TAO" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.db.feedback.findMany).not.toHaveBeenCalled();
  });
  it("filter ngoài phạm vi và tổ hợp đơn vị không khớp đều không tìm thấy", async () => {
    mocks.db.courseSection.findFirst.mockResolvedValue(null);
    await expect(
      getReportsDashboard(actor(["GIANG_VIEN"]), { courseId: randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.campaignSection.findMany).not.toHaveBeenCalled();
  });
  it("export không trả DTO nếu ghi audit thất bại", async () => {
    mocks.db.auditLog.create.mockRejectedValue(
      new Error("Audit chưa ghi được"),
    );
    await expect(
      prepareReportsExport(actor(["PHONG_DAO_TAO"]), { format: "xlsx" }),
    ).rejects.toThrow("Audit chưa ghi được");
  });
  it("ghi audit trong transaction và không chứa dữ liệu báo cáo", async () => {
    mocks.db.auditLog.create.mockImplementation(async () => {
      expect(inside).toBe(true);
      return {};
    });
    await prepareReportsExport(actor(["ADMIN"]), { format: "pdf" });
    const text = JSON.stringify(mocks.db.auditLog.create.mock.calls);
    expect(text).not.toMatch(/CANARY|canary@example|count|studentId/);
  });
  it("options chỉ trả phạm vi của role đang chọn, ADMIN không có options nghiệp vụ", async () => {
    const current = actor(["ADMIN", "PHONG_DAO_TAO"]);
    const result = await getReportOptions(current, {});
    expect(result.roles).toEqual(["ADMIN"]);
    expect(result.campaigns).toEqual([]);
    expect(result.capabilities.settingsRead).toBe(false);
    expect(mocks.db.courseSection.findMany).not.toHaveBeenCalled();
  });
});
describe("W12 BR-30/34/67 — cấu hình ngưỡng báo cáo", () => {
  it("mặc định hai ngưỡng là 5 và revision1", async () => {
    expect(await getReportsSettings(actor(["CAN_BO_DBCL"]))).toEqual({
      minFeedbackRecords: 5,
      minInspectionCases: 5,
      revision: 1,
    });
  });
  it.each(["ADMIN", "GIANG_VIEN", "PHONG_DAO_TAO", "THANH_TRA"] as const)(
    "%s không được đọc/đổi ngưỡng báo cáo",
    async (role) => {
      await expect(getReportsSettings(actor([role]))).rejects.toMatchObject({
        status: 403,
      });
      expect(mocks.db.systemSetting.findUnique).not.toHaveBeenCalled();
    },
  );
  it("cấu hình sai trong database chặn đọc thay vì hạ ngưỡng ngầm", async () => {
    mocks.db.systemSetting.findUnique.mockResolvedValue({
      value: { minFeedbackRecords: 1, minInspectionCases: 5, revision: 1 },
    });
    await expect(
      getReportsSettings(actor(["CAN_BO_DBCL"])),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("CAS ngăn ghi đè và audit ghi sau khi lưu", async () => {
    const current = actor(["CAN_BO_DBCL"]);
    await expect(
      updateReportsSettings(current, {
        minFeedbackRecords: 5,
        minInspectionCases: 5,
        revision: 2,
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.db.systemSetting.upsert).not.toHaveBeenCalled();
    const value = await updateReportsSettings(current, {
      minFeedbackRecords: 6,
      minInspectionCases: 7,
      revision: 1,
      requestId: randomUUID(),
    });
    expect(value.revision).toBe(2);
    expect(mocks.db.auditLog.create).toHaveBeenCalled();
  });
});
