import type { NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, assertSameOrigin, authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import {
  assertStudentSurveysCsrf,
  issueStudentSurveysCsrf,
} from "@/server/auth/csrf";
import { readStudentSurveyBody } from "@/server/auth/student-survey-body";
import { AuthError } from "@/server/auth/types";
import { requireCan } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import { pageInput } from "@/server/services/access";
import {
  getStudentSurvey,
  listStudentSurveys,
  submitStudentSurvey,
} from "@/server/services/student-surveys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const empty = z.object({}).strict();
const listInput = pageInput
  .extend({ status: z.enum(["PENDING", "DONE"]).optional() })
  .strict();
const missing = () =>
  authJson({ ok: false, message: "Không tìm thấy chức năng khảo sát." }, 404);

async function studentActor(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để làm khảo sát.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "student-surveys:read");
  return actor;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await studentActor(request);
    const path = (await context.params).path ?? [];
    const query = Object.fromEntries(request.nextUrl.searchParams);
    if (!path.length)
      return authJson({
        ok: true,
        ...(await listStudentSurveys(actor, listInput.parse(query))),
        serverTime: new Date().toISOString(),
      });
    empty.parse(query);
    if (path.length === 1 && path[0] === "csrf")
      return authJson({
        ok: true,
        csrfToken: issueStudentSurveysCsrf(actor),
        serverTime: new Date().toISOString(),
      });
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await getStudentSurvey(actor, path[0]),
        serverTime: new Date().toISOString(),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const actor = await studentActor(request);
    requireCan(actor, "student-surveys:submit");
    assertStudentSurveysCsrf(request, actor);
    empty.parse(Object.fromEntries(request.nextUrl.searchParams));
    const path = (await context.params).path ?? [];
    if (path.length !== 2 || path[1] !== "submit") return missing();
    return authJson({
      ok: true,
      item: await submitStudentSurvey(
        actor,
        path[0],
        await readStudentSurveyBody(request),
      ),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
