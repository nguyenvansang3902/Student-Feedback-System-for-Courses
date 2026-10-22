import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { getAuthConfig } from "../../lib/env";
import { sendAccountTokenMail } from "../../lib/mail";
import { getAuthLimits } from "../auth/limits";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor } from "./access";
import { lockCatalogMutations } from "./catalog";
import { makeImportTemplate, parseImportFile, parseImportKind, type ImportFormat, type ImportKind, type ImportRow, type ImportRowError, type ParsedImport } from "./import-file";

export { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, MAX_ACCOUNT_IMPORT_ROWS, IMPORT_COLUMNS, importKinds } from "./import-file";
export type { ImportFormat, ImportKind, ImportRowError } from "./import-file";

const PREVIEW_TTL_SECONDS = 15 * 60;
const IMPORT_ACTION = "CATALOG_IMPORT_COMMITTED";
const lookupKey = (text: string) => text.toLowerCase();
const digest = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
export interface ImportUpload { kind: ImportKind; fileName: string; content: Buffer }
export interface ImportPreview {
  kind: ImportKind; fileName: string; sha256: string; rowCount: number; validRows: number;
  errors: ImportRowError[]; sample: ImportRow[]; previewToken: string | null; expiresAt: string | null;
}
export interface ImportCommitResult { kind: ImportKind; created: number; activation: { sent: number; failed: number; revocationPending?: number } }
interface PreviewClaim { v: 1; uid: string; sid: string; kind: ImportKind; sha256: string; exp: number; nonce: string }
interface ResolvedRow extends ImportRow { courseId?: string; semesterId?: string; sectionId?: string; studentId?: string }

export class ImportValidationError extends AuthError {
  constructor(public readonly errors: ImportRowError[]) {
    super("Dữ liệu đã thay đổi hoặc tệp có lỗi. Hãy chạy thử lại để xem lỗi từng dòng.", 409, "IMPORT_VALIDATION_FAILED");
  }
}

function signPreview(payload: string): Buffer {
  return createHmac("sha256", getAuthConfig().jwtSecret).update(`sfs-import-preview-v1:${payload}`).digest();
}

function issuePreview(actor: AuthActor, kind: ImportKind, hash: string): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + PREVIEW_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ v: 1, uid: actor.userId, sid: actor.sessionId, kind, sha256: hash, exp, nonce: randomUUID() } satisfies PreviewClaim)).toString("base64url");
  return { token: `${payload}.${signPreview(payload).toString("base64url")}`, expiresAt: new Date(exp * 1000).toISOString() };
}

