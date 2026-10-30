import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthActor } from "../src/server/auth/types";
import { AuthError } from "../src/server/auth/types";
import {
  issueSurveyResultsCsrf,
  issueAdminCsrf,
} from "../src/server/auth/csrf";
import { GET, POST } from "../src/app/api/survey-results/[[...path]]/route";

const services = vi.hoisted(() => ({
  actor: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
  section: vi.fn(),
  aggregate: vi.fn(),
  publish: vi.fn(),
  moderation: vi.fn(),
  moderate: vi.fn(),
  incomplete: vi.fn(),
  remind: vi.fn(),
}));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    appUrl: "http://localhost:3000",
    jwtSecret: "c".repeat(64),
    trustProxy: false,
  }),
}));
vi.mock("../src/server/services/auth", () => ({ getActor: services.actor }));
vi.mock("../src/server/services/survey-results", () => ({
  listSurveyResults: services.list,
  getSurveyResults: services.detail,
  getSurveyClassResults: services.section,
}));
vi.mock("../src/server/services/survey-results-mutations", () => ({
  aggregateSurveyResults: services.aggregate,
  publishSurveyResults: services.publish,
}));
vi.mock("../src/server/services/survey-moderation", () => ({
  listSurveyModeration: services.moderation,
  moderateSurveyAnswer: services.moderate,
}));
vi.mock("../src/server/services/survey-reminders", () => ({
  listIncompleteStudents: services.incomplete,
  remindIncompleteStudents: services.remind,
}));
const campaignId = randomUUID(),
  sectionId = randomUUID(),
  answerId = randomUUID(),
  requestId = randomUUID();
function actor(role: AuthActor["roles"][number] = "CAN_BO_DBCL"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "W9-TEST",
    email: "week9@example.invalid",
    displayName: "Dữ liệu giả",
    roles: [role],
    assignments: [
      { role, scopeType: "GLOBAL", facultyId: null, departmentId: null },
    ],
    mfa: role === "ADMIN",
    purpose: "FULL",
    mustChangePassword: false,
  };
}
let current: AuthActor;
function request(
  path: string[],
  body?: unknown,
  options: {
    token?: string;
    origin?: string;
    query?: string;
    raw?: string;
    contentType?: string;
  } = {},
) {
  return new NextRequest(
    `http://localhost:3000/api/survey-results/${path.join("/")}${options.query ?? ""}`,
    {
      method: body === undefined && options.raw === undefined ? "GET" : "POST",
      headers: {
        host: "localhost:3000",
        cookie: "sfs_access=session",
        ...(body === undefined && options.raw === undefined
          ? {}
          : {
              origin: options.origin ?? "http://localhost:3000",
              "content-type": options.contentType ?? "application/json",
              "x-csrf-token": options.token ?? issueSurveyResultsCsrf(current),
            }),
      },
      body:
        options.raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    },
  );
}
const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
beforeEach(() => {
  Object.values(services).forEach((mock) => mock.mockReset());
  current = actor();
  services.actor.mockResolvedValue(current);
  services.list.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  services.detail.mockResolvedValue({ audience: "STANDARD" });
  services.section.mockResolvedValue({ comments: [] });
  services.aggregate.mockResolvedValue({ status: "DA_TONG_HOP" });
  services.publish.mockResolvedValue({ status: "DA_CONG_BO" });
  services.moderation.mockResolvedValue({ items: [], total: 0 });
  services.moderate.mockResolvedValue({ status: "HIEN_THI" });
  services.incomplete.mockResolvedValue({ items: [], total: 0 });
  services.remind.mockResolvedValue({ queued: 0 });
});

