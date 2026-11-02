import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, type AuthActor } from "../src/server/auth/types";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  ensure: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
}));
vi.mock("../src/server/feedback-http", async (original) => ({
  ...(await original<object>()),
  feedbackActor: mocks.actor,
}));
vi.mock("../src/server/services/feedback-sla", () => ({
  ensureDueFeedback: mocks.ensure,
}));
vi.mock("../src/server/services/inspection-workflow", () => ({
  listInspectionCases: mocks.list,
  getInspectionCase: mocks.get,
}));
import { GET as list } from "../src/app/api/inspection-cases/route";
import { GET as detail } from "../src/app/api/inspection-cases/[id]/route";
const caseId = randomUUID();
function actor(role: "THANH_TRA" | "LANH_DAO" | "CAN_BO_DBCL"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    displayName: "Tài khoản giả",
    email: "fixture@example.invalid",
    roles: [role],
    assignments: [
      { role, scopeType: "GLOBAL", departmentId: null, facultyId: null },
    ],
    mfa: true,
    purpose: "FULL",
    mustChangePassword: false,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue(actor("THANH_TRA"));
  mocks.ensure.mockResolvedValue({ inspectionOverdue: 1 });
  mocks.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  mocks.get.mockResolvedValue({
    id: caseId,
    status: "XAC_MINH",
    level: "full",
  });
});
describe("W11 BR-60 FR-154 — truy cập Thanh tra tự bảo đảm thông báo quá hạn khi scheduler tắt", () => {
  it("hàng đợi gọi ensure trước khi đọc hồ sơ và chỉ sau xác thực", async () => {
    const response = await list(
      new NextRequest(
        "http://localhost:3000/api/inspection-cases?status=XAC_MINH",
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.ensure).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "SERVER_CONSOLE" }),
      { limit: 100 },
    );
    expect(mocks.actor.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.ensure.mock.invocationCallOrder[0],
    );
    expect(mocks.ensure.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.list.mock.invocationCallOrder[0],
    );
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["THANH_TRA"] }),
      expect.objectContaining({ status: "XAC_MINH" }),
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("Lãnh đạo chỉ mở chi tiết vẫn kích hoạt ensure, không cần vào hàng đợi phản hồi", async () => {
    mocks.actor.mockResolvedValue(actor("LANH_DAO"));
    mocks.get.mockResolvedValue({
      id: caseId,
      status: "XAC_MINH",
      level: "summary",
    });
    const response = await detail(
      new NextRequest(`http://localhost:3000/api/inspection-cases/${caseId}`),
      { params: Promise.resolve({ id: caseId }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.ensure).toHaveBeenCalledTimes(1);
    expect(mocks.ensure.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.get.mock.invocationCallOrder[0],
    );
    expect(mocks.list).not.toHaveBeenCalled();
    expect((await response.json()).item.level).toBe("summary");
  });
  it.each(["list", "detail"] as const)(
    "%s: chưa đăng nhập không chạy job hoặc đọc dữ liệu",
    async (kind) => {
      mocks.actor.mockRejectedValue(
        new AuthError("Cần đăng nhập.", 401, "INVALID_SESSION"),
      );
      const response =
        kind === "list"
          ? await list(
              new NextRequest("http://localhost:3000/api/inspection-cases"),
            )
          : await detail(
              new NextRequest(
                `http://localhost:3000/api/inspection-cases/${caseId}`,
              ),
              { params: Promise.resolve({ id: caseId }) },
            );
      expect(response.status).toBe(401);
      expect(mocks.ensure).not.toHaveBeenCalled();
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.get).not.toHaveBeenCalled();
    },
  );
  it.each(["list", "detail"] as const)(
    "%s: không có quyền Thanh tra không kích hoạt job",
    async (kind) => {
      mocks.actor.mockResolvedValue(actor("CAN_BO_DBCL"));
      const response =
        kind === "list"
          ? await list(
              new NextRequest("http://localhost:3000/api/inspection-cases"),
            )
          : await detail(
              new NextRequest(
                `http://localhost:3000/api/inspection-cases/${caseId}`,
              ),
              { params: Promise.resolve({ id: caseId }) },
            );
      expect(response.status).toBe(403);
      expect(mocks.ensure).not.toHaveBeenCalled();
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.get).not.toHaveBeenCalled();
    },
  );
  it("query sai bị từ chối trước khi chạy job; không có thay đổi do yêu cầu không hợp lệ", async () => {
    expect(
      (
        await list(
          new NextRequest(
            "http://localhost:3000/api/inspection-cases?status=SAI",
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await detail(
          new NextRequest(
            `http://localhost:3000/api/inspection-cases/${caseId}?x=1`,
          ),
          { params: Promise.resolve({ id: caseId }) },
        )
      ).status,
    ).toBe(400);
    expect(mocks.ensure).not.toHaveBeenCalled();
  });
});
