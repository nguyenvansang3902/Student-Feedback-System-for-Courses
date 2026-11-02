"use client";
import { refreshSession } from "../auth/auth-client";
import {
  feedbackRequest,
  FeedbackRequestError,
} from "../feedback/feedback-client";

let cachedCsrf: { token: string; expiresAt: number } | null = null;
export async function notificationMutation(
  path: string,
  body: unknown,
): Promise<void> {
  if (!cachedCsrf || cachedCsrf.expiresAt <= Date.now()) {
    const data = await feedbackRequest<{ csrfToken: string }>(
      "/api/notifications/csrf",
    );
    if (typeof data.csrfToken !== "string")
      throw new Error("Chưa lấy được xác nhận bảo mật. Hãy tải lại trang.");
    cachedCsrf = { token: data.csrfToken, expiresAt: Date.now() + 840000 };
  }
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": cachedCsrf.token,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    cachedCsrf = null;
    if (!(await refreshSession())) window.location.replace("/dang-nhap");
  }
  if (response.status === 403 && data.code === "INVALID_CSRF")
    cachedCsrf = null;
  if (!response.ok)
    throw new FeedbackRequestError(
      typeof data.message === "string"
        ? data.message
        : "Chưa lưu được trạng thái thông báo. Tải lại dữ liệu trước khi thử tiếp.",
      response.status,
      data.code,
    );
}
