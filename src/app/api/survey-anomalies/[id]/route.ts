import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { getSurveyAnomaly } from "@/server/services/survey-anomalies";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    return authJson({
      ok: true,
      item: await getSurveyAnomaly(actor, (await params).id),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