function verifyPreview(actor: AuthActor, input: ImportUpload & { previewToken: string }): PreviewClaim {
  const deny = () => new AuthError("Lần chạy thử không hợp lệ hoặc đã hết hạn. Vui lòng chạy thử lại tệp.", 409, "INVALID_IMPORT_PREVIEW");
  if (typeof input.previewToken !== "string" || input.previewToken.length > 2048) throw deny();
  const parts = input.previewToken.split(".");
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw deny();
  const [payload, signature] = parts, expected = signPreview(payload), actual = Buffer.from(signature, "base64url");
  if (actual.toString("base64url") !== signature || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw deny();
  try {
    if (Buffer.from(payload, "base64url").toString("base64url") !== payload) throw deny();
    const claim: PreviewClaim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")), now = Math.floor(Date.now() / 1000);
    if (claim.v !== 1 || claim.uid !== actor.userId || claim.sid !== actor.sessionId || claim.kind !== input.kind || claim.sha256 !== digest(input.content) || !Number.isInteger(claim.exp) || claim.exp <= now || claim.exp > now + PREVIEW_TTL_SECONDS || !/^[a-f0-9-]{36}$/.test(claim.nonce)) throw deny();
    return claim;
  } catch { throw deny(); }
}

/** Truy vấn theo lô; thông báo chỉ chứa vị trí lỗi, không lộ bản ghi đang có. */
async function validateReferences(tx: Prisma.TransactionClient, parsed: ParsedImport): Promise<{ rows: ResolvedRow[]; errors: ImportRowError[] }> {
  const errors = [...parsed.errors], rows: ResolvedRow[] = parsed.rows.map((row) => ({ ...row }));
  const add = (row: ImportRow, column: string, code: string, message: string) => errors.push({ row: row.row, column, code, message });
  if (!rows.length) return { rows, errors };
  if (parsed.kind === "students" || parsed.kind === "teachers") {
    const existing = await tx.user.findMany({ where: { OR: [
      { loginCode: { in: rows.map((row) => row.values.loginCode) } }, { email: { in: rows.map((row) => row.values.email) } },
    ] }, select: { loginCode: true, email: true } });
    const codes = new Set(existing.map((user) => lookupKey(user.loginCode))), emails = new Set(existing.map((user) => lookupKey(user.email)));
    for (const row of rows) {
      if (codes.has(lookupKey(row.values.loginCode))) add(row, "loginCode", "ALREADY_EXISTS", "Mã định danh đã được sử dụng; nhập tệp không sửa tài khoản đang có.");
      if (emails.has(lookupKey(row.values.email))) add(row, "email", "ALREADY_EXISTS", "Email đã được sử dụng; nhập tệp không thay đổi tài khoản đang có.");
    }
    return { rows, errors };
  }
  const semesters = await tx.semester.findMany({ where: { code: { in: [...new Set(rows.map((row) => row.values.semesterCode))] } }, select: { id: true, code: true, lockedAt: true } });
  const semesterMap = new Map(semesters.map((semester) => [lookupKey(semester.code), semester]));
  for (const row of rows) {
    const semester = semesterMap.get(lookupKey(row.values.semesterCode));
    if (!semester) add(row, "semesterCode", "REFERENCE_NOT_FOUND", "Học kỳ không tồn tại.");
    else if (semester.lockedAt) add(row, "semesterCode", "SEMESTER_LOCKED", "Học kỳ đã khóa sổ; không thể nhập dữ liệu.");
    else row.semesterId = semester.id;
  }
  const semesterIds = semesters.map((semester) => semester.id);
  if (parsed.kind === "sections") {
    const [courses, existing] = await Promise.all([
      tx.course.findMany({ where: { code: { in: [...new Set(rows.map((row) => row.values.courseCode))] } }, select: { id: true, code: true, isActive: true, department: { select: { isActive: true, faculty: { select: { isActive: true } } } } } }),
      tx.courseSection.findMany({ where: { semesterId: { in: semesterIds }, code: { in: rows.map((row) => row.values.code) } }, select: { code: true, semesterId: true } }),
    ]);
    const courseMap = new Map(courses.map((course) => [lookupKey(course.code), course]));
    const pairs = new Set(existing.map((section) => `${section.semesterId}:${lookupKey(section.code)}`));
    for (const row of rows) {
      const course = courseMap.get(lookupKey(row.values.courseCode));
      if (!course || !course.isActive || !course.department.isActive || !course.department.faculty.isActive) add(row, "courseCode", "INACTIVE_REFERENCE", "Môn học không tồn tại hoặc môn/bộ môn/khoa đã ngừng hoạt động.");
      else row.courseId = course.id;
      if (row.semesterId && pairs.has(`${row.semesterId}:${lookupKey(row.values.code)}`)) add(row, "code", "ALREADY_EXISTS", "Mã lớp học phần đã có trong học kỳ.");
    }
  } else {
    const [sections, students] = await Promise.all([
      tx.courseSection.findMany({ where: { semesterId: { in: semesterIds }, code: { in: rows.map((row) => row.values.sectionCode) } }, select: { id: true, code: true, semesterId: true, course: { select: { isActive: true, department: { select: { isActive: true, faculty: { select: { isActive: true } } } } } } } }),
      tx.user.findMany({ where: { loginCode: { in: rows.map((row) => row.values.studentCode) }, status: { not: "DISABLED" }, roles: { some: { role: "SINH_VIEN", scopeType: "GLOBAL", scopeKey: "GLOBAL", departmentId: null, facultyId: null } } }, select: { id: true, loginCode: true } }),
    ]);
    const sectionMap = new Map(sections.map((section) => [`${section.semesterId}:${lookupKey(section.code)}`, section]));
    const studentMap = new Map(students.map((student) => [lookupKey(student.loginCode), student]));
    for (const row of rows) {
      const student = studentMap.get(lookupKey(row.values.studentCode));
      if (!student) add(row, "studentCode", "INVALID_STUDENT", "Không tìm thấy sinh viên hợp lệ hoặc tài khoản đã bị khóa.");
      else row.studentId = student.id;
      const section = row.semesterId ? sectionMap.get(`${row.semesterId}:${lookupKey(row.values.sectionCode)}`) : null;
      if (row.semesterId && !section) add(row, "sectionCode", "REFERENCE_NOT_FOUND", "Lớp học phần không tồn tại trong học kỳ này.");
      else if (section) {
        if (!section.course.isActive || !section.course.department.isActive || !section.course.department.faculty.isActive) add(row, "sectionCode", "INACTIVE_REFERENCE", "Môn học, bộ môn hoặc khoa của lớp đã ngừng hoạt động.");
        else row.sectionId = section.id;
      }
    }
    const existing = await tx.enrollment.findMany({ where: { sectionId: { in: sections.map((section) => section.id) }, studentId: { in: students.map((student) => student.id) } }, select: { sectionId: true, studentId: true } });
    const pairs = new Set(existing.map((enrollment) => `${enrollment.sectionId}:${enrollment.studentId}`));
    for (const row of rows) if (row.sectionId && row.studentId && pairs.has(`${row.sectionId}:${row.studentId}`)) add(row, "studentCode", "ALREADY_EXISTS", "Sinh viên đã có bản ghi đăng ký tại lớp này (kể cả đã rút).");
  }
  return { rows, errors };
}

export async function previewImport(actor: AuthActor, input: ImportUpload): Promise<ImportPreview> {
  requireCan(actor, "imports:manage");
  // Không tạo AuditLog, token DB, khóa mutex hoặc bản ghi import trong bước chạy thử.
  const parsed = await parseImportFile(input.kind, input.fileName, input.content);
  const result = await getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "imports:manage");
    return validateReferences(tx, parsed);
  });
  const sha256 = digest(input.content), issued = result.errors.length ? null : issuePreview(actor, parsed.kind, sha256);
  const invalidRows = new Set(result.errors.filter((error) => error.row > 1).map((error) => error.row));
  return { kind: parsed.kind, fileName: input.fileName, sha256, rowCount: parsed.rowCount,
    validRows: result.errors.some((error) => error.row === 1) ? 0 : parsed.rowCount - invalidRows.size,
    errors: result.errors, sample: parsed.rows.slice(0, 10), previewToken: issued?.token ?? null, expiresAt: issued?.expiresAt ?? null };
}

