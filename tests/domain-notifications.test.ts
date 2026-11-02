import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  enqueueDomainNotice,
  stableDomainNoticeId,
} from "../src/server/services/domain-notifications";

function fixture() {
  const noticeIds = new Set<string>(),
    outboxKeys = new Set<string>();
  const tx = {
    user: {
      findMany: vi.fn(async (input: { where: { id: { in: string[] } } }) =>
        input.where.id.in.map((id) => ({ id })),
      ),
    },
    notification: {
      createMany: vi.fn(async ({ data }: { data: { id: string }[] }) => {
        let count = 0;
        for (const row of data) {
          if (!noticeIds.has(row.id)) count++;
          noticeIds.add(row.id);
        }
        return { count };
      }),
    },
    emailOutbox: {
      createMany: vi.fn(
        async ({ data }: { data: { idempotencyKey: string }[] }) => {
          let count = 0;
          for (const row of data) {
            if (!outboxKeys.has(row.idempotencyKey)) count++;
            outboxKeys.add(row.idempotencyKey);
          }
          return { count };
        },
      ),
    },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}
const payload = () => ({
  key: `feedback-created:${randomUUID()}`,
  targetType: "Feedback" as const,
  targetId: randomUUID(),
  title: "Phản hồi có cập nhật",
  body: "Mở phản hồi để xem thông tin theo quyền truy cập.",
  userIds: [randomUUID(), randomUUID()],
});
describe("FR-80/81, BR-23/30 — hàng đợi thông báo nghiệp vụ", () => {
  it("cùng sự kiện/người nhận chỉ có một thông báo và một thư dù được gọi lại", async () => {
    const { tx, client } = fixture(),
      input = payload();
    input.userIds.push(input.userIds[0]);
    expect(await enqueueDomainNotice(client, input)).toEqual({ queued: 2 });
    expect(await enqueueDomainNotice(client, input)).toEqual({ queued: 0 });
    expect(
      tx.notification.createMany.mock.calls[0][0].data.map((r) => r.id),
    ).toEqual(
      tx.notification.createMany.mock.calls[1][0].data.map((r) => r.id),
    );
    const serialized = JSON.stringify(tx.emailOutbox.createMany.mock.calls);
    expect(serialized).not.toContain(input.body);
  });
  it("danh sách rỗng không đọc hoặc ghi DB", async () => {
    const { tx, client } = fixture();
    expect(
      await enqueueDomainNotice(client, { ...payload(), userIds: [] }),
    ).toEqual({ queued: 0 });
    expect(tx.user.findMany).not.toHaveBeenCalled();
  });
  it("cùng key/người nhận ở hai tài nguyên vẫn giữ đủ thông báo và outbox", async () => {
    const { tx, client } = fixture();
    const input = { ...payload(), key: randomUUID(), userIds: [randomUUID()] };
    const second = { ...input, targetId: randomUUID() };
    const anotherType = { ...input, targetType: "InspectionCase" as const };
    for (const event of [input, second, anotherType]) {
      expect(await enqueueDomainNotice(client, event)).toEqual({ queued: 1 });
      expect(await enqueueDomainNotice(client, event)).toEqual({ queued: 0 });
    }
    expect(
      new Set(
        tx.notification.createMany.mock.calls.flatMap(([call]) =>
          call.data.map((row) => row.id),
        ),
      ).size,
    ).toBe(3);
    expect(
      new Set(
        tx.emailOutbox.createMany.mock.calls.flatMap(([call]) =>
          call.data.map((row) => row.idempotencyKey),
        ),
      ).size,
    ).toBe(3);
  });
  it("khóa outbox được băm nên luôn nằm trong giới hạn 160 ký tự", async () => {
    const { tx, client } = fixture();
    await enqueueDomainNotice(client, { ...payload(), key: "x".repeat(110) });
    for (const { idempotencyKey } of tx.emailOutbox.createMany.mock.calls[0][0]
      .data) {
      expect(idempotencyKey).toMatch(/^domain:[0-9a-f]{64}$/);
      expect(idempotencyKey.length).toBeLessThanOrEqual(160);
    }
  });
  it("chỉ xét người nhận active và chia lô 250", async () => {
    const { tx, client } = fixture();
    await enqueueDomainNotice(client, {
      ...payload(),
      userIds: Array.from({ length: 501 }, () => randomUUID()),
    });
    expect(
      tx.user.findMany.mock.calls.map(([input]) => input.where.id.in.length),
    ).toEqual([250, 250, 1]);
    for (const [input] of tx.user.findMany.mock.calls)
      expect(input.where).toMatchObject({ status: "ACTIVE" });
  });
  it("ID ổn định, đúng định dạng UUID và không trùng giữa sự kiện", () => {
    const key = randomUUID();
    expect(stableDomainNoticeId(key)).toBe(stableDomainNoticeId(key));
    expect(stableDomainNoticeId(key)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(stableDomainNoticeId(key)).not.toBe(stableDomainNoticeId(key + "2"));
  });
  it.each([
    { key: "key invalid" },
    { targetType: "User" },
    { targetId: "invalid" },
    { userIds: ["invalid"] },
    { title: " " },
    { body: " " },
    { body: "x".repeat(10001) },
  ])("chặn đầu vào không hợp lệ trước khi ghi %#", async (extra) => {
    const { tx, client } = fixture();
    await expect(
      enqueueDomainNotice(client, { ...payload(), ...extra } as Parameters<
        typeof enqueueDomainNotice
      >[1]),
    ).rejects.toThrow();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});
