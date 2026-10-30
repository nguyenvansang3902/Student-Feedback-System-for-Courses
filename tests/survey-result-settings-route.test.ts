import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthActor } from "../src/server/auth/types";
import { AuthError } from "../src/server/auth/types";
import {
  issueAdminCsrf,
  issueSurveyResultsCsrf,
} from "../src/server/auth/csrf";
import { GET, POST } from "../src/app/api/admin/survey-result-settings/route";
const service = vi.hoisted(() => ({
  actor: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  stepUp: vi.fn(),
}));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    appUrl: "http://localhost:3000",
    jwtSecret: "c".repeat(64),
    trustProxy: false,
  }),
}));
vi.mock("../src/server/services/auth", () => ({ getActor: service.actor }));
vi.mock("../src/server/services/mfa", () => ({ assertStepUp: service.stepUp }));
vi.mock(
  "../src/server/services/survey-results-settings",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../src/server/services/survey-results-settings")
    >()),
    getSurveyResultSettings: service.read,
    setSurveyResultSettings: service.write,
  }),
);
const admin: AuthActor = {
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "ADMIN-TEST",
  email: "admin@example.invalid",
  displayName: "Quản trị giả",
  roles: ["ADMIN"],
  assignments: [
    { role: "ADMIN", scopeType: "GLOBAL", facultyId: null, departmentId: null },
  ],
  mfa: true,
  purpose: "FULL",
  mustChangePassword: false,
};
const settings = {
  ratingBands: [
    { minScore: 4.5, label: "Rất tốt" },
    { minScore: 0, label: "Cần cải thiện" },
  ],
  sensitiveKeywords: ["từ khóa giả"],
  expectedUpdatedAt: null,
};
function request(body?: object, token = issueAdminCsrf(admin), raw?: string) {
  return new NextRequest(
    "http://localhost:3000/api/admin/survey-result-settings",
    {
      method: body === undefined && raw === undefined ? "GET" : "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        cookie: "sfs_access=session",
        "content-type": "application/json",
        "x-csrf-token": token,
      },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    },
  );
}
beforeEach(() => {
  Object.values(service).forEach((mock) => mock.mockReset());
  service.actor.mockResolvedValue(admin);
  service.read.mockResolvedValue({
    ratingBands: settings.ratingBands,
    sensitiveKeywords: settings.sensitiveKeywords,
    updatedAt: null,
  });
  service.write.mockResolvedValue({ updatedAt: "2026-10-30T09:00:00.000Z" });
  service.stepUp.mockResolvedValue(undefined);
});
describe("W9 BR-09/30/32 — cấu hình kết quả yêu cầu ADMIN và TOTP mới", () => {
  it("ADMIN đầy đủ đọc cấu hình; DBCL và ADMIN chưa MFA bị chặn", async () => {
    expect((await GET(request())).status).toBe(200);
    expect(service.read).toHaveBeenCalledExactlyOnceWith(admin);
    for (const value of [
      { ...admin, mfa: false },
      { ...admin, roles: ["CAN_BO_DBCL"] },
    ]) {
      service.actor.mockResolvedValue(value);
      expect((await GET(request())).status).toBe(403);
    }
    expect(service.read).toHaveBeenCalledTimes(1);
  });
  it("không chấp nhận token miền kết quả cho route quản trị", async () => {
    const dbcl = {
      ...admin,
      roles: ["CAN_BO_DBCL" as const],
      assignments: [
        {
          role: "CAN_BO_DBCL" as const,
          scopeType: "GLOBAL" as const,
          facultyId: null,
          departmentId: null,
        },
      ],
    };
    expect(
      (
        await POST(
          request(
            { ...settings, stepUpCode: "123456" },
            issueSurveyResultsCsrf(dbcl),
          ),
        )
      ).status,
    ).toBe(403);
    expect(service.stepUp).not.toHaveBeenCalled();
    expect(service.write).not.toHaveBeenCalled();
  });
  it("kiểm TOTP mới trước khi lưu và tách mã khỏi dữ liệu cấu hình", async () => {
    const response = await POST(request({ ...settings, stepUpCode: "123456" }));
    expect(response.status).toBe(200);
    expect(service.stepUp).toHaveBeenCalledWith(
      admin,
      "123456",
      expect.any(Object),
    );
    expect(service.write).toHaveBeenCalledExactlyOnceWith(admin, settings);
    expect(service.stepUp.mock.invocationCallOrder[0]).toBeLessThan(
      service.write.mock.invocationCallOrder[0],
    );
  });
  it("giữ kiểm tra thứ tự ngưỡng sau khi mở rộng schema TOTP", async () => {
    expect(
      (
        await POST(
          request({
            ...settings,
            ratingBands: [
              { minScore: 2, label: "Thấp" },
              { minScore: 4, label: "Cao" },
              { minScore: 0, label: "Cuối" },
            ],
            stepUpCode: "123456",
          }),
        )
      ).status,
    ).toBe(400);
    expect(service.stepUp).not.toHaveBeenCalled();
    expect(service.write).not.toHaveBeenCalled();
  });
  it("TOTP bị từ chối và body quá lớn không ghi cấu hình", async () => {
    service.stepUp.mockRejectedValue(
      new AuthError("Mã không hợp lệ.", 403, "INVALID_TOTP"),
    );
    expect(
      (await POST(request({ ...settings, stepUpCode: "123456" }))).status,
    ).toBe(403);
    expect(
      (await POST(request(undefined, undefined, "x".repeat(262145)))).status,
    ).toBe(413);
    expect(service.write).not.toHaveBeenCalled();
  });
});
