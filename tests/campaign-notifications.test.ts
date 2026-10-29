import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    emailOutbox: { updateMany: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
  send: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/lib/mail", () => ({ sendCampaignMail: mocks.send }));
import {
  enqueueCampaignNotice,
  processCampaignMailOutbox,
} from "../src/server/services/campaign-notifications";

const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử hàng đợi thư bằng dữ liệu giả",
};
const campaignId = randomUUID();
const now = new Date("2030-01-02T03:04:05Z");
let insideTransaction: boolean;
function outboxRow(extra: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    status: "PENDING",
    attempts: 0,
    leaseToken: null,
    leaseUntil: null,
    notification: {
      title: "Đợt giả được gia hạn",
      body: "Nội dung thông báo giả",
      user: {
        id: randomUUID(),
        email: "student@fixture.invalid",
        status: "ACTIVE",
      },
    },
    ...extra,
  };
}
function queueTransaction() {
  const notificationIds = new Set<string>();
  const keys = new Set<string>();
  const tx = {
    user: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id: string) => ({ id })),
      ),
    },
    notification: {
      createMany: vi.fn(
        async ({
          data,
        }: {
          data: { id: string; targetType: string; targetId: string }[];
          skipDuplicates: boolean;
        }) => {
          let count = 0;
          for (const row of data) {
            if (!notificationIds.has(row.id)) count++;
            notificationIds.add(row.id);
          }
          return { count };
        },
      ),
    },
    emailOutbox: {
      createMany: vi.fn(
        async ({
          data,
        }: {
          data: { idempotencyKey: string }[];
          skipDuplicates: boolean;
        }) => {
          let count = 0;
          for (const row of data) {
            if (!keys.has(row.idempotencyKey)) count++;
            keys.add(row.idempotencyKey);
          }
          return { count };
        },
      ),
    },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.useRealTimers();
  insideTransaction = false;
  mocks.db.$transaction.mockImplementation(async (fn) => {
    insideTransaction = true;
    try {
      return await fn(mocks.db);
    } finally {
      insideTransaction = false;
    }
  });
  mocks.db.$executeRaw.mockResolvedValue(1);
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.db.emailOutbox.findMany.mockResolvedValue([]);
  mocks.db.emailOutbox.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.send.mockResolvedValue(undefined);
});

