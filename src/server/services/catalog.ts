import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import { assertFreshActor, lockAdminMutations, objectId, pageInput, parseInput } from "./access";

export const catalogEntities = ["semesters", "faculties", "departments", "courses", "sections", "teaching"] as const;
export type CatalogEntity = typeof catalogEntities[number];
export interface CatalogRecord {
  id: string; code: string; name: string; isActive?: boolean;
  startsOn?: string; endsOn?: string; lockedAt?: string | null;
  facultyId?: string; facultyCode?: string; facultyName?: string;
  departmentId?: string; departmentCode?: string; departmentName?: string;
  credits?: number; courseId?: string; courseCode?: string; courseName?: string;
  semesterId?: string; semesterCode?: string; semesterName?: string;
  sectionId?: string; sectionCode?: string; teacherId?: string; teacherCode?: string; teacherName?: string; isLead?: boolean;
}
export interface CatalogListInput {
  page?: number; pageSize?: number; search?: string; isActive?: boolean;
  facultyId?: string; departmentId?: string; courseId?: string; semesterId?: string; sectionId?: string; teacherId?: string;
}
const listSchema = pageInput.extend({
  search: z.string().trim().max(100).optional(), isActive: z.boolean().optional(),
  facultyId: objectId.optional(), departmentId: objectId.optional(), courseId: objectId.optional(),
  semesterId: objectId.optional(), sectionId: objectId.optional(), teacherId: objectId.optional(),
}).strict();
const code = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_.-]+$/);
const name = z.string().trim().min(1).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2200-12-31";
});
const facultyInput = z.object({ code, name, isActive: z.boolean().default(true) }).strict();
const departmentInput = facultyInput.extend({ facultyId: objectId }).strict();
const courseInput = facultyInput.extend({
  name: z.string().trim().min(1).max(200), departmentId: objectId,
  credits: z.number().finite().positive().max(999.9).refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 0.000001),
}).strict();
const semesterInput = z.object({ code, name, startsOn: date, endsOn: date }).strict()
  .refine((value) => value.startsOn <= value.endsOn);
const sectionInput = z.object({ code, courseId: objectId, semesterId: objectId }).strict();
const teachingInput = z.object({ sectionId: objectId, teacherId: objectId, isLead: z.boolean().default(false) }).strict();
const simpleSelect = { id: true, code: true, name: true } as const;
const facultySelect = { ...simpleSelect, isActive: true } satisfies Prisma.FacultySelect;
const departmentSelect = { ...simpleSelect, isActive: true, facultyId: true, faculty: { select: simpleSelect } } satisfies Prisma.DepartmentSelect;
const semesterSelect = { ...simpleSelect, startsOn: true, endsOn: true, lockedAt: true } satisfies Prisma.SemesterSelect;
const courseSelect = { ...simpleSelect, isActive: true, credits: true, departmentId: true, department: { select: departmentSelect } } satisfies Prisma.CourseSelect;
const sectionSelect = { id: true, code: true, courseId: true, semesterId: true,
  course: { select: courseSelect }, semester: { select: semesterSelect } } satisfies Prisma.CourseSectionSelect;
const teachingSelect = { sectionId: true, teacherId: true, isLead: true, section: { select: sectionSelect },
  teacher: { select: { id: true, loginCode: true, displayName: true } } } satisfies Prisma.TeachingAssignmentSelect;
type FacultyRow = Prisma.FacultyGetPayload<{ select: typeof facultySelect }>;
type DepartmentRow = Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>;
type SemesterRow = Prisma.SemesterGetPayload<{ select: typeof semesterSelect }>;
type CourseRow = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;
type SectionRow = Prisma.CourseSectionGetPayload<{ select: typeof sectionSelect }>;
type TeachingRow = Prisma.TeachingAssignmentGetPayload<{ select: typeof teachingSelect }>;
const facultyDto = (row: FacultyRow): CatalogRecord => ({ ...row });
const departmentDto = (row: DepartmentRow): CatalogRecord => ({ id: row.id, code: row.code, name: row.name, isActive: row.isActive,
  facultyId: row.facultyId, facultyCode: row.faculty.code, facultyName: row.faculty.name });
