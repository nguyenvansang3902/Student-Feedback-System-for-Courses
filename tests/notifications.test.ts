import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    emailOutbox: { findMany: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  fresh: vi.fn(),
  access: vi.fn(),
  recipient: vi.fn(),
  send: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/lib/mail", () => ({ sendCampaignMail: mocks.send }));
vi.mock("../src/server/services/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/services/access")>()),
  assertFreshActor: mocks.fresh,
}));
vi.mock("../src/server/services/notification-access", () => ({
  canReadNoticeTarget: mocks.access,
  noticeRecipientActor: mocks.recipient,
  notificationTargetHref: (type: string, id: string) => `/${type}/${id}`,
}));
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processDomainMailOutbox,
} from "../src/server/services/notifications";
const actor: AuthActor = {
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "FAKE",
  displayName: "Tài khoản giả",
  email: "fixture@example.invalid",
  roles: ["SINH_VIEN"],
  assignments: [
    {
      role: "SINH_VIEN",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
  ],
  purpose: "FULL",
  mfa: false,
  mustChangePassword: false,
};
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử gửi thông báo bằng dữ liệu giả",
};
const notice = (read = false) => ({
  id: randomUUID(),
  userId: actor.userId,
  title: "Có cập nhật",
  body: "Mở hệ thống để xem theo quyền truy cập",
  targetType: "Feedback",
  targetId: randomUUID(),
  createdAt: new Date(),
  readAt: read ? new Date() : null,
});
let inside = false;
beforeEach(() => {
  vi.resetAllMocks();
  inside = false;
  mocks.db.$transaction.mockImplementation(async (fn) => {
    inside = true;
    try {
      return await fn(mocks.db);
    } finally {
      inside = false;
    }
  });
  mocks.db.$executeRaw.mockResolvedValue(1);
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.fresh.mockResolvedValue(actor);
  mocks.access.mockResolvedValue(true);
  mocks.recipient.mockResolvedValue(actor);
  mocks.db.notification.findMany.mockResolvedValue([]);
  mocks.db.notification.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.emailOutbox.findMany.mockResolvedValue([]);
  mocks.db.emailOutbox.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.send.mockResolvedValue(undefined);
});
describe("FR-80, BR-18/24/34/62 — hộp thông báo riêng theo người dùng", () => {
  it("lọc quyền trước khi đếm, phân trang hoặc tính chưa đọc", async () => {
    const first = notice(),
      privateRow = notice(),
      third = notice(true);
    mocks.db.notification.findMany.mockResolvedValue([
      first,
      privateRow,
      third,
    ]);
    mocks.access.mockImplementation(
      async (_tx, _actor, _type, id) => id !== privateRow.targetId,
    );
    const result = await listNotifications(actor, { page: 2, pageSize: 1 });
    expect(result).toMatchObject({
      total: 2,
      unreadCount: 1,
      items: [{ id: third.id }],
    });
    expect(JSON.stringify(result)).not.toContain(privateRow.id);
    expect(mocks.db.notification.findMany.mock.calls[0][0].where).toEqual({
      userId: actor.userId,
    });
  });
  it("bộ lọc chưa đọc tính tổng đúng trên các mục còn quyền", async () => {
    mocks.db.notification.findMany.mockResolvedValue([notice(), notice(true)]);
    expect(
      await listNotifications(actor, { unreadOnly: "true" }),
    ).toMatchObject({ total: 1, unreadCount: 1, items: [{ readAt: null }] });
  });
  it("kiểm lại phiên/quyền trước khi đọc các thông báo", async () => {
    mocks.fresh.mockRejectedValue(new Error("Phiên đã thu hồi"));
    await expect(listNotifications(actor)).rejects.toThrow("Phiên đã thu hồi");
    expect(mocks.db.notification.findMany).not.toHaveBeenCalled();
  });
  it("không nhận userId để đọc hộp thông báo người khác", async () => {
    await expect(
      listNotifications(actor, { userId: randomUUID() }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("đánh dấu mục không thuộc người dùng trả cùng lỗi không tìm thấy", async () => {
    mocks.db.notification.findFirst.mockResolvedValue(null);
    await expect(
      markNotificationRead(actor, { id: randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.notification.updateMany).not.toHaveBeenCalled();
  });
  it("thu hồi quyền tài nguyên cũng chặn đánh dấu đã đọc", async () => {
    mocks.db.notification.findFirst.mockResolvedValue(notice());
    mocks.access.mockResolvedValue(false);
    await expect(
      markNotificationRead(actor, { id: randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.notification.updateMany).not.toHaveBeenCalled();
  });
  it("đọc lại cùng mục không đổi thời điểm đã đọc", async () => {
    const row = notice(true);
    mocks.db.notification.findFirst.mockResolvedValue(row);
    mocks.db.notification.updateMany.mockResolvedValue({ count: 0 });
    expect(await markNotificationRead(actor, { id: row.id })).toEqual({
      changed: 0,
    });
    expect(
      mocks.db.notification.updateMany.mock.calls[0][0].where,
    ).toMatchObject({ userId: actor.userId, readAt: null });
  });
  it("đọc tất cả chỉ cập nhật những thông báo còn quyền và chưa đọc", async () => {
    const a = notice(),
      b = notice(),
      c = notice(true);
    mocks.db.notification.findMany.mockResolvedValue([a, b, c]);
    mocks.access.mockImplementation(
      async (_tx, _actor, _type, id) => id !== b.targetId,
    );
    await markAllNotificationsRead(actor, {});
    expect(mocks.db.notification.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: [a.id] },
      userId: actor.userId,
      readAt: null,
    });
  });
  it("từ chối phiên thiếu MFA/đăng nhập trước khi gọi transaction", async () => {
    await expect(
      listNotifications({ ...actor, purpose: "MFA_VERIFY" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});
describe("FR-81, BR-30/61/62 — email nghiệp vụ có lease và kiểm quyền lại", () => {
  function row() {
    return {
      id: randomUUID(),
      status: "PENDING",
      attempts: 0,
      leaseToken: null,
      leaseUntil: null,
      notification: {
        ...notice(),
        title: "NỘI_DUNG_KHÔNG_GỬI_QUA_EMAIL",
        body: "DANH_TÍNH_KHÔNG_GỬI_QUA_EMAIL",
      },
    };
  }
  it("worker yêu cầu actor console và giới hạn lô", async () => {
    await expect(processDomainMailOutbox(null)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      processDomainMailOutbox(consoleActor, { limit: 51 }),
    ).rejects.toThrow();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("SMTP nằm ngoài transaction và không chứa nội dung thông báo", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.send.mockImplementation(async () => {
      expect(inside).toBe(false);
    });
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      claimed: 1,
      sent: 1,
    });
    const sent = JSON.stringify(mocks.send.mock.calls);
    expect(sent).not.toContain("KHÔNG_GỬI_QUA_EMAIL");
    expect(mocks.recipient).toHaveBeenCalled();
    expect(mocks.access).toHaveBeenCalled();
  });
  it("không gửi khi mất quyền hồ sơ dù outbox đã được xếp trước đó", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.access.mockResolvedValue(false);
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      sent: 0,
      suppressed: 1,
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(
      mocks.db.emailOutbox.updateMany.mock.calls.at(-1)?.[0].data,
    ).toMatchObject({ status: "FAILED", attempts: 5 });
  });
  it("không gửi cho người nhận bị vô hiệu hóa", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.recipient.mockResolvedValue(null);
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      suppressed: 1,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("mất lease khi claim không gửi email", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.db.emailOutbox.updateMany.mockResolvedValue({ count: 0 });
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      claimed: 0,
      sent: 0,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("mất lease trước SMTP không gửi email", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.db.emailOutbox.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      lostLease: 1,
      sent: 0,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("SMTP lỗi chỉ lên lịch thử lại và không lưu lỗi chứa bí mật", async () => {
    mocks.db.emailOutbox.findMany.mockResolvedValue([row()]);
    mocks.send.mockRejectedValue(new Error("SMTP_PASSWORD_RIENG"));
    expect(await processDomainMailOutbox(consoleActor)).toMatchObject({
      failed: 1,
      sent: 0,
    });
    expect(JSON.stringify(mocks.db.auditLog.create.mock.calls)).not.toContain(
      "SMTP_PASSWORD_RIENG",
    );
    expect(
      mocks.db.emailOutbox.updateMany.mock.calls.at(-1)?.[0].data,
    ).toMatchObject({
      status: "FAILED",
      leaseToken: null,
      nextAttemptAt: expect.any(Date),
    });
  });
});
