import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { Role, SessionPurpose } from "../../generated/prisma/enums";
import { getAuthConfig } from "../../lib/env";
import type { AuthActor } from "./types";

export interface AccessClaims extends JWTPayload {
  sub: string;
  sid: string;
  fid: string;
  roles: Role[];
  mfa: boolean;
  purpose: SessionPurpose;
  pwd: boolean;
  tokenUse: "access";
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isRefreshToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function mintAccessToken(
  actor: AuthActor,
  expiresAt: Date,
): Promise<string> {
  const config = getAuthConfig();
  return new SignJWT({
    sid: actor.sessionId,
    fid: actor.familyId,
    roles: actor.roles,
    mfa: actor.mfa,
    purpose:
      actor.purpose ?? (actor.mustChangePassword ? "PASSWORD_CHANGE" : "FULL"),
    pwd: actor.mustChangePassword,
    tokenUse: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setSubject(actor.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(config.jwtSecret));
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessClaims | null> {
  if (token.length > 8192) return null;
  const config = getAuthConfig();
  try {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(config.jwtSecret),
      {
        algorithms: ["HS256"],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
        requiredClaims: ["exp", "iat", "sub", "jti"],
      },
    );
    const uuid =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    if (
      protectedHeader.typ !== "JWT" ||
      payload.tokenUse !== "access" ||
      typeof payload.sub !== "string" ||
      !uuid.test(payload.sub) ||
      typeof payload.sid !== "string" ||
      !uuid.test(payload.sid) ||
      typeof payload.fid !== "string" ||
      !uuid.test(payload.fid) ||
      typeof payload.mfa !== "boolean" ||
      !Object.values(SessionPurpose).includes(
        payload.purpose as SessionPurpose,
      ) ||
      (payload.mfa && (payload.purpose !== "FULL" || payload.pwd !== false)) ||
      typeof payload.pwd !== "boolean" ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every((role) => Object.values(Role).includes(role))
    )
      return null;
    return payload as AccessClaims;
  } catch {
    return null;
  }
}
