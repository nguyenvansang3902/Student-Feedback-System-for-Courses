import type { NextRequest } from "next/server";
import { AuthError } from "./types";

export const MAX_STUDENT_SURVEY_BODY_BYTES = 262_144;

/** Đếm byte stream thực; không tin kích thước client khai báo. */
export async function readStudentSurveyBody(
  request: NextRequest,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AuthError("Phiếu khảo sát phải có định dạng JSON.", 415);
  const length = request.headers.get("content-length");
  if (
    length &&
    (!/^\d+$/.test(length) || Number(length) > MAX_STUDENT_SURVEY_BODY_BYTES)
  )
    throw new AuthError("Phiếu khảo sát vượt quá giới hạn 256 KiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu dữ liệu phiếu khảo sát.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_STUDENT_SURVEY_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new AuthError("Phiếu khảo sát vượt quá giới hạn 256 KiB.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu phiếu khảo sát không hợp lệ.");
  } finally {
    reader.releaseLock();
  }
}
