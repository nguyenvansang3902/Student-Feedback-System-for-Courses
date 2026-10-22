"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
type Json = Record<string, unknown>;
async function token(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const send = () =>
        fetch("/api/admin/csrf", {
          credentials: "same-origin",
          cache: "no-store",
        });
      let response = await send();
      if (response.status === 401 && (await refreshSession()))
        response = await send();
      const value = await response.json().catch(() => ({}));
      if (!response.ok || typeof value.csrfToken !== "string")
        throw new Error("Không lấy được xác nhận bảo mật. Hãy đăng nhập lại.");
      csrfToken = value.csrfToken;
      return value.csrfToken as string;
    })().finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}
export async function adminRequest<T = Json>(
  path: string,
  body?: Json,
): Promise<T> {
  async function send() {
    const headers: Record<string, string> = {};
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = await token();
    }
    return fetch(path, {
      method: body ? "POST" : "GET",
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  let response = await send();
  if (response.status === 401 && (await refreshSession())) {
    csrfToken = null;
    response = await send();
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      csrfToken = null;
      window.location.replace("/dang-nhap");
    }
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "Chưa xử lý được yêu cầu. Vui lòng thử lại.",
    );
  }
  return result as T;
}
export function useAdminResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    let active = true;
    void adminRequest<T>(path)
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
