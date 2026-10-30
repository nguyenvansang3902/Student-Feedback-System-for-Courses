import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  assertSameOrigin,
  authContext,
  authJson,
} from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { assertAdminCsrf } from "@/server/auth/csrf";
import { readSurveyResultsBody } from "@/server/auth/survey-results-body";
import { AuthError } from "@/server/auth/types";
import { authorizeAuthAction } from "@/server/policies/auth";
import { getActor } from "@/server/services/auth";
import { assertStepUp } from "@/server/services/mfa";
import {
  getSurveyResultSettings,
  setSurveyResultSettings,
  updateSurveyResultSettingsSchema,
} from "@/server/services/survey-results-settings";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const empty = z.object({}).strict();
async function actorFor(request: NextRequest) {
  const raw = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = raw ? await getActor(raw) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập và xác thực hai bước.",
      401,
      "INVALID_SESSION",
    );
  authorizeAuthAction(actor, "admin");
  return actor;
}
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFor(request);
    empty.parse(Object.fromEntries(request.nextUrl.searchParams));
    return authJson({ ok: true, item: await getSurveyResultSettings(actor) });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await actorFor(request);
    assertAdminCsrf(request, actor);
    empty.parse(Object.fromEntries(request.nextUrl.searchParams));
    const { stepUpCode, ...data } = updateSurveyResultSettingsSchema
      .safeExtend({ stepUpCode: z.string().regex(/^\d{6}$/) })
      .strict()
      .parse(await readSurveyResultsBody(request));
    await assertStepUp(actor, stepUpCode, authContext(request));
    return authJson({
      ok: true,
      item: await setSurveyResultSettings(actor, data),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
