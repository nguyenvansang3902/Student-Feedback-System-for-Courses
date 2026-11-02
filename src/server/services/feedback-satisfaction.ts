import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import {
  assertFreshActor,
  lockAdminMutations,
  parseInput,
  objectId,
} from "./access";
import { detailDto, lockFeedback, requireFeedbackResource } from "./feedback";
import {
  addBusinessDays,
  ratingAllowed,
  reopenAllowed,
} from "./feedback-deadlines";
import { readWorkflowSettings } from "./workflow-settings";
import { enqueueDomainNotice } from "./domain-notifications";
const mutation = { revision: z.number().int().positive(), requestId: z.uuid() };
export const feedbackRatingSchema = z
  .object({
    ...mutation,
    score: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
export const feedbackReopenSchema = z
  .object({ ...mutation, reason: z.string().trim().min(10).max(1000) })
  .strict();
export async function updateFeedbackSatisfaction(
  actor: AuthActor,
  id: string,
  input: unknown,
  reopen = false,
) {
  requireCan(actor, "feedback:create");
  const feedbackId = parseInput(objectId, id);
  const data = reopen
    ? parseInput(feedbackReopenSchema, input)
    : parseInput(feedbackRatingSchema, input);
  const hash = createHash("sha256")
    .update(JSON.stringify({ reopen, data }))
    .digest("hex");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "feedback:create");
    await lockFeedback(tx, feedbackId);
    const access = await requireFeedbackResource(tx, fresh, feedbackId);
    const row = access.feedback;
    if (!access.isAuthor || access.inspectionId)
      throw new AuthError(
        "Không thể đánh giá hoặc mở lại phản hồi này.",
        403,
        "FEEDBACK_ACTION_FORBIDDEN",
      );
    const prior = await tx.feedbackHistory.findUnique({
      where: {
        feedbackId_requestId: { feedbackId, requestId: data.requestId },
      },
    });
    if (prior) {
      if (prior.actorId !== fresh.userId || prior.requestHash !== hash)
        throw new AuthError(
          "Mã yêu cầu đã dùng cho dữ liệu khác.",
          409,
          "REQUEST_CONFLICT",
        );
      return detailDto(tx, access);
    }
    if (row.section.semester.lockedAt || row.isLocked)
      throw new AuthError(
        "Dữ liệu đang khóa và chỉ được xem.",
        409,
        "FEEDBACK_LOCKED",
      );
    if (row.revision !== data.revision)
      throw new AuthError(
        "Phản hồi đã thay đổi. Tải lại trước khi tiếp tục.",
        409,
        "REVISION_CONFLICT",
      );
    const settings = await readWorkflowSettings(tx),
      now = new Date();
    if (
      reopen
        ? !reopenAllowed(row, settings.reopenDays, now)
        : !!row.rating || !ratingAllowed(row, settings.satisfactionDays, now)
    )
      throw new AuthError(
        "Đã hết thời hạn hoặc phản hồi không còn đủ điều kiện thực hiện.",
        409,
        "FEEDBACK_WINDOW_CLOSED",
      );
    const status = reopen ? "DANG_XU_LY" : "DA_DONG";
    const changed = await tx.feedback.updateMany({
      where: { id: feedbackId, revision: data.revision, status: row.status },
      data: {
        status,
        revision: { increment: 1 },
        ...(reopen
          ? {
              reopenCount: { increment: 1 },
              closedAt: null,
              answeredAt: null,
              acceptedAt: now,
              isOverdue: false,
              replyDueAt: addBusinessDays(
                now,
                ["TO_CHUC_LOP_HOC", "THI_KET_THUC_HOC_PHAN"].includes(
                  row.category,
                )
                  ? settings.officeReplyDays
                  : row.severity === "KHIEU_NAI"
                    ? settings.complaintReplyDays
                    : settings.normalReplyDays,
              ),
            }
          : { closedAt: row.closedAt ?? now, isOverdue: false }),
      },
    });
    if (changed.count !== 1)
      throw new AuthError(
        "Phản hồi đã thay đổi. Tải lại dữ liệu.",
        409,
        "REVISION_CONFLICT",
      );
    if (!reopen) {
      const rating = feedbackRatingSchema.parse(data);
      await tx.feedbackRating.create({
        data: {
          feedbackId,
          score: rating.score,
          comment: rating.comment || null,
          createdAt: now,
        },
      });
    }
    await tx.feedbackHistory.create({
      data: {
        feedbackId,
        actorId: fresh.userId,
        event: reopen ? "MO_LAI" : "DONG",
        fromStatus: row.status,
        toStatus: status,
        requestId: data.requestId,
        requestHash: hash,
        reason: reopen
          ? feedbackReopenSchema.parse(data).reason
          : "Sinh viên đã đánh giá mức hài lòng.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: reopen ? "FEEDBACK_REOPENED" : "FEEDBACK_RATED",
        objectType: "Feedback",
        objectId: feedbackId,
        redactedSummary: { revision: data.revision + 1 },
      },
    });
    await enqueueDomainNotice(tx, {
      key: "feedback-satisfaction:" + data.requestId,
      targetType: "Feedback",
      targetId: feedbackId,
      title: reopen ? "Phản hồi được mở lại" : "Phản hồi đã hoàn tất",
      body: "Có cập nhật phản hồi cần xem. Đăng nhập để xem trong phạm vi được phép.",
      userIds: row.recipients.filter((x) => x.isActive).map((x) => x.userId),
    });
    return detailDto(tx, await requireFeedbackResource(tx, fresh, feedbackId));
  });
}