interface ActivationDelivery { userId: string; email: string; token: string; tokenHash: string }

/** Gửi sau commit: không giữ transaction/khóa MySQL trong lúc đợi SMTP. */
async function deliverActivations(actorId: string, deliveries: ActivationDelivery[]): Promise<ImportCommitResult["activation"]> {
  let cursor = 0, sent = 0, failed = 0, revocationPending = 0;
  await Promise.all(Array.from({ length: Math.min(5, deliveries.length) }, async () => {
    while (cursor < deliveries.length) {
      const delivery = deliveries[cursor++];
      try { await sendAccountTokenMail({ to: delivery.email, kind: "ACTIVATION", token: delivery.token }); sent++; }
      catch {
        failed++;
        // Chỉ thu hồi token vừa được lần nhập này tạo, không chạm token yêu cầu lại.
        try {
          await getDb().$transaction(async (tx) => {
            await tx.authToken.updateMany({ where: { userId: delivery.userId, tokenHash: delivery.tokenHash, kind: "ACTIVATION", usedAt: null }, data: { usedAt: new Date() } });
            await tx.auditLog.create({ data: { actorId, action: "IMPORT_ACTIVATION_DELIVERY_FAILED", objectType: "User", objectId: delivery.userId, redactedSummary: { purpose: "ACTIVATION" } } });
          });
        } catch {
          // Nếu cả SMTP lẫn DB ngắt sau commit, vẫn báo account đã được tạo.
          // Token không được trả ra; hạn dùng ban đầu vẫn có hiệu lực. Không ném
          // lỗi "chưa nhập" khiến người dùng lặp lô hoặc bỏ các worker đang gửi.
          revocationPending++;
        }
      }
    }
  }));
  return { sent, failed, ...(revocationPending ? { revocationPending } : {}) };
}

