import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { RoleGrant } from "../src/server/policies/can";
const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    surveyAnomalyFlag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    surveyAnomalyReviewEvent: { findUnique: vi.fn(), create: vi.fn() },
    inspectionCase: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    user: { findMany: vi.fn() },
  },
  fresh: vi.fn(),
  notice: vi.fn(),
  campaignNotice: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/access", async (original) => ({
  ...(await original<object>()),
  lockAdminMutations: vi.fn(),
  assertFreshActor: mocks.fresh,
}));
vi.mock("../src/server/services/domain-notifications", () => ({
  enqueueDomainNotice: mocks.notice,
}));
vi.mock("../src/server/services/campaign-notifications", () => ({
  enqueueCampaignNotice: mocks.campaignNotice,
}));
vi.mock("../src/server/services/workflow-settings", () => ({
  readWorkflowSettings: vi
    .fn()
    .mockResolvedValue({ inspectionAcceptDays: 3, inspectionCompleteDays: 30 }),
}));
import {
  getSurveyAnomaly,
  listSurveyAnomalies,
  reviewSurveyAnomaly,
} from "../src/server/services/survey-anomalies";
const flagId = randomUUID(),
  departmentId = randomUUID(),
  facultyId = randomUUID(),
  teacherId = randomUUID();
