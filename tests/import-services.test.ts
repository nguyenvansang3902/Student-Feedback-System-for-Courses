import { createHash, createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import { commitImport, downloadImportTemplate, previewImport, type ImportUpload } from "../src/server/services/imports";

const { db, sendMail } = vi.hoisted(() => ({ db: {
  $transaction: vi.fn(), $queryRaw: vi.fn(), $executeRaw: vi.fn(),
  user: { findMany: vi.fn(), createMany: vi.fn() }, userSession: { findUnique: vi.fn() },
  roleAssignment: { createMany: vi.fn() }, authToken: { createMany: vi.fn(), updateMany: vi.fn() },
  auditLog: { findFirst: vi.fn(), create: vi.fn(), createMany: vi.fn() },
  course: { findMany: vi.fn() }, semester: { findMany: vi.fn() },
  courseSection: { findMany: vi.fn(), createMany: vi.fn() }, enrollment: { findMany: vi.fn(), createMany: vi.fn() },
  systemSetting: { findUnique: vi.fn() },
}, sendMail: vi.fn() }));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/lib/env", () => ({ getAuthConfig: () => ({ jwtSecret: "a".repeat(64) }) }));
vi.mock("../src/lib/mail", () => ({ sendAccountTokenMail: sendMail }));

function actor(role: "CAN_BO_DBCL" | "GIANG_VIEN" | "ADMIN" = "CAN_BO_DBCL"): AuthActor {
  return { userId: randomUUID(), sessionId: randomUUID(), familyId: randomUUID(), loginCode: "DBCL", email: "fake@example.invalid", displayName: "Giả",
    roles: [role], assignments: [{ role, scopeType: "GLOBAL", facultyId: null, departmentId: null }],
    purpose: "FULL", mustChangePassword: false, mfa: role === "ADMIN", mfaRequired: role === "ADMIN" };
}
function session(current: AuthActor) {
  return { userId: current.userId, familyId: current.familyId, revokedAt: null, expiresAt: new Date(Date.now() + 60000), purpose: "FULL", mfaVerifiedAt: null,
    user: { loginCode: current.loginCode, email: current.email, displayName: current.displayName, status: "ACTIVE", mustChangePassword: false, roles: current.assignments } };
}
const upload = (kind: ImportUpload["kind"] = "students", text = "loginCode,email,displayName\nSV_NEW,new@example.invalid,Người giả") => ({ kind, fileName: "fixture.csv", content: Buffer.from(text) });
const activeCourse = { id: randomUUID(), code: "MH01", isActive: true, department: { isActive: true, faculty: { isActive: true } } };
const semester = { id: randomUUID(), code: "HK01", lockedAt: null as Date | null };
beforeEach(() => {
  vi.restoreAllMocks(); vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback) => callback(db)); db.$executeRaw.mockResolvedValue(1); db.$queryRaw.mockResolvedValue([]);
  db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN"] });
  db.user.findMany.mockResolvedValue([]); db.user.createMany.mockResolvedValue({ count: 1 });
  db.semester.findMany.mockResolvedValue([semester]); db.course.findMany.mockResolvedValue([activeCourse]);
  db.courseSection.findMany.mockResolvedValue([]); db.enrollment.findMany.mockResolvedValue([]);
  db.auditLog.findFirst.mockResolvedValue(null); db.auditLog.create.mockResolvedValue({}); db.auditLog.createMany.mockResolvedValue({ count: 1 });
  db.authToken.updateMany.mockResolvedValue({ count: 1 }); sendMail.mockResolvedValue(undefined);
});

