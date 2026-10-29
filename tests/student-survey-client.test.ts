import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../src/components/auth/auth-client", () => ({
  refreshSession: refresh,
}));
const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
describe("W8 BR-02/03 — client không tự gửi lại phiếu", () => {
  beforeEach(() => {
    vi.resetModules();
    refresh.mockReset();
    vi.stubGlobal("window", {
      localStorage: { length: 0 },
      location: { replace: vi.fn() },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("mạng lỗi sau POST không retry POST; CSRF chỉ lấy qua GET", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "in-memory-only" }))
      .mockRejectedValueOnce(new TypeError("network"));
    vi.stubGlobal("fetch", fetcher);
    const { surveyRequest } =
      await import("../src/components/student-surveys/survey-client");
    await expect(
      surveyRequest("/api/student-surveys/task/submit", { answers: [] }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "GET",
      "POST",
    ]);
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "in-memory-only" },
    });
  });
  it("POST401 refresh phiên nhưng không gửi lại; GET401 được phép đọc lại", async () => {
    refresh.mockResolvedValue(true);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "csrf" }))
      .mockResolvedValueOnce(response({ message: "Hết phiên" }, 401))
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ item: { status: "DONE" } }));
    vi.stubGlobal("fetch", fetcher);
    const { surveyRequest } =
      await import("../src/components/student-surveys/survey-client");
    await expect(
      surveyRequest("/api/student-surveys/task/submit", { answers: [] }),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      fetcher.mock.calls.filter((call) => call[1].method === "POST"),
    ).toHaveLength(1);
    await expect(
      surveyRequest("/api/student-surveys/task"),
    ).resolves.toMatchObject({ item: { status: "DONE" } });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("gia hạn CSRF trước 900 giây và không tự POST lại khi token bị từ chối", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "first" }))
      .mockResolvedValueOnce(response({ item: { status: "DONE" } }))
      .mockResolvedValueOnce(response({ csrfToken: "second" }))
      .mockResolvedValueOnce(response({ code: "INVALID_CSRF" }, 403))
      .mockResolvedValueOnce(response({ csrfToken: "third" }))
      .mockResolvedValueOnce(response({ item: { status: "DONE" } }));
    vi.stubGlobal("fetch", fetcher);
    const { surveyRequest } =
      await import("../src/components/student-surveys/survey-client");
    await surveyRequest("/api/student-surveys/a/submit", { answers: [] });
    vi.advanceTimersByTime(841_000);
    await expect(
      surveyRequest("/api/student-surveys/b/submit", { answers: [] }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher).toHaveBeenCalledTimes(4);
    await surveyRequest("/api/student-surveys/b/submit", { answers: [] });
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "GET",
      "POST",
      "GET",
      "POST",
      "GET",
      "POST",
    ]);
  });
});