const semesterDto = (row: SemesterRow): CatalogRecord => ({ id: row.id, code: row.code, name: row.name,
  startsOn: row.startsOn.toISOString().slice(0, 10), endsOn: row.endsOn.toISOString().slice(0, 10), lockedAt: row.lockedAt?.toISOString() ?? null });
const courseDto = (row: CourseRow): CatalogRecord => ({ id: row.id, code: row.code, name: row.name, isActive: row.isActive,
  credits: Number(row.credits), departmentId: row.departmentId, departmentCode: row.department.code, departmentName: row.department.name,
  facultyId: row.department.facultyId, facultyCode: row.department.faculty.code, facultyName: row.department.faculty.name });
const sectionDto = (row: SectionRow): CatalogRecord => ({ ...courseDto(row.course), id: row.id, code: row.code, name: row.course.name,
  courseId: row.courseId, courseCode: row.course.code, courseName: row.course.name,
  semesterId: row.semesterId, semesterCode: row.semester.code, semesterName: row.semester.name, lockedAt: row.semester.lockedAt?.toISOString() ?? null });
const teachingDto = (row: TeachingRow): CatalogRecord => ({ ...sectionDto(row.section), id: `${row.sectionId}:${row.teacherId}`,
  code: `${row.section.code} / ${row.teacher.loginCode}`, name: row.teacher.displayName,
  sectionId: row.sectionId, sectionCode: row.section.code, teacherId: row.teacherId,
  teacherCode: row.teacher.loginCode, teacherName: row.teacher.displayName, isLead: row.isLead });

function entityInput(entity: CatalogEntity): CatalogEntity {
  return parseInput(z.enum(catalogEntities), entity);
}
function teachingId(id: string) {
  const parts = id.split(":");
  if (parts.length !== 2) throw new AuthError("Mã phân công không hợp lệ.", 400, "INVALID_INPUT");
  return { sectionId: parseInput(objectId, parts[0]), teacherId: parseInput(objectId, parts[1]) };
}
function notFound(): never { throw new AuthError("Không tìm thấy dữ liệu danh mục.", 404, "NOT_FOUND"); }
function locked(): never { throw new AuthError("Học kỳ đã khóa sổ. Dữ liệu liên quan chỉ được đọc.", 409, "SEMESTER_LOCKED"); }

/** Cùng mutex với đổi quyền; phải là câu lệnh đầu tiên của transaction ghi, trước mọi SELECT. */
export async function lockCatalogMutations(tx: Prisma.TransactionClient): Promise<void> {
  await lockAdminMutations(tx);
}
/** Dùng lại cho import: chỉ gọi sau mutex trong transaction ghi. */
export async function assertCatalogSemesterOpen(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.semester.findUnique({ where: { id }, select: { id: true, lockedAt: true } });
  if (!row) throw new AuthError("Học kỳ không tồn tại.", 400, "INVALID_SEMESTER");
  if (row.lockedAt) locked();
  return row;
}
export async function assertCatalogCourseActive(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.course.findFirst({ where: { id, isActive: true, department: { isActive: true, faculty: { isActive: true } } }, select: { id: true } });
  if (!row) throw new AuthError("Môn học, bộ môn hoặc khoa không tồn tại hay đã ngừng hoạt động.", 400, "INVALID_COURSE");
  return row;
}

async function assertUnlockedImpact(tx: Prisma.TransactionClient, entity: CatalogEntity, id: string) {
  if (entity === "semesters") {
    const row = await tx.semester.findUnique({ where: { id }, select: { lockedAt: true } });
    if (!row) notFound();
    if (row.lockedAt) locked();
    return;
  }
  const where: Prisma.CourseSectionWhereInput = entity === "faculties" ? { course: { department: { facultyId: id } } } :
    entity === "departments" ? { course: { departmentId: id } } : entity === "courses" ? { courseId: id } :
      { id: entity === "teaching" ? teachingId(id).sectionId : id };
  if (await tx.courseSection.count({ where: { AND: [where, { semester: { lockedAt: { not: null } } }] } })) locked();
}

