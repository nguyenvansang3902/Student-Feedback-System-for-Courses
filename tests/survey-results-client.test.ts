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

describe("W9 BR-03/09/30 — thao tác kết quả không tự gửi lại POST", () => {
  beforeEach(() => {
    vi.resetModules();
    refresh.mockReset();
    vi.stubGlobal("window", { location: { replace: vi.fn() } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("mất phản hồi không tự công bố hoặc kiểm duyệt lại; CSRF chỉ ở bộ nhớ", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "memory-only" }))
      .mockRejectedValueOnce(new TypeError("network"));
    vi.stubGlobal("fetch", fetcher);
    const { resultsRequest } =
      await import("../src/components/survey-results/results-client");
    await expect(
      resultsRequest("/api/survey-results/campaign/publish", {
        requestId: "same-operation",
      }),
    ).rejects.toThrow();
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "GET",
      "POST",
    ]);
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "memory-only" },
    });
  });
  it("POST401 chỉ refresh phiên; GET401 được phép đọc lại dữ liệu", async () => {
    refresh.mockResolvedValue(true);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "csrf" }))
      .mockResolvedValueOnce(response({ message: "Hết phiên" }, 401))
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ item: { status: "DA_CONG_BO" } }));
    vi.stubGlobal("fetch", fetcher);
    const { resultsRequest } =
      await import("../src/components/survey-results/results-client");
    await expect(
      resultsRequest("/api/survey-results/campaign/publish", {
        requestId: "same-operation",
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      fetcher.mock.calls.filter((call) => call[1].method === "POST"),
    ).toHaveLength(1);
    await expect(
      resultsRequest("/api/survey-results/campaign"),
    ).resolves.toMatchObject({ item: { status: "DA_CONG_BO" } });
  });
  it("làm mới CSRF trước hết hạn; token bị từ chối không tự lặp thao tác", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: "first" }))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ csrfToken: "second" }))
      .mockResolvedValueOnce(response({ code: "INVALID_CSRF" }, 403));
    vi.stubGlobal("fetch", fetcher);
    const { resultsRequest } =
      await import("../src/components/survey-results/results-client");
    await resultsRequest("/api/survey-results/a/publish", { requestId: "one" });
    vi.advanceTimersByTime(841_000);
    await expect(
      resultsRequest("/api/survey-results/b/publish", { requestId: "two" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "GET",
      "POST",
      "GET",
      "POST",
    ]);
  });
});
