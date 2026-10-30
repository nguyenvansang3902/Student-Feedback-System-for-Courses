import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  listSurveyModeration,
  moderateSurveyAnswer,
} from "../src/server/services/survey-moderation";
const mocks = vi.hoisted(() => ({
  fresh: vi.fn(),
  lock: vi.fn(),
  settings: vi.fn(),
  db: {
    $transaction: vi.fn(),
    surveyCampaign: { findUnique: vi.fn() },
    surveyAnswer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/services/access")>()),
  assertFreshActor: mocks.fresh,
  lockAdminMutations: mocks.lock,
}));
vi.mock("../src/server/services/survey-results-settings", () => ({
  readSurveyResultSettings: mocks.settings,
}));
const { db } = mocks;
const campaignId = randomUUID(),
  answerId = randomUUID(),
  questionId = randomUUID();
function actor(role: Role = "CAN_BO_DBCL"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "GIA",
    email: "gia@fixture.invalid",
    displayName: "Người dùng giả",
    purpose: "FULL",
    mustChangePassword: false,
    mfa: role === "ADMIN",
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
        departmentId: role === "TRUONG_BO_MON" ? randomUUID() : null,
        facultyId: role === "TRUONG_KHOA" ? randomUUID() : null,
      },
    ],
  };
}
let campaign: {
  status: string;
  semester: { lockedAt: Date | null };
  template: { groups: { questions: { id: string; label: string }[] }[] };
};
let row: {
  id: string;
  questionId: string;
  valueText: string;
  moderationStatus: string;
  moderationReason: string | null;
};
const decision = {
  status: "HIEN_THI" as const,
  reason: "Nội dung góp ý phù hợp",
};
beforeEach(() => {
  vi.resetAllMocks();
  campaign = {
    status: "DA_TONG_HOP",
    semester: { lockedAt: null },
    template: {
      groups: [{ questions: [{ id: questionId, label: "Góp ý giả" }] }],
    },
  };
  row = {
    id: answerId,
    questionId,
    valueText: "Góp ý về TỪ KHÓA GIẢ",
    moderationStatus: "CHO_KIEM_DUYET",
    moderationReason: null,
  };
  mocks.fresh.mockImplementation(async (_tx, value) => value);
  mocks.lock.mockResolvedValue(undefined);
  mocks.settings.mockResolvedValue({ sensitiveKeywords: ["từ khóa giả"] });
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.surveyCampaign.findUnique.mockImplementation(async () => campaign);
  db.surveyAnswer.findFirst.mockImplementation(async () => ({ ...row }));
  db.surveyAnswer.findMany.mockImplementation(async () => [{ ...row }]);
  db.surveyAnswer.updateMany.mockImplementation(async ({ where, data }) => {
    if (where.moderationStatus !== row.moderationStatus) return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  });
  db.auditLog.create.mockResolvedValue({});
});
describe("W9 BR-09/17/18 — kiểm duyệt tự luận không nối danh tính", () => {
  it.each<Role>([
    "ADMIN",
    "PHONG_DAO_TAO",
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "LANH_DAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])("%s bị từ chối trước DB", async (role) => {
    await expect(
      listSurveyModeration(actor(role), campaignId),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      moderateSurveyAnswer(actor(role), campaignId, answerId, decision),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("đọc lại vai trò sau mutex trước truy vấn nội dung", async () => {
    mocks.fresh.mockResolvedValue(actor("SINH_VIEN"));
    await expect(
      listSurveyModeration(actor(), campaignId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fresh.mock.invocationCallOrder[0],
    );
    expect(db.surveyCampaign.findUnique).not.toHaveBeenCalled();
  });
  it("lý do rỗng/thuộc tính lạ không mở transaction", async () => {
    for (const data of [
      { ...decision, reason: " " },
      { ...decision, studentId: randomUUID() },
    ])
      await expect(
        moderateSurveyAnswer(actor(), campaignId, answerId, data),
      ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("chỉ truy vấn câu TEXT không-NA, lọc trống, gắn cờ không phân biệt hoa thường", async () => {
    db.surveyAnswer.findMany.mockResolvedValue([
      { ...row },
      { ...row, id: randomUUID(), valueText: "   " },
    ]);
    const result = await listSurveyModeration(actor(), campaignId, {
      status: "CHO_KIEM_DUYET",
    });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: answerId,
      flagged: true,
      text: row.valueText,
    });
    expect(Object.keys(result.items[0]).sort()).toEqual([
      "flagged",
      "id",
      "questionLabel",
      "reason",
      "status",
      "text",
    ]);
    const where = db.surveyAnswer.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      questionId: { in: [questionId] },
      response: { campaignId },
      isNotApplicable: false,
      moderationStatus: "CHO_KIEM_DUYET",
    });
    const selection =
      db.surveyCampaign.findUnique.mock.calls[0][0].select.template.select
        .groups.select.questions;
    expect(selection.where).toEqual({ type: "TEXT" });
    expect(
      JSON.stringify(db.surveyAnswer.findMany.mock.calls[0][0].select),
    ).not.toMatch(/student|response|submitted|session|user/i);
  });
  it("một quyết định chỉ ghi một audit; retry cùng quyết định không tạo cầu nối phiếu", async () => {
    const staff = actor();
    await moderateSurveyAnswer(staff, campaignId, answerId, decision);
    await moderateSurveyAnswer(staff, campaignId, answerId, decision);
    expect(row).toMatchObject({
      moderationStatus: "HIEN_THI",
      moderationReason: decision.reason,
    });
    expect(db.surveyAnswer.updateMany).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = db.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      actorId: staff.userId,
      objectType: "SurveyAnswer",
      objectId: answerId,
    });
    expect(audit.redactedSummary).toEqual({
      status: "HIEN_THI",
      reasonProvided: true,
      success: true,
    });
    expect(JSON.stringify(audit)).not.toContain(row.valueText);
    expect(JSON.stringify(audit)).not.toContain(decision.reason);
    expect(db.surveyAnswer.findFirst.mock.calls[0][0].where).toMatchObject({
      id: answerId,
      response: { campaignId },
      questionId: { in: [questionId] },
      isNotApplicable: false,
    });
  });
  it("quyết định khác và mất CAS bị 409, không ghi audit thành công", async () => {
    row.moderationStatus = "DA_AN";
    row.moderationReason = "Đã xử lý";
    await expect(
      moderateSurveyAnswer(actor(), campaignId, answerId, decision),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.auditLog.create).not.toHaveBeenCalled();
    row.moderationStatus = "CHO_KIEM_DUYET";
    db.surveyAnswer.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      moderateSurveyAnswer(actor(), campaignId, answerId, decision),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("học kỳ khóa vẫn đọc, nhưng không sửa; đợt công bố cũng không sửa", async () => {
    campaign.semester.lockedAt = new Date();
    await expect(
      listSurveyModeration(actor(), campaignId),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      moderateSurveyAnswer(actor(), campaignId, answerId, decision),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    campaign.semester.lockedAt = null;
    campaign.status = "DA_CONG_BO";
    await expect(
      moderateSurveyAnswer(actor(), campaignId, answerId, decision),
    ).rejects.toMatchObject({ code: "MODERATION_INVALID_STATE" });
    expect(db.surveyAnswer.updateMany).not.toHaveBeenCalled();
  });
  it("đáp án không thuộc đợt/TEXT/không-NA dùng cùng404", async () => {
    db.surveyAnswer.findFirst.mockResolvedValue(null);
    await expect(
      moderateSurveyAnswer(actor(), campaignId, randomUUID(), decision),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.surveyAnswer.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});