describe("FR-21/22 BR-17/30/34 — policy, chạy thử và ghi nguyên tử", () => {
  it("từ chối GV, ADMIN đơnvai, phiên tạm trước DB; không lấy ADMIN làm quyền nhập ngầm", async () => {
    for (const current of [actor("GIANG_VIEN"), actor("ADMIN"), { ...actor(), purpose: "MFA_VERIFY" as const }]) {
      await expect(previewImport(current, upload())).rejects.toMatchObject({ status: 403 });
      await expect(downloadImportTemplate(current, "students", "csv")).rejects.toMatchObject({ status: 403 });
      await expect(commitImport(current, { ...upload(), previewToken: "invalid" })).rejects.toMatchObject({ status: 403 });
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("chạy thử đọc lại vai trò trong DB, không tin quyền cũ hoặc phiên bị thu hồi", async () => {
    const current = actor(), active = session(current);
    for (const changed of [{ ...active, revokedAt: new Date() }, { ...active, user: { ...active.user, roles: [] } }]) {
      db.userSession.findUnique.mockResolvedValue(changed);
      await expect(previewImport(current, upload())).rejects.toMatchObject({ status: expect.any(Number) });
    }
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it("chạy thử hợp lệ không ghiDB/khóa mutex/email, token gắn hashfile và actor", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input);
    expect(preview).toMatchObject({ rowCount: 1, validRows: 1, errors: [], previewToken: expect.any(String), expiresAt: expect.any(String) });
    expect(preview.sha256).toBe(createHash("sha256").update(input.content).digest("hex"));
    expect(db.$executeRaw).not.toHaveBeenCalled(); expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.user.createMany).not.toHaveBeenCalled(); expect(db.auditLog.create).not.toHaveBeenCalled(); expect(db.authToken.createMany).not.toHaveBeenCalled(); expect(sendMail).not.toHaveBeenCalled();
  });
  it("trùng mã/email DB trả lỗi từng cột, không cấp token hay sửa tài khoản", async () => {
    const current = actor(); db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findMany.mockResolvedValue([{ loginCode: "sv_new", email: "NEW@example.invalid" }]);
    expect(await previewImport(current, upload())).toMatchObject({ validRows: 0, previewToken: null, errors: [
      { row: 2, column: "loginCode", code: "ALREADY_EXISTS" }, { row: 2, column: "email", code: "ALREADY_EXISTS" },
    ] });
    expect(db.user.createMany).not.toHaveBeenCalled();
  });
  it("tham chiếu học kỳ/môn không hợp lệ hoặc khóa sổ hiện đúng dòng", async () => {
    const current = actor(); db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findMany.mockResolvedValue([{ ...semester, lockedAt: new Date() }]); db.course.findMany.mockResolvedValue([]);
    const preview = await previewImport(current, upload("sections", "code,courseCode,semesterCode\nLP01,MH01,HK01\nLP02,MH02,HK_NO"));
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, column: "semesterCode", code: "SEMESTER_LOCKED" }),
      expect.objectContaining({ row: 3, column: "semesterCode", code: "REFERENCE_NOT_FOUND" }),
      expect.objectContaining({ row: 2, column: "courseCode", code: "INACTIVE_REFERENCE" }),
    ])); expect(preview.previewToken).toBeNull();
  });
  it("đăng ký cần SV GLOBAL hợp lệ, đúng lớp/học kỳ, và không tạo lại bản ghi đãrút", async () => {
    const current = actor(), sectionId = randomUUID(), studentId = randomUUID(); db.userSession.findUnique.mockResolvedValue(session(current));
    db.courseSection.findMany.mockResolvedValue([{ id: sectionId, code: "LP01", semesterId: semester.id, course: activeCourse }]);
    db.user.findMany.mockResolvedValue([{ id: studentId, loginCode: "SV01" }]); db.enrollment.findMany.mockResolvedValue([{ sectionId, studentId }]);
    const preview = await previewImport(current, upload("enrollments", "semesterCode,sectionCode,studentCode\nHK01,LP01,SV01"));
    expect(preview.errors).toMatchObject([{ row: 2, column: "studentCode", code: "ALREADY_EXISTS" }]);
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ roles: { some: expect.objectContaining({ role: "SINH_VIEN", scopeType: "GLOBAL", facultyId: null, departmentId: null }) }, status: { not: "DISABLED" } }) }));
  });
  it("không chấp nhận đổi file, loại nhập, actor, session, chữ ký hoặc token hết hạn", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input), previewToken = preview.previewToken!;
    const attempts = [
      () => commitImport(current, { ...input, content: Buffer.from(input.content.toString().replace("SV_NEW", "SV_CHANGED")), previewToken }),
      () => commitImport(current, { ...input, kind: "teachers", previewToken }),
      () => commitImport({ ...current, userId: randomUUID() }, { ...input, previewToken }),
      () => commitImport({ ...current, sessionId: randomUUID() }, { ...input, previewToken }),
      () => commitImport(current, { ...input, previewToken: previewToken + ".extra" }),
      () => commitImport(current, { ...input, previewToken: previewToken.slice(0, -4) + "abcd" }),
    ];
    for (const attempt of attempts) await expect(attempt()).rejects.toMatchObject({ code: "INVALID_IMPORT_PREVIEW" });
    const now = Date.now(); vi.spyOn(Date, "now").mockReturnValue(now + 901000);
    await expect(commitImport(current, { ...input, previewToken })).rejects.toMatchObject({ code: "INVALID_IMPORT_PREVIEW" });
    expect(db.user.createMany).not.toHaveBeenCalled();
  });
  it("payload được ký bằng domain khác không dùng được để xác nhận", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input), payload = preview.previewToken!.split(".")[0];
    const signature = createHmac("sha256", "a".repeat(64)).update(`sfs-admin-csrf-v1:${payload}`).digest("base64url");
    await expect(commitImport(current, { ...input, previewToken: `${payload}.${signature}` })).rejects.toMatchObject({ code: "INVALID_IMPORT_PREVIEW" });
  });
  it("commit khóa mutex trước đọc quyền, revalidate DB sau chạy thử; có lỗi không ghi dòng nào", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input); db.userSession.findUnique.mockClear();
    db.user.findMany.mockResolvedValue([{ loginCode: "SV_NEW", email: "other@example.invalid" }]);
    await expect(commitImport(current, { ...input, previewToken: preview.previewToken! })).rejects.toMatchObject({ code: "IMPORT_VALIDATION_FAILED", errors: [{ row: 2, code: "ALREADY_EXISTS" }] });
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(db.userSession.findUnique.mock.invocationCallOrder[0]);
    expect(db.user.createMany).not.toHaveBeenCalled(); expect(sendMail).not.toHaveBeenCalled();
  });
  it.each(["students", "teachers"] as const)("commit %s chỉ tạo vai trò tương ứng, nullpassword/PENDING và tokenhash; email sau commit", async (kind) => {
    const current = actor(), input = upload(kind); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input), result = await commitImport(current, { ...input, previewToken: preview.previewToken! });
    expect(result).toEqual({ kind, created: 1, activation: { sent: 1, failed: 0 } });
    expect(db.user.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ status: "PENDING_ACTIVATION", passwordHash: null, mustChangePassword: true })] });
    expect(db.roleAssignment.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ role: kind === "students" ? "SINH_VIEN" : "GIANG_VIEN", scopeType: "GLOBAL", scopeKey: "GLOBAL", facultyId: null, departmentId: null })] });
    const mailToken = sendMail.mock.calls[0][0].token;
    expect(db.authToken.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "ACTIVATION", tokenHash: createHash("sha256").update(mailToken).digest("hex") })] });
    expect(db.auditLog.create.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0]);
    expect(JSON.stringify(result)).not.toContain(mailToken);
    const audit = JSON.stringify([...db.auditLog.create.mock.calls, ...db.auditLog.createMany.mock.calls]);
    expect(audit).not.toContain(mailToken); expect(audit).not.toContain("new@example.invalid"); expect(audit).not.toContain("Người giả");
  });
  it("SMTP lỗi giữ kết quả accountđãtạo, thu hồi đúng token và audit antoàn", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    sendMail.mockRejectedValue(new Error("smtp-secret-private"));
    const preview = await previewImport(current, input), result = await commitImport(current, { ...input, previewToken: preview.previewToken! });
    expect(result).toEqual({ kind: "students", created: 1, activation: { sent: 0, failed: 1 } });
    expect(db.authToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kind: "ACTIVATION", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), usedAt: null }) }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "IMPORT_ACTIVATION_DELIVERY_FAILED" }) }));
    expect(JSON.stringify(result)).not.toContain("smtp-secret-private");
  });
  it("SMTP và DB cùngngắt saucommit vẫn báo đúng accountđãtạo, không thúc người dùng lặplô", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    sendMail.mockRejectedValue(new Error("smtp-private")); db.authToken.updateMany.mockRejectedValue(new Error("db-private"));
    const preview = await previewImport(current, input), result = await commitImport(current, { ...input, previewToken: preview.previewToken! });
    expect(result).toEqual({ kind: "students", created: 1, activation: { sent: 0, failed: 1, revocationPending: 1 } });
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("replay cùngpreview bị từchối trước ghilại hoặc gửiemail", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input); db.auditLog.findFirst.mockResolvedValue({ id: randomUUID() });
    await expect(commitImport(current, { ...input, previewToken: preview.previewToken! })).rejects.toMatchObject({ code: "IMPORT_ALREADY_COMMITTED" });
    expect(db.user.createMany).not.toHaveBeenCalled(); expect(sendMail).not.toHaveBeenCalled();
  });
  it("học kỳ bị khóa saupreview chặn toàn lô ngay trướcghi", async () => {
    const current = actor(), input = upload("sections", "code,courseCode,semesterCode\nLP01,MH01,HK01"); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input); expect(preview.previewToken).toBeTruthy();
    db.semester.findMany.mockResolvedValue([{ ...semester, lockedAt: new Date() }]);
    await expect(commitImport(current, { ...input, previewToken: preview.previewToken! })).rejects.toMatchObject({ code: "IMPORT_VALIDATION_FAILED", errors: [{ row: 2, code: "SEMESTER_LOCKED" }] });
    expect(db.courseSection.createMany).not.toHaveBeenCalled();
  });
  it("quyền bị thu hồi giữapreview/commit chặn trước việcghi", async () => {
    const current = actor(), input = upload(); db.userSession.findUnique.mockResolvedValue(session(current));
    const preview = await previewImport(current, input);
    const active = session(current); db.userSession.findUnique.mockResolvedValue({ ...active, user: { ...active.user, roles: [] } });
    await expect(commitImport(current, { ...input, previewToken: preview.previewToken! })).rejects.toMatchObject({ status: 403 });
    expect(db.user.createMany).not.toHaveBeenCalled();
  });
  it("tải mẫu cũng kiểm actor hiện tại từ DB", async () => {
    const current = actor(); db.userSession.findUnique.mockResolvedValue(session(current));
    await expect(downloadImportTemplate(current, "sections", "csv")).resolves.toMatchObject({ fileName: "mau-sections.csv" });
    db.userSession.findUnique.mockResolvedValue(null);
    await expect(downloadImportTemplate(current, "sections", "csv")).rejects.toMatchObject({ status: 401 });
  });
});
