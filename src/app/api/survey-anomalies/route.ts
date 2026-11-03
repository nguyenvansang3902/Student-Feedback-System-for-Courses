import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, feedbackQuery } from "@/server/feedback-http";
import { requireCan } from "@/server/policies/can";
import { ensureDueSurveyAnomalies } from "@/server/services/survey-anomaly-detection";
import { listSurveyAnomalies } from "@/server/services/survey-anomalies";
import { anomalyQuerySchema } from "@/server/services/survey-anomaly-types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    requireCan(actor, "anomalies:list");
    const query = anomalyQuerySchema.parse(feedbackQuery(request));
    await ensureDueSurveyAnomalies(
      {
        kind: "SERVER_CONSOLE",
        reason: "Kiểm chỉ số bất thường khi mở danh sách",
      },
      { limit: 10 },
    );
    return authJson({ ok: true, ...(await listSurveyAnomalies(actor, query)) });
  } catch (error) {
    return apiFailure(error);
  }
}
