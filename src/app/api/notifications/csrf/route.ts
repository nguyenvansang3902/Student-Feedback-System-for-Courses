import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { issueNotificationsCsrf } from "@/server/auth/csrf";
import { authJson } from "@/server/auth/http";
import { noFeedbackQuery } from "@/server/feedback-http";
import { notificationsActor } from "@/server/notifications-http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    noFeedbackQuery(request);
    const actor = await notificationsActor(request);
    return authJson({ ok: true, csrfToken: issueNotificationsCsrf(actor) });
  } catch (error) {
    return apiFailure(error);
  }
}
