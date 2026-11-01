import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  readFeedbackBody,
  feedbackActor,
  noFeedbackQuery,
} from "@/server/feedback-http";
import {
  getFeedbackSettings,
  updateFeedbackSettings,
} from "@/server/services/feedback-settings";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    return authJson({ ok: true, item: await getFeedbackSettings(actor) });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await feedbackActor(request, true);
    noFeedbackQuery(request);
    return authJson({
      ok: true,
      item: await updateFeedbackSettings(
        actor,
        await readFeedbackBody(request),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
