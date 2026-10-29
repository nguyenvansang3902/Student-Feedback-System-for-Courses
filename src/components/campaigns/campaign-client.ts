"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";

let cachedCsrf: string | null = null;
let csrfRequest: Promise<string> | null = null;
export class CampaignRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}
async function csrf(): Promise<string> {
  if (cachedCsrf) return cachedCsrf;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const data = await campaignRequest<{ csrfToken: string }>(
        "/api/campaigns/csrf",
      );
      if (typeof data.csrfToken !== "string")
        throw new Error("Không lấy được xác nhận bảo mật. Hãy tải lại trang.");
      cachedCsrf = data.csrfToken;
      return cachedCsrf;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}
export async function campaignRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const send = async () =>
    fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": await csrf(),
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  let response = await send();
  if (response.status === 401 && (await refreshSession())) {
    cachedCsrf = null;
    response = await send();
  }
  let data = await response.json().catch(() => ({}));
  if (
    body !== undefined &&
    response.status === 403 &&
    data.code === "INVALID_CSRF"
  ) {
    cachedCsrf = null;
    response = await send();
    data = await response.json().catch(() => ({}));
  }
  if (response.status === 401) {
    cachedCsrf = null;
    window.location.replace("/dang-nhap");
  }
  if (!response.ok)
    throw new CampaignRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa xử lý được đợt khảo sát. Vui lòng thử lại.",
      response.status,
      data.code,
    );
  return data as T;
}
export function useCampaignResource<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    if (!path) return;
    let active = true;
    void campaignRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active) setState({ key, error: messageOf(error) });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: !!path && state.key !== key,
    reload: () => setVersion((value) => value + 1),
  };
}
export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Chưa xử lý được đợt khảo sát. Vui lòng thử lại.";
