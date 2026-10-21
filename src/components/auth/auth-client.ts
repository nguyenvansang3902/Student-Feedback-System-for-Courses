"use client";

type AuthUser = { id: string; mustChangePassword: boolean };
type ApiResult = {
  ok?: boolean;
  message?: string;
  code?: string;
  mustChangePassword?: boolean;
  user?: AuthUser;
};

let refreshRequest: Promise<boolean> | null = null;
let restoreRequest: Promise<AuthUser | null> | null = null;

function readResult(value: unknown): ApiResult {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const user =
    source.user && typeof source.user === "object"
      ? (source.user as Record<string, unknown>)
      : null;
  return {
    ok: source.ok === true,
    message: typeof source.message === "string" ? source.message : undefined,
    code: typeof source.code === "string" ? source.code : undefined,
    mustChangePassword: source.mustChangePassword === true,
    user:
      user &&
      typeof user.id === "string" &&
      typeof user.mustChangePassword === "boolean"
        ? { id: user.id, mustChangePassword: user.mustChangePassword }
        : undefined,
  };
}

export function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function authRequest(
  path: string,
  body: Record<string, string>,
  retryOnExpiredSession = false,
): Promise<{ response: Response; result: ApiResult }> {
  const send = () =>
    fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  let response = await send();
  if (
    retryOnExpiredSession &&
    response.status === 401 &&
    (await refreshSession())
  )
    response = await send();
  const result = readResult(await response.json().catch(() => null));
  return { response, result };
}

export function restoreSession(): Promise<AuthUser | null> {
  if (!restoreRequest) {
    restoreRequest = (async () => {
      let response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401 && (await refreshSession()))
        response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
      if (!response.ok) return null;
      return readResult(await response.json().catch(() => null)).user ?? null;
    })()
      .catch(() => null)
      .finally(() => {
        restoreRequest = null;
      });
  }
  return restoreRequest;
}
