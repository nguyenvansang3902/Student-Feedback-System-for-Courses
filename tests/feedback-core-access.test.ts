import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { RoleGrant } from "../src/server/policies/can";
import {
  getFeedback,
  getInspectionCase,
  requireFeedbackResource,
} from "../src/server/services/feedback";

const { db } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    userSession: { findUnique: vi.fn() },
    systemSetting: { findUnique: vi.fn() },
    department: { findFirst: vi.fn() },
    faculty: { findFirst: vi.fn() },
    feedback: { findUnique: vi.fn() },
    inspectionCase: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));

const facultyId = randomUUID(),
  departmentId = randomUUID(),
  sectionId = randomUUID();
const authorId = randomUUID(),
  teacherId = randomUUID(),
  feedbackId = randomUUID(),
  caseId = randomUUID();
const privateAuthor = {
  displayName: "SINH_VIEN_DANH_TINH_RIENG",
  loginCode: "SV_PRIVATE_123456",
  email: "private-student@example.invalid",
};
function globalGrant(role: RoleGrant["role"]): RoleGrant {
  return { role, scopeType: "GLOBAL", departmentId: null, facultyId: null };
}
function actor(
  role: RoleGrant["role"] = "GIANG_VIEN",
  userId = randomUUID(),
  extra: RoleGrant[] = [],
): AuthActor {
  const grants = [globalGrant(role), ...extra];
  return {
    userId,
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "ACCOUNT_FAKE",
    email: "fixture@example.invalid",
    displayName: "Người xử lý giả",
    roles: [...new Set(grants.map((grant) => grant.role))],
    assignments: grants.map((grant) => ({
      ...grant,
      departmentId: grant.departmentId ?? null,
      facultyId: grant.facultyId ?? null,
    })),
    purpose: "FULL",
    mustChangePassword: false,
    mfa: true,
  };
}
function stubSession(current: AuthActor) {
  const row = {
    id: current.sessionId,
    userId: current.userId,
    familyId: current.familyId,
    revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 300000),
    purpose: "FULL",
    mfaVerifiedAt: new Date(),
    user: {
      status: "ACTIVE",
      mustChangePassword: false,
      loginCode: current.loginCode,
      displayName: current.displayName,
      email: current.email,
      roles: current.assignments,
    },
  };
  db.userSession.findUnique.mockResolvedValue(row);
  return row;
}
function feedback(serious = false) {
  const now = new Date();
  return {
    id: feedbackId,
    sectionId,
    authorId,
    assigneeId: null,
    category: serious ? "KHIEU_NAI_NGHIEM_TRONG" : "GIANG_DAY",
    severity: serious ? "KHIEU_NAI" : "GOP_Y",
    title: "Nội dung phản hồi riêng tư",
    body: "Phản hồi giả để kiểm việc che danh tính.",
    status: "MOI",
    revision: 1,
    isAnonymous: true,
    isLocked: false,
    isHidden: false,
    createdAt: now,
    identityLevel: serious ? "AN_DANH_HOAN_TOAN" : null,
    section: {
      id: sectionId,
      code: "LHP-GIA",
      semesterId: randomUUID(),
      semester: { name: "Học kỳ giả", lockedAt: null as Date | null },
      course: {
        name: "Môn giả",
        departmentId,
        department: { facultyId, isActive: true, faculty: { isActive: true } },
      },
      teaching: [{ teacherId, isLead: true }],
    },
    author: privateAuthor,
    assignee: null,
    recipients: [
      {
        feedbackId,
        userId: teacherId,
        accessRole: "GIANG_VIEN",
        isPrimary: true,
        isActive: true,
      },
    ],
    inspectionCase: serious
      ? { id: caseId, assigneeId: null, status: "TIEP_NHAN" }
      : null,
    messages: [
      {
        id: randomUUID(),
        authorId,
        author: { displayName: privateAuthor.displayName },
        body: "Trao đổi giả của sinh viên",
        isHidden: false,
        createdAt: now,
      },
    ],
    history: [
      {
        id: randomUUID(),
        actorId: authorId,
        actor: { displayName: privateAuthor.displayName },
        event: "GUI",
        fromStatus: "MOI",
        toStatus: "MOI",
        reason: null,
        occurredAt: now,
      },
    ],
    attachments: [
      {
        id: randomUUID(),
        originalName: `${privateAuthor.loginCode}.pdf`,
        storageKey: `${randomUUID()}.pdf`,
        sha256: "f".repeat(64),
        mimeType: "application/pdf",
        byteSize: 100,
        createdAt: now,
      },
    ],
  };
}
function inspection(row: ReturnType<typeof feedback>) {
  return {
    id: caseId,
    feedbackId: row.id,
    sectionId,
    section: row.section,
    source: "PHAN_HOI_NGHIEM_TRONG",
    violation: "KHAC_NGHIEM_TRONG",
    status: "TIEP_NHAN",
    conclusion: null,
    revision: 1,
    createdAt: new Date(),
    feedback: row,
    assignee: null,
    events: [
      {
        id: randomUUID(),
        actorId: authorId,
        actor: { displayName: privateAuthor.displayName },
        fromStatus: null,
        toStatus: "TIEP_NHAN",
        reason: null,
        occurredAt: new Date(),
      },
    ],
  };
}
function expectNoIdentity(value: unknown) {
  const result = JSON.stringify(value);
  for (const privateValue of Object.values(privateAuthor))
    expect(result).not.toContain(privateValue);
  expect(result).not.toContain("originalName");
  expect(result).not.toContain("storageKey");
  expect(result).not.toContain("sha256");
}
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback) => callback(db));
  db.$queryRaw.mockResolvedValue([]);
  db.$executeRaw.mockResolvedValue(1);
  db.systemSetting.findUnique.mockResolvedValue(null);
  db.department.findFirst.mockResolvedValue({ id: departmentId });
  db.faculty.findFirst.mockResolvedValue({ id: facultyId });
  db.user.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
});

