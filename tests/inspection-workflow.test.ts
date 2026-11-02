import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { RoleGrant } from "../src/server/policies/can";
import {
  inspectionNoteSchema,
  inspectionQueueSchema,
  inspectionTransferSchema,
  inspectionTransitionSchema,
  inspectionTransitionTarget,
} from "../src/server/services/inspection-workflow-types";
import {
  downloadInspectionNoteAttachment,
  getInspectionCase,
  getStudentInspectionResult,
  getTransferredFeedbackSummary,
  inspectionOverdue,
  listInspectionCases,
  transitionInspectionCase,
} from "../src/server/services/inspection-workflow";

const { db, freshActor, notices, feedbackAccess, feedbackDto, readFile } =
  vi.hoisted(() => ({
    db: {
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
      inspectionCase: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      inspectionCaseEvent: { findUnique: vi.fn(), create: vi.fn() },
      auditLog: { create: vi.fn() },
      feedback: { update: vi.fn() },
      user: { findMany: vi.fn() },
    },
    freshActor: vi.fn(),
    notices: vi.fn(),
    feedbackAccess: vi.fn(),
    feedbackDto: vi.fn(),
    readFile: vi.fn(),
  }));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/server/services/access", async (original) => ({
  ...(await original<object>()),
  lockAdminMutations: vi.fn(),
  assertFreshActor: freshActor,
}));
vi.mock("../src/server/services/feedback", () => ({
  detailDto: feedbackDto,
  requireFeedbackResource: feedbackAccess,
  lockFeedback: vi.fn(),
}));
vi.mock("../src/server/services/domain-notifications", () => ({
  enqueueDomainNotice: notices,
}));
vi.mock("../src/server/feedback/attachment-storage", () => ({
  readPrivateAttachment: readFile,
  writePrivateAttachment: vi.fn(),
  removePrivateAttachment: vi.fn(),
}));
const caseId = randomUUID(),
  feedbackId = randomUUID(),
  authorId = randomUUID(),
  teacherId = randomUUID(),
  departmentId = randomUUID(),
  facultyId = randomUUID();
