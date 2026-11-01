import { createHash } from "node:crypto";
import { AuthError } from "../auth/types";

export const MAX_FEEDBACK_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_REQUEST_BYTES =
  MAX_FEEDBACK_ATTACHMENTS * MAX_ATTACHMENT_BYTES + 64 * 1024;

export type AttachmentUpload = {
  name: string;
  content: Uint8Array;
};
export type AttachmentMime = "image/png" | "image/jpeg" | "application/pdf";
export type ValidatedAttachment = {
  originalName: string;
  content: Buffer;
  mimeType: AttachmentMime;
  extension: "png" | "jpg" | "pdf";
  byteSize: number;
  sha256: string;
};

function invalidFile(): never {
  throw new AuthError(
    "Chỉ nhận tệp PNG, JPG hoặc PDF có phần mở rộng khớp nội dung thực.",
    400,
    "INVALID_ATTACHMENT_TYPE",
  );
}

/** Kiểm chữ ký và phần kết thúc cơ bản, không dùng MIME do trình duyệt khai báo. */
function detectedType(content: Buffer): {
  mimeType: AttachmentMime;
  extension: ValidatedAttachment["extension"];
} | null {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    content.length >= 45 &&
    content.subarray(0, 8).equals(pngSignature) &&
    content.readUInt32BE(8) === 13 &&
    content.toString("ascii", 12, 16) === "IHDR" &&
    content
      .subarray(-12)
      .equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]))
  )
    return { mimeType: "image/png", extension: "png" };
  if (
    content.length >= 4 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff &&
    content[content.length - 2] === 0xff &&
    content[content.length - 1] === 0xd9
  )
    return { mimeType: "image/jpeg", extension: "jpg" };
  if (
    content.length >= 14 &&
    /^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(content.toString("ascii", 0, 10)) &&
    /%%EOF[\t\n\r ]*$/.test(content.subarray(-1024).toString("ascii"))
  )
    return { mimeType: "application/pdf", extension: "pdf" };
  return null;
}

/** BR-28: phần mở rộng và magic phải cùng loại; giữ một bản byte riêng sau kiểm. */
export function validateAttachment(
  upload: AttachmentUpload,
): ValidatedAttachment {
  if (
    !upload ||
    typeof upload.name !== "string" ||
    !upload.name.trim() ||
    upload.name.length > 255 ||
    /[\x00-\x1f\x7f/\\:]/.test(upload.name) ||
    upload.name.startsWith(".")
  )
    throw new AuthError(
      "Tên tệp không hợp lệ.",
      400,
      "INVALID_ATTACHMENT_NAME",
    );
  if (
    !(upload.content instanceof Uint8Array) ||
    upload.content.byteLength === 0
  )
    throw new AuthError(
      "Tệp đính kèm không được rỗng.",
      400,
      "EMPTY_ATTACHMENT",
    );
  if (upload.content.byteLength > MAX_ATTACHMENT_BYTES)
    throw new AuthError(
      "Mỗi tệp đính kèm tối đa 5 MB.",
      413,
      "ATTACHMENT_TOO_LARGE",
    );
  const name = upload.name.trim();
  const extension = name.split(".").at(-1)?.toLowerCase();
  if (!extension || !["png", "jpg", "jpeg", "pdf"].includes(extension))
    return invalidFile();
  const content = Buffer.from(upload.content);
  const detected = detectedType(content);
  if (
    !detected ||
    (extension === "jpeg" ? "jpg" : extension) !== detected.extension
  )
    return invalidFile();
  return {
    originalName: name,
    content,
    ...detected,
    byteSize: content.length,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

export function validateAttachmentBatch(
  uploads: readonly AttachmentUpload[],
  existingCount: number,
): ValidatedAttachment[] {
  if (!Array.isArray(uploads) || uploads.length === 0)
    throw new AuthError(
      "Chọn ít nhất một tệp đính kèm.",
      400,
      "NO_ATTACHMENTS",
    );
  if (
    !Number.isInteger(existingCount) ||
    existingCount < 0 ||
    existingCount + uploads.length > MAX_FEEDBACK_ATTACHMENTS
  )
    throw new AuthError(
      "Mỗi phản hồi có tối đa 3 tệp đính kèm.",
      400,
      "ATTACHMENT_LIMIT",
    );
  return uploads.map(validateAttachment);
}

export function safeAttachmentName(mimeType: string): string {
  if (mimeType === "image/png") return "tep-dinh-kem.png";
  if (mimeType === "image/jpeg") return "tep-dinh-kem.jpg";
  if (mimeType === "application/pdf") return "tep-dinh-kem.pdf";
  throw new AuthError("Không tìm thấy tệp đính kèm.", 404, "NOT_FOUND");
}

/** Không dùng originalName trong DTO hoặc header, kể cả khi người xử lý biết danh tính. */
export function attachmentDownloadHeaders(mimeType: string, byteSize: number) {
  if (
    !Number.isInteger(byteSize) ||
    byteSize < 1 ||
    byteSize > MAX_ATTACHMENT_BYTES
  )
    throw new AuthError("Không tìm thấy tệp đính kèm.", 404, "NOT_FOUND");
  return {
    "Content-Type": mimeType,
    "Content-Length": String(byteSize),
    "Content-Disposition": `attachment; filename="${safeAttachmentName(mimeType)}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Referrer-Policy": "no-referrer",
  };
}
