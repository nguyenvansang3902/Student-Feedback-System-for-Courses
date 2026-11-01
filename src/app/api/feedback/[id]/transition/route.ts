import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  readFeedbackBody,
  feedbackActor,
  noFeedbackQuery,
} from "@/server/feedback-http";
import { transitionFeedback } from "@/server/services/feedback";
import { feedbackTransitionSchema } from "@/server/services/feedback-types";
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
      item: await transitionFeedback(
        actor,
        (await params).id,
        feedbackTransitionSchema.parse(await readFeedbackBody(request)),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
