import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../src/components/auth/auth-client", () => ({
  refreshSession: refresh,
}));
const fetchMock = vi.fn(),
  replace = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  refresh.mockReset();
  replace.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { replace } });
});
afterEach(() => vi.unstubAllGlobals());
describe("FR-92/93 — bộ lọc và tải báo cáo", () => {
  it("đổi vai trò xóa mọi phạm vi, đổi khoa/bộ môn hoặc kỳ xóa lựa chọn con", async () => {
    const { changeReportFilter, buildReportQuery } =
      await import("../src/components/reports/reports-client");
    const initial = {
      role: "TRUONG_KHOA",
      semesterId: "semester",
      campaignId: "campaign",
      facultyId: "faculty",
      departmentId: "department",
      courseId: "course",
    };
    expect(changeReportFilter(initial, "role", "THANH_TRA")).toEqual({
      role: "THANH_TRA",
      semesterId: "",
      campaignId: "",
      facultyId: "",
      departmentId: "",
      courseId: "",
    });
    expect(changeReportFilter(initial, "facultyId", "other")).toMatchObject({
      facultyId: "other",
      departmentId: "",
      courseId: "",
    });
    expect(changeReportFilter(initial, "departmentId", "other")).toMatchObject({
      departmentId: "other",
      courseId: "",
    });
    expect(changeReportFilter(initial, "semesterId", "other")).toMatchObject({
      semesterId: "other",
      campaignId: "",
    });
    expect(
      buildReportQuery({
        role: "GIANG_VIEN",
        semesterId: "",
        courseId: "course",
      }),
    ).toBe("role=GIANG_VIEN&courseId=course");
  });
  it("tải đúng bộ lọc đã áp dụng, không dùng trường draft chưa gửi hoặc trường lạ", async () => {
    fetchMock.mockResolvedValue(
      new Response("muc,gia_tri\nA,5", {
        headers: { "content-type": "text/csv; charset=utf-8" },
      }),
    );
    const { prepareReportDownload, changeReportFilter } =
      await import("../src/components/reports/reports-client");
    const applied = {
      role: "GIANG_VIEN",
      semesterId: "old",
      campaignId: "",
      facultyId: "",
      departmentId: "",
      courseId: "",
    };
    const draft = changeReportFilter(applied, "semesterId", "new");
    const file = await prepareReportDownload(applied, "csv");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/reports/export?role=GIANG_VIEN&semesterId=old&format=csv",
    );
    expect(draft.semesterId).toBe("new");
    expect(await file.blob.text()).toContain("A,5");
    expect(file.fileName).toBe("bao-cao-khao-sat.csv");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  });
  it("lỗi quyền là thông báo lỗi, không tải JSON thành Excel", async () => {
    fetchMock.mockResolvedValue(
      json({ message: "Không có quyền xuất báo cáo.", code: "FORBIDDEN" }, 403),
    );
    const { prepareReportDownload } =
      await import("../src/components/reports/reports-client");
    await expect(
      prepareReportDownload({ role: "ADMIN" }, "xlsx"),
    ).rejects.toMatchObject({
      status: 403,
      message: "Không có quyền xuất báo cáo.",
    });
  });
  it("từ chối HTTP200 sai định dạng và tệp rỗng", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(
        new Response("", { headers: { "content-type": "application/pdf" } }),
      );
    const { prepareReportDownload } =
      await import("../src/components/reports/reports-client");
    await expect(prepareReportDownload({}, "pdf")).rejects.toMatchObject({
      status: 503,
    });
    await expect(prepareReportDownload({}, "pdf")).rejects.toMatchObject({
      status: 503,
    });
  });
  it("GET hết hạn được làm mới và thử lại đúng một lần", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ code: "INVALID_SESSION" }, 401))
      .mockResolvedValueOnce(
        new Response("%PDF-fake", {
          headers: { "content-type": "application/pdf" },
        }),
      );
    refresh.mockResolvedValue(true);
    const { prepareReportDownload } =
      await import("../src/components/reports/reports-client");
    expect(
      (await prepareReportDownload({ role: "GIANG_VIEN" }, "pdf")).fileName,
    ).toMatch(/\.pdf$/);
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("POST cấu hình dùng CSRF riêng, không tự gửi lại sau401", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "reports-only-token" }))
      .mockResolvedValueOnce(
        json({ message: "Phiên hết hạn.", code: "INVALID_SESSION" }, 401),
      );
    refresh.mockResolvedValue(true);
    const { reportsRequest } =
      await import("../src/components/reports/reports-client");
    await expect(
      reportsRequest("/api/reports/settings", { revision: 1 }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/reports/csrf");
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
      "reports-only-token",
    );
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(1);
  });
  it("CSRF sai được xóa khỏi bộ nhớ trước thao tác tiếp theo", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "old" }))
      .mockResolvedValueOnce(json({ code: "INVALID_CSRF" }, 403))
      .mockResolvedValueOnce(json({ csrfToken: "new" }))
      .mockResolvedValueOnce(json({ ok: true }));
    const { reportsRequest } =
      await import("../src/components/reports/reports-client");
    await expect(
      reportsRequest("/api/reports/settings", {}),
    ).rejects.toMatchObject({ status: 403 });
    await reportsRequest("/api/reports/settings", {});
    expect(fetchMock.mock.calls[3][1].headers["X-CSRF-Token"]).toBe("new");
  });
  it("lưu tệp bằng tên cố định và thu hồi URL blob", async () => {
    vi.useFakeTimers();
    const click = vi.fn(),
      remove = vi.fn(),
      appendChild = vi.fn(),
      link = { href: "", download: "", click, remove },
      create = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:report-fixture"),
      revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("document", {
      createElement: () => link,
      body: { appendChild },
    });
    try {
      const { saveReportDownload } =
        await import("../src/components/reports/reports-client");
      saveReportDownload({
        blob: new Blob(["fixture"]),
        fileName: "bao-cao-khao-sat.csv",
      });
      expect(link.download).toBe("bao-cao-khao-sat.csv");
      expect(click).toHaveBeenCalledOnce();
      expect(remove).toHaveBeenCalledOnce();
      await vi.runAllTimersAsync();
      expect(revoke).toHaveBeenCalledWith("blob:report-fixture");
    } finally {
      create.mockRestore();
      revoke.mockRestore();
      vi.useRealTimers();
    }
  });
});
