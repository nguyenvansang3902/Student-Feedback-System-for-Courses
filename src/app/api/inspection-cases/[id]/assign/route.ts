import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  readFeedbackBody,
  feedbackActor,
  noFeedbackQuery,
} from "@/server/feedback-http";
import { assignInspectionCase } from "@/server/services/inspection-workflow";
import { inspectionAssignmentSchema } from "@/server/services/feedback-types";
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
      item: await assignInspectionCase(
        actor,
        (await params).id,
        inspectionAssignmentSchema.parse(await readFeedbackBody(request)),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
