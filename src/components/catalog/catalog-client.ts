"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
export class CatalogRequestError extends Error {
  constructor(
    message: string,
    public readonly errors: {
      row: number;
      column: string;
      code: string;
      message: string;
    }[] = [],
  ) {
    super(message);
  }
}
async function token(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const response = await catalogFetch("/api/catalog/csrf");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.csrfToken !== "string")
        throw new Error(
          "Không lấy được xác nhận bảo mật. Hãy tải lại trang hoặc đăng nhập lại.",
        );
      csrfToken = data.csrfToken;
      return data.csrfToken as string;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}
export async function catalogFetch(
  path: string,
  body?: Record<string, unknown> | FormData,
) {
  async function send() {
    const headers: Record<string, string> = {};
    if (body) {
      headers["X-CSRF-Token"] = await token();
      if (!(body instanceof FormData))
        headers["Content-Type"] = "application/json";
    }
    return fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
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
  return response;
}
export async function catalogRequest<T>(
  path: string,
  body?: Record<string, unknown> | FormData,
): Promise<T> {
  const response = await catalogFetch(path, body);
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new CatalogRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa xử lý được yêu cầu. Vui lòng thử lại.",
      Array.isArray(data.errors) ? data.errors : [],
    );
  return data as T;
}
export function useCatalogResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    let active = true;
    void catalogRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active)
          setState({
            key,
            error:
              error instanceof Error ? error.message : "Chưa tải được dữ liệu.",
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
