import type { NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, assertSameOrigin, authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import {
  assertSurveyResultsCsrf,
  issueSurveyResultsCsrf,
} from "@/server/auth/csrf";
import { readSurveyResultsBody } from "@/server/auth/survey-results-body";
import { AuthError } from "@/server/auth/types";
import { can } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import { pageInput } from "@/server/services/access";
import {
  getSurveyClassResults,
  getSurveyResults,
  listSurveyResults,
} from "@/server/services/survey-results";
import {
  aggregateSurveyResults,
  publishSurveyResults,
} from "@/server/services/survey-results-mutations";
import {
  listSurveyModeration,
  moderateSurveyAnswer,
} from "@/server/services/survey-moderation";
import {
  listIncompleteStudents,
  remindIncompleteStudents,
} from "@/server/services/survey-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const empty = z.object({}).strict();
const id = z.uuid();
const paged = pageInput
  .extend({ search: z.string().trim().max(100).optional() })
  .strict();
const moderationQuery = pageInput
  .extend({
    status: z.enum(["CHO_KIEM_DUYET", "HIEN_THI", "DA_AN"]).optional(),
  })
  .strict();
const incompleteQuery = pageInput.extend({ sectionId: id.optional() }).strict();
const actionInput = z
  .object({ expectedRevision: z.number().int().min(1), requestId: id })
  .strict();
const missing = () =>
  authJson(
    { ok: false, message: "Không tìm thấy chức năng kết quả khảo sát." },
    404,
  );

async function resultsActor(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để xem kết quả khảo sát.",
      401,
      "INVALID_SESSION",
    );
  if (
    !["results:read", "results:assessment", "results:incomplete"].some(
      (action) => can(actor, action),
    )
  )
    throw new AuthError(
      "Bạn không có quyền thực hiện thao tác này.",
      403,
      "FORBIDDEN",
    );
  return actor;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await resultsActor(request);
    const path = (await context.params).path ?? [];
    const query = Object.fromEntries(request.nextUrl.searchParams);
    if (!path.length)
      return authJson({
        ok: true,
        ...(await listSurveyResults(actor, paged.parse(query))),
      });
    if (path.length === 1 && path[0] === "csrf") {
      empty.parse(query);
      return authJson({ ok: true, csrfToken: issueSurveyResultsCsrf(actor) });
    }
    if (path.length === 1) {
      const parsed = z
        .object({ audience: z.enum(["STANDARD", "ASSESSMENT"]).optional() })
        .strict()
        .parse(query);
      return authJson({
        ok: true,
        item: await getSurveyResults(actor, id.parse(path[0]), parsed.audience),
      });
    }
    if (path.length === 3 && path[1] === "classes") {
      empty.parse(query);
      return authJson({
        ok: true,
        item: await getSurveyClassResults(
          actor,
          id.parse(path[0]),
          id.parse(path[2]),
        ),
      });
    }
    if (path.length === 2 && path[1] === "moderation")
      return authJson({
        ok: true,
        ...(await listSurveyModeration(
          actor,
          id.parse(path[0]),
          moderationQuery.parse(query),
        )),
      });
    if (path.length === 2 && path[1] === "incomplete")
      return authJson({
        ok: true,
        ...(await listIncompleteStudents(
          actor,
          id.parse(path[0]),
          incompleteQuery.parse(query),
        )),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const actor = await resultsActor(request);
    assertSurveyResultsCsrf(request, actor);
    const path = (await context.params).path ?? [];
    empty.parse(Object.fromEntries(request.nextUrl.searchParams));
    const input = await readSurveyResultsBody(request);
    if (path.length === 2 && path[1] === "aggregate")
      return authJson({
        ok: true,
        item: await aggregateSurveyResults(
          actor,
          id.parse(path[0]),
          actionInput.parse(input),
        ),
      });
    if (path.length === 2 && path[1] === "publish")
      return authJson({
        ok: true,
        item: await publishSurveyResults(
          actor,
          id.parse(path[0]),
          actionInput.parse(input),
        ),
      });
    if (path.length === 2 && path[1] === "moderation") {
      const { answerId, ...data } = z
        .object({
          answerId: id,
          status: z.enum(["HIEN_THI", "DA_AN"]),
          reason: z.string().trim().min(1).max(500),
        })
        .strict()
        .parse(input);
      return authJson({
        ok: true,
        item: await moderateSurveyAnswer(
          actor,
          id.parse(path[0]),
          answerId,
          data,
        ),
      });
    }
    if (path.length === 2 && path[1] === "remind") {
      const data = z.object({ sectionId: id.optional() }).strict().parse(input);
      return authJson({
        ok: true,
        item: await remindIncompleteStudents(actor, id.parse(path[0]), data),
      });
    }
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
