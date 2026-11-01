import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { AuthError } from "@/server/auth/types";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { requireCan } from "@/server/policies/can";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_REQUEST_BYTES,
  MAX_FEEDBACK_ATTACHMENTS,
  type AttachmentUpload,
} from "@/server/feedback/attachment-files";
import { uploadFeedbackAttachments } from "@/server/services/feedback-attachments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

/** Chặn kích thước trên stream, kể cả khi client bỏ hoặc khai sai Content-Length. */
async function readUploads(request: NextRequest): Promise<AttachmentUpload[]> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(type))
    throw new AuthError(
      "Hãy gửi tệp bằng biểu mẫu tải lên.",
      415,
      "INVALID_ATTACHMENT_REQUEST",
    );
  const length = request.headers.get("content-length");
  if (
    length &&
    (!/^\d+$/.test(length) || Number(length) > MAX_ATTACHMENT_REQUEST_BYTES)
  )
    throw new AuthError(
      "Các tệp tải lên vượt quá giới hạn cho phép.",
      413,
      "ATTACHMENT_TOO_LARGE",
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new AuthError(
      "Chọn ít nhất một tệp đính kèm.",
      400,
      "NO_ATTACHMENTS",
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_ATTACHMENT_REQUEST_BYTES) {
        await reader.cancel();
        throw new AuthError(
          "Các tệp tải lên vượt quá giới hạn cho phép.",
          413,
          "ATTACHMENT_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
    const body = new Uint8Array(Buffer.concat(chunks));
    const form = await new Response(body, {
      headers: { "Content-Type": type },
    }).formData();
    const files = form.getAll("files");
    if (
      [...form.keys()].some((key) => key !== "files") ||
      !files.length ||
      files.length > MAX_FEEDBACK_ATTACHMENTS ||
      files.some((file) => !(file instanceof File))
    )
      throw new AuthError(
        "Dữ liệu tệp đính kèm không hợp lệ.",
        400,
        "INVALID_ATTACHMENT_REQUEST",
      );
    return await Promise.all(
      (files as File[]).map(async (file) => {
        if (file.size > MAX_ATTACHMENT_BYTES)
          throw new AuthError(
            "Mỗi tệp đính kèm tối đa 5 MB.",
            413,
            "ATTACHMENT_TOO_LARGE",
          );
        return {
          name: file.name,
          content: Buffer.from(await file.arrayBuffer()),
        };
      }),
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      "Chưa đọc được tệp gửi lên. Hãy chọn lại tệp.",
      400,
      "INVALID_ATTACHMENT_REQUEST",
    );
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await feedbackActor(request, true);
    requireCan(actor, "feedback:attach");
    noFeedbackQuery(request);
    const { id } = await context.params;
    const uploads = await readUploads(request);
    const attachments = await uploadFeedbackAttachments(actor, id, uploads);
    return authJson({ ok: true, attachments }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
