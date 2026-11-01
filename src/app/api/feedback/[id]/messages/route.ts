import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  readFeedbackBody,
  feedbackActor,
  noFeedbackQuery,
} from "@/server/feedback-http";
import { addFeedbackMessage } from "@/server/services/feedback";
import { feedbackMessageSchema } from "@/server/services/feedback-types";
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
      item: await addFeedbackMessage(
        actor,
        (await params).id,
        feedbackMessageSchema.parse(await readFeedbackBody(request)),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
