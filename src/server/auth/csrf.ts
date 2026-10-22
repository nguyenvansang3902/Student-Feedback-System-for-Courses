import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/env";
import { authorizeAuthAction } from "@/server/policies/auth";
import { AuthError, type AuthActor } from "./types";

function signature(payload: string) {
  return createHmac("sha256", getAuthConfig().jwtSecret)
    .update(`sfs-admin-csrf-v1:${payload}`)
    .digest();
}

/** Token chỉ hợp lệ cho đúng access-session đã kiểm DB, không truyền qua URL. */
export function issueAdminCsrf(actor: AuthActor): string {
  authorizeAuthAction(actor, "admin");
  const payload = Buffer.from(
    JSON.stringify({
      sid: actor.sessionId,
      uid: actor.userId,
      exp: Math.floor(Date.now() / 1000) + 900,
      nonce: randomBytes(24).toString("base64url"),
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function assertAdminCsrf(request: NextRequest, actor: AuthActor): void {
  authorizeAuthAction(actor, "admin");
  const token = request.headers.get("x-csrf-token") ?? "";
  const deny = () =>
    new AuthError(
      "Phiên bảo vệ thao tác đã hết hạn. Vui lòng tải lại trang.",
      403,
      "INVALID_CSRF",
    );
  if (token.length > 1024) throw deny();
  const parts = token.split(".");
  if (
    parts.length !== 2 ||
    !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  )
    throw deny();
  const [payload, rawSignature] = parts;
  const actual = Buffer.from(rawSignature, "base64url");
  const expected = signature(payload);
  if (actual.toString("base64url") !== rawSignature) throw deny();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw deny();
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (
      data.sid !== actor.sessionId ||
      data.uid !== actor.userId ||
      !Number.isInteger(data.exp) ||
      data.exp <= now ||
      data.exp > now + 900 ||
      typeof data.nonce !== "string" ||
      !/^[A-Za-z0-9_-]{32}$/.test(data.nonce)
    )
      throw deny();
  } catch {
    throw deny();
  }
}
