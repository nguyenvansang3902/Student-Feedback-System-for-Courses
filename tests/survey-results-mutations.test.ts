import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  aggregateSurveyResults,
  publishSurveyResults,
} from "../src/server/services/survey-results-mutations";

const { db } = vi.hoisted(() => {
  const delegate = () => ({
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  });
  return {
    db: {
      surveyCampaign: delegate(),
      campaignHistory: delegate(),
      campaignSection: delegate(),
      surveyTemplate: delegate(),
      surveyResponse: delegate(),
      surveyTask: delegate(),
      surveyAnswer: delegate(),
      question: delegate(),
      aggregateResult: delegate(),
      systemSetting: delegate(),
      userSession: delegate(),
      department: delegate(),
      faculty: delegate(),
      auditLog: delegate(),
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    },
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => db }));

const ids = Array.from({ length: 10 }, () => randomUUID());
function actor(role: Role = "CAN_BO_DBCL"): AuthActor {
  return {
    userId: ids[0],
    sessionId: ids[1],
    familyId: ids[2],
    loginCode: "FAKE_DBCL",
    displayName: "Giả",
    email: "fake@fixture.invalid",
    roles: [role],
    assignments: [
      {
        role,
        scopeType:
          role === "TRUONG_KHOA"
            ? "FACULTY"
            : role === "TRUONG_BO_MON"
              ? "DEPARTMENT"
              : "GLOBAL",
        departmentId: role === "TRUONG_BO_MON" ? ids[8] : null,
        facultyId: role === "TRUONG_KHOA" ? ids[9] : null,
      },
    ],
    purpose: "FULL",
    mustChangePassword: false,
    mfa: role === "ADMIN",
    mfaRequired: role === "ADMIN",
  };
}
function session(current: AuthActor) {
  return {
    userId: current.userId,
    familyId: current.familyId,
    purpose: "FULL",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    mfaVerifiedAt: current.mfa ? new Date() : null,
    user: {
      status: "ACTIVE",
      mustChangePassword: false,
      loginCode: current.loginCode,
      email: current.email,
      displayName: current.displayName,
      roles: current.assignments,
    },
  };
}
let campaign: {
  id: string;
  revision: number;
  status: string;
  semester: { lockedAt: Date | null };
  templateId: string;
  minResponses: number;
  minRate: number;
};
let aggregates: Record<string, unknown>[];
let history: Record<string, unknown> | null;
const input = () => ({
  expectedRevision: campaign.revision,
  requestId: randomUUID(),
});
beforeEach(() => {
  vi.resetAllMocks();
  campaign = {
    id: ids[3],
    revision: 3,
    status: "DA_DONG",
    semester: { lockedAt: null },
    templateId: ids[4],
    minResponses: 5,
    minRate: 0.3,
  };
  aggregates = [];
  history = null;
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.userSession.findUnique.mockResolvedValue(session(actor()));
  db.systemSetting.findUnique.mockResolvedValue(null);
  db.surveyCampaign.findUnique.mockImplementation(async () =>
    structuredClone(campaign),
  );
  db.surveyCampaign.updateMany.mockImplementation(async ({ data }) => {
    campaign.status = data.status;
    campaign.revision++;
    return { count: 1 };
  });
  db.campaignHistory.findUnique.mockImplementation(async ({ where }) =>
    history?.requestId === where.campaignId_requestId.requestId
      ? history
      : null,
  );
  db.campaignHistory.create.mockImplementation(async ({ data }) => {
    history = data;
    return data;
  });
  db.campaignSection.findMany.mockResolvedValue([
    {
      sectionId: ids[5],
      section: { teaching: [{ teacherId: ids[6] }, { teacherId: ids[7] }] },
    },
  ]);
  db.surveyTemplate.findUnique.mockResolvedValue({
    groups: [
      {
        id: "group",
        title: "Đánh giá",
        position: 1,
        weight: "1",
        isAssessmentGroup: true,
        questions: [
          {
            id: "Q1",
            label: "Câu hỏi",
            type: "LIKERT",
            position: 1,
            weight: "1",
            scaleMin: 1,
            scaleMax: 5,
            options: [],
          },
          {
            id: "TEXT",
            label: "Góp ý",
            type: "TEXT",
            position: 2,
            weight: "1",
            scaleMin: null,
            scaleMax: null,
            options: [],
          },
        ],
      },
    ],
  });
  db.surveyResponse.count.mockResolvedValue(4);
  db.surveyTask.count.mockImplementation(async ({ where }) =>
    where.status === "DONE" ? 4 : 10,
  );
  db.surveyAnswer.findMany.mockImplementation(async ({ select }) =>
    select.questionId
      ? [5, 4, 4, 5].map((valueNumber) => ({
          questionId: "Q1",
          valueNumber,
          valueOptionIds: null,
          valueBoolean: null,
          valueText: null,
          isNotApplicable: false,
        }))
      : [],
  );
  db.aggregateResult.count.mockImplementation(async () => aggregates.length);
  db.aggregateResult.create.mockImplementation(async ({ data }) => {
    aggregates.push(data);
    return data;
  });
  db.aggregateResult.findMany.mockImplementation(async () => aggregates);
  db.question.findMany.mockResolvedValue([{ id: "TEXT" }]);
  db.auditLog.create.mockResolvedValue({});
});