function actor(role: RoleGrant["role"], extra: RoleGrant[] = []): AuthActor {
  const grants = [{ role, scopeType: "GLOBAL" as const }, ...extra];
  return {
    userId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Giả",
    sessionId: randomUUID(),
    familyId: randomUUID(),
    roles: grants.map((g) => g.role),
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
function fixture() {
  return {
    id: flagId,
    campaignId: randomUUID(),
    sectionId: randomUUID(),
    ruleCode: "UNIFORM_LIKERT",
    metrics: {
      version: 1,
      responseCount: 10,
      participationRate: 0.5,
      uniformCount: 7,
      uniformRate: 0.7,
      scoreDeltaAbs: 1.6,
      priorSemesterName: "Kỳ giả",
      thresholds: { minResponses: 10, uniformRate: 0.7, scoreDelta: 1.5 },
    },
    status: "CHO_XEM_XET",
    revision: 1,
    note: null,
    createdAt: new Date(),
    campaign: {
      title: "Đợt giả",
      status: "DA_TONG_HOP",
      semester: { name: "Kỳ giả", lockedAt: null as Date | null },
    },
    section: {
      code: "LHP-GIA",
      course: { name: "Môn giả", departmentId, department: { facultyId } },
      teaching: [{ teacherId }],
    },
    inspectionCase: null as { id: string } | null,
    events: [],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn) => fn(mocks.db));
  mocks.fresh.mockImplementation(async (_tx, actor) => actor);
  mocks.db.surveyAnomalyReviewEvent.findUnique.mockResolvedValue(null);
  mocks.db.surveyAnomalyFlag.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.user.findMany.mockResolvedValue([]);
});
describe("W12 BR-61/65/67/68 — đọc vàxemxét chỉsố", () => {
  it.each([
    "ADMIN",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "PHONG_KHAO_THI",
    "PHONG_DAO_TAO",
    "SINH_VIEN",
  ] as const)(
    "%s khôngđọc chỉsố; quảntrị khôngsuy quyềnThanhtra",
    async (role) => {
      await expect(
        getSurveyAnomaly(
          actor(
            role,
            (
              [{ role: "THANH_TRA", scopeType: "GLOBAL" }] as RoleGrant[]
            ).filter(() => role === "ADMIN" || role === "CAN_BO_DBCL"),
          ),
          flagId,
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(mocks.db.surveyAnomalyFlag.findUnique).not.toHaveBeenCalled();
    },
  );
  it("TT chỉ nhận sốphiếu/tỉlệ/chênh, khôngđiểm tuyệtđối/rawanswer/teacherID", async () => {
    mocks.db.surveyAnomalyFlag.findUnique.mockResolvedValue(fixture());
    const value = await getSurveyAnomaly(actor("THANH_TRA"), flagId),
      text = JSON.stringify(value);
    expect(value.metrics.scoreDeltaAbs).toBe(1.6);
    for (const field of [
      teacherId,
      "overallScore",
      "answers",
      "comments",
      "studentId",
      "teacherIds",
    ])
      expect(text).not.toContain(field);
  });
  it("xungđột hiện tại chặn404kểcảđa vaitrò", async () => {
    const current = actor("THANH_TRA", [
      { role: "TRUONG_BO_MON", scopeType: "DEPARTMENT", departmentId },
    ]);
    mocks.db.surveyAnomalyFlag.findUnique.mockResolvedValue(fixture());
    await expect(getSurveyAnomaly(current, flagId)).rejects.toMatchObject({
      status: 404,
    });
    const teacher = actor("THANH_TRA");
    teacher.userId = teacherId;
    await expect(getSurveyAnomaly(teacher, flagId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("mất quyền tronggiao dịch bịtừchối trướcđọccờ", async () => {
    mocks.fresh.mockResolvedValue(actor("CAN_BO_DBCL"));
    await expect(
      getSurveyAnomaly(actor("THANH_TRA"), flagId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.db.surveyAnomalyFlag.findUnique).not.toHaveBeenCalled();
  });
  it("list/countcùnglọcphạmvi xungđột", async () => {
    mocks.db.surveyAnomalyFlag.findMany.mockResolvedValue([]);
    mocks.db.surveyAnomalyFlag.count.mockResolvedValue(0);
    await listSurveyAnomalies(
      actor("THANH_TRA", [
        { role: "TRUONG_KHOA", scopeType: "FACULTY", facultyId },
      ]),
    );
    expect(mocks.db.surveyAnomalyFlag.findMany.mock.calls[0][0].where).toEqual(
      mocks.db.surveyAnomalyFlag.count.mock.calls[0][0].where,
    );
    expect(
      JSON.stringify(mocks.db.surveyAnomalyFlag.count.mock.calls[0][0].where),
    ).toContain(facultyId);
  });
  it("CHUYEN_XAC_MINH tạomộtcaseBATkhôngfeedbackvàretrykhôngnhânđôi", async () => {
    const current = actor("THANH_TRA"),
      row = fixture(),
      input = {
        revision: 1,
        requestId: randomUUID(),
        decision: "CHUYEN_XAC_MINH",
        note: "Cần xác minh dữ liệu khảo sát theo quy trình.",
      };
    let previous: unknown = null;
    mocks.db.surveyAnomalyFlag.findUnique.mockImplementation(async () => row);
    mocks.db.surveyAnomalyReviewEvent.findUnique.mockImplementation(
      async () => previous,
    );
    mocks.db.surveyAnomalyReviewEvent.create.mockImplementation(
      async ({ data }) => {
        previous = data;
        return data;
      },
    );
    mocks.db.surveyAnomalyFlag.updateMany.mockImplementation(
      async ({ data }) => {
        Object.assign(row, data, { revision: 2 });
        return { count: 1 };
      },
    );
    mocks.db.inspectionCase.create.mockImplementation(async ({ data }) => {
      row.inspectionCase = { id: randomUUID() };
      return { ...data, id: row.inspectionCase.id };
    });
    await reviewSurveyAnomaly(current, flagId, input);
    await reviewSurveyAnomaly(current, flagId, input);
    expect(mocks.db.inspectionCase.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.surveyAnomalyReviewEvent.create).toHaveBeenCalledTimes(1);
    const data = mocks.db.inspectionCase.create.mock.calls[0][0].data;
    expect(data.source).toBe("BAT_THUONG_KHAO_SAT");
    expect(data).not.toHaveProperty("feedbackId");
    await expect(
      reviewSurveyAnomaly(current, flagId, {
        ...input,
        note: "Nội dung đã bị thay đổi với cùng requestId",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("họckỳkhóa khôngreview,khôngtạohồsơ", async () => {
    const row = fixture();
    row.campaign.semester.lockedAt = new Date();
    mocks.db.surveyAnomalyFlag.findUnique.mockResolvedValue(row);
    await expect(
      reviewSurveyAnomaly(actor("THANH_TRA"), flagId, {
        revision: 1,
        requestId: randomUUID(),
        decision: "CHUYEN_XAC_MINH",
        note: "Cần xem xét thông tin theo quy trình.",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.db.inspectionCase.create).not.toHaveBeenCalled();
  });
});
