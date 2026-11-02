import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { sendCampaignMail } from "../../lib/mail";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import {
  assertFreshActor,
  lockAdminMutations,
  pageInput,
  parseInput,
} from "./access";
import { domainNoticeTargets } from "./domain-notifications";
import {
  canReadNoticeTarget,
  noticeRecipientActor,
  notificationTargetHref,
} from "./notification-access";

export const notificationListSchema = pageInput
  .extend({
    unreadOnly: z.enum(["true", "false"]).default("false"),
  })
  .strict();
export const notificationReadSchema = z.object({ id: z.uuid() }).strict();
export const notificationReadAllSchema = z.object({}).strict();
export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
}
export interface NotificationList {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
type Notice = Prisma.NotificationGetPayload<Record<string, never>>;

async function visibleNotices(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
): Promise<Notice[]> {
  const rows = await tx.notification.findMany({
    where: { userId: actor.userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const access = new Map<string, boolean>();
  const visible: Notice[] = [];
  for (const row of rows) {
    const key = `${row.targetType}:${row.targetId}`;
    if (!access.has(key))
      access.set(
        key,
        await canReadNoticeTarget(tx, actor, row.targetType, row.targetId),
      );
    if (access.get(key)) visible.push(row);
  }
  return visible;
}
export async function listNotifications(
  actor: AuthActor,
  input: unknown = {},
): Promise<NotificationList> {
  requireCan(actor, "notifications:list");
  const data = parseInput(notificationListSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "notifications:list");
      const visible = await visibleNotices(tx, fresh);
      const unreadCount = visible.filter((row) => !row.readAt).length;
      const filtered =
        data.unreadOnly === "true"
          ? visible.filter((row) => !row.readAt)
          : visible;
      return {
        items: filtered
          .slice((data.page - 1) * data.pageSize, data.page * data.pageSize)
          .map((row) => ({
            id: row.id,
            title: row.title,
            body: row.body,
            createdAt: row.createdAt.toISOString(),
            readAt: row.readAt?.toISOString() ?? null,
            href: notificationTargetHref(row.targetType, row.targetId),
          })),
        total: filtered.length,
        unreadCount,
        page: data.page,
        pageSize: data.pageSize,
      };
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
export async function markNotificationRead(
  actor: AuthActor,
  input: unknown,
): Promise<{ changed: number }> {
  requireCan(actor, "notifications:mutate");
  const data = parseInput(notificationReadSchema, input);
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "notifications:mutate");
    const row = await tx.notification.findFirst({
      where: { id: data.id, userId: fresh.userId },
    });
    if (
      !row ||
      !(await canReadNoticeTarget(tx, fresh, row.targetType, row.targetId))
    )
      throw new AuthError("Không tìm thấy thông báo.", 404, "NOT_FOUND");
    const result = await tx.notification.updateMany({
      where: { id: row.id, userId: fresh.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { changed: result.count };
  });
}
export async function markAllNotificationsRead(
  actor: AuthActor,
  input: unknown = {},
): Promise<{ changed: number }> {
  requireCan(actor, "notifications:mutate");
  parseInput(notificationReadAllSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "notifications:mutate");
      const ids = (await visibleNotices(tx, fresh))
        .filter((row) => !row.readAt)
        .map((row) => row.id);
      let changed = 0;
      for (let offset = 0; offset < ids.length; offset += 250)
        changed += (
          await tx.notification.updateMany({
            where: {
              id: { in: ids.slice(offset, offset + 250) },
              userId: fresh.userId,
              readAt: null,
            },
            data: { readAt: new Date() },
          })
        ).count;
      return { changed };
    },
    { maxWait: 15000, timeout: 30000 },
  );
}

const MAX_ATTEMPTS = 5;
const batchSchema = z
  .object({ limit: z.number().int().min(1).max(50).default(10) })
  .strict();
/** Email nghiệp vụ chỉ báo có cập nhật, không gửi nội dung hồ sơ, kết luận hay danh tính. */
export async function processDomainMailOutbox(
  actor: ServerConsoleActor | null,
  input: { limit?: number } = {},
) {
  authorizeConsole(actor);
  const { limit } = batchSchema.parse(input),
    db = getDb();
  const claimed = await db.$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const now = new Date();
    await tx.emailOutbox.updateMany({
      where: {
        notification: { targetType: { in: [...domainNoticeTargets] } },
        status: "PROCESSING",
        leaseUntil: { lte: now },
        attempts: { gte: MAX_ATTEMPTS },
      },
      data: { status: "FAILED", leaseToken: null, leaseUntil: null },
    });
    const rows = await tx.emailOutbox.findMany({
      where: {
        notification: { targetType: { in: [...domainNoticeTargets] } },
        attempts: { lt: MAX_ATTEMPTS },
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          { status: "PROCESSING", leaseUntil: { lte: now } },
        ],
      },
      include: { notification: true },
      orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
      take: limit,
    });
    const leases: { row: (typeof rows)[number]; token: string }[] = [];
    for (const row of rows) {
      const token = randomUUID();
      const changed = await tx.emailOutbox.updateMany({
        where: {
          id: row.id,
          status: row.status,
          attempts: row.attempts,
          leaseToken: row.leaseToken,
          leaseUntil: row.leaseUntil,
        },
        data: {
          status: "PROCESSING",
          leaseToken: token,
          leaseUntil: new Date(now.getTime() + 60000),
          attempts: { increment: 1 },
        },
      });
      if (changed.count === 1) leases.push({ row, token });
    }
    return leases;
  });
  let sent = 0,
    failed = 0,
    suppressed = 0,
    lostLease = 0;
  for (let offset = 0; offset < claimed.length; offset += 5) {
    await Promise.all(
      claimed.slice(offset, offset + 5).map(async ({ row, token }) => {
        const recipient = await db.$transaction(async (tx) => {
          await lockAdminMutations(tx);
          const fresh = await noticeRecipientActor(tx, row.notification.userId);
          return fresh &&
            (await canReadNoticeTarget(
              tx,
              fresh,
              row.notification.targetType,
              row.notification.targetId,
            ))
            ? fresh
            : null;
        });
        const valid =
          !!recipient && z.email().safeParse(recipient.email).success;
        const renewed = await db.emailOutbox.updateMany({
          where: { id: row.id, status: "PROCESSING", leaseToken: token },
          data: { leaseUntil: new Date(Date.now() + 60000) },
        });
        if (renewed.count !== 1) {
          lostLease++;
          return;
        }
        let success = false;
        if (valid)
          try {
            await sendCampaignMail({
              to: recipient.email,
              title: "Thông báo từ hệ thống khảo sát và phản hồi môn học",
              body: "Có cập nhật trong hệ thống khảo sát và phản hồi môn học. Đăng nhập và mở mục Thông báo để xem thông tin theo quyền truy cập.",
            });
            success = true;
          } catch {
            /* Không log ngoại lệ SMTP có thể chứa địa chỉ hoặc thông tin kết nối. */
          }
        const completed = await db.emailOutbox.updateMany({
          where: { id: row.id, status: "PROCESSING", leaseToken: token },
          data: {
            status: success ? "SENT" : "FAILED",
            leaseToken: null,
            leaseUntil: null,
            ...(success
              ? { sentAt: new Date() }
              : {
                  nextAttemptAt: new Date(
                    Date.now() + Math.min(3600000, 30000 * 2 ** row.attempts),
                  ),
                  ...(!valid ? { attempts: MAX_ATTEMPTS } : {}),
                }),
          },
        });
        if (completed.count !== 1) lostLease++;
        else if (success) sent++;
        else if (!valid) suppressed++;
        else failed++;
      }),
    );
  }
  if (claimed.length)
    await db.auditLog.create({
      data: {
        action: "DOMAIN_EMAIL_DISPATCH",
        objectType: "EmailOutbox",
        redactedSummary: {
          console: true,
          recipients: claimed.length,
          sent,
          failed,
          suppressed,
          lostLease,
        },
      },
    });
  return { claimed: claimed.length, sent, failed, suppressed, lostLease };
}
