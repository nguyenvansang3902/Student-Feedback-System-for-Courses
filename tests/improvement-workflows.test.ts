import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role } from "../src/generated/prisma/enums";
import {
  canReadImprovement,
  canReviewImprovement,
  canSubmitImprovement,
  canReadRecommendation,
  canRespondRecommendation,
  improvementTarget,
} from "../src/server/policies/improvement-workflows";
import {
  improvementMutationSchema,
  recommendationCreateSchema,
  recommendationRespondSchema,
} from "../src/server/services/improvement-types";
import { ensureRequiredImprovements } from "../src/server/services/improvements";
import { hasRecommendationEvidence } from "../src/server/services/exam-recommendations";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
} from "../src/server/services/survey-score";

const { notice } = vi.hoisted(() => ({
  notice: vi.fn().mockResolvedValue({ queued: 1 }),
}));
vi.mock("../src/server/services/domain-notifications", () => ({
  enqueueDomainNotice: notice,
}));
const departmentId = randomUUID(),
  facultyId = randomUUID(),
  teacherId = randomUUID(),
  reviewerId = randomUUID();
function actor(role: Role, userId = reviewerId, scopeId?: string): AuthActor {
  return {
    userId,
    loginCode: "FAKE",
    displayName: "Tài khoản giả",
    email: "fake@example.invalid",
    sessionId: randomUUID(),
    familyId: randomUUID(),
    roles: [role],
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
    assignments: [
      {
        role,
        scopeType:
          role === "TRUONG_BO_MON"
            ? "DEPARTMENT"
            : role === "TRUONG_KHOA"
              ? "FACULTY"
              : "GLOBAL",
        departmentId:
          role === "TRUONG_BO_MON" ? (scopeId ?? departmentId) : null,
        facultyId: role === "TRUONG_KHOA" ? (scopeId ?? facultyId) : null,
      },
    ],
  };
}
const resource = {
  teacherId,
  departmentId,
  facultyId,
  currentTeacherIds: [teacherId],
};
const recommendation = {
  senderId: randomUUID(),
  recipientId: reviewerId,
  departmentId,
  facultyId,
};

