import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";

export const domainNoticeTargets = [
  "Feedback",
  "InspectionCase",
  "ImprovementPlan",
  "ExamReviewRecommendation",
] as const;
export type DomainNoticeTarget = (typeof domainNoticeTargets)[number];
const inputSchema = z
  .object({
    key: z.string().regex(/^[A-Za-z0-9:_-]{1,110}$/),
    targetType: z.enum(domainNoticeTargets),
    targetId: z.uuid(),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
    userIds: z.array(z.uuid()).max(50000),
  })
  .strict();
export type DomainNoticeInput = z.input<typeof inputSchema>;

export function stableDomainNoticeId(key: string): string {
  const h = createHash("sha256")
    .update(`sfs-domain-notice-v1:${key}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Chỉ gọi trong transaction nghiệp vụ đã kiểm quyền; không đưa nội dung hồ sơ/định danh vào thông báo. */
export async function enqueueDomainNotice(
  tx: Prisma.TransactionClient,
  input: DomainNoticeInput,
): Promise<{ queued: number }> {
  const data = inputSchema.parse(input);
  const ids = [...new Set(data.userIds)].sort();
  let queued = 0;
  const now = new Date();
  for (let offset = 0; offset < ids.length; offset += 250) {
    const users = await tx.user.findMany({
      where: { id: { in: ids.slice(offset, offset + 250) }, status: "ACTIVE" },
      select: { id: true },
    });
    const notices = users.map(({ id }) => ({
      id: stableDomainNoticeId(
        JSON.stringify([data.targetType, data.targetId, data.key, id]),
      ),
      userId: id,
      title: data.title,
      body: data.body,
      targetType: data.targetType,
      targetId: data.targetId,
      createdAt: now,
    }));
    await tx.notification.createMany({ data: notices, skipDuplicates: true });
    const result = await tx.emailOutbox.createMany({
      data: notices.map((notice) => ({
        id: randomUUID(),
        notificationId: notice.id,
        idempotencyKey: `domain:${createHash("sha256")
          .update(
            JSON.stringify([
              data.targetType,
              data.targetId,
              data.key,
              notice.userId,
            ]),
          )
          .digest("hex")}`,
        status: "PENDING" as const,
        nextAttemptAt: now,
      })),
      skipDuplicates: true,
    });
    queued += result.count;
  }
  return { queued };
}
