import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../src/components/auth/auth-client", () => ({
  refreshSession: auth.refresh,
}));
const fetchMock = vi.fn();
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.resetModules();
  auth.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { replace: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

describe("W10 FR-70/73/76 — client không gửi lặp thao tác ghi", () => {
  it("chỉ thử lại GET sau khi làm mới phiên", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ items: [] }));
    auth.refresh.mockResolvedValue(true);
    const { feedbackRequest } =
      await import("../src/components/feedback/feedback-client");
    await expect(
      feedbackRequest("/api/feedback?view=mine"),
    ).resolves.toMatchObject({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.every(([, options]) => options.method === "GET"),
    ).toBe(true);
  });
  it("không tự gửi lại nội dung trao đổi khi access hết hạn", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "fixture-csrf" }))
      .mockResolvedValueOnce(
        json({ message: "Phiên vừa hết hạn", code: "INVALID_SESSION" }, 401),
      );
    auth.refresh.mockResolvedValue(true);
    const { feedbackRequest } =
      await import("../src/components/feedback/feedback-client");
    await expect(
      feedbackRequest("/api/feedback/fake/messages", {
        body: "Nội dung giả",
        revision: 1,
        requestId: "fixture",
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(1);
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
      "fixture-csrf",
    );
  });
  it("upload multipart giữ boundary do trình duyệt tạo và gắn CSRF", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "fixture-csrf" }))
      .mockResolvedValueOnce(json({ items: [] }));
    const { feedbackRequest } =
      await import("../src/components/feedback/feedback-client");
    const form = new FormData();
    form.append(
      "files",
      new Blob(["fake"], { type: "application/pdf" }),
      "fixture.pdf",
    );
    await feedbackRequest("/api/feedback/fake/attachments", form);
    expect(fetchMock.mock.calls[1][1].body).toBe(form);
    expect(fetchMock.mock.calls[1][1].headers["Content-Type"]).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
      "fixture-csrf",
    );
  });
});