describe("BR-10/18/34 — giải trình đúng giảng viên và phạm vi", () => {
  it.each([
    "SINH_VIEN",
    "ADMIN",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ] as const)("%s không được đọc giải trình", (role) =>
    expect(canReadImprovement(actor(role), resource)).toBe(false),
  );
  it.each(["TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO"] as const)(
    "%s xem trong phạm vi",
    (role) => expect(canReadImprovement(actor(role), resource)).toBe(true),
  );
  it("giảng viên chỉ đọc/nộp hồ sơ của mình khi còn được phân công", () => {
    const identity = actor("GIANG_VIEN", teacherId);
    expect(canReadImprovement(identity, resource)).toBe(true);
    expect(canSubmitImprovement(identity, resource)).toBe(true);
    expect(canReadImprovement(actor("GIANG_VIEN"), resource)).toBe(false);
    expect(
      canReadImprovement(identity, { ...resource, currentTeacherIds: [] }),
    ).toBe(false);
  });
  it("TBM/TK ngoài phạm vi không đọc; người khác không xác nhận", () => {
    expect(
      canReadImprovement(
        actor("TRUONG_BO_MON", reviewerId, randomUUID()),
        resource,
      ),
    ).toBe(false);
    expect(
      canReadImprovement(
        actor("TRUONG_KHOA", reviewerId, randomUUID()),
        resource,
      ),
    ).toBe(false);
    expect(canReviewImprovement(actor("TRUONG_BO_MON"), resource)).toBe(true);
    expect(canReviewImprovement(actor("TRUONG_KHOA"), resource)).toBe(false);
    expect(canReviewImprovement(actor("GIANG_VIEN", teacherId), resource)).toBe(
      false,
    );
  });
  it("không dùng gán ADMIN bổ sung để đọc nội dung giải trình", () => {
    const identity = actor("GIANG_VIEN", teacherId);
    identity.roles.push("ADMIN");
    identity.assignments!.push({
      role: "ADMIN",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    });
    expect(canReadImprovement(identity, resource)).toBe(false);
  });
  it.each([
    ["CAN_GIAI_TRINH", "submit", "DA_GUI"],
    ["CAN_BO_SUNG", "submit", "DA_GUI"],
    ["DA_GUI", "confirm", "DA_XAC_NHAN"],
    ["DA_GUI", "supplement", "CAN_BO_SUNG"],
    ["DA_XAC_NHAN", "submit", null],
    ["CAN_GIAI_TRINH", "confirm", null],
    ["DA_GUI", "submit", null],
  ])("%s/%s → %s", (status, action, target) =>
    expect(improvementTarget(status!, action!)).toBe(target),
  );
});
describe("BR-58/34 — quyền kiến nghị và phản hồi có lý do", () => {
  it("Khảo thí đọc, đúng TBM nhận mới phản hồi; TK chỉ đọc", () => {
    expect(canReadRecommendation(actor("PHONG_KHAO_THI"), recommendation)).toBe(
      true,
    );
    expect(
      canRespondRecommendation(actor("TRUONG_BO_MON"), recommendation),
    ).toBe(true);
    expect(
      canRespondRecommendation(
        actor("TRUONG_BO_MON", randomUUID()),
        recommendation,
      ),
    ).toBe(false);
    expect(canReadRecommendation(actor("TRUONG_KHOA"), recommendation)).toBe(
      true,
    );
    expect(canRespondRecommendation(actor("TRUONG_KHOA"), recommendation)).toBe(
      false,
    );
    expect(canReadRecommendation(actor("ADMIN"), recommendation)).toBe(false);
    expect(canReadRecommendation(actor("SINH_VIEN"), recommendation)).toBe(
      false,
    );
  });
  it("khác bộ môn không được đọc hoặc phản hồi", () => {
    const identity = actor("TRUONG_BO_MON", reviewerId, randomUUID());
    expect(canReadRecommendation(identity, recommendation)).toBe(false);
    expect(canRespondRecommendation(identity, recommendation)).toBe(false);
  });
  it("không nhận lý do trống, outcome lạ hoặc payload thừa", () => {
    const data = {
      revision: 1,
      requestId: randomUUID(),
      outcome: "DA_TIEP_THU",
      reason: "Đã rà soát quy trình kiểm tra.",
    };
    expect(recommendationRespondSchema.safeParse(data).success).toBe(true);
    expect(
      recommendationRespondSchema.safeParse({ ...data, reason: " " }).success,
    ).toBe(false);
    expect(
      recommendationRespondSchema.safeParse({ ...data, outcome: "MOI" })
        .success,
    ).toBe(false);
    expect(
      recommendationRespondSchema.safeParse({ ...data, senderId: randomUUID() })
        .success,
    ).toBe(false);
    expect(
      recommendationCreateSchema.safeParse({
        campaignId: randomUUID(),
        courseId: randomUUID(),
        recipientId: randomUUID(),
        body: "Kiến nghị rà soát hình thức kiểm tra.",
        requestId: randomUUID(),
      }).success,
    ).toBe(true);
  });
  it("giải trình phải có cả nguyên nhân và kế hoạch, bổ sung có nhận xét", () => {
    const data = {
      revision: 1,
      requestId: randomUUID(),
      action: "submit",
      explanation: "Nội dung giải trình nguyên nhân cụ thể.",
      actionPlan: "Kế hoạch cải tiến theo từng nội dung.",
    };
    expect(improvementMutationSchema.safeParse(data).success).toBe(true);
    expect(
      improvementMutationSchema.safeParse({ ...data, actionPlan: "" }).success,
    ).toBe(false);
    expect(
      improvementMutationSchema.safeParse({
        revision: 1,
        requestId: randomUUID(),
        action: "supplement",
        comment: "",
      }).success,
    ).toBe(false);
  });
});

const questionId = randomUUID(),
  groupId = randomUUID(),
  templateId = randomUUID();
