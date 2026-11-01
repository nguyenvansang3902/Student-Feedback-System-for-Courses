import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { issueFeedbackCsrf } from "@/server/auth/csrf";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    return authJson({ ok: true, csrfToken: issueFeedbackCsrf(actor) });
  } catch (error) {
    return apiFailure(error);
  }
}
