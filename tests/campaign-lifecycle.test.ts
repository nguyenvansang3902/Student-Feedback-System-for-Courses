import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cohort: vi.fn(), enqueue: vi.fn() }));
vi.mock("../src/server/services/campaign-readiness", () => ({
  resolveCampaignCohort: mocks.cohort,
}));
vi.mock("../src/server/services/campaign-notifications", () => ({
  enqueueCampaignNotice: mocks.enqueue,
}));
import {
  advanceCampaignState,
  advanceDueCampaignsInTransaction,
  dueCampaignWhere,
  ensureCampaignState,
  ensureDueCampaigns,
} from "../src/server/services/campaign-lifecycle";

const ids = Array.from({ length: 8 }, () => randomUUID()),
  now = new Date("2030-01-03T00:00:00Z");
function fixture(overrides: Record<string, unknown> = {}) {
  const row = {
    id: ids[0],
    title: "Đợt giả",
    revision: 4,
    status: "DA_DUYET",
    semesterId: ids[1],
    scope: "GLOBAL",
    facultyId: null,
    departmentId: null,
    startsAt: new Date("2030-01-02T00:00:00Z"),
    endsAt: new Date("2030-01-04T00:00:00Z"),
    approvedAt: new Date("2030-01-01T00:00:00Z"),
    approvedById: ids[2],
    semester: { lockedAt: null },
    ...overrides,
  };
  const tx = {
    surveyCampaign: {
      findUnique: vi.fn(async () => structuredClone(row)),
      findUniqueOrThrow: vi.fn(async () => structuredClone(row)),
      updateMany: vi.fn(
        async (args: {
          where: { status: string; revision: number; endsAt?: {lt: Date} };
          data: Record<string, unknown>;
        }) => {
          if (
            args.where.status !== row.status ||
            args.where.revision !== row.revision
          )
            return { count: 0 };
          Object.assign(row, args.data, { revision: row.revision + 1 });
          return { count: 1 };
        },
      ),
    },
    campaignDataConfirmation: {
      findFirst: vi.fn(async () => ({
        id: ids[3],
        status: "DA_XAC_NHAN",
        campaignRevision: 3,
        snapshotHash: "a".repeat(64),
      })),
    },
    campaignSection: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    surveyTask: {
      count: vi.fn(async () => 0),
      createMany: vi
        .fn<
          (args: {
            data: { studentId: string; status: string; doneDate: null }[];
          }) => Promise<{ count: number }>
        >()
        .mockResolvedValue({ count: 2 }),
    },
    campaignHistory: {
      create: vi
        .fn<(args: { data: Record<string, unknown> }) => Promise<object>>()
        .mockResolvedValue({}),
    },
    auditLog: {
      create: vi
        .fn<(args: { data: Record<string, unknown> }) => Promise<object>>()
        .mockResolvedValue({}),
    },
    user: {
      findMany: vi
        .fn<
          (args: {
            where: Record<string, unknown>;
          }) => Promise<{ id: string }[]>
        >()
        .mockResolvedValue([{ id: ids[6] }, { id: ids[7] }]),
    },
  };
  return { row, tx, client: tx as unknown as Prisma.TransactionClient };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.enqueue.mockResolvedValue({ queued: 2 });
  mocks.cohort.mockResolvedValue({
    sections: [
      {
        id: ids[4],
        code: "LHP-GIA",
        courseName: "Môn giả",
        teacherIds: [ids[2]],
        students: [
          {
            studentId: ids[5],
            status: "PENDING_ACTIVATION",
            email: "fake@example.invalid",
          },
          { studentId: ids[6], status: "DISABLED", email: "" },
        ],
      },
    ],
    pairs: [
      { sectionId: ids[4], studentId: ids[5] },
      { sectionId: ids[4], studentId: ids[6] },
    ],
    snapshotHash: "a".repeat(64),
  });
});