describe("FR-45/144, BR-53 — thông báo đợt với queue bền", () => {
  it("đối tượng rỗng không đọc DB hoặc gửi SMTP", async () => {
    const { tx, client } = queueTransaction();
    expect(
      await enqueueCampaignNotice(client, {
        key: `campaign-drift:${campaignId}:5`,
        campaignId,
        title: "Dữ liệu thay đổi",
        body: "Cần kiểm tra dữ liệu",
        userIds: [],
      }),
    ).toEqual({ queued: 0 });
    expect(tx.user.findMany).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
    expect(tx.emailOutbox.createMany).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("trùng SV/sự kiện không nhân đôi thông báo và outbox; sự kiện mới độc lập", async () => {
    const { tx, client } = queueTransaction();
    const users = [randomUUID(), randomUUID()];
    const input = {
      key: `campaign-extend:${campaignId}:6`,
      campaignId,
      title: "Gia hạn đợt giả",
      body: "Thời gian đã được gia hạn",
      userIds: [users[1], users[0], users[1]],
    };
    expect(await enqueueCampaignNotice(client, input)).toEqual({ queued: 2 });
    expect(await enqueueCampaignNotice(client, input)).toEqual({ queued: 0 });
    expect(tx.user.findMany.mock.calls[0][0].where.id.in).toEqual(
      [...users].sort(),
    );
    const first = tx.notification.createMany.mock.calls[0][0];
    const repeated = tx.notification.createMany.mock.calls[1][0];
    expect(first.skipDuplicates).toBe(true);
    expect(first.data.map((row) => row.id)).toEqual(
      repeated.data.map((row) => row.id),
    );
    expect(
      first.data.every(
        (row) =>
          row.targetType === "SurveyCampaign" && row.targetId === campaignId,
      ),
    ).toBe(true);
    expect(tx.emailOutbox.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
    expect(
      await enqueueCampaignNotice(client, {
        ...input,
        key: `campaign-extend:${campaignId}:7`,
      }),
    ).toEqual({ queued: 2 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("chia lô 250 người, chỉ xếp người dùng còn tồn tại", async () => {
    const { tx, client } = queueTransaction();
    const userIds = Array.from({ length: 501 }, () => randomUUID());
    tx.user.findMany.mockImplementation(async ({ where }) =>
      where.id.in.slice(0, -1).map((id: string) => ({ id })),
    );
    expect(
      await enqueueCampaignNotice(client, {
        key: "event",
        campaignId,
        title: "Thông báo giả",
        body: "Thông báo giả",
        userIds,
      }),
    ).toEqual({ queued: 498 });
    expect(
      tx.user.findMany.mock.calls.map((call) => call[0].where.id.in.length),
    ).toEqual([250, 250, 1]);
  });
  it.each([
    { key: "bad key" },
    { campaignId: "invalid" },
    { title: " " },
    { body: "x".repeat(10001) },
    { userIds: ["invalid"] },
  ])("payload không hợp lệ bị chặn trước truy cập DB %#", async (extra) => {
    const { tx, client } = queueTransaction();
    await expect(
      enqueueCampaignNotice(client, {
        key: "event",
        campaignId,
        title: "Thông báo giả",
        body: "Thông báo giả",
        userIds: [],
        ...extra,
      }),
    ).rejects.toThrow();
    expect(tx.user.findMany).not.toHaveBeenCalled();
  });
  it("worker cần actor console hợp lệ và giới hạn lô", async () => {
    await expect(processCampaignMailOutbox(null)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      processCampaignMailOutbox({ ...consoleActor, reason: "ngắn" }),
    ).rejects.toMatchObject({ status: 403 });
    for (const limit of [0, 51, 1.5])
      await expect(
        processCampaignMailOutbox(consoleActor, { limit }),
      ).rejects.toThrow();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("claim sau mutex, đúng loại SurveyCampaign và thu hồi lease hết lần thử cuối", async () => {
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      lostLease: 0,
    });
    const cleanup = mocks.db.emailOutbox.updateMany.mock.calls[0][0];
    expect(cleanup).toMatchObject({
      where: {
        notification: { targetType: "SurveyCampaign" },
        status: "PROCESSING",
        attempts: { gte: 5 },
        leaseUntil: { lte: expect.any(Date) },
      },
      data: { status: "FAILED", leaseToken: null, leaseUntil: null },
    });
    const query = mocks.db.emailOutbox.findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      where: {
        notification: { targetType: "SurveyCampaign" },
        attempts: { lt: 5 },
      },
      take: 10,
    });
    expect(query.where.OR).toHaveLength(2);
    expect(mocks.db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.db.emailOutbox.findMany.mock.invocationCallOrder[0],
    );
    expect(mocks.db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.db.emailOutbox.findMany.mock.invocationCallOrder[0],
    );
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("CAS claim thua không gửi thư hay kết thúc lease của worker khác", async () => {
    const row = outboxRow();
    mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
    mocks.db.emailOutbox.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      lostLease: 0,
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.db.emailOutbox.updateMany.mock.calls[1][0].where).toEqual({
      id: row.id,
      status: row.status,
      attempts: row.attempts,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
    });
    expect(mocks.db.emailOutbox.updateMany).toHaveBeenCalledTimes(2);
  });
  it("SMTP chỉ chạy sau transaction; finalize dùng đúng lease và audit chỉ chứa số lượng", async () => {
    const row = outboxRow();
    mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
    mocks.send.mockImplementation(async () => {
      expect(insideTransaction).toBe(false);
    });
    expect(await processCampaignMailOutbox(consoleActor, { limit: 1 })).toEqual(
      { claimed: 1, sent: 1, failed: 0, lostLease: 0 },
    );
    const claim = mocks.db.emailOutbox.updateMany.mock.calls[1][0];
    expect(claim.data).toMatchObject({
      status: "PROCESSING",
      attempts: { increment: 1 },
      leaseToken: expect.any(String),
      leaseUntil: expect.any(Date),
    });
    const renew = mocks.db.emailOutbox.updateMany.mock.calls[2][0];
    expect(renew).toEqual({
      where: {
        id: row.id,
        status: "PROCESSING",
        leaseToken: claim.data.leaseToken,
      },
      data: { leaseUntil: expect.any(Date) },
    });
    expect(
      mocks.db.emailOutbox.updateMany.mock.invocationCallOrder[2],
    ).toBeLessThan(mocks.send.mock.invocationCallOrder[0]);
    const finish = mocks.db.emailOutbox.updateMany.mock.calls[3][0];
    expect(finish.where).toEqual({
      id: row.id,
      status: "PROCESSING",
      leaseToken: claim.data.leaseToken,
    });
    expect(finish.data).toMatchObject({
      status: "SENT",
      leaseToken: null,
      leaseUntil: null,
      sentAt: expect.any(Date),
    });
    expect(mocks.send).toHaveBeenCalledWith({
      to: row.notification.user.email,
      title: row.notification.title,
      body: row.notification.body,
    });
    const audit = mocks.db.auditLog.create.mock.calls[0][0];
    expect(audit.data.redactedSummary).toEqual({
      console: true,
      recipients: 1,
      sent: 1,
      failed: 0,
    });
    expect(JSON.stringify(audit)).not.toContain(row.notification.user.email);
    expect(JSON.stringify(audit)).not.toContain(row.notification.body);
  });
  it("SMTP lỗi không log địa chỉ/bí mật; retry theo backoff từ attempt đã lưu", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const row = outboxRow({ status: "FAILED", attempts: 2 });
    mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
    mocks.send.mockRejectedValue(
      new Error("SMTP secret student@fixture.invalid password=private"),
    );
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const log = vi.spyOn(console, "log");
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 1,
      sent: 0,
      failed: 1,
      lostLease: 0,
    });
    const finish = mocks.db.emailOutbox.updateMany.mock.calls[3][0].data;
    expect(finish).toMatchObject({
      status: "FAILED",
      nextAttemptAt: new Date(now.getTime() + 120000),
      leaseToken: null,
      leaseUntil: null,
    });
    expect(finish).not.toHaveProperty("sentAt");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it.each(["disabled", "invalid-email"])(
    "%s không gửi SMTP, kết thúc retry vĩnh viễn",
    async (kind) => {
      const row = outboxRow();
      if (kind === "disabled") row.notification.user.status = "DISABLED";
      else row.notification.user.email = "invalid";
      mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
      expect(await processCampaignMailOutbox(consoleActor)).toEqual({
        claimed: 1,
        sent: 0,
        failed: 1,
        lostLease: 0,
      });
      expect(mocks.send).not.toHaveBeenCalled();
      expect(
        mocks.db.emailOutbox.updateMany.mock.calls[3][0].data,
      ).toMatchObject({ status: "FAILED", attempts: 5 });
    },
  );
  it("SV chờ kích hoạt vẫn nhận thư ở địa chỉ hợp lệ", async () => {
    const row = outboxRow();
    row.notification.user.status = "PENDING_ACTIVATION";
    mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
    expect((await processCampaignMailOutbox(consoleActor)).sent).toBe(1);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it("lease bị mất sau SMTP không ghi nhận SENT hoặc nhận thành công giả", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([outboxRow()]);
    mocks.db.emailOutbox.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 1,
      sent: 0,
      failed: 0,
      lostLease: 1,
    });
    expect(
      mocks.db.auditLog.create.mock.calls[0][0].data.redactedSummary.sent,
    ).toBe(0);
  });
  it("tối đa năm SMTP đồng thời trong lô lớn", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue(
      Array.from({ length: 12 }, () => outboxRow()),
    );
    let concurrent = 0,
      maxConcurrent = 0;
    mocks.send.mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Promise.resolve();
      concurrent--;
    });
    expect(
      (await processCampaignMailOutbox(consoleActor, { limit: 12 })).sent,
    ).toBe(12);
    expect(maxConcurrent).toBe(5);
  });
  it("lease mất trước SMTP thì bỏ qua, không gửi trùng hoặc finalize lease của worker khác", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([outboxRow()]);
    mocks.db.emailOutbox.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 1,
      sent: 0,
      failed: 0,
      lostLease: 1,
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.db.emailOutbox.updateMany).toHaveBeenCalledTimes(3);
  });
  it("lô sau chờ quá60giây phải gia hạn lease trước khi gửi, không dùng expiry lúc claim", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const rows = Array.from({ length: 6 }, () => outboxRow());
    mocks.db.emailOutbox.findMany.mockResolvedValue(rows);
    let sends = 0;
    mocks.send.mockImplementation(async () => {
      sends++;
      if (sends === 5) vi.setSystemTime(new Date(now.getTime() + 61000));
    });
    expect(await processCampaignMailOutbox(consoleActor, { limit: 6 })).toEqual(
      { claimed: 6, sent: 6, failed: 0, lostLease: 0 },
    );
    const last = rows[5];
    const claim = mocks.db.emailOutbox.updateMany.mock.calls.find(
      ([args]) =>
        args.where.id === last.id && args.data.status === "PROCESSING",
    )![0];
    const renewalIndex = mocks.db.emailOutbox.updateMany.mock.calls.findIndex(
      ([args]) =>
        args.where.id === last.id &&
        args.data.status === undefined &&
        args.data.leaseUntil instanceof Date,
    );
    const renewal = mocks.db.emailOutbox.updateMany.mock.calls[renewalIndex][0];
    expect(claim.data.leaseUntil).toEqual(new Date(now.getTime() + 60000));
    expect(renewal.data.leaseUntil).toEqual(new Date(now.getTime() + 121000));
    expect(
      mocks.db.emailOutbox.updateMany.mock.invocationCallOrder[renewalIndex],
    ).toBeLessThan(mocks.send.mock.invocationCallOrder[5]);
    vi.useRealTimers();
  });
  it("lô sau hết lease và đã bị worker khác nhận thì worker cũ không gửi hàng đó", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const rows = Array.from({ length: 6 }, () => outboxRow());
    mocks.db.emailOutbox.findMany.mockResolvedValue(rows);
    mocks.db.emailOutbox.updateMany.mockImplementation(
      async ({ where, data }) => ({
        count:
          where.id === rows[5].id &&
          data.status === undefined &&
          Date.now() > now.getTime() + 60000
            ? 0
            : 1,
      }),
    );
    let sends = 0;
    mocks.send.mockImplementation(async () => {
      sends++;
      if (sends === 5) vi.setSystemTime(new Date(now.getTime() + 61000));
    });
    expect(await processCampaignMailOutbox(consoleActor, { limit: 6 })).toEqual(
      { claimed: 6, sent: 5, failed: 0, lostLease: 1 },
    );
    expect(mocks.send).toHaveBeenCalledTimes(5);
    expect(
      mocks.db.emailOutbox.updateMany.mock.calls.filter(
        ([args]) => args.where.id === rows[5].id && args.data.status === "SENT",
      ),
    ).toHaveLength(0);
    vi.useRealTimers();
  });
  it("CAS claim so cả expiry: không giành hàng vừa được chủ cũ renew sau SELECT", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const oldExpiry = new Date(now.getTime() - 1);
    const row = outboxRow({
      status: "PROCESSING",
      attempts: 2,
      leaseToken: randomUUID(),
      leaseUntil: oldExpiry,
    });
    const renewedExpiry = new Date(now.getTime() + 60000);
    mocks.db.emailOutbox.findMany.mockResolvedValue([row]);
    mocks.db.emailOutbox.updateMany.mockImplementation(
      async ({ where, data }) => {
        if (data.status === "PROCESSING")
          return {
            count:
              where.leaseUntil?.getTime() === renewedExpiry.getTime() ? 1 : 0,
          };
        return { count: 0 };
      },
    );
    expect(await processCampaignMailOutbox(consoleActor)).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      lostLease: 0,
    });
    expect(
      mocks.db.emailOutbox.updateMany.mock.calls[1][0].where.leaseUntil,
    ).toBe(oldExpiry);
    expect(mocks.send).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
