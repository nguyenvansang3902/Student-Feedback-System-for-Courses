import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/env";
import { authorizeAuthAction } from "@/server/policies/auth";
import { requireCan } from "@/server/policies/can";
import { AuthError, type AuthActor } from "./types";

type CsrfPurpose = "admin" | "catalog" | "templates" | "campaigns";
function signature(payload: string, purpose: CsrfPurpose) {
  return createHmac("sha256", getAuthConfig().jwtSecret)
    .update(`sfs-${purpose}-csrf-v1:${payload}`)
    .digest();
}

/** Token chỉ hợp lệ cho đúng access-session đã kiểm DB, không truyền qua URL. */
export function issueAdminCsrf(actor: AuthActor): string {
  authorizeAuthAction(actor, "admin");
  return issueCsrf(actor, "admin");
}

/** CSRF bảo vệ phiên mở danh mục; quyền ghi từng entity vẫn do service quyết định. */
export function issueCatalogCsrf(actor: AuthActor): string {
  requireCan(actor, "catalog:list");
  return issueCsrf(actor, "catalog");
}

/** Mẫu phiếu dùng miền chữ ký riêng, không nhận token quản trị/danh mục. */
export function issueTemplatesCsrf(actor: AuthActor): string {
  requireCan(actor, "templates:write");
  return issueCsrf(actor, "templates");
}

/** Đợt khảo sát dùng chữ ký riêng, quyền chuyển trạng thái do service kiểm. */
export function issueCampaignsCsrf(actor: AuthActor): string {
  requireCan(actor, "campaigns:read");
  return issueCsrf(actor, "campaigns");
}

export function assertCampaignsCsrf(
  request: NextRequest,
  actor: AuthActor,
): void {
  requireCan(actor, "campaigns:read");
  assertCsrf(request, actor, "campaigns");
}

function issueCsrf(actor: AuthActor, purpose: CsrfPurpose): string {
  const payload = Buffer.from(
    JSON.stringify({
      sid: actor.sessionId,
      uid: actor.userId,
      exp: Math.floor(Date.now() / 1000) + 900,
      nonce: randomBytes(24).toString("base64url"),
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, purpose).toString("base64url")}`;
}

export function assertAdminCsrf(request: NextRequest, actor: AuthActor): void {
  authorizeAuthAction(actor, "admin");
  assertCsrf(request, actor, "admin");
}

export function assertCatalogCsrf(
  request: NextRequest,
  actor: AuthActor,
): void {
  requireCan(actor, "catalog:list");
  assertCsrf(request, actor, "catalog");
}

export function assertTemplatesCsrf(
  request: NextRequest,
  actor: AuthActor,
): void {
  requireCan(actor, "templates:write");
  assertCsrf(request, actor, "templates");
}

function assertCsrf(
  request: NextRequest,
  actor: AuthActor,
  purpose: CsrfPurpose,
): void {
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
  const expected = signature(payload, purpose);
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
