import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { getInspectionCase } from "@/server/services/inspection-workflow";
import { ensureDueFeedback } from "@/server/services/feedback-sla";
import { requireCan } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await feedbackActor(request);
    requireCan(actor, "inspection:read");
    noFeedbackQuery(request);
    await ensureDueFeedback(
      {
        kind: "SERVER_CONSOLE",
        reason: "Kiểm tra hạn khi truy cập hồ sơ Thanh tra",
      },
      { limit: 100 },
    );
    return authJson({
      ok: true,
      item: await getInspectionCase(actor, (await params).id),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
