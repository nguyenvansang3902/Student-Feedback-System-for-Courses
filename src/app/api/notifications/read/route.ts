import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { noFeedbackQuery, readFeedbackBody } from "@/server/feedback-http";
import { notificationsActor } from "@/server/notifications-http";
import {
  markNotificationRead,
  notificationReadSchema,
} from "@/server/services/notifications";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    noFeedbackQuery(request);
    const actor = await notificationsActor(request, true);
    return authJson({
      ok: true,
      ...(await markNotificationRead(
        actor,
        notificationReadSchema.parse(await readFeedbackBody(request)),
      )),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
