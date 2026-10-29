import type { NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, assertSameOrigin, authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { assertCampaignsCsrf, issueCampaignsCsrf } from "@/server/auth/csrf";
import { readCampaignBody } from "@/server/auth/campaign-body";
import { AuthError } from "@/server/auth/types";
import { requireCan } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import { pageInput } from "@/server/services/access";
import {
  campaignListSchema,
  campaignOptionSchema,
} from "@/server/services/campaign-input";
import { campaignActions } from "@/server/services/campaign-types";
import {
  createCampaign,
  getCampaign,
  getCampaignOptions,
  getCampaignProgress,
  getCampaignReadiness,
  listCampaigns,
  performCampaignAction,
  updateCampaign,
} from "@/server/services/campaigns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const empty = z.object({}).strict();
const missing = () =>
  authJson(
    { ok: false, message: "Không tìm thấy chức năng đợt khảo sát." },
    404,
  );

async function campaignActor(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = token ? await getActor(token) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để xem đợt khảo sát.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "campaigns:read");
  return actor;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await campaignActor(request);
    const path = (await context.params).path ?? [];
    const query = Object.fromEntries(request.nextUrl.searchParams);
    if (path.length === 0)
      return authJson({
        ok: true,
        ...(await listCampaigns(actor, campaignListSchema.parse(query))),
      });
    if (path.length === 1 && path[0] === "csrf") {
      empty.parse(query);
      return authJson({ ok: true, csrfToken: issueCampaignsCsrf(actor) });
    }
    if (path.length === 1 && path[0] === "options")
      return authJson({
        ok: true,
        ...(await getCampaignOptions(actor, campaignOptionSchema.parse(query))),
      });
    if (path.length === 1) {
      empty.parse(query);
      return authJson({ ok: true, item: await getCampaign(actor, path[0]) });
    }
    if (path.length === 2 && path[1] === "readiness") {
      empty.parse(query);
      return authJson({
        ok: true,
        item: await getCampaignReadiness(actor, path[0]),
      });
    }
    if (path.length === 2 && path[1] === "progress")
      return authJson({
        ok: true,
        ...(await getCampaignProgress(
          actor,
          path[0],
          pageInput.strict().parse(query),
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
    const actor = await campaignActor(request);
    assertCampaignsCsrf(request, actor);
    const path = (await context.params).path ?? [];
    empty.parse(Object.fromEntries(request.nextUrl.searchParams));
    const input = await readCampaignBody(request);
    if (path.length === 0)
      return authJson(
        { ok: true, item: await createCampaign(actor, input) },
        201,
      );
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await updateCampaign(actor, path[0], input),
      });
    if (path.length === 2) {
      const parsed = z.enum(campaignActions).safeParse(path[1]);
      if (parsed.success)
        return authJson({
          ok: true,
          item: await performCampaignAction(actor, path[0], parsed.data, input),
        });
    }
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
