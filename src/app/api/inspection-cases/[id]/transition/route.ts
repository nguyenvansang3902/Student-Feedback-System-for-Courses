import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  feedbackActor,
  noFeedbackQuery,
  readFeedbackBody,
} from "@/server/feedback-http";
import { transitionInspectionCase } from "@/server/services/inspection-workflow";
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
      item: await transitionInspectionCase(
        actor,
        (await params).id,
        await readFeedbackBody(request),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