function actor(role: RoleGrant["role"], extra: RoleGrant[] = []): AuthActor {
  const assignments = [
    { role, scopeType: "GLOBAL" as const, facultyId: null, departmentId: null },
    ...extra,
  ].map((grant) => ({
    ...grant,
    departmentId: grant.departmentId ?? null,
    facultyId: grant.facultyId ?? null,
  }));
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Tài khoản giả",
    roles: assignments.map((grant) => grant.role),
    assignments,
    purpose: "FULL",
    mfa: true,
    mustChangePassword: false,
  };
}
function fixture() {
  return {
    id: caseId,
    feedbackId: null as string | null,
    source: "SV_KHIEU_NAI",
    violation: "HANH_VI_KHONG_PHU_HOP",
    status: "TIEP_NHAN",
    conclusion: null,
    reason: "NOI_DUNG_KET_LUAN_BI_MAT",
    studentSummary: "TOM_TAT_CHI_SINH_VIEN",
    revision: 1,
    createdById: authorId,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    acceptDueAt: new Date("2026-11-04T00:00:00Z"),
    completeDueAt: new Date("2026-12-15T00:00:00Z"),
    acceptedAt: null as Date | null,
    closedAt: null,
    assigneeId: null as string | null,
    assignee: null,
    feedback: null,
    section: {
      id: randomUUID(),
      code: "LHP-GIA",
      semester: { lockedAt: null as Date | null },
      course: {
        departmentId,
        department: { facultyId, isActive: true, faculty: { isActive: true } },
      },
      teaching: [{ teacherId }],
    },
    notes: [
      {
        id: randomUUID(),
        authorId: randomUUID(),
        author: { displayName: "Cán bộ giả" },
        body: "GHI_CHU_XAC_MINH_BI_MAT",
        createdAt: new Date(),
        internalFiles: [
          {
            id: randomUUID(),
            storageKey: "KHOA_LUU_TRU_BI_MAT",
            mimeType: "application/pdf",
            byteSize: 100,
            sha256: "HASH_BI_MAT",
          },
        ],
      },
    ],
    events: [
      {
        id: randomUUID(),
        actorId: randomUUID(),
        actor: { displayName: "Cán bộ giả" },
        fromStatus: null,
        toStatus: "TIEP_NHAN",
        reason: "LY_DO_NOI_BO_BI_MAT",
        occurredAt: new Date(),
      },
    ],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (operation) => operation(db));
  freshActor.mockImplementation(async (_tx, value) => value);
  db.inspectionCaseEvent.findUnique.mockResolvedValue(null);
  db.inspectionCaseEvent.create.mockResolvedValue({});
  db.inspectionCase.updateMany.mockResolvedValue({ count: 1 });
  db.user.findMany.mockResolvedValue([]);
});
describe("W11 FR-154/156 BR-60/61/62 — quy trình Thanh tra", () => {
  it("BR-62 lãnh đạo chỉ nhận loại/trạng thái/kết luận, không nhận ghi chú/tệp/nội dung/người giao", async () => {
    const current = actor("LANH_DAO"),
      row = fixture();
    db.inspectionCase.findUnique.mockResolvedValue(row);
    const result = await getInspectionCase(current, caseId);
    expect(result.level).toBe("summary");
    expect(result.feedbackId).toBeNull();
    expect(result.canNote).toBe(false);
    const json = JSON.stringify(result);
    for (const value of [
      row.reason,
      row.studentSummary,
      row.notes[0].body,
      row.events[0].reason,
      "KHOA_LUU_TRU_BI_MAT",
      "HASH_BI_MAT",
      "assignee",
      "notes",
      "events",
      "conclusionReason",
    ])
      expect(json).not.toContain(value);
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "INSPECTION_CASE_VIEWED" }),
      }),
    );
  });
  it("BR-62 cán bộ Thanh tra đọc lại lý do kết luận, các mức tóm tắt không nhận trường này", async () => {
    const row = { ...fixture(), status: "KET_LUAN", conclusion: "CO_CAN_CU" };
    db.inspectionCase.findUnique.mockResolvedValue(row);
    const full = await getInspectionCase(actor("THANH_TRA"), caseId);
    expect(full.level).toBe("full");
    expect(full.conclusion).toBe("CO_CAN_CU");
    expect(full.conclusionReason).toBe(row.reason);
    const summary = await getInspectionCase(actor("LANH_DAO"), caseId);
    expect(summary.conclusion).toBe("CO_CAN_CU");
    expect(summary).not.toHaveProperty("conclusionReason");
    expect(JSON.stringify(summary)).not.toContain(row.reason);
  });
  it.each(["ADMIN", "CAN_BO_DBCL"] as const)(
    "BR-62 %s không mở hồ sơ, kể cả có gán Thanh tra",
    async (role) => {
      const current = actor(role, [{ role: "THANH_TRA", scopeType: "GLOBAL" }]);
      await expect(getInspectionCase(current, caseId)).rejects.toMatchObject({
        status: 403,
      });
      expect(db.inspectionCase.findUnique).not.toHaveBeenCalled();
    },
  );
  it("BR-61 giảng viên của lớp dù có Thanh tra vẫn nhận 404 và không đọc tệp nội bộ", async () => {
    const current = actor("THANH_TRA");
    current.userId = teacherId;
    const row = fixture();
    db.inspectionCase.findUnique.mockResolvedValue(row);
    await expect(getInspectionCase(current, caseId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      downloadInspectionNoteAttachment(
        current,
        caseId,
        row.notes[0].id,
        row.notes[0].internalFiles[0].id,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(readFile).not.toHaveBeenCalled();
  });
  it("BR-61 trưởng bộ môn có Thanh tra vẫn bị 404 với hồ sơ của bộ môn", async () => {
    const current = actor("THANH_TRA", [
      { role: "TRUONG_BO_MON", scopeType: "DEPARTMENT", departmentId },
    ]);
    db.inspectionCase.findUnique.mockResolvedValue(fixture());
    await expect(getInspectionCase(current, caseId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("BR-62 lãnh đạo không tải tệp nội bộ dù biết UUID chính xác", async () => {
    const row = fixture();
    db.inspectionCase.findUnique.mockResolvedValue(row);
    await expect(
      downloadInspectionNoteAttachment(
        actor("LANH_DAO"),
        caseId,
        row.notes[0].id,
        row.notes[0].internalFiles[0].id,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(readFile).not.toHaveBeenCalled();
  });
  it("BR-34 đọc lại quyền trong giao dịch, từ chối actor vừa bị thu hồi Thanh tra", async () => {
    const old = actor("THANH_TRA"),
      fresh = actor("PHONG_DAO_TAO");
    freshActor.mockResolvedValue(fresh);
    await expect(
      transitionInspectionCase(old, caseId, {
        action: "accept",
        revision: 1,
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.inspectionCase.findUnique).not.toHaveBeenCalled();
  });
  it("BR-22 tiếp nhận lặp cùng request không tạo thêm lịch sử hoặc tăng revision", async () => {
    const current = actor("THANH_TRA"),
      row = fixture(),
      requestId = randomUUID();
    const input = { action: "accept", revision: 1, requestId };
    db.inspectionCase.findUnique.mockImplementation(async () => row);
    let history: unknown = null;
    db.inspectionCaseEvent.findUnique.mockImplementation(async () => history);
    db.inspectionCaseEvent.create.mockImplementation(async ({ data }) => {
      history = data;
      return data;
    });
    db.inspectionCase.updateMany.mockImplementation(async ({ data }) => {
      Object.assign(row, {
        status: data.status,
        revision: 2,
        acceptedAt: data.acceptedAt,
        assigneeId: data.assigneeId,
      });
      return { count: 1 };
    });
    expect(
      (await transitionInspectionCase(current, caseId, input)).status,
    ).toBe("XAC_MINH");
    expect(
      (await transitionInspectionCase(current, caseId, input)).status,
    ).toBe("XAC_MINH");
    expect(db.inspectionCase.updateMany).toHaveBeenCalledTimes(1);
    expect(db.inspectionCaseEvent.create).toHaveBeenCalledTimes(1);
    await expect(
      transitionInspectionCase(current, caseId, {
        ...input,
        action: "reject",
        reason: "Ngoài phạm vi xử lý của đơn vị",
      }),
    ).rejects.toMatchObject({ status: 409, code: "REQUEST_CONFLICT" });
  });
  it("BR-17 kỳ khóa chặn chuyển trạng thái và giữ hồ sơ", async () => {
    const row = fixture();
    row.section.semester.lockedAt = new Date();
    db.inspectionCase.findUnique.mockResolvedValue(row);
    await expect(
      transitionInspectionCase(actor("THANH_TRA"), caseId, {
        action: "accept",
        revision: 1,
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    expect(db.inspectionCase.updateMany).not.toHaveBeenCalled();
  });
  it("BR-60 cờ quá hạn tính theo giờ thật, hồ sơ đóng/từ chối/chuyển lại hết bị gắn cờ", () => {
    const row = fixture(),
      now = new Date("2026-11-05T00:00:00Z");
    expect(inspectionOverdue(row, now)).toBe(true);
    expect(
      inspectionOverdue(
        { ...row, acceptedAt: new Date("2026-11-03T00:00:00Z") },
        now,
      ),
    ).toBe(false);
    for (const status of ["DONG", "TU_CHOI", "CHUYEN_LAI"])
      expect(
        inspectionOverdue({ ...row, status }, new Date("2027-01-01T00:00:00Z")),
      ).toBe(false);
  });
  it("BR-61 hàng đợi lọc cả giảng viên, trưởng bộ môn và trưởng khoa ở DB", async () => {
    const current = actor("THANH_TRA", [
      { role: "TRUONG_BO_MON", scopeType: "DEPARTMENT", departmentId },
      { role: "TRUONG_KHOA", scopeType: "FACULTY", facultyId },
    ]);
    db.inspectionCase.findMany.mockResolvedValue([]);
    db.inspectionCase.count.mockResolvedValue(0);
    await listInspectionCases(current, { status: "XAC_MINH" });
    const args = db.inspectionCase.findMany.mock.calls[0][0];
    expect(JSON.stringify(args.where)).toContain(departmentId);
    expect(JSON.stringify(args.where)).toContain(facultyId);
    expect(JSON.stringify(args.where)).toContain(current.userId);
    expect(args.where.status).toBe("XAC_MINH");
  });
  it("BR-63 sinh viên chỉ nhận tóm tắt sau thông báo, không nhận lý do hoặc ghi chú nội bộ", async () => {
    const current = actor("SINH_VIEN"),
      row = fixture();
    row.feedbackId = feedbackId;
    feedbackAccess.mockResolvedValue({ isAuthor: true, inspectionId: caseId });
    db.inspectionCase.findUnique.mockResolvedValue({
      ...row,
      status: "KET_LUAN",
      conclusion: "CO_CAN_CU",
    });
    expect(await getStudentInspectionResult(current, feedbackId)).toEqual({
      status: "KET_LUAN",
      conclusion: null,
      summary: null,
    });
    db.inspectionCase.findUnique.mockResolvedValue({
      ...row,
      status: "THONG_BAO",
      conclusion: "CO_CAN_CU",
    });
    const result = await getStudentInspectionResult(current, feedbackId);
    expect(result.summary).toBe(row.studentSummary);
    expect(JSON.stringify(result)).not.toContain(row.reason);
    feedbackAccess.mockResolvedValue({ isAuthor: false, inspectionId: caseId });
    await expect(
      getStudentInspectionResult(current, feedbackId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("BR-64 người chuyển chỉ nhận trạng thái/kết luận; người khác không đoán được hồ sơ", async () => {
    const current = actor("PHONG_DAO_TAO"),
      row = {
        ...fixture(),
        source: "CHUYEN_PHAN_HOI",
        createdById: current.userId,
        feedbackId,
      };
    db.inspectionCase.findUnique.mockResolvedValue(row);
    const result = await getTransferredFeedbackSummary(current, feedbackId);
    expect(result).toEqual({
      id: caseId,
      caseId,
      feedbackId,
      source: "CHUYEN_PHAN_HOI",
      status: "TIEP_NHAN",
      conclusion: null,
    });
    expect(JSON.stringify(result)).not.toContain(row.notes[0].body);
    await expect(
      getTransferredFeedbackSummary(actor("PHONG_DAO_TAO"), feedbackId),
    ).rejects.toMatchObject({ status: 404 });
  });
});
describe("W11 FR-154 BR-22 — trạng thái và đầu vào", () => {
  it("chỉ đi qua các bước hợp lệ; từ chối/chuyển lại chỉ ở tiếp nhận", () => {
    expect(inspectionTransitionTarget("TIEP_NHAN", "accept")).toBe("XAC_MINH");
    expect(inspectionTransitionTarget("XAC_MINH", "conclude")).toBe("KET_LUAN");
    expect(inspectionTransitionTarget("KET_LUAN", "notify")).toBe("THONG_BAO");
    expect(inspectionTransitionTarget("THONG_BAO", "close")).toBe("DONG");
    for (const status of ["XAC_MINH", "KET_LUAN", "THONG_BAO", "DONG"])
      for (const action of ["reject", "return"])
        expect(inspectionTransitionTarget(status, action)).toBeNull();
    expect(inspectionTransitionTarget("DONG", "accept")).toBeNull();
  });
  it("BR-22 kết luận bắt buộc lý do và phân loại, thông báo bắt buộc tóm tắt", () => {
    const base = { revision: 1, requestId: randomUUID() };
    expect(
      inspectionTransitionSchema.safeParse({ ...base, action: "conclude" })
        .success,
    ).toBe(false);
    expect(
      inspectionTransitionSchema.safeParse({
        ...base,
        action: "conclude",
        conclusion: "CO_CAN_CU",
        reason: "Đã đối chiếu các chứng cứ liên quan",
      }).success,
    ).toBe(true);
    expect(
      inspectionTransitionSchema.safeParse({ ...base, action: "notify" })
        .success,
    ).toBe(false);
    expect(
      inspectionTransitionSchema.safeParse({
        ...base,
        action: "return",
        reason: "Nội dung thuộc phản hồi thông thường",
        returnCategory: "KHIEU_NAI_NGHIEM_TRONG",
      }).success,
    ).toBe(false);
    expect(
      inspectionTransferSchema.safeParse({
        ...base,
        reason: "Nội dung cần xác minh theo thẩm quyền",
        violation: "HANH_VI_KHONG_PHU_HOP",
        studentId: authorId,
      }).success,
    ).toBe(false);
    expect(
      inspectionNoteSchema.safeParse({
        ...base,
        body: "Ghi chú xác minh hợp lệ",
        internalFiles: [],
      }).success,
    ).toBe(false);
    expect(
      inspectionQueueSchema.safeParse({ status: "XAC_MINH" }).success,
    ).toBe(true);
  });
});