export async function commitImport(actor: AuthActor, input: ImportUpload & { previewToken: string }): Promise<ImportCommitResult> {
  requireCan(actor, "imports:manage");
  parseImportKind(input.kind);
  if (!Buffer.isBuffer(input.content)) throw new AuthError("Nội dung tệp không hợp lệ.", 400, "INVALID_IMPORT_FILE");
  const claim = verifyPreview(actor, input), parsed = await parseImportFile(input.kind, input.fileName, input.content);
  let deliveries: ActivationDelivery[] = [];
  try {
    deliveries = await getDb().$transaction(async (tx) => {
      // Cùng mutex với khóa học kỳ và đổi quyền, trước mọi consistent read.
      await lockCatalogMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "imports:manage");
      if (claim.exp <= Math.floor(Date.now() / 1000))
        throw new AuthError("Lần chạy thử đã hết hạn. Vui lòng chạy thử lại.", 409, "INVALID_IMPORT_PREVIEW");
      if (await tx.auditLog.findFirst({ where: { action: IMPORT_ACTION, objectType: "ImportBatch", objectId: claim.nonce }, select: { id: true } }))
        throw new AuthError("Lần nhập này đã được ghi trước đó. Hãy tải lại dữ liệu.", 409, "IMPORT_ALREADY_COMMITTED");
      const result = await validateReferences(tx, parsed);
      if (result.errors.length) throw new ImportValidationError(result.errors);
      const created: ActivationDelivery[] = [];
      if (parsed.kind === "students" || parsed.kind === "teachers") {
        const role = parsed.kind === "students" ? "SINH_VIEN" as const : "GIANG_VIEN" as const;
        const users = result.rows.map((row) => ({ id: randomUUID(), loginCode: row.values.loginCode, email: row.values.email, displayName: row.values.displayName }));
        await tx.user.createMany({ data: users.map((user) => ({ id: user.id, loginCode: user.loginCode, email: user.email, displayName: user.displayName, status: "PENDING_ACTIVATION", passwordHash: null, mustChangePassword: true })) });
        await tx.roleAssignment.createMany({ data: users.map((user) => ({ userId: user.id, role, scopeType: "GLOBAL", scopeKey: "GLOBAL", facultyId: null, departmentId: null })) });
        const now = Date.now(), ttl = getAuthLimits().ACTIVATION_TTL_SECONDS * 1000;
        for (const user of users) { const token = randomBytes(32).toString("base64url"); created.push({ userId: user.id, email: user.email, token, tokenHash: digest(token) }); }
        await tx.authToken.createMany({ data: created.map((delivery) => ({ userId: delivery.userId, kind: "ACTIVATION", tokenHash: delivery.tokenHash, expiresAt: new Date(now + ttl) })) });
        await tx.auditLog.createMany({ data: users.map((user) => ({ actorId: fresh.userId, action: "IMPORT_ACCOUNT_ACTIVATION_ISSUED", objectType: "User", objectId: user.id, redactedSummary: { purpose: "ACTIVATION", status: "PENDING_ACTIVATION", role } })) });
      } else if (parsed.kind === "sections") {
        await tx.courseSection.createMany({ data: result.rows.map((row) => ({ code: row.values.code, courseId: row.courseId!, semesterId: row.semesterId! })) });
      } else {
        await tx.enrollment.createMany({ data: result.rows.map((row) => ({ sectionId: row.sectionId!, studentId: row.studentId! })) });
      }
      await tx.auditLog.create({ data: { actorId: fresh.userId, action: IMPORT_ACTION, objectType: "ImportBatch", objectId: claim.nonce, redactedSummary: { kind: parsed.kind, created: result.rows.length } } });
      return created;
    }, { maxWait: 15_000, timeout: 30_000 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new AuthError("Có dữ liệu trùng vừa được tạo. Không ghi dòng nào; hãy chạy thử lại.", 409, "IMPORT_CONFLICT");
    throw error;
  }
  const activation = await deliverActivations(actor.userId, deliveries);
  return { kind: parsed.kind, created: parsed.rows.length, activation };
}

export async function downloadImportTemplate(actor: AuthActor, kind: ImportKind, format: ImportFormat) {
  requireCan(actor, "imports:manage");
  await getDb().$transaction(async (tx) => { requireCan(await assertFreshActor(tx, actor), "imports:manage"); });
  return makeImportTemplate(kind, format);
}
