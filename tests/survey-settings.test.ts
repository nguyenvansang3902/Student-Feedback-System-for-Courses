import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  DEFAULT_SURVEY_SETTINGS,
  getSurveySettings,
  readSurveySettings,
  setSurveySettings,
  type SurveySettingsUpdate,
} from "../src/server/services/survey-settings";

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

const roles: Role[] = [
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
];
const readRoles: Role[] = ["ADMIN", "CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"];
function actor(role: Role = "ADMIN"): AuthActor {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          departmentId: randomUUID(),
          facultyId: null,
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            facultyId: randomUUID(),
            departmentId: null,
          }
        : { scopeType: "GLOBAL" as const, facultyId: null, departmentId: null };
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "TEST_SETTINGS",
    email: "settings@fixture.invalid",
    displayName: "Tài khoản giả",
    roles: [role],
    assignments: [{ role, ...scope }],
    mfa: role === "ADMIN",
    mfaRequired: role === "ADMIN",
    purpose: "FULL",
    mustChangePassword: false,
  };
}
function session(value: AuthActor) {
  return {
    id: value.sessionId,
    familyId: value.familyId,
    userId: value.userId,
    purpose: "FULL",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    mfaVerifiedAt: value.mfa ? new Date() : null,
    user: {
      status: "ACTIVE",
      mustChangePassword: false,
      loginCode: value.loginCode,
      email: value.email,
      displayName: value.displayName,
      roles: value.assignments,
    },
  };
}
type StoredSettings = { value: unknown; updatedAt: Date };
let stored: StoredSettings | null;
const update = (
  extra: Partial<SurveySettingsUpdate> = {},
): SurveySettingsUpdate => ({
  ...DEFAULT_SURVEY_SETTINGS,
  expectedUpdatedAt: null,
  ...extra,
});
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  stored = null;
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.systemSetting.findUnique.mockImplementation(async ({ where }) =>
    where.key === "MFA_REQUIRED_ROLES" ? { value: ["ADMIN"] } : stored,
  );
  db.systemSetting.upsert.mockImplementation(
    async ({ create, update: values }) => {
      stored = stored
        ? { value: values.value, updatedAt: values.updatedAt }
        : { value: create.value, updatedAt: create.updatedAt };
      return stored;
    },
  );
  db.auditLog.create.mockResolvedValue({});
  db.userSession.findUnique.mockResolvedValue(session(actor()));
});

