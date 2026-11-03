import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, type AuthActor } from "../src/server/auth/types";
import { issueFeedbackCsrf, issueReportsCsrf } from "../src/server/auth/csrf";
import { GET, POST } from "../src/app/api/reports/[[...path]]/route";
const service = vi.hoisted(() => ({
  actor: vi.fn(),
  options: vi.fn(),
  dashboard: vi.fn(),
  settings: vi.fn(),
  update: vi.fn(),
  prepare: vi.fn(),
  render: vi.fn(),
}));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    appUrl: "http://localhost:3000",
    jwtSecret: "r".repeat(64),
    trustProxy: false,
  }),
}));
vi.mock("../src/server/services/auth", () => ({ getActor: service.actor }));
vi.mock("../src/server/services/reports", () => ({
  getReportOptions: service.options,
  getReportsDashboard: service.dashboard,
  getReportsSettings: service.settings,
  updateReportsSettings: service.update,
  prepareReportsExport: service.prepare,
}));
vi.mock("../src/server/services/reports-export", () => ({
  renderReportExport: service.render,
}));
function identity(role: AuthActor["roles"][number] = "CAN_BO_DBCL"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "W12-FAKE",
    email: "fixture@example.invalid",
    displayName: "Tài khoản giả",
    roles: [role],
    assignments: [
      { role, scopeType: "GLOBAL", facultyId: null, departmentId: null },
    ],
    mfa: true,
    mustChangePassword: false,
    purpose: "FULL",
  };
}
let current: AuthActor;
const semesterId = randomUUID(),
  campaignId = randomUUID(),
  requestId = randomUUID();
const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
function request(
  path: string[],
  options: {
    query?: string;
    body?: unknown;
    raw?: string;
    csrf?: string;
    origin?: string;
    contentType?: string;
    cookie?: boolean;
  } = {},
) {
  const write = options.body !== undefined || options.raw !== undefined;
  return new NextRequest(
    `http://localhost:3000/api/reports/${path.join("/")}${options.query ?? ""}`,
    {
      method: write ? "POST" : "GET",
      headers: {
        host: "localhost:3000",
        ...(options.cookie === false ? {} : { cookie: "sfs_access=fixture" }),
        ...(write
          ? {
              origin: options.origin ?? "http://localhost:3000",
              "content-type": options.contentType ?? "application/json",
              "x-csrf-token": options.csrf ?? issueReportsCsrf(current),
            }
          : {}),
      },
      body: options.raw ?? (write ? JSON.stringify(options.body) : undefined),
    },
  );
}
beforeEach(() => {
  Object.values(service).forEach((mock) => mock.mockReset());
  current = identity();
  service.actor.mockResolvedValue(current);
  service.options.mockResolvedValue({
    roles: ["CAN_BO_DBCL"],
    defaultRole: "CAN_BO_DBCL",
    semesters: [],
    campaigns: [],
    faculties: [],
    departments: [],
    courses: [],
    capabilities: { export: true, settingsRead: true, settingsWrite: true },
    exportFormats: ["csv", "xlsx", "pdf"],
  });
  service.dashboard.mockResolvedValue({
    role: "CAN_BO_DBCL",
    generatedAt: "2026-11-03T00:00:00Z",
    filters: { role: "CAN_BO_DBCL" },
    sections: [],
    exportable: true,
  });
  service.prepare.mockResolvedValue({
    role: "CAN_BO_DBCL",
    generatedAt: "2026-11-03T00:00:00Z",
    filters: { role: "CAN_BO_DBCL", semesterId },
    sections: [],
    exportable: true,
  });
  service.settings.mockResolvedValue({
    minFeedbackRecords: 5,
    minInspectionCases: 5,
    revision: 1,
  });
  service.update.mockResolvedValue({
    minFeedbackRecords: 6,
    minInspectionCases: 7,
    revision: 2,
  });
  service.render.mockResolvedValue({
    bytes: new TextEncoder().encode("muc,gia_tri\nA,5"),
    mimeType: "text/csv; charset=utf-8",
    fileName: "bao-cao-khao-sat.csv",
  });
});