describe("W9 BR-03/07/09/13/18/57 — ranh giới API kết quả", () => {
  it("khách và ADMIN không nhận dữ liệu kết quả hoặc CSRF nghiệp vụ", async () => {
    services.actor.mockResolvedValue(null);
    expect((await GET(request([]), context([]))).status).toBe(401);
    current = actor("ADMIN");
    services.actor.mockResolvedValue(current);
    expect((await GET(request([]), context([]))).status).toBe(403);
    expect((await GET(request(["csrf"]), context(["csrf"]))).status).toBe(403);
    expect(services.list).not.toHaveBeenCalled();
  });
  it("đọc truyền audience tường minh tới service, không tự mở rộng phạm vi", async () => {
    current = actor("PHONG_KHAO_THI");
    services.actor.mockResolvedValue(current);
    const response = await GET(
      request([campaignId], undefined, { query: "?audience=ASSESSMENT" }),
      context([campaignId]),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.detail).toHaveBeenCalledWith(
      current,
      campaignId,
      "ASSESSMENT",
    );
  });
  it("query hoặc UUID lạ bị từ chối trước service", async () => {
    expect(
      (
        await GET(
          request([campaignId], undefined, { query: "?studentId=hidden" }),
          context([campaignId]),
        )
      ).status,
    ).toBe(400);
    expect(
      (await GET(request(["not-a-uuid"]), context(["not-a-uuid"]))).status,
    ).toBe(400);
    expect(services.detail).not.toHaveBeenCalled();
  });
  it("POST kiểm origin và token đúng miền trước khi gọi nghiệp vụ", async () => {
    const body = { expectedRevision: 3, requestId };
    expect(
      (
        await POST(
          request([campaignId, "publish"], body, {
            origin: "https://foreign.invalid",
          }),
          context([campaignId, "publish"]),
        )
      ).status,
    ).toBe(403);
    const admin = actor("ADMIN");
    expect(
      (
        await POST(
          request([campaignId, "publish"], body, {
            token: issueAdminCsrf(admin),
          }),
          context([campaignId, "publish"]),
        )
      ).status,
    ).toBe(403);
    expect(services.publish).not.toHaveBeenCalled();
  });
  it("giới hạn body thực đọc 256 KiB và không gọi service khi sai kiểu nội dung", async () => {
    const path = [campaignId, "publish"];
    expect(
      (
        await POST(
          request(path, undefined, { raw: "x".repeat(262145) }),
          context(path),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await POST(
          request(path, {}, { contentType: "text/plain" }),
          context(path),
        )
      ).status,
    ).toBe(415);
    expect(services.publish).not.toHaveBeenCalled();
  });
  it("giữ nguyên requestId/revision và không chấp nhận thuộc tính chen thêm", async () => {
    const path = [campaignId, "aggregate"],
      body = { expectedRevision: 3, requestId };
    expect((await POST(request(path, body), context(path))).status).toBe(200);
    expect(services.aggregate).toHaveBeenCalledExactlyOnceWith(
      current,
      campaignId,
      body,
    );
    expect(
      (
        await POST(
          request(path, { ...body, studentId: randomUUID() }),
          context(path),
        )
      ).status,
    ).toBe(400);
    expect(services.aggregate).toHaveBeenCalledTimes(1);
  });
  it("kiểm duyệt bắt buộc lý do; danh sách chưa hoàn thành là endpoint riêng", async () => {
    const path = [campaignId, "moderation"];
    expect(
      (
        await POST(
          request(path, { answerId, status: "HIEN_THI", reason: " " }),
          context(path),
        )
      ).status,
    ).toBe(400);
    expect(services.moderate).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          request(path, {
            answerId,
            status: "HIEN_THI",
            reason: "Góp ý phù hợp",
          }),
          context(path),
        )
      ).status,
    ).toBe(200);
    expect(services.moderate).toHaveBeenCalledExactlyOnceWith(
      current,
      campaignId,
      answerId,
      { status: "HIEN_THI", reason: "Góp ý phù hợp" },
    );
    const legacyPath = [campaignId, "moderation", answerId];
    expect(
      (
        await POST(
          request(legacyPath, {
            answerId,
            status: "HIEN_THI",
            reason: "Góp ý phù hợp",
          }),
          context(legacyPath),
        )
      ).status,
    ).toBe(404);
    expect(services.moderate).toHaveBeenCalledTimes(1);
    await GET(
      request([campaignId, "incomplete"], undefined, {
        query: `?sectionId=${sectionId}&page=1`,
      }),
      context([campaignId, "incomplete"]),
    );
    expect(services.incomplete).toHaveBeenCalledWith(current, campaignId, {
      page: 1,
      pageSize: 20,
      sectionId,
    });
    expect(services.section).not.toHaveBeenCalled();
  });
  it("lỗi service không làm lộ SQL hoặc nội dung góp ý", async () => {
    services.detail.mockRejectedValue(new Error("SELECT valueText secret"));
    const response = await GET(request([campaignId]), context([campaignId]));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    services.detail.mockRejectedValue(
      new AuthError(
        "Không tìm thấy kết quả khảo sát.",
        404,
        "SURVEY_RESULTS_NOT_FOUND",
      ),
    );
    expect(
      (await GET(request([campaignId]), context([campaignId]))).status,
    ).toBe(404);
  });
});
