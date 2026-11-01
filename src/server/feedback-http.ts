import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, assertSameOrigin } from "./auth/http";
import { assertFeedbackCsrf } from "./auth/csrf";
import { AuthError } from "./auth/types";
import { getActor } from "./services/auth";
import { requireCan } from "./policies/can";

export async function feedbackActor(request: NextRequest, write = false) {
  if (write) assertSameOrigin(request);
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để tiếp tục.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "feedback:access");
  if (write) assertFeedbackCsrf(request, actor);
  return actor;
}

export function feedbackQuery(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;
  for (const key of parameters.keys()) {
    if (parameters.getAll(key).length !== 1)
      throw new AuthError(
        "Tham số yêu cầu không hợp lệ.",
        400,
        "INVALID_INPUT",
      );
  }
  return Object.fromEntries(parameters);
}

export function noFeedbackQuery(request: NextRequest) {
  if (request.nextUrl.searchParams.size)
    throw new AuthError("Tham số yêu cầu không hợp lệ.", 400, "INVALID_INPUT");
}

/** Nội dung phản hồi tối đa 10.000 ký tự Unicode; chặn luồng JSON vượt 64KiB. */
export async function readFeedbackBody(request: NextRequest): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthError(
      "Dữ liệu gửi lên phải có định dạng JSON.",
      415,
      "INVALID_CONTENT_TYPE",
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new AuthError("Thiếu dữ liệu yêu cầu.", 400, "INVALID_INPUT");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new AuthError("Nội dung gửi lên quá lớn.", 413, "BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu yêu cầu không hợp lệ.", 400, "INVALID_INPUT");
  } finally {
    reader.releaseLock();
  }
}
