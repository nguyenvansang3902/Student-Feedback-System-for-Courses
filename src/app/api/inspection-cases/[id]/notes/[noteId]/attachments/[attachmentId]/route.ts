import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { downloadInspectionNoteAttachment } from "@/server/services/inspection-workflow";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; noteId: string; attachmentId: string }> },
) {
  try {
    const actor = await feedbackActor(request);
    noFeedbackQuery(request);
    const { id, noteId, attachmentId } = await params;
    const file = await downloadInspectionNoteAttachment(
      actor,
      id,
      noteId,
      attachmentId,
    );
    return new Response(new Uint8Array(file.content), {
      headers: file.headers,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
