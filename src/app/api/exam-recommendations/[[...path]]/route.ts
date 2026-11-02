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
  createExamRecommendation,
  getExamRecommendation,
  getRecommendationOptions,
  listExamRecommendations,
  respondExamRecommendation,
} from "@/server/services/exam-recommendations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const missing = () =>
  authJson(
    { ok: false, message: "Không tìm thấy chức năng kiến nghị rà soát." },
    404,
  );
export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await feedbackActor(request),
      path = (await context.params).path ?? [];
    if (!path.length)
      return authJson({
        ok: true,
        ...(await listExamRecommendations(actor, feedbackQuery(request))),
      });
    noFeedbackQuery(request);
    if (path.length === 1 && path[0] === "options")
      return authJson({ ok: true, ...(await getRecommendationOptions(actor)) });
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await getExamRecommendation(actor, path[0]),
      });
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
    const body = await readFeedbackBody(request);
    if (!path.length)
      return authJson(
        { ok: true, item: await createExamRecommendation(actor, body) },
        201,
      );
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await respondExamRecommendation(actor, path[0], body),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
