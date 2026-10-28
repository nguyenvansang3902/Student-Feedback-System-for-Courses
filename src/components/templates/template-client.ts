"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
export class TemplateRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}
async function token(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const data = await templateRequest<{ csrfToken: string }>(
        "/api/templates/csrf",
      );
      if (typeof data.csrfToken !== "string")
        throw new Error("Không lấy được xác nhận bảo mật. Hãy tải lại trang.");
      csrfToken = data.csrfToken;
      return csrfToken;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}
export async function templateRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  async function send() {
    return fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": await token(),
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  let response = await send();
  if (response.status === 401 && (await refreshSession())) {
    csrfToken = null;
    response = await send();
  }
  if (response.status === 401) {
    csrfToken = null;
    window.location.replace("/dang-nhap");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new TemplateRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa xử lý được mẫu phiếu. Vui lòng thử lại.",
      response.status,
      data.code,
    );
  return data as T;
}
export function useTemplatesResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    let active = true;
    void templateRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active)
          setState({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Chưa tải được mẫu phiếu.",
          });
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
