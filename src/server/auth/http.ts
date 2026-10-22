import { isIP } from "node:net";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/env";
import { getActor } from "@/server/services/auth";
import { AuthError, type AuthContext, type SessionTokens } from "./types";

export const ACCESS_COOKIE = "sfs_access";
export const REFRESH_COOKIE = "sfs_refresh";

export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function assertSameOrigin(request: NextRequest) {
  const configured = getAuthConfig().appUrl;
  if (request.headers.get("origin") !== configured)
    throw new AuthError(
      "Yêu cầu không hợp lệ. Hãy mở ứng dụng từ địa chỉ đã cấu hình.",
      403,
      "INVALID_ORIGIN",
    );
  // Next có thể dựng request.url từ hostname nội bộ; Host phải khớp origin cấu hình.
  if (request.headers.get("host") !== new URL(configured).host)
    throw new AuthError(
      "Địa chỉ ứng dụng không hợp lệ.",
      403,
      "INVALID_ORIGIN",
    );
}

export function authContext(request: NextRequest): AuthContext {
  const forwarded = getAuthConfig().trustProxy
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    : undefined;
  return {
    ip: forwarded && isIP(forwarded) ? forwarded : "untrusted-client",
    userAgent: request.headers.get("user-agent")?.slice(0, 512),
  };
}

export async function readAuthBody(request: NextRequest): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthError("Dữ liệu gửi lên phải có định dạng JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu dữ liệu yêu cầu.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new AuthError("Dữ liệu gửi lên quá lớn.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Dữ liệu yêu cầu không hợp lệ.");
  } finally {
    reader.releaseLock();
  }
}

const cookieOptions = (path: string) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path,
});

export function setSessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions("/"),
    expires: tokens.accessExpiresAt,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions("/api/auth"),
    ...(tokens.refreshToken
      ? { expires: tokens.refreshExpiresAt }
      : { maxAge: 0, expires: new Date(0) }),
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...cookieOptions("/"),
    maxAge: 0,
    expires: new Date(0),
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    ...cookieOptions("/api/auth"),
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getPageActor(
  options: { allowPasswordChange?: boolean } = {},
) {
  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE)?.value;
  if (!raw) return null;
  const actor = await getActor(raw, true);
  if (actor?.mustChangePassword && !options.allowPasswordChange) return actor;
  // Trang tự điều hướng bắt buộc đổi mật khẩu; không trả DTO nghiệp vụ ở đây.
  return actor;
}
