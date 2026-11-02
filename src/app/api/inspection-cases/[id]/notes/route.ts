import type { NextRequest } from "next/server";
import { apiFailure } from "@/server/auth/api-error";
import { authJson } from "@/server/auth/http";
import { feedbackActor, noFeedbackQuery } from "@/server/feedback-http";
import { readInspectionNote } from "@/server/inspection-note-http";
import { requireCan } from "@/server/policies/can";
import { addInspectionNote } from "@/server/services/inspection-workflow";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await feedbackActor(request, true);
    requireCan(actor, "inspection:assign");
    noFeedbackQuery(request);
    const { input, uploads } = await readInspectionNote(request);
    return authJson(
      {
        ok: true,
        item: await addInspectionNote(actor, (await params).id, input, uploads),
      },
      201,
    );
  } catch (error) {
    return apiFailure(error);
  }
}
