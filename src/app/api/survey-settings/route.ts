import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  assertSameOrigin,
  authContext,
  authJson,
  readAuthBody,
} from "@/server/auth/http";
import { assertAdminCsrf } from "@/server/auth/csrf";
import { apiFailure } from "@/server/auth/api-error";
import { AuthError } from "@/server/auth/types";
import { requireCan } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import { assertStepUp } from "@/server/services/mfa";
import {
  getSurveySettings,
  setSurveySettings,
  updateSurveySettingsSchema,
} from "@/server/services/survey-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function settingsActor(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để xem cấu hình khảo sát.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "campaign-settings:read");
  if (request.nextUrl.searchParams.size)
    throw new AuthError("Tham số cấu hình không hợp lệ.", 400, "INVALID_INPUT");
  return actor;
}

export async function GET(request: NextRequest) {
  try {
    return authJson({
      ok: true,
      item: await getSurveySettings(await settingsActor(request)),
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await settingsActor(request);
    requireCan(actor, "campaign-settings:write");
    assertAdminCsrf(request, actor);
    const { stepUpCode, ...input } = updateSurveySettingsSchema
      .extend({
        stepUpCode: z.string().regex(/^\d{6}$/),
      })
      .strict()
      .parse(await readAuthBody(request));
    await assertStepUp(actor, stepUpCode, authContext(request));
    return authJson({ ok: true, item: await setSurveySettings(actor, input) });
  } catch (error) {
    return apiFailure(error);
  }
}
