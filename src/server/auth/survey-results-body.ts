import type { NextRequest } from "next/server";
import { AuthError } from "./types";

export const MAX_SURVEY_RESULTS_BODY_BYTES = 262_144;

/** Giới hạn dữ liệu thực đọc; không tin Content-Length do client gửi. */
export async function readSurveyResultsBody(
  request: NextRequest,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AuthError("Yêu cầu phải có định dạng JSON.", 415);
  const length = request.headers.get("content-length");
  if (
    length &&
    (!/^\d+$/.test(length) || Number(length) > MAX_SURVEY_RESULTS_BODY_BYTES)
  )
    throw new AuthError("Dữ liệu vượt quá giới hạn 256 KiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu dữ liệu yêu cầu.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_SURVEY_RESULTS_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new AuthError("Dữ liệu vượt quá giới hạn 256 KiB.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu yêu cầu không hợp lệ.");
  } finally {
    reader.releaseLock();
  }
}
