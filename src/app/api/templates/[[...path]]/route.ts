import type { NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, assertSameOrigin, authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { assertTemplatesCsrf, issueTemplatesCsrf } from "@/server/auth/csrf";
import { readTemplateBody } from "@/server/auth/template-body";
import { AuthError } from "@/server/auth/types";
import { requireCan } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import {
  cloneTemplate,
  createTemplate,
  createTemplateVersion,
  getTemplate,
  listTemplates,
  lockTemplate,
  setDefaultTemplate,
  updateTemplate,
} from "@/server/services/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };

async function templateActor(request: NextRequest) {
  const raw = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = raw ? await getActor(raw) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để quản lý mẫu phiếu.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "templates:read");
  return actor;
}
const absent = () =>
  authJson({ ok: false, message: "Không tìm thấy chức năng mẫu phiếu." }, 404);

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await templateActor(request);
    const path = (await context.params).path ?? [];
    if (path.length === 1 && path[0] === "csrf")
      return authJson({ ok: true, csrfToken: issueTemplatesCsrf(actor) });
    if (path.length === 0)
      return authJson({
        ok: true,
        ...(await listTemplates(actor, {
          ...Object.fromEntries(request.nextUrl.searchParams),
          ...(request.nextUrl.searchParams.has("isDefault")
            ? {
                isDefault:
                  z
                    .enum(["true", "false"])
                    .parse(request.nextUrl.searchParams.get("isDefault")) ===
                  "true",
              }
            : {}),
        })),
      });
    if (path.length === 1)
      return authJson({ ok: true, item: await getTemplate(actor, path[0]) });
    return absent();
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const actor = await templateActor(request);
    assertTemplatesCsrf(request, actor);
    const path = (await context.params).path ?? [];
    const input = await readTemplateBody(request);
    if (path.length === 0)
      return authJson(
        { ok: true, item: await createTemplate(actor, input) },
        201,
      );
    if (path.length === 1)
      return authJson({
        ok: true,
        item: await updateTemplate(actor, path[0], input),
      });
    if (path.length === 2) {
      const [id, action] = path;
      if (action === "lock")
        return authJson({
          ok: true,
          item: await lockTemplate(actor, id, input),
        });
      if (action === "version")
        return authJson(
          { ok: true, item: await createTemplateVersion(actor, id, input) },
          201,
        );
      if (action === "clone")
        return authJson(
          { ok: true, item: await cloneTemplate(actor, id, input) },
          201,
        );
      if (action === "default")
        return authJson({
          ok: true,
          item: await setDefaultTemplate(actor, id, input),
        });
    }
    return absent();
  } catch (error) {
    return apiFailure(error);
  }
}
