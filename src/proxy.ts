import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  documentContentSecurityPolicy,
  securityHeaders,
} from "./lib/security-headers";

/** Proxy bổ sung header trình duyệt; xác thực/phân quyền vẫn thuộc route/service. */
export function proxy(request: NextRequest) {
  const production = process.env.NODE_ENV === "production";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-nonce");
  requestHeaders.delete("content-security-policy");
  const document = !/^\/api(?:\/|$)/.test(request.nextUrl.pathname);
  let policy: string | undefined;
  if (document) {
    const nonce = randomBytes(24).toString("base64");
    policy = documentContentSecurityPolicy(nonce, production);
    // Next đọc CSP của request để gắn cùng nonce vào script SSR và script runtime.
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", policy);
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of Object.entries(securityHeaders(production)))
    response.headers.set(key, value);
  if (policy) {
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  // API tải tệp tự đặt CSP sandbox mạnh hơn; proxy không ghi đè chính sách đó.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
