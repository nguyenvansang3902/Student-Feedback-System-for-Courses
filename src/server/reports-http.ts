import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, assertSameOrigin } from "./auth/http";
import { assertReportsCsrf } from "./auth/csrf";
import { AuthError } from "./auth/types";
import { getActor } from "./services/auth";
import { requireCan } from "./policies/can";
import { readFeedbackBody } from "./feedback-http";

type ReportAction =
  | "reports:read"
  | "reports:export"
  | "reports:settings:read"
  | "reports:settings:write";
export async function reportsActor(
  request: NextRequest,
  action: ReportAction = "reports:read",
) {
  if (request.method !== "GET") assertSameOrigin(request);
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để xem báo cáo.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, action);
  if (request.method !== "GET") assertReportsCsrf(request, actor);
  return actor;
}
export function reportsQuery(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;
  for (const key of parameters.keys())
    if (parameters.getAll(key).length !== 1)
      throw new AuthError(
        "Tham số báo cáo không hợp lệ.",
        400,
        "INVALID_INPUT",
      );
  return Object.fromEntries(parameters);
}
export function noReportsQuery(request: NextRequest) {
  if (request.nextUrl.searchParams.size)
    throw new AuthError(
      "Chức năng này không nhận tham số lọc.",
      400,
      "INVALID_INPUT",
    );
}
export const readReportsBody = readFeedbackBody;