describe("W10 FR-70/71 BR-24/34/68 — tài nguyên phản hồi dùng phiên/quyền mới", () => {
  it("ADMIN kể cảđa vai trò, khách và phiên tạm bị chặn trướcDB", async () => {
    for (const current of [
      actor("ADMIN"),
      actor("ADMIN", randomUUID(), [
        globalGrant("SINH_VIEN"),
        globalGrant("THANH_TRA"),
      ]),
      { ...actor(), purpose: "MFA_VERIFY" as const },
      null,
    ])
      await expect(
        getFeedback(current as AuthActor, feedbackId),
      ).rejects.toMatchObject({ status: current ? 403 : 401 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.feedback.findUnique).not.toHaveBeenCalled();
  });
  it("phiên bị thu hồi/hết hạn/khác family và vai trò bị gỡ trongDB không trả nội dung", async () => {
    const current = actor("GIANG_VIEN", teacherId);
    for (const mutate of [
      (row: ReturnType<typeof stubSession>) => {
        row.revokedAt = new Date();
      },
      (row: ReturnType<typeof stubSession>) => {
        row.expiresAt = new Date(Date.now() - 1);
      },
      (row: ReturnType<typeof stubSession>) => {
        row.familyId = randomUUID();
      },
      (row: ReturnType<typeof stubSession>) => {
        row.user.roles = [];
      },
    ]) {
      const session = stubSession(current);
      mutate(session);
      await expect(getFeedback(current, feedbackId)).rejects.toMatchObject({
        status: expect.toSatisfy(
          (value: number) => value === 401 || value === 403,
        ),
      });
    }
    expect(db.feedback.findUnique).not.toHaveBeenCalled();
  });
  it("handler đúng lớp và recipient được đọc nhưng không nhận tên/email/MSSV qua DTO, message, history hoặc tệp", async () => {
    const current = actor("GIANG_VIEN", teacherId);
    stubSession(current);
    db.feedback.findUnique.mockResolvedValue(feedback());
    const result = await getFeedback(current, feedbackId);
    expect(result.author).toBeNull();
    expect(result.authorLabel).toBe("Sinh viên ẩn danh");
    expect(result.messages[0].authorLabel).toBe("Sinh viên ẩn danh");
    expect(result.history[0].actorLabel).toBe("Sinh viên ẩn danh");
    expect(result.attachments[0].displayName).toBe("tep-dinh-kem.pdf");
    expectNoIdentity(result);
  });
  it("recipient đã đổi quyền hoặc giảng viên không còn dạy lớp nhận404", async () => {
    const current = actor("GIANG_VIEN", teacherId);
    stubSession(current);
    const row = feedback();
    row.section.teaching = [{ teacherId: randomUUID(), isLead: true }];
    db.feedback.findUnique.mockResolvedValue(row);
    await expect(getFeedback(current, feedbackId)).rejects.toMatchObject({
      status: 404,
      code: "FEEDBACK_NOT_FOUND",
    });
    row.section.teaching = [{ teacherId, isLead: true }];
    row.recipients[0].accessRole = "PHONG_DAO_TAO";
    await expect(getFeedback(current, feedbackId)).rejects.toMatchObject({
      status: 404,
    });
    row.recipients[0].accessRole = "GIANG_VIEN";
    row.recipients[0].isActive = false;
    await expect(getFeedback(current, feedbackId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("chủ phản hồi còn xem được nội dung của mình, sinh viên khác không được traID", async () => {
    const owner = actor("SINH_VIEN", authorId);
    stubSession(owner);
    db.feedback.findUnique.mockResolvedValue(feedback());
    const result = await getFeedback(owner, feedbackId);
    expect(result.isAuthor).toBe(true);
    expect(result.author).toEqual(privateAuthor);
    expect(result.canAttach).toBe(true);
    const other = actor("SINH_VIEN");
    stubSession(other);
    await expect(getFeedback(other, feedbackId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("tệp chỉ được gắn bởi chủ phản hồi, khi trạng thái còn xử lý và kỳ chưa khóa", async () => {
    const owner = actor("SINH_VIEN", authorId);
    stubSession(owner);
    const row = feedback();
    db.feedback.findUnique.mockResolvedValue(row);
    const tx = db as unknown as Parameters<typeof requireFeedbackResource>[0];
    expect(
      (await requireFeedbackResource(tx, owner, feedbackId, "attach")).isAuthor,
    ).toBe(true);
    for (const state of ["DA_TRA_LOI", "DA_DONG", "TU_CHOI"]) {
      row.status = state;
      await expect(
        requireFeedbackResource(tx, owner, feedbackId, "attach"),
      ).rejects.toMatchObject({ status: 403 });
    }
    row.status = "MOI";
    row.isLocked = true;
    await expect(
      requireFeedbackResource(tx, owner, feedbackId, "attach"),
    ).rejects.toMatchObject({ status: 403 });
    row.isLocked = false;
    row.section.semester.lockedAt = new Date();
    await expect(
      requireFeedbackResource(tx, owner, feedbackId, "attach"),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
  });
});

describe("W10 FR-153/155 BR-61/62/63 — hồ sơ Thanh tra, xung đột và mức danh tính", () => {
  it.each(["GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA"] as const)(
    "THANH_TRA có thêm vai trò %s liên quan vẫn nhận404",
    async (role) => {
      const extra: RoleGrant =
        role === "TRUONG_BO_MON"
          ? { role, scopeType: "DEPARTMENT", departmentId, facultyId: null }
          : role === "TRUONG_KHOA"
            ? { role, scopeType: "FACULTY", facultyId, departmentId: null }
            : globalGrant(role);
      const current = actor(
        "THANH_TRA",
        role === "GIANG_VIEN" ? teacherId : randomUUID(),
        [extra],
      );
      stubSession(current);
      const row = feedback(true);
      db.feedback.findUnique.mockResolvedValue(row);
      db.inspectionCase.findUnique.mockResolvedValue(inspection(row));
      await expect(getInspectionCase(current, caseId)).rejects.toMatchObject({
        status: 404,
        code: "FEEDBACK_NOT_FOUND",
      });
      await expect(getFeedback(current, feedbackId)).rejects.toMatchObject({
        status: 404,
      });
      expect(db.auditLog.create).not.toHaveBeenCalled();
    },
  );
  it("THANH_TRA không xung đột đọc toàn bộ nhưng che danh tính, mỗi lần mở ghi audit", async () => {
    const current = actor("THANH_TRA");
    stubSession(current);
    const row = feedback(true);
    db.feedback.findUnique.mockResolvedValue(row);
    db.inspectionCase.findUnique.mockResolvedValue(inspection(row));
    const result = await getInspectionCase(current, caseId);
    expect(result.level).toBe("full");
    expect(result.feedback?.author).toBeNull();
    expect(result.events?.[0].actorLabel).toBe("Sinh viên ẩn danh");
    expectNoIdentity(result);
    await getInspectionCase(current, caseId);
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "INSPECTION_CASE_VIEWED",
        objectId: caseId,
        redactedSummary: expect.objectContaining({ identityVisible: false }),
      }),
    });
  });
  it("CHO_THANH_TRA_BIET chỉ hiển thị cho Thanh tra và audit mỗi lần xem danh tính", async () => {
    const current = actor("THANH_TRA");
    stubSession(current);
    const row = feedback(true);
    row.identityLevel = "CHO_THANH_TRA_BIET";
    db.feedback.findUnique.mockResolvedValue(row);
    db.inspectionCase.findUnique.mockResolvedValue(inspection(row));
    const result = await getInspectionCase(current, caseId);
    expect(result.feedback?.author).toEqual(privateAuthor);
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        redactedSummary: expect.objectContaining({ identityVisible: true }),
      }),
    });
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      privateAuthor.email,
    );
    const teacher = actor("GIANG_VIEN", teacherId);
    stubSession(teacher);
    await expect(getFeedback(teacher, feedbackId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("LANH_DAO chỉ nhận tóm tắt, không body/title/tệp/messages/định danh hoặc ID phản hồi", async () => {
    const current = actor("LANH_DAO");
    stubSession(current);
    const row = feedback(true);
    db.inspectionCase.findUnique.mockResolvedValue(inspection(row));
    const result = await getInspectionCase(current, caseId);
    expect(result).toMatchObject({
      level: "summary",
      feedbackId: null,
      canAssign: false,
      assignTargets: [],
    });
    for (const key of ["feedback", "events", "title", "assignee"])
      expect(result).not.toHaveProperty(key);
    expectNoIdentity(result);
    expect(JSON.stringify(result)).not.toContain(row.body);
    expect(db.feedback.findUnique).not.toHaveBeenCalled();
  });
  it("ADMIN/ĐBCL kể cảkèmTHANH_TRA không được xem hồ sơ", async () => {
    for (const role of ["ADMIN", "CAN_BO_DBCL"] as const) {
      const current = actor(role, randomUUID(), [globalGrant("THANH_TRA")]);
      await expect(getInspectionCase(current, caseId)).rejects.toMatchObject({
        status: 403,
      });
    }
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.inspectionCase.findUnique).not.toHaveBeenCalled();
  });
});
