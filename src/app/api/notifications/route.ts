import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackQuery } from "@/server/feedback-http";
import { notificationsActor } from "@/server/notifications-http";
import {
  listNotifications,
  notificationListSchema,
} from "@/server/services/notifications";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await notificationsActor(request);
    return authJson({
      ok: true,
      ...(await listNotifications(
        actor,
        notificationListSchema.parse(feedbackQuery(request)),
      )),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
