import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { resultSectionScopeWhere } from "../src/server/policies/can";
import {
  listIncompleteStudents,
  remindDueSurveyStudents,
  remindIncompleteStudents,
  surveyReminderDay,
} from "../src/server/services/survey-reminders";
const mocks = vi.hoisted(() => ({
  fresh: vi.fn(),
  lock: vi.fn(),
  db: {
    $transaction: vi.fn(),
    surveyCampaign: { findFirst: vi.fn(), findMany: vi.fn() },
    surveyTask: { findMany: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
    emailOutbox: { createMany: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/services/access")>()),
  assertFreshActor: mocks.fresh,
  lockAdminMutations: mocks.lock,
}));
const { db } = mocks;
const campaignId = randomUUID(),
  sectionId = randomUUID(),
  departmentId = randomUUID(),
  facultyId = randomUUID(),
  studentIds = [randomUUID(), randomUUID()];
const now = new Date("2026-10-30T03:00:00Z");
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
        departmentId: role === "TRUONG_BO_MON" ? departmentId : null,
        facultyId: role === "TRUONG_KHOA" ? facultyId : null,
      },
    ],
  };
}
let campaign: {
  id: string;
  title: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  semester: { lockedAt: Date | null };
};
let notificationIds: Set<string>, outboxKeys: Set<string>;
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử nhắc khảo sát bằng dữ liệu giả",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  campaign = {
    id: campaignId,
    title: "Đợt giả",
    status: "DANG_MO",
    startsAt: new Date("2026-10-01"),
    endsAt: new Date("2026-11-05"),
    semester: { lockedAt: null },
  };
  notificationIds = new Set();
  outboxKeys = new Set();
  mocks.fresh.mockImplementation(async (_tx, value) => value);
  mocks.lock.mockResolvedValue(undefined);
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.surveyCampaign.findFirst.mockImplementation(async () => campaign);
  db.surveyCampaign.findMany.mockImplementation(async () => [campaign]);
  db.surveyTask.findMany.mockImplementation(async () => [
    { studentId: studentIds[0] },
    { studentId: studentIds[1] },
    { studentId: studentIds[0] },
  ]);
  db.surveyTask.count.mockResolvedValue(0);
  db.auditLog.create.mockResolvedValue({});
  db.systemSetting.findUnique.mockResolvedValue(null);
  db.systemSetting.upsert.mockResolvedValue({});
  db.user.findMany.mockImplementation(async ({ where }) =>
    where.id.in.map((id: string) => ({ id })),
  );
  db.notification.createMany.mockImplementation(async ({ data }) => {
    let count = 0;
    for (const item of data) {
      if (!notificationIds.has(item.id)) count++;
      notificationIds.add(item.id);
    }
    return { count };
  });
  db.emailOutbox.createMany.mockImplementation(async ({ data }) => {
    let count = 0;
    for (const item of data) {
      if (!outboxKeys.has(item.idempotencyKey)) count++;
      outboxKeys.add(item.idempotencyKey);
    }
    return { count };
  });
});
afterEach(() => vi.useRealTimers());
describe("W9 BR-13/17/18 — trạng thái hoàn thành và nhắc tối đa một lần/ngày", () => {
  it.each<Role>([
    "ADMIN",
    "PHONG_DAO_TAO",
    "SINH_VIEN",
    "GIANG_VIEN",
    "LANH_DAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])("%s không xem hoặc nhắc danh sách trước DB", async (role) => {
    await expect(
      listIncompleteStudents(actor(role), campaignId),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      remindIncompleteStudents(actor(role), campaignId),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("đọc lại vai trò sau khóa trước khi truy vấn trạng thái", async () => {
    mocks.fresh.mockResolvedValue(actor("SINH_VIEN"));
    await expect(
      listIncompleteStudents(actor(), campaignId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fresh.mock.invocationCallOrder[0],
    );
    expect(db.surveyCampaign.findFirst).not.toHaveBeenCalled();
  });
  it.each<Role>(["TRUONG_BO_MON", "TRUONG_KHOA"])(
    "%s lọc phạm vi trong cả truy vấn đợt, list và count",
    async (role) => {
      const staff = actor(role);
      db.surveyTask.findMany.mockResolvedValue([
        {
          studentId: studentIds[0],
          sectionId,
          student: { loginCode: "SV-GIA", displayName: "Sinh viên giả" },
          cohort: { section: { code: "LHP-GIA" } },
        },
      ]);
      db.surveyTask.count.mockResolvedValue(1);
      const result = await listIncompleteStudents(staff, campaignId, {
        page: 2,
        pageSize: 5,
        sectionId,
      });
      const campaignWhere =
        db.surveyCampaign.findFirst.mock.calls[0][0].where.sections.some;
      expect(campaignWhere).toEqual({
        campaignId,
        sectionId,
        section: resultSectionScopeWhere(staff, "results:incomplete"),
      });
      const query = db.surveyTask.findMany.mock.calls[0][0];
      expect(query.where).toEqual({
        campaignId,
        status: "PENDING",
        cohort: campaignWhere,
      });
      expect(db.surveyTask.count).toHaveBeenCalledWith({ where: query.where });
      expect(query.skip).toBe(5);
      expect(result.items[0]).toEqual({
        studentId: studentIds[0],
        sectionId,
        loginCode: "SV-GIA",
        displayName: "Sinh viên giả",
        sectionCode: "LHP-GIA",
      });
      expect(JSON.stringify(query.select)).not.toMatch(
        /answer|response|valueText|submitted/,
      );
      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SURVEY_INCOMPLETE_VIEWED",
          redactedSummary: {
            page: 2,
            pageSize: 5,
            count: 1,
            sectionFiltered: true,
            success: true,
          },
        }),
      });
    },
  );
  it("danh sách rỗng vẫn có audit; nhật ký không chép SV hay nội dung trả lời", async () => {
    db.surveyTask.findMany.mockResolvedValue([]);
    await listIncompleteStudents(actor(), campaignId);
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = JSON.stringify(db.auditLog.create.mock.calls[0][0]);
    expect(audit).not.toContain(studentIds[0]);
    expect(audit).not.toMatch(/answer|response|valueText/);
  });
  it("ngoài phạm vi trả404 trước truy vấn danh sách hoặc tạo thông báo", async () => {
    db.surveyCampaign.findFirst.mockResolvedValue(null);
    await expect(
      listIncompleteStudents(actor("TRUONG_BO_MON"), campaignId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      remindIncompleteStudents(actor("TRUONG_KHOA"), campaignId),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.surveyTask.findMany).not.toHaveBeenCalled();
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });
  it("học kỳ khóa cho xem có audit nhưng không nhắc", async () => {
    campaign.semester.lockedAt = new Date();
    db.surveyTask.findMany.mockResolvedValue([]);
    await expect(
      listIncompleteStudents(actor(), campaignId),
    ).resolves.toMatchObject({ total: 0 });
    await expect(
      remindIncompleteStudents(actor(), campaignId),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });
  it("chỉ nhắc khi đang mở và còn hạn; nhận đúng endsAt", async () => {
    campaign.status = "DA_DONG";
    await expect(
      remindIncompleteStudents(actor(), campaignId),
    ).rejects.toMatchObject({ code: "REMINDER_INVALID_STATE" });
    campaign.status = "DANG_MO";
    campaign.endsAt = new Date(now.getTime() - 1);
    await expect(
      remindIncompleteStudents(actor(), campaignId),
    ).rejects.toMatchObject({ code: "REMINDER_INVALID_STATE" });
    campaign.endsAt = new Date(now);
    await expect(
      remindIncompleteStudents(actor(), campaignId),
    ).resolves.toMatchObject({ queued: 2 });
  });
  it("nhắc tay, qua phạm vi lớp khác và scheduler cùng ngày không nhân đôi; ngày mới được nhắc", async () => {
    const staff = actor();
    expect(
      await remindIncompleteStudents(staff, campaignId, { sectionId }),
    ).toMatchObject({ queued: 2, day: "2026-10-30" });
    expect(
      await remindIncompleteStudents(staff, campaignId, {
        sectionId: randomUUID(),
      }),
    ).toMatchObject({ queued: 0 });
    expect(await remindDueSurveyStudents(consoleActor)).toMatchObject({
      queued: 0,
    });
    expect(notificationIds.size).toBe(2);
    expect(outboxKeys.size).toBe(2);
    vi.setSystemTime(new Date("2026-10-30T17:00:00Z"));
    expect(await remindIncompleteStudents(staff, campaignId)).toMatchObject({
      queued: 2,
      day: "2026-10-31",
    });
    expect(notificationIds.size).toBe(4);
    expect(outboxKeys.size).toBe(4);
    expect(db.notification.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
    expect(db.emailOutbox.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
    const where = db.surveyTask.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      campaignId,
      status: "PENDING",
      student: { status: "ACTIVE" },
    });
  });
  it("ngày nhắc dùng múi giờ Việt Nam tại ranh giới nửa đêm", () => {
    expect(surveyReminderDay(new Date("2026-10-29T16:59:59Z"))).toBe(
      "2026-10-29",
    );
    expect(surveyReminderDay(new Date("2026-10-29T17:00:00Z"))).toBe(
      "2026-10-30",
    );
  });
  it("console không hợp lệ không kích hoạt scheduler hoặc đọc DB", async () => {
    await expect(remindDueSurveyStudents(null)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("cursor đưa scheduler đến các đợt sau giới hạn và quay lại đầu khi hết", async () => {
    const ids = Array.from({ length: 55 }, () => randomUUID()).sort();
    let cursor: string | null = null;
    db.systemSetting.findUnique.mockImplementation(async () =>
      cursor ? { value: { lastId: cursor } } : null,
    );
    db.systemSetting.upsert.mockImplementation(async ({ update }) => {
      cursor = update.value.lastId;
      return {};
    });
    db.surveyCampaign.findMany.mockImplementation(async ({ where, take }) =>
      ids
        .filter((id) => !where.id || id > where.id.gt)
        .slice(0, take)
        .map((id) => ({ id, title: "Đợt giả" })),
    );
    db.surveyTask.findMany.mockResolvedValue([]);
    expect(await remindDueSurveyStudents(consoleActor)).toEqual({
      checked: 50,
      queued: 0,
    });
    expect(cursor).toBe(ids[49]);
    expect(await remindDueSurveyStudents(consoleActor)).toEqual({
      checked: 5,
      queued: 0,
    });
    expect(cursor).toBe(ids[54]);
    expect(await remindDueSurveyStudents(consoleActor)).toEqual({
      checked: 50,
      queued: 0,
    });
    expect(cursor).toBe(ids[49]);
    expect(db.surveyCampaign.findMany.mock.calls[2][0].where.id).toEqual({
      gt: ids[54],
    });
    expect(
      db.surveyCampaign.findMany.mock.calls[3][0].where.id,
    ).toBeUndefined();
  });
});
