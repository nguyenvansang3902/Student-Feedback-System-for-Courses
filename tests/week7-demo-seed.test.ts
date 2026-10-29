import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "../src/generated/prisma/client";
import {
  seedWeek7ReadinessData,
  WEEK7_DEMO_MARKER,
  type Week7DemoContext,
} from "../src/server/services/week7-demo-seed";

const actor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử seed readiness với dữ liệu giả",
};
function id(key: string) {
  const hex = createHash("sha256").update(`fixture:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const context: Week7DemoContext = {
  id,
  departmentId: id("department"),
  teacherIds: [id("teacher:0"), id("teacher:1")],
  studentIds: Array.from({ length: 5 }, (_, index) => id(`student:${index}`)),
  createdById: id("dbcl"),
  templateId: id("template"),
};
const w7 = (key: string) => id(`week7:${key}`);
function transaction() {
  const tx = {
    systemSetting: { findUnique: vi.fn(), create: vi.fn() },
    course: { count: vi.fn(), create: vi.fn() },
    semester: { count: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    courseSection: { count: vi.fn(), createMany: vi.fn() },
    surveyCampaign: { count: vi.fn(), createMany: vi.fn() },
    user: { count: vi.fn(), create: vi.fn() },
    teachingAssignment: { createMany: vi.fn() },
    enrollment: { createMany: vi.fn() },
    campaignSection: { createMany: vi.fn() },
    campaignHistory: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  tx.systemSetting.findUnique.mockResolvedValue(null);
  for (const model of [
    tx.course,
    tx.semester,
    tx.courseSection,
    tx.surveyCampaign,
    tx.user,
  ])
    model.count.mockResolvedValue(0);
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("FR-101/142, BR-52 — bundle seed readiness riêng và bảo toàn dữ liệu", () => {
  it("không nhận actor HTTP/rỗng hoặc production trước khi truy cập DB", async () => {
    const { tx, client } = transaction();
    await expect(
      seedWeek7ReadinessData(null, client, context),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      seedWeek7ReadinessData({ ...actor, reason: "ngắn" }, client, context),
    ).rejects.toMatchObject({ status: 403 });
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      seedWeek7ReadinessData(actor, client, context),
    ).rejects.toThrow("phát triển");
    expect(tx.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled();
  });
  it.each([
    { teacherIds: [id("teacher:0")] },
    { studentIds: [id("student:0"), id("student:1")] },
  ])("thiếu nền demo thì từ chối trước đọc marker %#", async (extra) => {
    const { tx, client } = transaction();
    await expect(
      seedWeek7ReadinessData(actor, client, { ...context, ...extra }),
    ).rejects.toThrow("hai giảng viên");
    expect(tx.systemSetting.findUnique).not.toHaveBeenCalled();
  });
  it("marker đã có: không upsert/sửa/xóa bundle hay mật khẩu/trạng thái cũ", async () => {
    const { tx, client } = transaction();
    tx.systemSetting.findUnique.mockResolvedValue({
      key: WEEK7_DEMO_MARKER,
      value: { version: 1 },
    });
    expect(await seedWeek7ReadinessData(actor, client, context)).toEqual({
      created: false,
      campaigns: 2,
      sections: 8,
      newUsers: 0,
    });
    expect(tx.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { key: WEEK7_DEMO_MARKER },
    });
    for (const model of [
      tx.course,
      tx.semester,
      tx.courseSection,
      tx.surveyCampaign,
      tx.user,
    ])
      expect(model.count).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.surveyCampaign.createMany).not.toHaveBeenCalled();
    expect(tx.semester.update).not.toHaveBeenCalled();
    expect(tx.systemSetting.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it.each([
    "course",
    "semester",
    "courseSection",
    "surveyCampaign",
    "user",
  ] as const)(
    "collision %s chưa có marker: fail closed, không ghi đè dữ liệu",
    async (model) => {
      const { tx, client } = transaction();
      tx[model].count.mockResolvedValue(1);
      await expect(
        seedWeek7ReadinessData(actor, client, context),
      ).rejects.toThrow("không tự ghi đè");
      expect(tx.course.create).not.toHaveBeenCalled();
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.systemSetting.create).not.toHaveBeenCalled();
    },
  );
  it("tạo đúng hai đợt nháp, 8 lớp, 26 cặp, 1 SV pending không mật khẩu; không tạo phiếu/lịch sử duyệt giả", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const { tx, client } = transaction();
    expect(await seedWeek7ReadinessData(actor, client, context)).toEqual({
      created: true,
      campaigns: 2,
      sections: 8,
      newUsers: 1,
    });
    const user = tx.user.create.mock.calls[0][0].data;
    expect(user).toMatchObject({
      id: w7("pending-student"),
      loginCode: "W7-SV2026001",
      status: "PENDING_ACTIVATION",
      passwordHash: null,
      mustChangePassword: true,
      roles: {
        create: { role: "SINH_VIEN", scopeType: "GLOBAL", scopeKey: "GLOBAL" },
      },
    });
    const campaigns = tx.surveyCampaign.createMany.mock.calls[0][0].data;
    expect(campaigns).toHaveLength(2);
    expect(
      campaigns.map((row: { id: string; status: string; scope: string }) => [
        row.id,
        row.status,
        row.scope,
      ]),
    ).toEqual([
      [w7("campaign:ready"), "NHAP", "SECTIONS"],
      [w7("campaign:blocked"), "NHAP", "GLOBAL"],
    ]);
    expect(
      campaigns.every(
        (row: { templateId: string; startsAt: Date; endsAt: Date }) =>
          row.templateId === context.templateId && row.startsAt < row.endsAt,
      ),
    ).toBe(true);
    expect(tx.courseSection.createMany.mock.calls[0][0].data).toHaveLength(8);
    expect(tx.enrollment.createMany.mock.calls[0][0].data).toHaveLength(26);
    expect(tx.teachingAssignment.createMany.mock.calls[0][0].data).toHaveLength(
      8,
    );
    const histories = tx.campaignHistory.createMany.mock.calls[0][0].data;
    expect(
      histories.every(
        (row: {
          actorId: unknown;
          fromStatus: string;
          toStatus: string;
          action: string;
        }) =>
          row.actorId === null &&
          row.fromStatus === "NHAP" &&
          row.toStatus === "NHAP" &&
          row.action === "create",
      ),
    ).toBe(true);
    expect(tx).not.toHaveProperty("surveyResponse");
    expect(tx).not.toHaveProperty("surveyAnswer");
    expect(tx).not.toHaveProperty("surveyTask");
    expect(tx.semester.update).toHaveBeenCalledWith({
      where: { id: w7("semester:locked") },
      data: { lockedAt: expect.any(Date) },
    });
    expect(tx.semester.update.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.surveyCampaign.createMany.mock.invocationCallOrder[0],
    );
  });
  it("dữ liệu có chủ ý bao phủ RS01–06, đợt cảnh báo đủ điều kiện và không trộn kỳ", async () => {
    const { tx, client } = transaction();
    await seedWeek7ReadinessData(actor, client, context);
    const teachers = tx.teachingAssignment.createMany.mock.calls[0][0].data as {
      sectionId: string;
    }[];
    const enrollments = tx.enrollment.createMany.mock.calls[0][0].data as {
      sectionId: string;
      studentId: string;
    }[];
    for (const si of [0, 1]) {
      expect(
        teachers.filter((row) => row.sectionId === w7(`section:${si}:0`)),
      ).toHaveLength(0); // RS01
      expect(
        enrollments.filter((row) => row.sectionId === w7(`section:${si}:1`)),
      ).toHaveLength(0); // RS02
      expect(
        teachers.filter((row) => row.sectionId === w7(`section:${si}:2`)),
      ).toHaveLength(2); // RS04
      expect(
        enrollments.filter((row) => row.sectionId === w7(`section:${si}:3`)),
      ).toHaveLength(1); // RS05
      expect(
        enrollments.some(
          (row) =>
            row.sectionId === w7(`section:${si}:2`) &&
            row.studentId === w7("pending-student"),
        ),
      ).toBe(true); // RS06
    }
    const selected = tx.campaignSection.createMany.mock.calls[0][0].data;
    expect(selected).toEqual(
      [2, 3].map((index) => ({
        campaignId: w7("campaign:ready"),
        sectionId: w7(`section:0:${index}`),
      })),
    );
    expect(tx.semester.update.mock.calls[0][0].where.id).toBe(
      w7("semester:locked"),
    ); // RS03
    const readyPairs = enrollments.filter((row) =>
      [w7("section:0:2"), w7("section:0:3")].includes(row.sectionId),
    );
    expect(readyPairs).toHaveLength(7);
  });
  it("marker ghi sau bundle, khi tạo dở bị lỗi không đánh dấu hoàn tất", async () => {
    const { tx, client } = transaction();
    tx.enrollment.createMany.mockRejectedValueOnce(new Error("lỗi fixture"));
    await expect(
      seedWeek7ReadinessData(actor, client, context),
    ).rejects.toThrow("lỗi fixture");
    expect(tx.systemSetting.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    const good = transaction();
    await seedWeek7ReadinessData(actor, good.client, context);
    expect(
      good.tx.systemSetting.create.mock.invocationCallOrder[0],
    ).toBeGreaterThan(good.tx.semester.update.mock.invocationCallOrder[0]);
    expect(good.tx.systemSetting.create.mock.calls[0][0].data.key).toBe(
      WEEK7_DEMO_MARKER,
    );
    expect(
      JSON.stringify(good.tx.auditLog.create.mock.calls[0][0]),
    ).not.toContain("password");
  });
});
