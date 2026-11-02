import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { listTransferredFeedbackSummaries } from "@/server/services/inspection-workflow";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    return authJson({
      ok: true,
      items: await listTransferredFeedbackSummaries(actor),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
