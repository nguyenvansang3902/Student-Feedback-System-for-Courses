"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";
import { clearAllSurveyDrafts } from "./survey-draft";

let cachedCsrf: { token: string; expiresAt: number } | null = null;
let csrfRequest: Promise<string> | null = null;
export class SurveyRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}
export const surveyMessageOf = (error: unknown) =>
  error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Chưa kết nối được với máy chủ. Bản nháp của sinh viên vẫn được giữ trên thiết bị này.";
async function csrf(): Promise<string> {
  if (cachedCsrf && cachedCsrf.expiresAt > Date.now()) return cachedCsrf.token;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const data = await surveyRequest<{ csrfToken: string }>(
        "/api/student-surveys/csrf",
      );
      if (typeof data.csrfToken !== "string")
        throw new Error(
          "Chưa lấy được xác nhận bảo mật. Vui lòng tải lại trang.",
        );
      cachedCsrf = { token: data.csrfToken, expiresAt: Date.now() + 840_000 };
      return data.csrfToken;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}
export async function surveyRequest<T>(
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
  // GET có thể đọc lại sau refresh; POST chỉ gửi đúng một lần, rồi form kiểm trạng thái nhiệm vụ.
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
    clearAllSurveyDrafts();
    window.location.replace("/dang-nhap");
  }
  if (!response.ok)
    throw new SurveyRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa xử lý được khảo sát. Vui lòng thử lại.",
      response.status,
      data.code,
    );
  return data as T;
}
export function useSurveyResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    let active = true;
    void surveyRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active) setState({ key, error: surveyMessageOf(error) });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: state.key !== key,
    reload: () => setVersion((value) => value + 1),
  };
}
