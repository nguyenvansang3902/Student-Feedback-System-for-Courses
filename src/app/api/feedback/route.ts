import { ensureDueFeedback } from "@/server/services/feedback-sla";
import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import {
  readFeedbackBody,
  feedbackActor,
  feedbackQuery,
  noFeedbackQuery,
} from "@/server/feedback-http";
import { createFeedback, listFeedback } from "@/server/services/feedback";
import {
  createFeedbackSchema,
  feedbackListSchema,
} from "@/server/services/feedback-types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const actor = await feedbackActor(request);
    await ensureDueFeedback(
      { kind: "SERVER_CONSOLE", reason: "Kiểm tra hạn khi truy cập phản hồi" },
      { limit: 100 },
    );
    return authJson({
      ok: true,
      ...(await listFeedback(
        actor,
        feedbackListSchema.parse(feedbackQuery(request)),
      )),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await feedbackActor(request, true);
    noFeedbackQuery(request);
    return authJson(
      {
        ok: true,
        item: await createFeedback(
          actor,
          createFeedbackSchema.parse(await readFeedbackBody(request)),
        ),
      },
      201,
    );
  } catch (error) {
    return apiFailure(error);
  }
}
