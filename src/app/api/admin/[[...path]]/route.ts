import type { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import {
  ACCESS_COOKIE,
  authContext,
  authJson,
  assertSameOrigin,
  readAuthBody,
} from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { assertAdminCsrf, issueAdminCsrf } from "@/server/auth/csrf";
import { AuthError } from "@/server/auth/types";
import { getActor } from "@/server/services/auth";
import { authorizeAuthAction } from "@/server/policies/auth";
import {
  listUsers,
  getUser,
  createUser,
  setUserStatus,
  replaceUserRoles,
  getAdminScopes,
} from "@/server/services/users";
import { listAuditLogs } from "@/server/services/audit";
import { getMfaPolicy, setMfaPolicy } from "@/server/services/mfa-policy";
import { assertStepUp, resetUserMfa } from "@/server/services/mfa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const idInput = z.uuid();
const role = z.enum(Role);
const grants = z
  .array(
    z
      .object({
        role,
        scopeType: z.enum(["GLOBAL", "FACULTY", "DEPARTMENT"]),
        facultyId: z.uuid().nullable().optional(),
        departmentId: z.uuid().nullable().optional(),
      })
      .strict(),
  )
  .min(1)
  .max(20);
const stepUp = z.string().regex(/^\d{6}$/);

async function adminActor(request: NextRequest) {
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
function absent() {
  return authJson({ ok: false, message: "Không tìm thấy chức năng." }, 404);
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await adminActor(request);
    const path = (await context.params).path ?? [];
    const query = Object.fromEntries(request.nextUrl.searchParams);
    if (path.length === 1 && path[0] === "csrf")
      return authJson({ ok: true, csrfToken: issueAdminCsrf(actor) });
    if (path.length === 1 && path[0] === "users")
      return authJson({ ok: true, ...(await listUsers(actor, query)) });
    if (path.length === 2 && path[0] === "users")
      return authJson({
        ok: true,
        user: await getUser(actor, idInput.parse(path[1])),
      });
    if (path.length === 1 && path[0] === "scopes")
      return authJson({ ok: true, ...(await getAdminScopes(actor)) });
    if (path.length === 1 && path[0] === "audit")
      return authJson({ ok: true, ...(await listAuditLogs(actor, query)) });
    if (path.length === 1 && path[0] === "mfa-policy")
      return authJson({ ok: true, ...(await getMfaPolicy(actor)) });
    return absent();
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const actor = await adminActor(request);
    assertAdminCsrf(request, actor);
    const path = (await context.params).path ?? [];
    const input = await readAuthBody(request);
    const client = authContext(request);
    if (path.length === 1 && path[0] === "users") {
      const { stepUpCode, ...data } = z
        .object({
          loginCode: z.string().trim().min(1).max(32),
          email: z.email().max(254),
          displayName: z.string().trim().min(1).max(160),
          roles: grants,
          stepUpCode: stepUp,
        })
        .strict()
        .parse(input);
      await assertStepUp(actor, stepUpCode, client);
      return authJson({ ok: true, user: await createUser(actor, data) }, 201);
    }
    if (path.length === 1 && path[0] === "mfa-policy") {
      const { stepUpCode, requiredRoles } = z
        .object({
          requiredRoles: z.array(role).min(1).max(Object.values(Role).length),
          stepUpCode: stepUp,
        })
        .strict()
        .parse(input);
      await assertStepUp(actor, stepUpCode, client);
      return authJson({
        ok: true,
        ...(await setMfaPolicy(actor, { requiredRoles })),
      });
    }
    if (path.length === 3 && path[0] === "users") {
      const id = idInput.parse(path[1]);
      if (path[2] === "status") {
        const data = z
          .object({ status: z.enum(["ACTIVE", "DISABLED"]) })
          .strict()
          .parse(input);
        return authJson({
          ok: true,
          user: await setUserStatus(actor, id, data),
        });
      }
      if (path[2] === "roles") {
        const { stepUpCode, roles } = z
          .object({ roles: grants, stepUpCode: stepUp })
          .strict()
          .parse(input);
        await assertStepUp(actor, stepUpCode, client);
        return authJson({
          ok: true,
          user: await replaceUserRoles(actor, id, { roles }),
        });
      }
      if (path[2] === "reset-mfa") {
        const { stepUpCode, reason } = z
          .object({
            stepUpCode: stepUp,
            reason: z.string().trim().min(10).max(500),
          })
          .strict()
          .parse(input);
        await assertStepUp(actor, stepUpCode, client);
        await resetUserMfa(actor, id, { reason }, client);
        return authJson({
          ok: true,
          message:
            "Đã đặt lại xác thực hai bước và thu hồi các phiên của tài khoản.",
        });
      }
    }
    return absent();
  } catch (error) {
    return apiFailure(error);
  }
}