async function findRecord(tx: Prisma.TransactionClient, entity: CatalogEntity, id: string): Promise<CatalogRecord> {
  switch (entity) {
    case "faculties": { const row = await tx.faculty.findUnique({ where: { id }, select: facultySelect }); return row ? facultyDto(row) : notFound(); }
    case "departments": { const row = await tx.department.findUnique({ where: { id }, select: departmentSelect }); return row ? departmentDto(row) : notFound(); }
    case "semesters": { const row = await tx.semester.findUnique({ where: { id }, select: semesterSelect }); return row ? semesterDto(row) : notFound(); }
    case "courses": { const row = await tx.course.findUnique({ where: { id }, select: courseSelect }); return row ? courseDto(row) : notFound(); }
    case "sections": { const row = await tx.courseSection.findUnique({ where: { id }, select: sectionSelect }); return row ? sectionDto(row) : notFound(); }
    case "teaching": { const row = await tx.teachingAssignment.findUnique({ where: { sectionId_teacherId: teachingId(id) }, select: teachingSelect }); return row ? teachingDto(row) : notFound(); }
  }
}
function validatedId(entity: CatalogEntity, id: string) {
  if (entity === "teaching") { teachingId(id); return id; }
  return parseInput(objectId, id);
}

export async function getCatalog(actor: AuthActor, entity: CatalogEntity, id: string): Promise<CatalogRecord> {
  requireCan(actor, "catalog:read");
  const kind = entityInput(entity), key = validatedId(kind, id);
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "catalog:read");
    return findRecord(tx, kind, key);
  });
}

