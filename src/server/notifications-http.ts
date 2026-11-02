import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, assertSameOrigin } from "./auth/http";
import { assertNotificationsCsrf } from "./auth/csrf";
import { AuthError } from "./auth/types";
import { requireCan } from "./policies/can";
import { getActor } from "./services/auth";

export async function notificationsActor(request: NextRequest, write = false) {
  if (write) assertSameOrigin(request);
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để tiếp tục.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, write ? "notifications:mutate" : "notifications:list");
  if (write) assertNotificationsCsrf(request, actor);
  return actor;
}
