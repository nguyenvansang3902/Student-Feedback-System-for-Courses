import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ refresh: vi.fn() }));
const fixture = vi.hoisted(() => ({
  data: {
    items: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "Cập nhật <script>bad()</script>",
        body: "Nội dung <img src=x onerror=bad()>",
        createdAt: "2026-11-02T00:00:00Z",
        readAt: null,
        href: "/phan-hoi/00000000-0000-4000-8000-000000000002",
      },
    ],
    total: 1,
    unreadCount: 1,
    page: 1,
    pageSize: 20,
  },
}));
vi.mock("../src/components/auth/auth-client", () => ({
  refreshSession: auth.refresh,
}));
vi.mock(
  "../src/components/feedback/feedback-client",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../src/components/feedback/feedback-client")
    >()),
    useFeedbackResource: () => ({
      data: fixture.data,
      reload: vi.fn(),
      loading: false,
      error: undefined,
    }),
  }),
);
import { NotificationListPanel } from "../src/components/notifications/notification-list";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetModules();
  auth.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { replace: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());
describe("FR-80, BR-34 — giao diện và thao tác hộp thông báo", () => {
  it("escape nội dung; khóa đánh dấu/lọc trước hydration, không có placeholder", () => {
    const html = renderToStaticMarkup(createElement(NotificationListPanel));
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("placeholder=");
    expect(html).not.toContain("của bạn");
    for (const button of html.match(/<button\b[^>]*>/g) ?? [])
      expect(button).toMatch(/\sdisabled(?:=|\s|>)/);
  });
  it("ghi trạng thái dùng CSRF thông báo riêng và không gửi kèm token trong URL", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "notify-only-token" }))
      .mockResolvedValueOnce(json({ ok: true }));
    const { notificationMutation } =
      await import("../src/components/notifications/notification-client");
    await notificationMutation("/api/notifications/read", { id: "fixture" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/notifications/csrf");
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
      "notify-only-token",
    );
    expect(fetchMock.mock.calls[1][0]).not.toContain("token");
  });
  it("access hết hạn không tự gửi lại thao tác đánh dấu", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "notify-only-token" }))
      .mockResolvedValueOnce(json({ code: "INVALID_SESSION" }, 401));
    auth.refresh.mockResolvedValue(true);
    const { notificationMutation } =
      await import("../src/components/notifications/notification-client");
    await expect(
      notificationMutation("/api/notifications/read", { id: "fixture" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(1);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });
  it("CSRF bị từ chối sẽ lấy token mới cho thao tác tiếp theo", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "old-token" }))
      .mockResolvedValueOnce(json({ code: "INVALID_CSRF" }, 403))
      .mockResolvedValueOnce(json({ csrfToken: "new-token" }))
      .mockResolvedValueOnce(json({ ok: true }));
    const { notificationMutation } =
      await import("../src/components/notifications/notification-client");
    await expect(
      notificationMutation("/api/notifications/read", { id: "fixture" }),
    ).rejects.toMatchObject({ status: 403 });
    await notificationMutation("/api/notifications/read", { id: "fixture" });
    expect(fetchMock.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
      "new-token",
    );
  });
});