export async function listCatalog(actor: AuthActor, entity: CatalogEntity, input: CatalogListInput = {}) {
  requireCan(actor, "catalog:list");
  const kind = entityInput(entity), filter = parseInput(listSchema, input);
  const { page, pageSize, search, isActive, facultyId, departmentId, courseId, semesterId, sectionId, teacherId } = filter;
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "catalog:list");
    const paging = { skip: (page - 1) * pageSize, take: pageSize };
    let items: CatalogRecord[], total: number;
    const text = search ? { OR: [{ code: { contains: search } }, { name: { contains: search } }] } : {};
    switch (kind) {
      case "faculties": {
        const where: Prisma.FacultyWhereInput = { ...text, ...(isActive !== undefined ? { isActive } : {}) };
        const [rows, count] = await Promise.all([tx.faculty.findMany({ where, select: facultySelect, orderBy: [{ code: "asc" }, { id: "asc" }], ...paging }), tx.faculty.count({ where })]);
        items = rows.map(facultyDto); total = count; break;
      }
      case "departments": {
        const where: Prisma.DepartmentWhereInput = { ...text, ...(facultyId ? { facultyId } : {}), ...(isActive !== undefined ? { isActive } : {}) };
        const [rows, count] = await Promise.all([tx.department.findMany({ where, select: departmentSelect, orderBy: [{ code: "asc" }, { id: "asc" }], ...paging }), tx.department.count({ where })]);
        items = rows.map(departmentDto); total = count; break;
      }
      case "semesters": {
        const where: Prisma.SemesterWhereInput = text;
        const [rows, count] = await Promise.all([tx.semester.findMany({ where, select: semesterSelect, orderBy: [{ startsOn: "desc" }, { id: "asc" }], ...paging }), tx.semester.count({ where })]);
        items = rows.map(semesterDto); total = count; break;
      }
      case "courses": {
        const where: Prisma.CourseWhereInput = { ...text, ...(departmentId ? { departmentId } : {}), ...(facultyId ? { department: { facultyId } } : {}), ...(isActive !== undefined ? { isActive } : {}) };
        const [rows, count] = await Promise.all([tx.course.findMany({ where, select: courseSelect, orderBy: [{ code: "asc" }, { id: "asc" }], ...paging }), tx.course.count({ where })]);
        items = rows.map(courseDto); total = count; break;
      }
      case "sections": {
        const where: Prisma.CourseSectionWhereInput = { ...(search ? { OR: [{ code: { contains: search } }, { course: { name: { contains: search } } }] } : {}),
          ...(semesterId ? { semesterId } : {}), ...(courseId ? { courseId } : {}),
          ...((facultyId || departmentId || isActive !== undefined) ? { course: { ...(departmentId ? { departmentId } : {}), ...(facultyId ? { department: { facultyId } } : {}), ...(isActive !== undefined ? { isActive } : {}) } } : {}) };
        const [rows, count] = await Promise.all([tx.courseSection.findMany({ where, select: sectionSelect, orderBy: [{ code: "asc" }, { id: "asc" }], ...paging }), tx.courseSection.count({ where })]);
        items = rows.map(sectionDto); total = count; break;
      }
      case "teaching": {
        const where: Prisma.TeachingAssignmentWhereInput = { ...(sectionId ? { sectionId } : {}), ...(teacherId ? { teacherId } : {}),
          ...((semesterId || courseId || departmentId || facultyId || isActive !== undefined) ? { section: {
            ...(semesterId ? { semesterId } : {}), ...(courseId ? { courseId } : {}),
            ...((departmentId || facultyId || isActive !== undefined) ? { course: {
              ...(departmentId ? { departmentId } : {}), ...(facultyId ? { department: { facultyId } } : {}),
              ...(isActive !== undefined ? { isActive } : {}),
            } } : {}),
          } } : {}),
          ...(search ? { OR: [{ section: { code: { contains: search } } }, { teacher: { displayName: { contains: search } } }, { teacher: { loginCode: { contains: search } } }] } : {}) };
        const [rows, count] = await Promise.all([tx.teachingAssignment.findMany({ where, select: teachingSelect, orderBy: [{ sectionId: "asc" }, { teacherId: "asc" }], ...paging }), tx.teachingAssignment.count({ where })]);
        items = rows.map(teachingDto); total = count; break;
      }
    }
    return { items, total, page, pageSize };
  });
}

export async function listCatalogTeachers(actor: AuthActor, input: { page?: number; pageSize?: number; search?: string } = {}) {
  requireCan(actor, "catalog:list");
  const { page, pageSize, search } = parseInput(pageInput.extend({ search: z.string().trim().max(100).optional() }).strict(), input);
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "catalog:list");
    const where: Prisma.UserWhereInput = { status: { not: "DISABLED" }, roles: { some: { role: "GIANG_VIEN", scopeType: "GLOBAL", scopeKey: "GLOBAL", facultyId: null, departmentId: null } },
      ...(search ? { OR: [{ loginCode: { contains: search } }, { displayName: { contains: search } }] } : {}) };
    const [rows, total] = await Promise.all([tx.user.findMany({ where, select: { id: true, loginCode: true, displayName: true }, orderBy: [{ loginCode: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }), tx.user.count({ where })]);
    return { items: rows.map((row): CatalogRecord => ({ id: row.id, code: row.loginCode, name: row.displayName })), total, page, pageSize };
  });
}

async function audit(tx: Prisma.TransactionClient, actor: AuthActor, entity: CatalogEntity, id: string, operation: "CREATED" | "UPDATED" | "DELETED") {
  const objectType = { faculties: "Faculty", departments: "Department", semesters: "Semester", courses: "Course", sections: "CourseSection", teaching: "TeachingAssignment" }[entity];
  await tx.auditLog.create({ data: { actorId: actor.userId, action: `CATALOG_${entity.toUpperCase()}_${operation}`, objectType,
    objectId: entity === "teaching" ? teachingId(id).sectionId : id, redactedSummary: { success: true, count: 1 } } });
}
function catalogFailure(error: unknown): never {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "P2002") throw new AuthError("Mã danh mục hoặc phân công đã tồn tại.", 409, "DUPLICATE_CATALOG");
    if (error.code === "P2003") throw new AuthError("Dữ liệu đang được sử dụng hoặc liên kết không hợp lệ. Không thể xóa hay thay đổi.", 409, "CATALOG_IN_USE");
    if (error.code === "P2025") notFound();
  }
  throw error;
}

