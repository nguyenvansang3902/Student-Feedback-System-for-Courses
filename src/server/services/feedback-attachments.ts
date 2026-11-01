import { createHash, randomUUID } from "node:crypto";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { lockAdminMutations, objectId, parseInput } from "./access";
import { lockFeedback, requireFeedbackResource } from "./feedback";
import type { FeedbackAttachment } from "./feedback-types";
import {
  attachmentDownloadHeaders,
  safeAttachmentName,
  validateAttachmentBatch,
  type AttachmentUpload,
} from "../feedback/attachment-files";
import {
  readPrivateAttachment,
  removePrivateAttachment,
  writePrivateAttachment,
} from "../feedback/attachment-storage";

export async function uploadFeedbackAttachments(
  actor: AuthActor,
  feedbackId: string,
  uploads: readonly AttachmentUpload[],
): Promise<FeedbackAttachment[]> {
  requireCan(actor, "feedback:attach");
  const id = parseInput(objectId, feedbackId);
  const writtenKeys: string[] = [];
  try {
    return await getDb().$transaction(
      async (tx) => {
        await lockAdminMutations(tx);
        await lockFeedback(tx, id);
        const access = await requireFeedbackResource(tx, actor, id, "attach");
        const count = await tx.attachment.count({ where: { feedbackId: id } });
        const files = validateAttachmentBatch(uploads, count);
        const output: FeedbackAttachment[] = [];
        for (const file of files) {
          const storageKey = `${randomUUID()}.${file.extension}`;
          await writePrivateAttachment(storageKey, file.content);
          writtenKeys.push(storageKey);
          const stored = await tx.attachment.create({
            data: {
              id: randomUUID(),
              feedbackId: id,
              storageKey,
              originalName: file.originalName,
              mimeType: file.mimeType,
              byteSize: file.byteSize,
              sha256: file.sha256,
            },
            select: {
              id: true,
              mimeType: true,
              byteSize: true,
              createdAt: true,
            },
          });
          output.push({
            id: stored.id,
            mimeType: stored.mimeType,
            byteSize: stored.byteSize,
            createdAt: stored.createdAt.toISOString(),
            displayName: safeAttachmentName(stored.mimeType),
            downloadUrl: `/api/feedback/${id}/attachments/${stored.id}`,
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: access.actor.userId,
            action: "FEEDBACK_ATTACHMENTS_ADDED",
            objectType: "Feedback",
            objectId: id,
            redactedSummary: { count: output.length },
          },
        });
        return output;
      },
      { maxWait: 10000, timeout: 15000 },
    );
  } catch (error) {
    // Khóa đều do lần gọi này sinh ra; không nhận tên hoặc đường dẫn từ client.
    await Promise.allSettled(
      writtenKeys.map((key) => removePrivateAttachment(key)),
    );
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      "Chưa lưu được tệp đính kèm. Phản hồi đã tạo vẫn được giữ; hãy thử tải tệp lại.",
      503,
      "ATTACHMENT_SAVE_FAILED",
    );
  }
}

export async function downloadFeedbackAttachment(
  actor: AuthActor,
  feedbackId: string,
  attachmentId: string,
): Promise<{
  content: Buffer;
  headers: ReturnType<typeof attachmentDownloadHeaders>;
}> {
  requireCan(actor, "feedback:read");
  const id = parseInput(objectId, feedbackId);
  const fileId = parseInput(objectId, attachmentId);
  try {
    return await getDb().$transaction(
      async (tx) => {
        await lockAdminMutations(tx);
        await lockFeedback(tx, id);
        const access = await requireFeedbackResource(tx, actor, id, "read");
        const attachment = await tx.attachment.findFirst({
          where: { id: fileId, feedbackId: id },
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            byteSize: true,
            sha256: true,
          },
        });
        if (!attachment)
          throw new AuthError("Không tìm thấy tệp đính kèm.", 404, "NOT_FOUND");
        const headers = attachmentDownloadHeaders(
          attachment.mimeType,
          attachment.byteSize,
        );
        const content = await readPrivateAttachment(attachment.storageKey);
        if (
          content.length !== attachment.byteSize ||
          createHash("sha256").update(content).digest("hex") !==
            attachment.sha256
        )
          throw new AuthError(
            "Chưa đọc được tệp đính kèm. Vui lòng thử lại.",
            503,
            "ATTACHMENT_INTEGRITY_ERROR",
          );
        await tx.auditLog.create({
          data: {
            actorId: access.actor.userId,
            action: access.inspectionId
              ? "INSPECTION_ATTACHMENT_DOWNLOADED"
              : "FEEDBACK_ATTACHMENT_DOWNLOADED",
            objectType: access.inspectionId ? "InspectionCase" : "Attachment",
            objectId: access.inspectionId || attachment.id,
            redactedSummary: { attachmentId: attachment.id },
          },
        });
        return { content, headers };
      },
      { maxWait: 10000, timeout: 15000 },
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      "Chưa tải được tệp đính kèm. Vui lòng thử lại.",
      503,
      "ATTACHMENT_DOWNLOAD_FAILED",
    );
  }
}
