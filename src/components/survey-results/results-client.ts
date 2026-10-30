"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";

let cachedCsrf: { token: string; expiresAt: number } | null = null;
let csrfRequest: Promise<string> | null = null;

export class ResultsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const resultsMessageOf = (error: unknown): string =>
  error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Chưa kết nối được với máy chủ. Hãy tải lại dữ liệu để kiểm tra trạng thái trước khi thử lại.";

async function csrf(): Promise<string> {
  if (cachedCsrf && cachedCsrf.expiresAt > Date.now()) return cachedCsrf.token;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const data = await resultsRequest<{ csrfToken: string }>(
        "/api/survey-results/csrf",
      );
      if (typeof data.csrfToken !== "string")
        throw new Error("Chưa lấy được xác nhận bảo mật. Hãy tải lại trang.");
      cachedCsrf = { token: data.csrfToken, expiresAt: Date.now() + 840_000 };
      return data.csrfToken;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

/** POST chỉ gửi một lần. UI giữ requestId và đọc trạng thái trước khi thử lại. */
export async function resultsRequest<T>(
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
  let sessionLost = false;
  if (response.status === 401) {
    cachedCsrf = null;
    const refreshed = await refreshSession();
    if (body === undefined && refreshed) response = await send();
    else if (!refreshed) sessionLost = true;
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 403 && data.code === "INVALID_CSRF")
    cachedCsrf = null;
  if (response.status === 401 && (body === undefined || sessionLost)) {
    cachedCsrf = null;
    window.location.replace("/dang-nhap");
  }
  if (!response.ok)
    throw new ResultsRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa xử lý được yêu cầu. Hãy thử lại.",
      response.status,
      data.code,
    );
  return data as T;
}

export function useResultsResource<T>(path: string | null) {
  const [version, setVersion] = useState(0),
    key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    if (!path) return;
    let active = true;
    void resultsRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active) setState({ key, error: resultsMessageOf(error) });
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
