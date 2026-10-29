import type { NextRequest } from "next/server";
import { AuthError } from "./types";

export const MAX_CAMPAIGN_BODY_BYTES = 262_144;

/** Giới hạn byte thực đọc, không phụ thuộc Content-Length do client khai báo. */
export async function readCampaignBody(request: NextRequest): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AuthError("Dữ liệu đợt khảo sát phải có định dạng JSON.", 415);
  const length = request.headers.get("content-length");
  if (
    length &&
    (!/^\d+$/.test(length) || Number(length) > MAX_CAMPAIGN_BODY_BYTES)
  )
    throw new AuthError("Dữ liệu đợt khảo sát vượt quá giới hạn 256 KiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu dữ liệu đợt khảo sát.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_CAMPAIGN_BODY_BYTES) {
        await reader.cancel();
        throw new AuthError(
          "Dữ liệu đợt khảo sát vượt quá giới hạn 256 KiB.",
          413,
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu đợt khảo sát không hợp lệ.");
  } finally {
    reader.releaseLock();
  }
}
