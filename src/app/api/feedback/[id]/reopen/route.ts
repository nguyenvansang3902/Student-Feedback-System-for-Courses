import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  feedbackActor,
  noFeedbackQuery,
  readFeedbackBody,
} from "@/server/feedback-http";
import { updateFeedbackSatisfaction } from "@/server/services/feedback-satisfaction";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await feedbackActor(request, true);
    noFeedbackQuery(request);
    return authJson({
      ok: true,
      item: await updateFeedbackSatisfaction(
        actor,
        (await params).id,
        await readFeedbackBody(request),
        true,
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