describe("FR-60/61/62 — BR-07/09/11/17/18 chuyển trạng thái tổng hợp/công bố", () => {
  it.each<Role>([
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "LANH_DAO",
    "ADMIN",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])(
    "BR-18 %s không tổng hợp/công bố, ADMIN không có quyền ngầm",
    async (role) => {
      await expect(
        aggregateSurveyResults(actor(role), campaign.id, input()),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        publishSurveyResults(actor(role), campaign.id, input()),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("BR-34 đọc lại phiên/quyền bên trong khóa trước khi đọc dữ liệu và ghi", async () => {
    db.userSession.findUnique.mockResolvedValue(session(actor("SINH_VIEN")));
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.surveyCampaign.findUnique).not.toHaveBeenCalled();
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
  });
  it("BR-34 phiên bị thu hồi không ghi kết quả", async () => {
    db.userSession.findUnique.mockResolvedValue({
      ...session(actor()),
      revokedAt: new Date(),
    });
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ status: 401 });
    expect(db.aggregateResult.create).not.toHaveBeenCalled();
  });
  it("BR-11 tổng hợp lưu đủ số đếm, ảnh chụp giáo viên nội bộ nhưng không nội dung/định danh phiếu", async () => {
    const result = await aggregateSurveyResults(actor(), campaign.id, input());
    expect(result).toMatchObject({
      status: "DA_TONG_HOP",
      revision: 4,
      resultCount: 1,
      replayed: false,
    });
    expect(aggregates[0]).toMatchObject({
      responseCount: 4,
      taskCount: 10,
      participationRate: 0.4,
      overallScore: 4.5,
      eligibleToPublish: false,
    });
    expect(aggregates[0].details).toMatchObject({
      version: 2,
      templateId: campaign.templateId,
      teacherIds: [ids[6], ids[7]].sort(),
    });
    const stored = JSON.stringify(aggregates[0]);
    for (const key of [
      "responseId",
      "studentId",
      "answerId",
      "valueText",
      "submittedDate",
      "sessionId",
    ])
      expect(stored).not.toContain(key);
    expect(db.auditLog.create).toHaveBeenCalledOnce();
    expect(db.campaignHistory.create).toHaveBeenCalledOnce();
  });
  it("FR-62 retry cùng requestId trả trạng thái hiện tại, không tạo thêm kết quả/lịch sử/audit", async () => {
    const request = input();
    await aggregateSurveyResults(actor(), campaign.id, request);
    const replay = await aggregateSurveyResults(actor(), campaign.id, request);
    expect(replay).toMatchObject({
      status: "DA_TONG_HOP",
      revision: 4,
      resultCount: 1,
      replayed: true,
    });
    expect(db.aggregateResult.create).toHaveBeenCalledOnce();
    expect(db.campaignHistory.create).toHaveBeenCalledOnce();
    expect(db.auditLog.create).toHaveBeenCalledOnce();
    await expect(
      aggregateSurveyResults(actor(), campaign.id, {
        ...request,
        expectedRevision: 4,
      }),
    ).rejects.toMatchObject({ code: "RESULT_REQUEST_CONFLICT" });
  });
  it("FR-62 requestId gắn người thao tác, không cho tài khoản khác dùng lại", async () => {
    const request = input();
    await aggregateSurveyResults(actor(), campaign.id, request);
    history!.actorId = randomUUID();
    await expect(
      aggregateSurveyResults(actor(), campaign.id, request),
    ).rejects.toMatchObject({ code: "RESULT_REQUEST_CONFLICT" });
  });
  it("FR-62 CAS từ chối revision cũ trước tổng hợp", async () => {
    await expect(
      aggregateSurveyResults(actor(), campaign.id, {
        ...input(),
        expectedRevision: 2,
      }),
    ).rejects.toMatchObject({ code: "RESULT_REVISION_CONFLICT" });
    expect(db.aggregateResult.create).not.toHaveBeenCalled();
  });
  it.each([
    "NHAP",
    "CHO_DUYET",
    "DA_DUYET",
    "DANG_MO",
    "DA_TONG_HOP",
    "DA_CONG_BO",
    "LUU_TRU",
    "HUY",
  ])("BR-11 không tổng hợp từ %s", async (status) => {
    campaign.status = status;
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "RESULT_INVALID_STATE" });
    expect(db.aggregateResult.create).not.toHaveBeenCalled();
  });
  it("BR-17 khóa sổ ngăn tổng hợp và công bố", async () => {
    campaign.semester.lockedAt = new Date();
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    campaign.status = "DA_TONG_HOP";
    await expect(
      publishSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("BR-07 công bố toàn đợt vẫn được khi lớp thiếu mẫu; cờ lớp giữ false", async () => {
    await aggregateSurveyResults(actor(), campaign.id, input());
    const result = await publishSurveyResults(actor(), campaign.id, input());
    expect(result).toMatchObject({
      status: "DA_CONG_BO",
      revision: 5,
      resultCount: 1,
    });
    expect(aggregates[0].eligibleToPublish).toBe(false);
  });
  it("BR-09 chặn công bố khi còn TEXT có nội dung đang chờ; bỏ qua nonTEXT/NA/trắng", async () => {
    await aggregateSurveyResults(actor(), campaign.id, input());
    db.surveyAnswer.findMany.mockResolvedValue([
      { valueText: "Nội dung cần duyệt" },
    ]);
    await expect(
      publishSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "PENDING_MODERATION" });
    expect(campaign.status).toBe("DA_TONG_HOP");
    const query = db.surveyAnswer.findMany.mock.calls.at(-1)![0];
    expect(query.where).toMatchObject({
      questionId: { in: ["TEXT"] },
      isNotApplicable: false,
      moderationStatus: "CHO_KIEM_DUYET",
    });
    expect(query.select).toEqual({ valueText: true });
    db.surveyAnswer.findMany.mockResolvedValue([
      { valueText: "  \n " },
      { valueText: null },
    ]);
    expect(
      (await publishSurveyResults(actor(), campaign.id, input())).status,
    ).toBe("DA_CONG_BO");
  });
  it("BR-11 không công bố thiếu hoặc hỏng dữ liệu tổng hợp", async () => {
    campaign.status = "DA_TONG_HOP";
    await expect(
      publishSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "INVALID_AGGREGATE" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("BR-11 không ghi đè tổng hợp đã tồn tại khi không có requestId tương ứng", async () => {
    aggregates.push({ sectionId: ids[5] });
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "INVALID_AGGREGATE" });
    expect(db.aggregateResult.create).not.toHaveBeenCalled();
  });
  it("FR-62 CAS thất bại không ghi lịch sử/audit; giao dịch DB chịu trách nhiệm rollback kết quả", async () => {
    db.surveyCampaign.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "RESULT_REVISION_CONFLICT" });
    expect(db.campaignHistory.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("BR-11 từ chối câu trả lời sai thang mà không log/đưa nội dung vào lỗi", async () => {
    db.surveyAnswer.findMany.mockResolvedValue([
      {
        questionId: "Q1",
        valueNumber: 999,
        valueText: "nội dung riêng",
        valueOptionIds: null,
        valueBoolean: null,
        isNotApplicable: false,
      },
    ]);
    await expect(
      aggregateSurveyResults(actor(), campaign.id, input()),
    ).rejects.toMatchObject({ code: "INVALID_AGGREGATE" });
    expect(db.aggregateResult.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("FR-62 payload không hợp lệ bị chặn trước giao dịch", async () => {
    await expect(
      aggregateSurveyResults(actor(), campaign.id, {
        expectedRevision: 0,
        requestId: "not-uuid",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
