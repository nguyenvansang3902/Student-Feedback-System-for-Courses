import type { NextRequest } from "next/server";
import { authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import {
  feedbackActor,
  feedbackQuery,
  noFeedbackQuery,
  readFeedbackBody,
} from "@/server/feedback-http";
import {
  getImprovement,
  listImprovements,
  mutateImprovement,
} from "@/server/services/improvements";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const missing = () =>
  authJson({ ok: false, message: "Không tìm thấy chức năng giải trình." }, 404);
export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await feedbackActor(request),
      path = (await context.params).path ?? [];
    if (!path.length)
      return authJson({
        ok: true,
        ...(await listImprovements(actor, feedbackQuery(request))),
      });
    noFeedbackQuery(request);
    if (path.length === 1)
      return authJson({ ok: true, item: await getImprovement(actor, path[0]) });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await feedbackActor(request, true),
      path = (await context.params).path ?? [];
    noFeedbackQuery(request);
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await mutateImprovement(
          actor,
          path[0],
          await readFeedbackBody(request),
        ),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
