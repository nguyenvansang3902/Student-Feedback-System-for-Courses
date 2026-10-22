import type { NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, authJson } from "@/server/auth/http";
import { AuthError } from "@/server/auth/types";
import { apiFailure } from "@/server/auth/api-error";
import { getActor } from "@/server/services/auth";
import {
  listWorkspaceSections,
  getWorkspaceSection,
} from "@/server/services/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id?: string[] }> },
) {
  try {
    const raw = request.cookies.get(ACCESS_COOKIE)?.value;
    const actor = raw ? await getActor(raw) : null;
    if (!actor)
      throw new AuthError(
        "Vui lòng đăng nhập để tiếp tục.",
        401,
        "INVALID_SESSION",
      );
    const ids = (await context.params).id ?? [];
    if (ids.length > 1)
      return authJson({ ok: false, message: "Không tìm thấy dữ liệu." }, 404);
    if (ids.length)
      return authJson({
        ok: true,
        section: await getWorkspaceSection(actor, z.uuid().parse(ids[0])),
      });
    return authJson({
      ok: true,
      ...(await listWorkspaceSections(
        actor,
        Object.fromEntries(request.nextUrl.searchParams),
      )),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
