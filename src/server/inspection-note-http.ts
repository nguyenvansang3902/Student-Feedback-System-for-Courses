import type { NextRequest } from "next/server";
import { AuthError } from "./auth/types";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_REQUEST_BYTES,
  type AttachmentUpload,
} from "./feedback/attachment-files";
import { inspectionNoteSchema } from "./services/inspection-workflow-types";
import { readFeedbackBody } from "./feedback-http";

export async function readInspectionNote(
  request: NextRequest,
): Promise<{ input: unknown; uploads: AttachmentUpload[] }> {
  const type = request.headers.get("content-type") ?? "";
  if (type.split(";")[0].trim() === "application/json")
    return {
      input: inspectionNoteSchema.parse(await readFeedbackBody(request)),
      uploads: [],
    };
  if (!/^multipart\/form-data\s*;/i.test(type))
    throw new AuthError(
      "Dữ liệu ghi chú phải dùng JSON hoặc biểu mẫu tải lên.",
      415,
      "INVALID_CONTENT_TYPE",
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
    throw new AuthError("Thiếu dữ liệu ghi chú.", 400, "INVALID_INPUT");
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
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
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": type },
    }).formData();
    const allowed = new Set(["body", "revision", "requestId", "files"]);
    if (
      [...form.keys()].some((key) => !allowed.has(key)) ||
      ["body", "revision", "requestId"].some(
        (key) => form.getAll(key).length !== 1,
      )
    )
      throw new AuthError(
        "Dữ liệu ghi chú không hợp lệ.",
        400,
        "INVALID_INPUT",
      );
    const input = inspectionNoteSchema.parse({
      body: form.get("body"),
      revision: Number(form.get("revision")),
      requestId: form.get("requestId"),
    });
    const files = form.getAll("files");
    if (files.length > 3 || files.some((file) => !(file instanceof File)))
      throw new AuthError(
        "Mỗi ghi chú có tối đa 3 tệp PNG, JPG hoặc PDF.",
        400,
        "INVALID_ATTACHMENT_REQUEST",
      );
    const uploads = await Promise.all(
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
    return { input, uploads };
  } catch (error) {
    if (
      error instanceof AuthError ||
      (error instanceof Error && error.name === "ZodError")
    )
      throw error;
    throw new AuthError("Chưa đọc được ghi chú gửi lên.", 400, "INVALID_INPUT");
  } finally {
    reader.releaseLock();
  }
}
