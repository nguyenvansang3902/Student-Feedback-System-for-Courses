import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, feedbackQuery } from "@/server/feedback-http";
import { listInspectionCases } from "@/server/services/feedback";
import { inspectionListSchema } from "@/server/services/feedback-types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    return authJson({
      ok: true,
      ...(await listInspectionCases(
        actor,
        inspectionListSchema.parse(feedbackQuery(request)),
      )),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