const template = {
  groups: [
    {
      id: groupId,
      title: "Kiểm tra, đánh giá",
      position: 1,
      weight: 1,
      isAssessmentGroup: true,
      questions: [
        {
          id: questionId,
          label: "Nội dung kiểm tra",
          type: "LIKERT" as const,
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
const score = calculateSurveyScore(
  template,
  [{ questionId, valueNumber: 2, count: 5 }],
  {
    responseCount: 5,
    taskCount: 5,
    doneTaskCount: 5,
    minResponses: 5,
    minRate: 0.3,
  },
);
function aggregateDetails(ids = [teacherId]) {
  return {
    version: 2,
    templateId,
    template,
    teacherIds: ids,
    bands: DEFAULT_SURVEY_RATING_BANDS,
    score,
  };
}
describe("BR-10 — tự tạo bắt buộc khi công bố, giữ hạn và chống trùng", () => {
  const publishedAt = new Date("2026-11-01T10:00:00Z");
  const campaign = {
    status: "DA_CONG_BO",
    semester: { lockedAt: null as Date | null },
    warningScore: 3,
    explanationDays: 14,
    history: [{ occurredAt: publishedAt }],
  };
  const tx = {
    surveyCampaign: { findUnique: vi.fn() },
    aggregateResult: { findMany: vi.fn() },
    improvementPlan: { findUnique: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    tx.surveyCampaign.findUnique.mockResolvedValue(campaign);
    tx.aggregateResult.findMany.mockResolvedValue([
      {
        sectionId: randomUUID(),
        details: aggregateDetails(),
        cohort: {
          section: {
            teaching: [
              {
                teacherId,
                teacher: {
                  status: "ACTIVE",
                  roles: [{ role: "GIANG_VIEN", scopeType: "GLOBAL" }],
                },
              },
            ],
            course: { department: { id: departmentId, facultyId } },
          },
        },
      },
    ]);
    tx.improvementPlan.findUnique.mockResolvedValue(null);
    tx.improvementPlan.create.mockImplementation(
      async ({ data }: { data: object }) => ({ id: randomUUID(), ...data }),
    );
    tx.user.findMany.mockResolvedValue([{ id: reviewerId }]);
  });
  it("lấy ngưỡng/cấu hình theo đợt, hạn tính từ công bố và thông báo không chứa điểm/nội dung", async () => {
    const campaignId = randomUUID();
    expect(
      await ensureRequiredImprovements(
        tx as never,
        campaignId,
        new Date("2026-11-20Z"),
      ),
    ).toEqual({ created: 1 });
    expect(tx.aggregateResult.findMany.mock.calls[0][0].where).toMatchObject({
      eligibleToPublish: true,
      overallScore: { lt: 3 },
    });
    expect(tx.improvementPlan.create.mock.calls[0][0].data.dueAt).toEqual(
      new Date("2026-11-15T10:00:00Z"),
    );
    expect(notice.mock.calls[0][1]).toMatchObject({
      targetType: "ImprovementPlan",
      userIds: [teacherId, reviewerId],
    });
    expect(JSON.stringify(notice.mock.calls[0][1])).not.toContain("2.00");
  });
  it("đã tạo thì retry không đổi hạn hoặc tạo thêm thông báo", async () => {
    tx.improvementPlan.findUnique.mockResolvedValue({ id: randomUUID() });
    expect(await ensureRequiredImprovements(tx as never, randomUUID())).toEqual(
      { created: 0 },
    );
    expect(tx.improvementPlan.create).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });
  it.each(["DA_TONG_HOP", "DA_DONG", "LUU_TRU"])(
    "chưa công bố hoặc lưu trữ (%s) không tự tạo",
    async (status) => {
      tx.surveyCampaign.findUnique.mockResolvedValue({ ...campaign, status });
      expect(
        await ensureRequiredImprovements(tx as never, randomUUID()),
      ).toEqual({ created: 0 });
      expect(tx.aggregateResult.findMany).not.toHaveBeenCalled();
    },
  );
  it("học kỳ khóa sổ chỉ đọc, không thêm yêu cầu", async () => {
    tx.surveyCampaign.findUnique.mockResolvedValue({
      ...campaign,
      semester: { lockedAt: new Date() },
    });
    expect(await ensureRequiredImprovements(tx as never, randomUUID())).toEqual(
      { created: 0 },
    );
  });
  it("không tạo cho giảng viên mới không thuộc snapshot tổng hợp", async () => {
    const rows = await tx.aggregateResult.findMany();
    rows[0].cohort.section.teaching[0].teacherId = randomUUID();
    expect(await ensureRequiredImprovements(tx as never, randomUUID())).toEqual(
      { created: 0 },
    );
  });
});
describe("BR-57/58 — điều kiện tạo kiến nghị không lộ lớp hay giảng viên", () => {
  it("lớp không có phiếu không được dùng để đủ số giảng viên", () => {
    const contributing = { details: aggregateDetails(), responseCount: 5 };
    const empty = {
      details: aggregateDetails([randomUUID()]),
      responseCount: 0,
    };
    expect(hasRecommendationEvidence([contributing, empty], 5)).toBe(false);
    const emptyScore = aggregateDetails([randomUUID()]);
    emptyScore.score = { ...emptyScore.score, responseCount: 0 };
    expect(
      hasRecommendationEvidence(
        [contributing, { details: emptyScore, responseCount: 5 }],
        5,
      ),
    ).toBe(false);
  });
  it("phải có ít nhất hai giảng viên khác nhau và đủ tổng phiếu", () => {
    const row = { details: aggregateDetails(), responseCount: 5 };
    expect(hasRecommendationEvidence([row], 5)).toBe(false);
    expect(
      hasRecommendationEvidence(
        [row, { ...row, details: aggregateDetails([randomUUID()]) }],
        10,
      ),
    ).toBe(true);
    expect(
      hasRecommendationEvidence(
        [row, { ...row, details: aggregateDetails([randomUUID()]) }],
        11,
      ),
    ).toBe(false);
    expect(hasRecommendationEvidence([row, row], 10)).toBe(false);
  });
  it("nhóm không có cờ đánh giá không đủ điều kiện, dữ liệu lỗi bị bỏ qua", () => {
    const detail = aggregateDetails([teacherId, randomUUID()]);
    detail.template = {
      ...template,
      groups: template.groups.map((g) => ({ ...g, isAssessmentGroup: false })),
    };
    expect(
      hasRecommendationEvidence([{ details: detail, responseCount: 5 }], 5),
    ).toBe(false);
    expect(
      hasRecommendationEvidence(
        [
          {
            details: { teacherIds: [teacherId, randomUUID()] },
            responseCount: 20,
          },
        ],
        5,
      ),
    ).toBe(false);
  });
});
