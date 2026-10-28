import type { NextRequest } from "next/server";
import { AuthError } from "./types";

export const MAX_TEMPLATE_BODY_BYTES = 262_144;

/** Chặn theo byte thực đọc, kể cả khi Content-Length vắng hoặc bị giả. */
export async function readTemplateBody(request: NextRequest): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthError("Dữ liệu gửi lên phải có định dạng JSON.", 415);
  const length = request.headers.get("content-length");
  if (
    length &&
    (!/^\d+$/.test(length) || Number(length) > MAX_TEMPLATE_BODY_BYTES)
  )
    throw new AuthError("Mẫu phiếu vượt quá giới hạn 256 KiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu dữ liệu mẫu phiếu.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_TEMPLATE_BODY_BYTES) {
        await reader.cancel();
        throw new AuthError("Mẫu phiếu vượt quá giới hạn 256 KiB.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu mẫu phiếu không hợp lệ.");
  } finally {
    reader.releaseLock();
  }
}
