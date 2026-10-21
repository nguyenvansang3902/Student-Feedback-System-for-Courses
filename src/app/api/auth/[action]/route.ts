import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  assertSameOrigin,
  authContext,
  authJson,
  clearSessionCookies,
  readAuthBody,
  setSessionCookies,
} from "@/server/auth/http";
import { AuthError } from "@/server/auth/types";
import {
  changePassword,
  getActor,
  login,
  logout,
  refreshSession,
} from "@/server/services/auth";
import {
  activateAccount,
  requestActivation,
  requestPasswordReset,
  resetPassword,
} from "@/server/services/account-recovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ action: string }> };
const password = z.string().min(1).max(4096);
const loginInput = z
  .object({ identifier: z.string().trim().min(1).max(254), password })
  .strict();
const emailInput = z.object({ email: z.email().max(254) }).strict();
const completeInput = z
  .object({ token: z.string().min(1).max(256), newPassword: password })
  .strict();
const changeInput = z
  .object({ currentPassword: password, newPassword: password })
  .strict();
const supported = new Set([
  "login",
  "logout",
  "refresh",
  "change-password",
  "forgot-password",
  "request-activation",
  "reset-password",
  "activate",
]);

function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return authJson(
      {
        ok: false,
        message: "Vui lòng kiểm tra lại thông tin đã nhập.",
        code: "VALIDATION_ERROR",
      },
      400,
    );
  if (error instanceof AuthError)
    return authJson(
      { ok: false, message: error.message, code: error.code },
      error.status,
    );
  // Không log exception/SQL: có thể kèm token, mật khẩu hoặc biến môi trường.
  return authJson(
    {
      ok: false,
      message:
        "Hệ thống tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau.",
      code: "SERVER_ERROR",
    },
    503,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (action !== "me")
    return authJson({ ok: false, message: "Không tìm thấy chức năng." }, 404);
  try {
    const raw = request.cookies.get(ACCESS_COOKIE)?.value;
    const actor = raw ? await getActor(raw, true) : null;
    if (!actor)
      throw new AuthError(
        "Vui lòng đăng nhập để tiếp tục.",
        401,
        "INVALID_SESSION",
      );
    return authJson({
      ok: true,
      user: {
        id: actor.userId,
        loginCode: actor.loginCode,
        email: actor.email,
        displayName: actor.displayName,
        roles: actor.roles,
        mustChangePassword: actor.mustChangePassword,
        mfa: actor.mfa,
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (!supported.has(action))
    return authJson({ ok: false, message: "Không tìm thấy chức năng." }, 404);
  let verifiedOrigin = false;
  try {
    assertSameOrigin(request);
    verifiedOrigin = true;
    const input = await readAuthBody(request);
    const client = authContext(request);
    const access = request.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (action === "login") {
      const tokens = await login(null, loginInput.parse(input), client);
      const response = authJson({
        ok: true,
        mustChangePassword: tokens.actor.mustChangePassword,
      });
      setSessionCookies(response, tokens);
      return response;
    }
    if (action === "refresh") {
      z.object({}).strict().parse(input);
      const tokens = await refreshSession(null, refresh ?? "", client);
      const response = authJson({
        ok: true,
        mustChangePassword: tokens.actor.mustChangePassword,
      });
      setSessionCookies(response, tokens);
      return response;
    }
    if (action === "logout") {
      z.object({}).strict().parse(input);
      const actor = access ? await getActor(access, true) : null;
      await logout(actor, refresh);
      const response = authJson({ ok: true });
      clearSessionCookies(response);
      return response;
    }
    if (action === "change-password") {
      const actor = access ? await getActor(access, true) : null;
      if (!actor)
        throw new AuthError(
          "Vui lòng đăng nhập để tiếp tục.",
          401,
          "INVALID_SESSION",
        );
      await changePassword(actor, changeInput.parse(input));
      const response = authJson({
        ok: true,
        message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại.",
      });
      clearSessionCookies(response);
      return response;
    }
    if (action === "forgot-password" || action === "request-activation") {
      const { email } = emailInput.parse(input);
      if (action === "forgot-password")
        await requestPasswordReset(null, email, client);
      else await requestActivation(null, email, client);
      return authJson({
        ok: true,
        message:
          "Nếu tài khoản phù hợp, hướng dẫn sẽ được gửi đến email đã đăng ký.",
      });
    }
    const data = completeInput.parse(input);
    if (action === "reset-password") await resetPassword(null, data, client);
    else await activateAccount(null, data, client);
    const response = authJson({
      ok: true,
      message: "Đã hoàn tất. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
    clearSessionCookies(response);
    return response;
  } catch (error) {
    const response = failure(error);
    if (verifiedOrigin && (action === "refresh" || action === "logout"))
      clearSessionCookies(response);
    return response;
  }
}