describe("BR-01/06/17, FR-43/44 — ensure lifecycle idempotent trong transaction", () => {
  it("không mở trước startsAt dù đã duyệt", async () => {
    const { client, tx } = fixture({
      startsAt: new Date("2030-01-03T00:00:01Z"),
    });
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      opened: false,
      closed: false,
      blocked: null,
    });
    expect(mocks.cohort).not.toHaveBeenCalled();
    expect(tx.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("không mở trước duyệt, kể cả giờ mở đã qua", async () => {
    const { client, tx } = fixture({ status: "CHO_DUYET" });
    expect((await advanceCampaignState(client, ids[0], now)).opened).toBe(
      false,
    );
    expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
  });
  it("kỳ khóa do dữ liệu legacy/direct DB thì bị chặn, không tự bỏ khóa hoặc tạo task", async () => {
    const { client, tx } = fixture({ semester: { lockedAt: now } });
    expect((await advanceCampaignState(client, ids[0], now)).blocked).toBe(
      "SEMESTER_LOCKED",
    );
    expect(tx.surveyCampaign.updateMany).not.toHaveBeenCalled();
    expect(tx.surveyTask.count).not.toHaveBeenCalled();
  });
  it("thiếu metadata phê duyệt không thể lách bằng status DA_DUYET", async () => {
    const { client, tx } = fixture({ approvedAt: null });
    expect((await advanceCampaignState(client, ids[0], now)).blocked).toBe(
      "MISSING_APPROVAL",
    );
    expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { status: "TRA_VE", campaignRevision: 3 },
    { status: "DA_XAC_NHAN", campaignRevision: 1 },
  ])(
    "không dùng xác nhận thiếu/trả về/thuộc vòng cũ %#",
    async (confirmation) => {
      const { client, tx } = fixture();
      tx.campaignDataConfirmation.findFirst.mockResolvedValue(
        confirmation as never,
      );
      expect((await advanceCampaignState(client, ids[0], now)).blocked).toBe(
        "MISSING_CONFIRMATION",
      );
      expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
    },
  );
  it("không ghi lại cohort đã có task do dữ liệu bất nhất", async () => {
    const { client, tx } = fixture();
    tx.surveyTask.count.mockResolvedValue(1);
    expect((await advanceCampaignState(client, ids[0], now)).blocked).toBe(
      "COHORT_ALREADY_EXISTS",
    );
    expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
  });
  it("chốt đúng cặp hiện tại, không loại tài khoản pending/disabled và không tạo phiếu/câu trả lời", async () => {
    const { client, tx, row } = fixture();
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      opened: true,
      closed: false,
      driftDetected: false,
    });
    const tasks = tx.surveyTask.createMany.mock.calls[0][0].data;
    expect(
      tasks.map((item: { studentId: string }) => item.studentId).sort(),
    ).toEqual([ids[5], ids[6]].sort());
    expect(
      tasks.every(
        (item: { status: string; doneDate: unknown }) =>
          item.status === "PENDING" && item.doneDate === null,
      ),
    ).toBe(true);
    expect(row).toMatchObject({
      status: "DANG_MO",
      revision: 5,
      openedSnapshotHash: "a".repeat(64),
      openedAt: now,
      dataDriftDetected: false,
    });
    expect(tx.campaignHistory.create).toHaveBeenCalledOnce();
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(tx).not.toHaveProperty("surveyResponse");
    expect(tx).not.toHaveProperty("surveyAnswer");
  });
  it("TC-PDT-03: hash lệch vẫn mở, tạo audit và thông báo PĐT/ĐBCL trong cùng transaction", async () => {
    const { client, tx } = fixture();
    tx.campaignDataConfirmation.findFirst.mockResolvedValue({
      id: ids[3],
      status: "DA_XAC_NHAN",
      campaignRevision: 3,
      snapshotHash: "b".repeat(64),
    });
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      opened: true,
      driftDetected: true,
    });
    expect(
      tx.auditLog.create.mock.calls.map((call) => call[0].data.action),
    ).toContain("CAMPAIGN_DATA_DRIFT");
    expect(mocks.enqueue).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        key: `campaign-drift:${ids[0]}:5`,
        campaignId: ids[0],
        userIds: [ids[6], ids[7]],
      }),
    );
    const recipientQuery = tx.user.findMany.mock.calls[0][0].where;
    expect(recipientQuery).toMatchObject({
      status: "ACTIVE",
      roles: {
        some: {
          role: { in: ["PHONG_DAO_TAO", "CAN_BO_DBCL"] },
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
      },
    });
  });
  it("chạy lặp sau mở không resync khi danh sách đăng ký đã đổi", async () => {
    const { client, tx } = fixture();
    await advanceCampaignState(client, ids[0], now);
    mocks.cohort.mockResolvedValue({
      sections: [],
      pairs: [],
      snapshotHash: "b".repeat(64),
    });
    expect((await advanceCampaignState(client, ids[0], now)).opened).toBe(
      false,
    );
    expect(mocks.cohort).toHaveBeenCalledOnce();
    expect(tx.surveyTask.createMany).toHaveBeenCalledOnce();
    expect(tx.campaignHistory.create).toHaveBeenCalledOnce();
  });
  it("CAS thua không tạo task, history hoặc thông báo", async () => {
    const { client, tx } = fixture();
    tx.surveyCampaign.updateMany.mockResolvedValue({ count: 0 });
    expect((await advanceCampaignState(client, ids[0], now)).opened).toBe(
      false,
    );
    expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
    expect(tx.campaignHistory.create).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("scheduler bỏ qua cả cửa sổ vẫn chốt rồi đóng đúng chuỗi, không ghi lùi thời gian; lần hai không nhân đôi", async () => {
    const { client, tx, row } = fixture({
      endsAt: new Date("2030-01-02T23:59:59Z"),
    });
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      opened: true,
      closed: true,
    });
    expect(row.status).toBe("DA_DONG");
    expect(
      tx.campaignHistory.create.mock.calls.map((call) => [
        call[0].data.fromStatus,
        call[0].data.toStatus,
      ]),
    ).toEqual([
      ["DA_DUYET", "DANG_MO"],
      ["DANG_MO", "DA_DONG"],
    ]);
    expect(
      tx.campaignHistory.create.mock.calls.every(
        (call) => call[0].data.occurredAt === now,
      ),
    ).toBe(true);
    await advanceCampaignState(client, ids[0], now);
    expect(tx.surveyTask.createMany).toHaveBeenCalledOnce();
    expect(tx.campaignHistory.create).toHaveBeenCalledTimes(2);
  });
  it("BR-04: đóng đợt sau endsAt, giữ nguyên cohort và không đọc lại sinh viên", async () => {
    const { client, tx } = fixture({
      status: "DANG_MO",
      endsAt: new Date(now.getTime() - 1),
    });
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      opened: false,
      closed: true,
    });
    expect(mocks.cohort).not.toHaveBeenCalled();
    expect(tx.surveyTask.createMany).not.toHaveBeenCalled();
    expect(tx.campaignHistory.create.mock.calls[0][0].data.action).toBe(
      "AUTO_CLOSE",
    );
  });
  it("BR-04: giữ mở tại đúng endsAt inclusive, chỉ đóng sau một millisecond", async () => {
    const { client, tx } = fixture({ status: "DANG_MO", endsAt: now });
    expect(await advanceCampaignState(client, ids[0], now)).toMatchObject({
      closed: false,
    });
    expect(tx.surveyCampaign.updateMany).not.toHaveBeenCalled();
    expect(
      await advanceCampaignState(client, ids[0], new Date(now.getTime() + 1)),
    ).toMatchObject({ closed: true });
    expect(tx.surveyCampaign.updateMany.mock.calls[0][0].where.endsAt).toEqual({
      lt: new Date(now.getTime() + 1),
    });
  });
  it("không tự tổng hợp/công bố/lưu trữ trong Tuần7", async () => {
    for (const status of [
      "DA_DONG",
      "DA_TONG_HOP",
      "DA_CONG_BO",
      "LUU_TRU",
      "HUY",
    ]) {
      const { client, tx } = fixture({ status });
      await advanceCampaignState(client, ids[0], now);
      expect(tx.surveyCampaign.updateMany).not.toHaveBeenCalled();
    }
  });
  it("đọc lần đầu xử lý đủ21đợt qua nhiều trang; legacy kỳkhóa ở trang đầu không chặn các đợt sau", async () => {
    const { tx } = fixture();
    const campaignIds: string[] = Array.from({ length: 21 }, () =>
      randomUUID(),
    ).sort();
    const rows = new Map(
      campaignIds.map((id, index) => [
        id,
        fixture({ id, semester: { lockedAt: index === 0 ? now : null } }).row,
      ]),
    );
    const findMany = vi.fn(
      async (args: {
        where: { AND: { id?: { gt: string } }[] };
        take: number;
      }) => {
        const cursor = args.where.AND.find((item) => item.id)?.id?.gt;
        return campaignIds
          .filter((id) => !cursor || id > cursor)
          .slice(0, args.take)
          .map((id) => ({ id }));
      },
    );
    Object.assign(tx.surveyCampaign, {
      findMany,
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        structuredClone(rows.get(where.id)),
      ),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) =>
        structuredClone(rows.get(where.id)),
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = rows.get(where.id)!;
          Object.assign(row, data, { revision: row.revision + 1 });
          return { count: 1 };
        },
      ),
    });
    const results = await advanceDueCampaignsInTransaction(
      tx as unknown as Prisma.TransactionClient,
      now,
      20,
    );
    expect(results).toHaveLength(21);
    expect(results.filter((item) => item.opened)).toHaveLength(20);
    expect(results[0].blocked).toBe("SEMESTER_LOCKED");
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(tx.surveyTask.createMany).toHaveBeenCalledTimes(20);
  });
  it("query đến hạn gồm cả đợt duyệt đã qua toàn bộ cửa sổ, không bỏ sót do startsAt quá khứ", () => {
    expect(dueCampaignWhere(now)).toEqual({
      OR: [
        { status: "DA_DUYET", startsAt: { lte: now } },
        { status: "DANG_MO", endsAt: { lt: now } },
      ],
    });
  });
  it("helper scheduler không nhận actor console giả hoặc giới hạn batch vượt mức", async () => {
    await expect(ensureCampaignState(null, ids[0])).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      ensureDueCampaigns(
        { kind: "SERVER_CONSOLE", reason: "Lý do console giả hợp lệ" },
        { limit: 101 },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