/** Tạo/cập nhật toàn bộ trường chỉnh sửa được; ID và trạng thái khóa không lấy từ client. */
export async function saveCatalog(actor: AuthActor, entity: CatalogEntity, id: string | null, input: unknown): Promise<CatalogRecord> {
  requireCan(actor, "catalog:write");
  const kind = entityInput(entity), key = id === null ? null : validatedId(kind, id);
  // Parse trước transaction; parse lại theo nhánh giữ kiểu đầu vào cụ thể cho Prisma.
  const schemas = { faculties: facultyInput, departments: departmentInput, semesters: semesterInput, courses: courseInput, sections: sectionInput, teaching: teachingInput };
  if (!schemas[kind].safeParse(input).success) throw new AuthError("Dữ liệu danh mục không hợp lệ. Kiểm tra mã, tên, ngày, tín chỉ và liên kết.", 400, "INVALID_INPUT");
  try {
    return await getDb().$transaction(async (tx) => {
      await lockCatalogMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "catalog:write");
      if (key) { await findRecord(tx, kind, key); await assertUnlockedImpact(tx, kind, key); }
      let result: CatalogRecord;
      switch (kind) {
        case "faculties": {
          const data = parseInput(facultyInput, input);
          result = facultyDto(key ? await tx.faculty.update({ where: { id: key }, data, select: facultySelect }) : await tx.faculty.create({ data, select: facultySelect })); break;
        }
        case "departments": {
          const data = parseInput(departmentInput, input);
          if (!(await tx.faculty.findFirst({ where: { id: data.facultyId, isActive: true }, select: { id: true } })))
            throw new AuthError("Khoa không tồn tại hoặc đã ngừng hoạt động.", 400, "INVALID_FACULTY");
          result = departmentDto(key ? await tx.department.update({ where: { id: key }, data, select: departmentSelect }) : await tx.department.create({ data, select: departmentSelect })); break;
        }
        case "semesters": {
          const parsed = parseInput(semesterInput, input), data = { ...parsed, startsOn: new Date(`${parsed.startsOn}T00:00:00.000Z`), endsOn: new Date(`${parsed.endsOn}T00:00:00.000Z`) };
          result = semesterDto(key ? await tx.semester.update({ where: { id: key }, data, select: semesterSelect }) : await tx.semester.create({ data, select: semesterSelect })); break;
        }
        case "courses": {
          const data = parseInput(courseInput, input);
          if (!(await tx.department.findFirst({ where: { id: data.departmentId, isActive: true, faculty: { isActive: true } }, select: { id: true } })))
            throw new AuthError("Bộ môn hoặc khoa không tồn tại hay đã ngừng hoạt động.", 400, "INVALID_DEPARTMENT");
          result = courseDto(key ? await tx.course.update({ where: { id: key }, data, select: courseSelect }) : await tx.course.create({ data, select: courseSelect })); break;
        }
        case "sections": {
          const data = parseInput(sectionInput, input);
          await assertCatalogSemesterOpen(tx, data.semesterId); await assertCatalogCourseActive(tx, data.courseId);
          result = sectionDto(key ? await tx.courseSection.update({ where: { id: key }, data, select: sectionSelect }) : await tx.courseSection.create({ data, select: sectionSelect })); break;
        }
        case "teaching": {
          const data = parseInput(teachingInput, input);
          if (key) {
            const current = teachingId(key);
            if (current.sectionId !== data.sectionId || current.teacherId !== data.teacherId)
              throw new AuthError("Không đổi lớp hoặc giảng viên của phân công. Hãy xóa và tạo phân công khác.", 400, "IMMUTABLE_ASSIGNMENT");
          }
          const section = await tx.courseSection.findUnique({ where: { id: data.sectionId }, select: { semesterId: true, courseId: true } });
          if (!section) throw new AuthError("Lớp học phần không tồn tại.", 400, "INVALID_SECTION");
          await assertCatalogSemesterOpen(tx, section.semesterId); await assertCatalogCourseActive(tx, section.courseId);
          if (!(await tx.user.findFirst({ where: { id: data.teacherId, status: { not: "DISABLED" }, roles: { some: { role: "GIANG_VIEN", scopeType: "GLOBAL", scopeKey: "GLOBAL", facultyId: null, departmentId: null } } }, select: { id: true } })))
            throw new AuthError("Tài khoản không có vai trò giảng viên hợp lệ hoặc đã bị khóa.", 400, "INVALID_TEACHER");
          if (data.isLead && await tx.teachingAssignment.count({ where: { sectionId: data.sectionId, teacherId: { not: data.teacherId }, isLead: true } }))
            throw new AuthError("Lớp học phần đã có giảng viên phụ trách chính.", 409, "LEAD_TEACHER_EXISTS");
          result = teachingDto(key ? await tx.teachingAssignment.update({ where: { sectionId_teacherId: teachingId(key) }, data: { isLead: data.isLead }, select: teachingSelect }) : await tx.teachingAssignment.create({ data, select: teachingSelect })); break;
        }
      }
      await audit(tx, fresh, kind, result.id, key ? "UPDATED" : "CREATED");
      return result;
    });
  } catch (error) { return catalogFailure(error); }
}

