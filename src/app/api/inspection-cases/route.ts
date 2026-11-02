import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, feedbackQuery } from "@/server/feedback-http";
import { listInspectionCases } from "@/server/services/inspection-workflow";
import { inspectionQueueSchema } from "@/server/services/inspection-workflow-types";
import { ensureDueFeedback } from "@/server/services/feedback-sla";
import { requireCan } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    requireCan(actor, "inspection:list");
    const query = inspectionQueueSchema.parse(feedbackQuery(request));
    await ensureDueFeedback(
      {
        kind: "SERVER_CONSOLE",
        reason: "Kiểm tra hạn khi truy cập hồ sơ Thanh tra",
      },
      { limit: 100 },
    );
    return authJson({
      ok: true,
      ...(await listInspectionCases(actor, query)),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
