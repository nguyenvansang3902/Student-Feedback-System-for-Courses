import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { sendCampaignMail } from "../../lib/mail";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { lockAdminMutations } from "./access";

const MAX_ATTEMPTS = 5;
const queueInput = z
  .object({
    key: z.string().regex(/^[A-Za-z0-9:_-]{1,110}$/),
    campaignId: z.uuid(),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
    userIds: z.array(z.uuid()).max(50000),
  })
  .strict();
const batchInput = z
  .object({ limit: z.number().int().min(1).max(50).default(10) })
  .strict();
function stableNoticeId(key: string) {
  const h = createHash("sha256")
    .update(`sfs-campaign-notice-v1:${key}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Nội bộ transaction đợt đã kiểm actor/mutex; chỉ thông báo bắt buộc của Tuần7. */
export async function enqueueCampaignNotice(
  tx: Prisma.TransactionClient,
  input: {
    key: string;
    campaignId: string;
    title: string;
    body: string;
    userIds: string[];
  },
): Promise<{ queued: number }> {
  const data = queueInput.parse(input);
  const ids = [...new Set(data.userIds)].sort();
  if (!ids.length) return { queued: 0 };
  const now = new Date();
  let queued = 0;
  for (let offset = 0; offset < ids.length; offset += 250) {
    const users = await tx.user.findMany({
      where: { id: { in: ids.slice(offset, offset + 250) } },
      select: { id: true },
    });
    const notices = users.map(({ id }) => ({
      id: stableNoticeId(`${data.key}:${id}`),
      userId: id,
      title: data.title,
      body: data.body,
      targetType: "SurveyCampaign",
      targetId: data.campaignId,
      createdAt: now,
    }));
    await tx.notification.createMany({ data: notices, skipDuplicates: true });
    const result = await tx.emailOutbox.createMany({
      data: notices.map((notice) => ({
        id: randomUUID(),
        notificationId: notice.id,
        idempotencyKey: `${data.key}:${notice.userId}`,
        status: "PENDING" as const,
        nextAttemptAt: now,
      })),
      skipDuplicates: true,
    });
    queued += result.count;
  }
  return { queued };
}

/** Lease ngắn: các worker không cùng gửi một hàng; SMTP không nằm trong transaction. */
export async function processCampaignMailOutbox(
  actor: ServerConsoleActor | null,
  input: { limit?: number } = {},
) {
  authorizeConsole(actor);
  const { limit } = batchInput.parse(input),
    db = getDb();
  const claimed = await db.$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const now = new Date();
    await tx.emailOutbox.updateMany({
      where: {
        notification: { targetType: "SurveyCampaign" },
        status: "PROCESSING",
        leaseUntil: { lte: now },
        attempts: { gte: MAX_ATTEMPTS },
      },
      data: { status: "FAILED", leaseToken: null, leaseUntil: null },
    });
    const rows = await tx.emailOutbox.findMany({
      where: {
        notification: { targetType: "SurveyCampaign" },
        attempts: { lt: MAX_ATTEMPTS },
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          { status: "PROCESSING", leaseUntil: { lte: now } },
        ],
      },
      include: {
        notification: {
          include: {
            user: { select: { id: true, email: true, status: true } },
          },
        },
      },
      orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
      take: limit,
    });
    const leases: { row: (typeof rows)[number]; token: string }[] = [];
    for (const row of rows) {
      const token = randomUUID();
      const changed = await tx.emailOutbox.updateMany({
        // A previous owner may renew after our candidate SELECT. Comparing the
        // old expiry prevents reclaiming that freshly renewed lease.
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
    lostLease = 0;
  // Bounded concurrency giữ SMTP timeout độc lập số lượng sinh viên trong đợt.
  for (let offset = 0; offset < claimed.length; offset += 5) {
    await Promise.all(
      claimed.slice(offset, offset + 5).map(async ({ row, token }) => {
        // A large batch can wait beyond its original lease before reaching SMTP.
        // Renew just before sending and skip rows reclaimed by another worker.
        const renewed = await db.emailOutbox.updateMany({
          where: { id: row.id, status: "PROCESSING", leaseToken: token },
          data: { leaseUntil: new Date(Date.now() + 60000) },
        });
        if (renewed.count !== 1) {
          lostLease++;
          return;
        }
        let success = false;
        const user = row.notification.user;
        const permanent =
          user.status === "DISABLED" ||
          !z.email().safeParse(user.email).success;
        if (!permanent) {
          try {
            await sendCampaignMail({
              to: user.email,
              title: row.notification.title,
              body: row.notification.body,
            });
            success = true;
          } catch {
            /* SMTP errors may contain addresses/credentials; never log the exception. */
          }
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
                  ...(permanent ? { attempts: MAX_ATTEMPTS } : {}),
                }),
          },
        });
        if (completed.count !== 1) lostLease++;
        else if (success) sent++;
        else failed++;
      }),
    );
  }
  if (claimed.length)
    await db.auditLog.create({
      data: {
        action: "CAMPAIGN_EMAIL_DISPATCH",
        objectType: "EmailOutbox",
        redactedSummary: {
          console: true,
          recipients: claimed.length,
          sent,
          failed,
        },
      },
    });
  return { claimed: claimed.length, sent, failed, lostLease };
}