export async function deleteCatalog(actor: AuthActor, entity: CatalogEntity, id: string) {
  requireCan(actor, "catalog:write");
  const kind = entityInput(entity), key = validatedId(kind, id);
  try {
    return await getDb().$transaction(async (tx) => {
      await lockCatalogMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "catalog:write");
      await findRecord(tx, kind, key); await assertUnlockedImpact(tx, kind, key);
      switch (kind) {
        case "faculties": await tx.faculty.delete({ where: { id: key } }); break;
        case "departments": await tx.department.delete({ where: { id: key } }); break;
        case "semesters": await tx.semester.delete({ where: { id: key } }); break;
        case "courses": await tx.course.delete({ where: { id: key } }); break;
        case "sections": await tx.courseSection.delete({ where: { id: key } }); break;
        case "teaching": await tx.teachingAssignment.delete({ where: { sectionId_teacherId: teachingId(key) } }); break;
      }
      await audit(tx, fresh, kind, key, "DELETED");
      return { deleted: true };
    });
  } catch (error) { return catalogFailure(error); }
}

export async function lockSemester(actor: AuthActor, id: string, input: { reason: string }): Promise<CatalogRecord> {
  requireCan(actor, "catalog:write");
  const key = parseInput(objectId, id);
  const { reason } = parseInput(z.object({ reason: z.string().trim().min(10).max(500) }).strict(), input);
  return getDb().$transaction(async (tx) => {
    await lockCatalogMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "catalog:write");
    const record = await tx.semester.findUnique({ where: { id: key }, select: { lockedAt: true } });
    if (!record) notFound();
    if (record.lockedAt) throw new AuthError("Học kỳ đã khóa sổ trước đó; không thể khóa hoặc mở lại.", 409, "SEMESTER_LOCKED");
    const changed = await tx.semester.updateMany({ where: { id: key, lockedAt: null }, data: { lockedAt: new Date() } });
    if (changed.count !== 1) locked();
    await tx.auditLog.create({ data: { actorId: fresh.userId, action: "SEMESTER_LOCKED", objectType: "Semester", objectId: key,
      redactedSummary: { success: true, reasonProvided: true, reasonLength: reason.length } } });
    return findRecord(tx, "semesters", key);
  });
}
