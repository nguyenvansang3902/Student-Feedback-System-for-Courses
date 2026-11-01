import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { downloadFeedbackAttachment } from "@/server/services/feedback-attachments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    const { id, attachmentId } = await context.params;
    const file = await downloadFeedbackAttachment(actor, id, attachmentId);
    return new Response(new Uint8Array(file.content), {
      headers: file.headers,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
