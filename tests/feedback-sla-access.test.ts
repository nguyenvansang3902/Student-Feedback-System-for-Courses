import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    feedback: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn() },
    slaEscalation: { createMany: vi.fn() },
    feedbackRecipient: { updateMany: vi.fn(), upsert: vi.fn() },
    feedbackHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    inspectionCase: { findMany: vi.fn() },
  },
  notice: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/domain-notifications", () => ({
  enqueueDomainNotice: mocks.notice,
}));
import { ensureDueFeedback } from "../src/server/services/feedback-sla";

const now = new Date("2026-11-03T03:00:00Z");
const actor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử quyền người nhận SLA bằng dữ liệu giả",
};
const facultyId = randomUUID(),
  departmentId = randomUUID(),
  newAssignee = randomUUID();
function row(
  departmentActive = true,
  facultyActive = true,
  currentRole = "TRUONG_BO_MON",
) {
  return {
    id: randomUUID(),
    authorId: randomUUID(),
    assigneeId: randomUUID(),
    category: "GIANG_DAY",
    status: "DANG_XU_LY",
    revision: 3,
    escalationLevel: 0,
    acceptDueAt: new Date("2026-10-20T03:00:00Z"),
    replyDueAt: new Date("2026-10-29T03:00:00Z"),
    inspectionCase: null,
    escalations: [],
    recipients: [
      {
        isPrimary: true,
        isActive: true,
        userId: randomUUID(),
        accessRole: currentRole,
      },
    ],
    section: {
      semester: { lockedAt: null },
      teaching: [],
      course: {
        departmentId,
        department: {
          isActive: departmentActive,
          facultyId,
          faculty: { isActive: facultyActive },
        },
      },
    },
  };
}
function candidate(role: "TRUONG_KHOA" | "CAN_BO_DBCL" = "TRUONG_KHOA") {
  return {
    id: newAssignee,
    roles: [
      {
        id: randomUUID(),
        userId: newAssignee,
        role,
        scopeType: role === "TRUONG_KHOA" ? "FACULTY" : "GLOBAL",
        scopeKey: role === "TRUONG_KHOA" ? `FACULTY:${facultyId}` : "GLOBAL",
        departmentId: null,
        facultyId: role === "TRUONG_KHOA" ? facultyId : null,
      },
    ],
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (operation) =>
    operation(mocks.db),
  );
  mocks.db.$executeRaw.mockResolvedValue(1);
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.db.systemSetting.findUnique.mockResolvedValue(null);
  mocks.db.systemSetting.upsert.mockResolvedValue({});
  mocks.db.feedback.findMany.mockResolvedValue([row()]);
  mocks.db.feedback.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.feedback.update.mockResolvedValue({});
  mocks.db.user.findMany.mockResolvedValue([candidate()]);
  mocks.db.slaEscalation.createMany.mockResolvedValue({ count: 1 });
  mocks.db.feedbackRecipient.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.feedbackRecipient.upsert.mockResolvedValue({});
  mocks.db.feedbackHistory.create.mockResolvedValue({});
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.db.inspectionCase.findMany.mockResolvedValue([]);
  mocks.notice.mockResolvedValue({ queued: 1 });
});
describe("BR-23/34 — SLA không giao trưởng khoa vào phản hồi ngoài quyền đọc", () => {
  it("bộ môn lớp ngừng hoạt động không giao TK dù khoa và grant TK còn hoạt động", async () => {
    mocks.db.feedback.findMany.mockResolvedValue([row(false, true)]);
    expect(await ensureDueFeedback(actor, { now })).toMatchObject({
      overdue: 1,
      escalated: 0,
    });
    expect(mocks.db.slaEscalation.createMany).not.toHaveBeenCalled();
    expect(mocks.db.feedbackRecipient.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.feedbackRecipient.upsert).not.toHaveBeenCalled();
    expect(mocks.db.feedback.update).not.toHaveBeenCalled();
  });
  it("khoa của lớp ngừng hoạt động cũng không tạo marker hoặc thu hồi người cũ", async () => {
    mocks.db.feedback.findMany.mockResolvedValue([row(true, false)]);
    expect(await ensureDueFeedback(actor, { now })).toMatchObject({
      escalated: 0,
    });
    expect(mocks.db.slaEscalation.createMany).not.toHaveBeenCalled();
    expect(mocks.db.feedbackRecipient.updateMany).not.toHaveBeenCalled();
  });
  it("đối chứng lớp thuộc bộ môn/khoa hoạt động vẫn leo thang TBM sang TK", async () => {
    const feedback = row();
    mocks.db.feedback.findMany.mockResolvedValue([feedback]);
    expect(await ensureDueFeedback(actor, { now })).toMatchObject({
      escalated: 1,
    });
    expect(mocks.db.feedbackRecipient.updateMany).toHaveBeenCalledTimes(1);
    expect(
      mocks.db.feedbackRecipient.upsert.mock.calls[0][0].create,
    ).toMatchObject({
      feedbackId: feedback.id,
      userId: newAssignee,
      accessRole: "TRUONG_KHOA",
      isActive: true,
    });
    expect(mocks.db.feedback.update.mock.calls[0][0].data).toMatchObject({
      assigneeId: newAssignee,
      revision: { increment: 1 },
    });
  });
  it("không chặn tầng ĐBCL toàn trường chỉ vì bộ môn lớp đã ngừng hoạt động", async () => {
    mocks.db.feedback.findMany.mockResolvedValue([
      row(false, true, "TRUONG_KHOA"),
    ]);
    mocks.db.user.findMany.mockResolvedValue([candidate("CAN_BO_DBCL")]);
    expect(await ensureDueFeedback(actor, { now })).toMatchObject({
      escalated: 1,
    });
    expect(
      mocks.db.feedbackRecipient.upsert.mock.calls[0][0].create,
    ).toMatchObject({ accessRole: "CAN_BO_DBCL" });
  });
});