describe("FR-90/92/93, BR-34/67 — API báo cáo", () => {
  it("dashboard và options chuyển bộ lọc đúng service, no-store", async () => {
    const query = `?role=CAN_BO_DBCL&semesterId=${semesterId}&campaignId=${campaignId}`;
    const result = await GET(request([], { query }), context([]));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(service.dashboard).toHaveBeenCalledWith(current, {
      role: "CAN_BO_DBCL",
      semesterId,
      campaignId,
    });
    await GET(request(["options"], { query }), context(["options"]));
    expect(service.options).toHaveBeenCalledWith(current, {
      role: "CAN_BO_DBCL",
      semesterId,
      campaignId,
    });
  });
  it.each([
    "?role=ADMIN&role=CAN_BO_DBCL",
    "?studentId=private",
    "?semesterId=not-uuid",
    "?role=UNKNOWN",
  ])("lọc không hợp lệ bị chặn: %s", async (query) => {
    expect((await GET(request([], { query }), context([]))).status).toBe(400);
    expect(service.dashboard).not.toHaveBeenCalled();
  });
  it("xuất gọi service kiểm quyền/audit trước renderer và trả attachment", async () => {
    const result = await GET(
      request(["export"], {
        query: `?role=CAN_BO_DBCL&semesterId=${semesterId}&format=csv`,
      }),
      context(["export"]),
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toContain("text/csv");
    expect(result.headers.get("content-disposition")).toBe(
      'attachment; filename="bao-cao-khao-sat.csv"',
    );
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(service.prepare).toHaveBeenCalledWith(current, {
      role: "CAN_BO_DBCL",
      semesterId,
      format: "csv",
    });
    expect(service.render).toHaveBeenCalledWith(
      await service.prepare.mock.results[0].value,
      "csv",
    );
    expect(await result.text()).toContain("A,5");
  });
  it("mất quyền từ service không render hoặc trả tệp", async () => {
    service.prepare.mockRejectedValue(
      new AuthError("Không có quyền xuất báo cáo.", 403, "FORBIDDEN"),
    );
    const response = await GET(
      request(["export"], { query: "?format=xlsx" }),
      context(["export"]),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(service.render).not.toHaveBeenCalled();
  });
  it("chưa đăng nhập không gọi dịch vụ; format lạ hoặc lặp bị chặn", async () => {
    service.actor.mockResolvedValue(null);
    expect((await GET(request([]), context([]))).status).toBe(401);
    expect(service.dashboard).not.toHaveBeenCalled();
    service.actor.mockResolvedValue(current);
    expect(
      (
        await GET(
          request(["export"], { query: "?format=html" }),
          context(["export"]),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await GET(
          request(["export"], { query: "?format=csv&format=pdf" }),
          context(["export"]),
        )
      ).status,
    ).toBe(400);
  });
  it("renderer sai type/rỗng bị từ chối; tên tệp không an toàn được thay bằng tên cố định", async () => {
    service.render.mockResolvedValueOnce({
      bytes: new Uint8Array([1]),
      mimeType: "application/json",
      fileName: "bad.csv",
    });
    expect(
      (
        await GET(
          request(["export"], { query: "?format=csv" }),
          context(["export"]),
        )
      ).status,
    ).toBe(503);
    service.render.mockResolvedValueOnce({
      bytes: new Uint8Array([1]),
      mimeType: "text/csv",
      fileName: '../wrong"\r\nfile.csv',
    });
    const response = await GET(
      request(["export"], { query: "?format=csv" }),
      context(["export"]),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="bao-cao-khao-sat.csv"',
    );
  });
});
describe("BR-30/34 — cấu hình báo cáo và CSRF riêng", () => {
  it("cấp token riêng và cập nhật đúng revision/requestId", async () => {
    const response = await GET(request(["csrf"]), context(["csrf"]));
    expect(response.status).toBe(200);
    const { csrfToken } = await response.json();
    const body = {
      minFeedbackRecords: 6,
      minInspectionCases: 7,
      revision: 1,
      requestId,
    };
    expect(
      (
        await POST(
          request(["settings"], { body, csrf: csrfToken }),
          context(["settings"]),
        )
      ).status,
    ).toBe(200);
    expect(service.update).toHaveBeenCalledWith(current, body);
  });
  it("không nhận CSRF phản hồi, token khác phiên hoặc nguồn khác", async () => {
    const body = {
      minFeedbackRecords: 6,
      minInspectionCases: 7,
      revision: 1,
      requestId,
    };
    expect(
      (
        await POST(
          request(["settings"], { body, csrf: issueFeedbackCsrf(current) }),
          context(["settings"]),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request(["settings"], {
            body,
            csrf: issueReportsCsrf({ ...current, sessionId: randomUUID() }),
          }),
          context(["settings"]),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request(["settings"], { body, origin: "https://example.invalid" }),
          context(["settings"]),
        )
      ).status,
    ).toBe(403);
    expect(service.update).not.toHaveBeenCalled();
  });
  it("CSRF settings không được cấp cho giảng viên/ADMIN", async () => {
    for (const role of ["GIANG_VIEN", "ADMIN"] as const) {
      current = identity(role);
      service.actor.mockResolvedValue(current);
      expect((await GET(request(["csrf"]), context(["csrf"]))).status).toBe(
        403,
      );
      expect(
        (await GET(request(["settings"]), context(["settings"]))).status,
      ).toBe(403);
    }
  });
  it("không nhận số dưới ngưỡng, payload thừa, JSON vượt64KiB hoặc sai type", async () => {
    const body = {
      minFeedbackRecords: 1,
      minInspectionCases: 5,
      revision: 1,
      requestId,
    };
    expect(
      (await POST(request(["settings"], { body }), context(["settings"])))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(["settings"], {
            body: { ...body, minFeedbackRecords: 5, role: "ADMIN" },
          }),
          context(["settings"]),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(["settings"], {
            raw: JSON.stringify({ content: "x".repeat(66000) }),
          }),
          context(["settings"]),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await POST(
          request(["settings"], { body, contentType: "text/plain" }),
          context(["settings"]),
        )
      ).status,
    ).toBe(415);
    expect(service.update).not.toHaveBeenCalled();
  });
});