describe("FR-100 / BR-30/32/34 — cấu hình ngưỡng khảo sát", () => {
  it.each(roles)(
    "TC-ALL-01 phần Tuần7: %s đọc mặc định đúng quyền hoặc bị chặn trước DB",
    async (role) => {
      const current = actor(role);
      db.userSession.findUnique.mockResolvedValue(session(current));
      if (readRoles.includes(role))
        expect(await getSurveySettings(current)).toEqual({
          ...DEFAULT_SURVEY_SETTINGS,
          updatedAt: null,
        });
      else {
        await expect(getSurveySettings(current)).rejects.toMatchObject({
          status: 403,
        });
        expect(db.$transaction).not.toHaveBeenCalled();
      }
    },
  );
  it.each(roles.filter((role) => role !== "ADMIN"))(
    "TC-ALL-01: %s không ghi cấu hình dù biết payload đúng",
    async (role) => {
      await expect(
        setSurveySettings(actor(role), update()),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
    },
  );
  it("BR-32: ADMIN chưa MFA hoặc phiên hạn chế không truy cập cấu hình", async () => {
    for (const current of [
      { ...actor(), mfa: false },
      { ...actor(), purpose: "MFA_VERIFY" as const },
    ]) {
      await expect(getSurveySettings(current)).rejects.toMatchObject({
        status: 403,
      });
      await expect(setSurveySettings(current, update())).rejects.toMatchObject({
        status: 403,
      });
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("BR-34: đọc lại phiên thật, từ chối quyền bị thu hồi trước khi ghi", async () => {
    const current = actor(),
      fresh = session(current);
    fresh.user.roles = [
      {
        role: "SINH_VIEN",
        scopeType: "GLOBAL",
        facultyId: null,
        departmentId: null,
      },
    ];
    db.userSession.findUnique.mockResolvedValue(fresh);
    await expect(setSurveySettings(current, update())).rejects.toMatchObject({
      status: 403,
    });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it("BR-32/34: không tin actor.mfa nếu DB không còn xác nhận MFA hoặc phiên đã thu hồi", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue({
      ...session(current),
      mfaVerifiedAt: null,
    });
    await expect(setSurveySettings(current, update())).rejects.toMatchObject({
      status: 403,
    });
    db.userSession.findUnique.mockResolvedValue({
      ...session(current),
      revokedAt: new Date(),
    });
    await expect(getSurveySettings(current)).rejects.toMatchObject({
      status: 401,
    });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it("FR-100: mặc định thiếu trường mới được bổ sung, không ghi đè dữ liệu đang đọc", async () => {
    const current = actor("CAN_BO_DBCL");
    db.userSession.findUnique.mockResolvedValue(session(current));
    stored = {
      value: { minResponses: 8, minRate: 0.45 },
      updatedAt: new Date("2026-10-28T00:00:00Z"),
    };
    expect(await getSurveySettings(current)).toEqual({
      ...DEFAULT_SURVEY_SETTINGS,
      minResponses: 8,
      minRate: 0.45,
      updatedAt: stored.updatedAt.toISOString(),
    });
    expect(stored.value).toEqual({ minResponses: 8, minRate: 0.45 });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it.each([
    null,
    [],
    true,
    "private",
    { minResponses: 0 },
    { minRate: 2 },
    { multiTeacherWarningThreshold: 1 },
    { disableReadinessBlockers: true },
  ])(
    "FR-100: cấu hình lưu sai %j bị từ chối, không âm thầm bỏ guard",
    async (value) => {
      stored = { value, updatedAt: new Date() };
      await expect(readSurveySettings(db as never)).rejects.toMatchObject({
        status: 503,
        code: "INVALID_SURVEY_SETTINGS",
      });
      expect(db.systemSetting.upsert).not.toHaveBeenCalled();
    },
  );
  it.each([
    { minResponses: 0 },
    { minResponses: 1.1 },
    { minResponses: 1001 },
    { minRate: -0.1 },
    { minRate: 1.01 },
    { warningScore: 0 },
    { warningScore: 6 },
    { explanationDays: 0 },
    { explanationDays: 366 },
    { multiTeacherWarningThreshold: 1 },
    { multiTeacherWarningThreshold: 21 },
    { expectedUpdatedAt: "không-phải-thời-gian" },
    { minResponses: "5" },
    { disableReadinessBlockers: true },
  ])("FR-100: payload sai %j bị chặn trước transaction", async (extra) => {
    await expect(
      setSurveySettings(actor(), {
        ...update(),
        ...extra,
      } as SurveySettingsUpdate),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("BR-30: lưu ngưỡng và audit nguyên tử với metadata số, không có OTP/email/phiếu", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    const input = update({
      minResponses: 8,
      minRate: 0.45,
      warningScore: 3.25,
      explanationDays: 21,
      multiTeacherWarningThreshold: 3,
    });
    const result = await setSurveySettings(current, input);
    expect(result).toMatchObject({
      minResponses: 8,
      minRate: 0.45,
      warningScore: 3.25,
      explanationDays: 21,
      multiTeacherWarningThreshold: 3,
    });
    expect(result.updatedAt).toBeTypeOf("string");
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: current.userId,
        action: "SURVEY_SETTINGS_CHANGED",
        objectType: "SystemSetting",
        objectId: "SURVEY_DEFAULTS",
        redactedSummary: {
          before: DEFAULT_SURVEY_SETTINGS,
          after: {
            minResponses: 8,
            minRate: 0.45,
            warningScore: 3.25,
            explanationDays: 21,
            multiTeacherWarningThreshold: 3,
          },
          success: true,
        },
      },
    });
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
  });
  it("BR-34: hai lần lưu với timestamp cũ chỉ lần đầu có hiệu lực", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    const first = await setSurveySettings(current, update({ minResponses: 6 }));
    await expect(
      setSurveySettings(current, update({ minResponses: 7 })),
    ).rejects.toMatchObject({ status: 409, code: "SURVEY_SETTINGS_CONFLICT" });
    expect(stored!.value).toMatchObject({ minResponses: 6 });
    expect(db.systemSetting.upsert).toHaveBeenCalledOnce();
    expect(db.auditLog.create).toHaveBeenCalledOnce();
    const second = await setSurveySettings(
      current,
      update({ minResponses: 7, expectedUpdatedAt: first.updatedAt }),
    );
    expect(second.minResponses).toBe(7);
  });
  it("BR-34: cùng millisecond vẫn tăng phiên timestamp, nên payload cũ không lưu đè", async () => {
    const now = new Date("2026-10-29T00:00:00.000Z"),
      current = actor();
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
    db.userSession.findUnique.mockResolvedValue(session(current));
    stored = { value: { ...DEFAULT_SURVEY_SETTINGS }, updatedAt: now };
    const input = update({ expectedUpdatedAt: now.toISOString() });
    expect((await setSurveySettings(current, input)).updatedAt).toBe(
      "2026-10-29T00:00:00.001Z",
    );
    await expect(setSurveySettings(current, input)).rejects.toMatchObject({
      status: 409,
    });
    expect(db.systemSetting.upsert).toHaveBeenCalledOnce();
  });
});
