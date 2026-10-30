import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import {
  DEFAULT_SURVEY_RESULT_SETTINGS,
  getSurveyResultSettings,
  readSurveyResultSettings,
  setSurveyResultSettings,
  surveyResultSettingsSchema,
  type SurveyResultSettingsUpdate,
} from "../src/server/services/survey-results-settings";

const { db } = vi.hoisted(() => ({
  db: {
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    userSession: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    department: { findFirst: vi.fn() },
    faculty: { findFirst: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
const admin: AuthActor = {
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "FAKE_ADMIN",
  email: "fake@fixture.invalid",
  displayName: "Quản trị giả",
  roles: ["ADMIN"],
  assignments: [
    { role: "ADMIN", scopeType: "GLOBAL", facultyId: null, departmentId: null },
  ],
  purpose: "FULL",
  mfa: true,
  mfaRequired: true,
  mustChangePassword: false,
};
const session = () => ({
  userId: admin.userId,
  familyId: admin.familyId,
  purpose: "FULL",
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60000),
  mfaVerifiedAt: new Date(),
  user: {
    status: "ACTIVE",
    mustChangePassword: false,
    loginCode: admin.loginCode,
    email: admin.email,
    displayName: admin.displayName,
    roles: admin.assignments,
  },
});
let stored: { value: unknown; updatedAt: Date } | null;
const update = (
  extra: Partial<SurveyResultSettingsUpdate> = {},
): SurveyResultSettingsUpdate => ({
  ...structuredClone(DEFAULT_SURVEY_RESULT_SETTINGS),
  expectedUpdatedAt: null,
  ...extra,
});
beforeEach(() => {
  vi.resetAllMocks();
  stored = null;
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.userSession.findUnique.mockResolvedValue(session());
  db.systemSetting.findUnique.mockImplementation(async ({ where }) =>
    where.key === "MFA_REQUIRED_ROLES" ? null : stored,
  );
  db.systemSetting.upsert.mockImplementation(
    async ({ create, update: values }) => {
      stored = {
        value: stored ? values.value : create.value,
        updatedAt: stored ? values.updatedAt : create.updatedAt,
      };
      return stored;
    },
  );
  db.auditLog.create.mockResolvedValue({});
});
describe("FR-60/65 — BR-09/11/18 cấu hình xếp mức và từ khóa", () => {
  it("BR-11 đọc mặc định không ghi lại cấu hình", async () => {
    expect(await getSurveyResultSettings(admin)).toEqual({
      ...DEFAULT_SURVEY_RESULT_SETTINGS,
      updatedAt: null,
    });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it.each([
    { ratingBands: [{ minScore: 3, label: "A" }] },
    {
      ratingBands: [
        { minScore: 0, label: "A" },
        { minScore: 4, label: "B" },
      ],
    },
    {
      ratingBands: [
        { minScore: 4, label: "A" },
        { minScore: 4, label: "B" },
        { minScore: 0, label: "C" },
      ],
    },
    {
      ratingBands: [
        { minScore: 5.1, label: "A" },
        { minScore: 0, label: "B" },
      ],
    },
    { ratingBands: [{ minScore: 0, label: " " }] },
    { sensitiveKeywords: [""] },
    { sensitiveKeywords: ["Riêng", "riêng"] },
    { sensitiveKeywords: Array.from({ length: 101 }, (_, i) => `Từ ${i}`) },
    { exposeStudents: true },
  ])(
    "BR-09/11 cấu hình không hợp lệ bị chặn trước giao dịch: %j",
    async (extra) => {
      await expect(
        setSurveyResultSettings(admin, {
          ...update(),
          ...extra,
        } as SurveyResultSettingsUpdate),
      ).rejects.toMatchObject({ status: 400 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("BR-11 nhận ngưỡng có 4 chữ số thập phân và từ khóa Unicode đã trim", () => {
    expect(
      surveyResultSettingsSchema.parse({
        ratingBands: [
          { minScore: 4.4999, label: "  Mức cao " },
          { minScore: 0, label: "Còn lại" },
        ],
        sensitiveKeywords: ["  thông tin riêng "],
      }),
    ).toEqual({
      ratingBands: [
        { minScore: 4.4999, label: "Mức cao" },
        { minScore: 0, label: "Còn lại" },
      ],
      sensitiveKeywords: ["thông tin riêng"],
    });
  });
  it("BR-18 chỉ ADMIN đủ MFA ghi cấu hình", async () => {
    const other = {
      ...admin,
      roles: ["CAN_BO_DBCL" as const],
      assignments: [
        {
          role: "CAN_BO_DBCL" as const,
          scopeType: "GLOBAL" as const,
          facultyId: null,
          departmentId: null,
        },
      ],
    };
    await expect(
      setSurveyResultSettings(other, update()),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      setSurveyResultSettings({ ...admin, mfa: false }, update()),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("BR-34/32 kiểm lại quyền và MFA từ DB, không tin actor cũ", async () => {
    db.userSession.findUnique.mockResolvedValue({
      ...session(),
      mfaVerifiedAt: null,
    });
    await expect(
      setSurveyResultSettings(admin, update()),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it("BR-34 CAS timestamp ngăn ghi đè và audit chỉ chứa số từ khóa, không chứa danh sách", async () => {
    const first = await setSurveyResultSettings(
      admin,
      update({ sensitiveKeywords: ["riêng tư"] }),
    );
    await expect(
      setSurveyResultSettings(admin, update()),
    ).rejects.toMatchObject({ code: "RESULT_SETTINGS_CONFLICT" });
    const audit = JSON.stringify(db.auditLog.create.mock.calls[0]);
    expect(audit).not.toContain("riêng tư");
    expect(audit).toContain('"keywordCount":1');
    expect(db.systemSetting.upsert).toHaveBeenCalledOnce();
    expect(
      (
        await setSurveyResultSettings(
          admin,
          update({ expectedUpdatedAt: first.updatedAt }),
        )
      ).updatedAt,
    ).not.toBe(first.updatedAt);
  });
  it.each([
    null,
    [],
    "private",
    {},
    { ratingBands: [], sensitiveKeywords: [] },
  ])(
    "BR-11 cấu hình lưu hỏng bị từ chối, không bỏ bảo vệ: %j",
    async (value) => {
      stored = { value, updatedAt: new Date() };
      await expect(readSurveyResultSettings(db as never)).rejects.toMatchObject(
        { status: 503, code: "INVALID_RESULT_SETTINGS" },
      );
    },
  );
});
