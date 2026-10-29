import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role } from "../src/generated/prisma/enums";
import { can } from "../src/server/policies/can";
import {
  assertCatalogCourseActive,
  assertCatalogSemesterOpen,
  deleteCatalog,
  getCatalog,
  listCatalog,
  listCatalogTeachers,
  lockCatalogMutations,
  lockSemester,
  unlockSemester,
  saveCatalog,
} from "../src/server/services/catalog";

const { db, sendUnlockMail } = vi.hoisted(() => {
  const delegate = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  });
  return {
    db: {
      faculty: delegate(),
      department: delegate(),
      semester: delegate(),
      course: delegate(),
      courseSection: delegate(),
      teachingAssignment: delegate(),
      user: delegate(),
      userSession: delegate(),
      systemSetting: delegate(),
      auditLog: delegate(),
      surveyCampaign: delegate(),
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    },
    sendUnlockMail: vi.fn(),
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/lib/mail", () => ({
  sendSemesterUnlockedMail: sendUnlockMail,
}));

function actor(role: Role = "PHONG_DAO_TAO"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Giả",
    roles: [role],
    assignments: [
      { role, scopeType: "GLOBAL", facultyId: null, departmentId: null },
    ],
    purpose: "FULL",
    mustChangePassword: false,
    mfa: role === "ADMIN",
    mfaRequired: role === "ADMIN",
  };
}
function session(current: AuthActor) {
  return {
    id: current.sessionId,
    userId: current.userId,
    familyId: current.familyId,
    purpose: "FULL",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    mfaVerifiedAt: current.mfa ? new Date() : null,
    user: {
      id: current.userId,
      loginCode: current.loginCode,
      email: current.email,
      displayName: current.displayName,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: current.assignments,
    },
  };
}
const faculty = {
  id: randomUUID(),
  code: "FAKE_F",
  name: "Khoa giả",
  isActive: true,
};
const department = {
  id: randomUUID(),
  code: "FAKE_D",
  name: "Bộ môn giả",
  isActive: true,
  facultyId: faculty.id,
  faculty,
};
const semester = {
  id: randomUUID(),
  code: "FAKE_S",
  name: "Kỳ giả",
  startsOn: new Date("2026-09-01T00:00:00Z"),
  endsOn: new Date("2027-01-31T00:00:00Z"),
  lockedAt: null as Date | null,
};
const course = {
  id: randomUUID(),
  code: "FAKE_C",
  name: "Môn giả",
  credits: 3.5,
  isActive: true,
  departmentId: department.id,
  department,
};
const section = {
  id: randomUUID(),
  code: "FAKE_L",
  courseId: course.id,
  semesterId: semester.id,
  course,
  semester,
};
const teacher = {
  id: randomUUID(),
  loginCode: "FAKE_T",
  displayName: "Giảng viên giả",
};
const assignment = {
  sectionId: section.id,
  teacherId: teacher.id,
  isLead: false,
  section,
  teacher,
};
const assignmentId = `${section.id}:${teacher.id}`;
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN"] });
  db.auditLog.create.mockResolvedValue({});
  sendUnlockMail.mockResolvedValue(undefined);
  for (const model of [
    db.faculty,
    db.department,
    db.semester,
    db.course,
    db.courseSection,
    db.teachingAssignment,
    db.user,
  ]) {
    model.count.mockResolvedValue(0);
    model.findMany.mockResolvedValue([]);
  }
  db.faculty.findUnique.mockResolvedValue(faculty);
  db.faculty.findFirst.mockResolvedValue(faculty);
  db.faculty.create.mockResolvedValue(faculty);
  db.faculty.update.mockResolvedValue(faculty);
  db.department.findUnique.mockResolvedValue(department);
  db.department.findFirst.mockResolvedValue(department);
  db.department.create.mockResolvedValue(department);
  db.department.update.mockResolvedValue(department);
  db.semester.findUnique.mockResolvedValue(semester);
  db.semester.create.mockResolvedValue(semester);
  db.semester.update.mockResolvedValue(semester);
  db.semester.updateMany.mockResolvedValue({ count: 1 });
  db.course.findUnique.mockResolvedValue(course);
  db.course.findFirst.mockResolvedValue(course);
  db.course.create.mockResolvedValue(course);
  db.course.update.mockResolvedValue(course);
  db.courseSection.findUnique.mockResolvedValue(section);
  db.courseSection.create.mockResolvedValue(section);
  db.courseSection.update.mockResolvedValue(section);
  db.teachingAssignment.findUnique.mockResolvedValue(assignment);
  db.teachingAssignment.create.mockResolvedValue(assignment);
  db.teachingAssignment.update.mockResolvedValue(assignment);
  db.user.findFirst.mockResolvedValue(teacher);
});

describe("FR-20/21/22, BR-17/30/34 — quyền danh mục và khóa sổ", () => {
  it.each<Role>([
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "ADMIN",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])("TC-PDT-01/TC-ALL-01 một phần: %s quyền theo entity", (role) => {
    expect(can(actor(role), "catalog:list")).toBe(
      ["PHONG_DAO_TAO", "ADMIN", "CAN_BO_DBCL"].includes(role),
    );
    expect(can(actor(role), "catalog:write")).toBe(false);
    expect(can(actor(role), "imports:manage")).toBe(role === "PHONG_DAO_TAO");
    for (const entity of [
      "semesters",
      "courses",
      "sections",
      "teaching",
    ] as const) {
      expect(can(actor(role), "catalog:write", { catalogEntity: entity })).toBe(
        role === "PHONG_DAO_TAO",
      );
      expect(can(actor(role), "catalog:read", { catalogEntity: entity })).toBe(
        ["PHONG_DAO_TAO", "CAN_BO_DBCL"].includes(role),
      );
    }
    for (const entity of ["faculties", "departments"] as const)
      expect(can(actor(role), "catalog:write", { catalogEntity: entity })).toBe(
        role === "ADMIN",
      );
  });
  it("ADMIN+PĐT cần MFA, gán PĐT sai phạm vi không cấp quyền", () => {
    const admin = actor("ADMIN"),
      combined = {
        ...admin,
        roles: [...admin.roles, "PHONG_DAO_TAO" as const],
        assignments: [...admin.assignments!, ...actor().assignments!],
      };
    expect(can(combined, "catalog:write", { catalogEntity: "semesters" })).toBe(
      true,
    );
    expect(
      can({ ...combined, mfa: false }, "catalog:write", {
        catalogEntity: "semesters",
      }),
    ).toBe(false);
    expect(
      can(
        {
          ...actor(),
          assignments: [
            {
              role: "PHONG_DAO_TAO",
              scopeType: "FACULTY",
              facultyId: faculty.id,
              departmentId: null,
            },
          ],
        },
        "catalog:write",
        { catalogEntity: "semesters" },
      ),
    ).toBe(false);
  });
  it.each<Role>([
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "ADMIN",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ])(
    "TC-PDT-01: %s không được ghi dữ liệu đào tạo qua ID thật",
    async (role) => {
      const current = actor(role);
      for (const kind of [
        "semesters",
        "courses",
        "sections",
        "teaching",
      ] as const) {
        const id = kind === "teaching" ? assignmentId : semester.id;
        await expect(saveCatalog(current, kind, id, {})).rejects.toMatchObject({
          status: 403,
        });
        await expect(deleteCatalog(current, kind, id)).rejects.toMatchObject({
          status: 403,
        });
      }
      await expect(
        lockSemester(current, semester.id, {
          reason: "Không có quyền khóa sổ",
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        unlockSemester(current, semester.id, {
          reason: "Không có quyền mở khóa",
        }),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("TC-PDT-01: PĐT không ghi khoa/bộ môn; ĐBCL chỉ đọc và không nhập tệp", async () => {
    for (const current of [actor(), actor("CAN_BO_DBCL")]) {
      for (const kind of ["faculties", "departments"] as const) {
        await expect(
          saveCatalog(current, kind, faculty.id, {}),
        ).rejects.toMatchObject({ status: 403 });
        await expect(
          deleteCatalog(current, kind, faculty.id),
        ).rejects.toMatchObject({ status: 403 });
      }
    }
    expect(db.$transaction).not.toHaveBeenCalled();
    const quality = actor("CAN_BO_DBCL");
    db.userSession.findUnique.mockResolvedValue(session(quality));
    db.semester.findMany.mockResolvedValue([semester]);
    await expect(listCatalog(quality, "semesters")).resolves.toMatchObject({
      items: [{ id: semester.id }],
    });
  });
  it("từ chối mọi lối service trước truy cập DB cho ADMIN đơn vai trò", async () => {
    const current = actor("ADMIN");
    const attempts = [
      () => listCatalog(current, "semesters"),
      () => getCatalog(current, "semesters", semester.id),
      () => saveCatalog(current, "semesters", null, {}),
      () => deleteCatalog(current, "semesters", semester.id),
      () => lockSemester(current, semester.id, { reason: "Đã đối soát xong" }),
      () =>
        unlockSemester(current, semester.id, { reason: "Đã đối soát xong" }),
      () => listCatalogTeachers(current),
    ];
    for (const attempt of attempts)
      await expect(attempt()).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("vai trò bị thu hồi/phiên cũ không được sửa dù actor truyền vào còn ĐBCL", async () => {
    const current = actor("ADMIN"),
      active = session(current);
    for (const changed of [
      { ...active, revokedAt: new Date() },
      { ...active, user: { ...active.user, roles: [] } },
    ]) {
      db.userSession.findUnique.mockResolvedValue(changed);
      await expect(
        saveCatalog(current, "faculties", null, { code: "X", name: "X" }),
      ).rejects.toMatchObject({ status: expect.any(Number) });
    }
    expect(db.faculty.create).not.toHaveBeenCalled();
  });
  it("validate UUID, page, dates, credit, unknownfields trước transaction", async () => {
    const current = actor();
    const attempts = [
      () => getCatalog(current, "courses", "bad"),
      () => getCatalog(current, "teaching", `${section.id}:bad`),
      () => listCatalog(current, "faculties", { pageSize: 51 }),
      () =>
        saveCatalog(current, "semesters", null, {
          code: "X",
          name: "X",
          startsOn: "2026-02-30",
          endsOn: "2026-03-31",
        }),
      () =>
        saveCatalog(current, "semesters", null, {
          code: "X",
          name: "X",
          startsOn: "2026-10-01",
          endsOn: "2026-09-01",
        }),
      () =>
        saveCatalog(current, "courses", null, {
          code: "X",
          name: "X",
          departmentId: department.id,
          credits: 1.25,
        }),
      () =>
        saveCatalog(actor("ADMIN"), "faculties", null, {
          code: "X",
          name: "X",
          roles: ["ADMIN"],
        }),
      () => lockSemester(current, semester.id, { reason: "ngắn" }),
    ];
    for (const attempt of attempts)
      await expect(attempt()).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("mutex dùng locking INSERT đầu tiên trước actor/dữ liệu, không có ORM upsert", async () => {
    const current = actor("ADMIN");
    db.userSession.findUnique.mockResolvedValue(session(current));
    await saveCatalog(current, "faculties", null, { code: "X", name: "X" });
    const sql = db.$executeRaw.mock.calls[0]?.[0].join("");
    expect(sql).toContain("INSERT INTO SystemSetting");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.$queryRaw.mock.invocationCallOrder[0],
    );
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.userSession.findUnique.mock.invocationCallOrder[0]).toBeLessThan(
      db.faculty.create.mock.invocationCallOrder[0],
    );
  });
  it("list/count cùng bộ lọc, phân trang và chỉ DTO đã chọn", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.course.findMany.mockResolvedValue([course]);
    db.course.count.mockResolvedValue(1);
    const result = await listCatalog(current, "courses", {
      page: 2,
      pageSize: 10,
      search: "giả",
      facultyId: faculty.id,
      departmentId: department.id,
      isActive: true,
    });
    const where = db.course.count.mock.calls[0]?.[0].where;
    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 10, take: 10 }),
    );
    expect(result).toMatchObject({
      total: 1,
      page: 2,
      pageSize: 10,
      items: [{ id: course.id, credits: 3.5, facultyName: faculty.name }],
    });
    expect(result.items[0]).not.toHaveProperty("department");
  });
  it("detail ngày DATE không đổi múi giờ; ID không tồn tại trả404", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    expect(await getCatalog(current, "semesters", semester.id)).toMatchObject({
      startsOn: "2026-09-01",
      endsOn: "2027-01-31",
      lockedAt: null,
    });
    db.semester.findUnique.mockResolvedValue(null);
    await expect(
      getCatalog(current, "semesters", semester.id),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("chỉ đọc giảng viên hợp lệ, không chọn password/email, list/count cùng predicate", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findMany.mockResolvedValue([teacher]);
    db.user.count.mockResolvedValue(1);
    const result = await listCatalogTeachers(current, {
      search: "giả",
      pageSize: 5,
    });
    expect(result.items).toEqual([
      { id: teacher.id, code: teacher.loginCode, name: teacher.displayName },
    ]);
    const query = db.user.findMany.mock.calls[0]?.[0];
    expect(query.where.roles.some).toMatchObject({
      role: "GIANG_VIEN",
      scopeType: "GLOBAL",
      scopeKey: "GLOBAL",
      facultyId: null,
      departmentId: null,
    });
    expect(db.user.count).toHaveBeenCalledWith({ where: query.where });
    expect(query.select).toEqual({
      id: true,
      loginCode: true,
      displayName: true,
    });
  });
  it.each(["DA_DUYET", "DANG_MO"])(
    "BR-17/53: chặn khóa kỳ khi có đợt %s theo quyết định người dùng",
    async (status) => {
      const current = actor();
      db.userSession.findUnique.mockResolvedValue(session(current));
      db.surveyCampaign.findFirst.mockResolvedValue({
        id: randomUUID(),
        status,
      });
      await expect(
        lockSemester(current, semester.id, {
          reason: "Đã kiểm tra dữ liệu kỳ",
        }),
      ).rejects.toMatchObject({
        status: 409,
        code: "SEMESTER_HAS_ACTIVE_CAMPAIGN",
      });
      expect(db.surveyCampaign.findFirst).toHaveBeenCalledWith({
        where: {
          semesterId: semester.id,
          status: { in: ["DA_DUYET", "DANG_MO"] },
        },
        select: { id: true },
      });
      expect(db.semester.updateMany).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
      expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        db.surveyCampaign.findFirst.mock.invocationCallOrder[0],
      );
    },
  );
  it("khóa sổ có CAS, audit người/thời điểm/ngữ cảnh không ghi nguyên văn lý do", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    const reason = "Đã đối soát dữ liệu kỳ này";
    await lockSemester(current, semester.id, { reason });
    expect(db.semester.updateMany).toHaveBeenCalledWith({
      where: { id: semester.id, lockedAt: null },
      data: { lockedAt: expect.any(Date) },
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: current.userId,
        action: "SEMESTER_LOCKED",
        objectId: semester.id,
        redactedSummary: {
          success: true,
          reasonProvided: true,
          reasonLength: reason.length,
        },
      }),
    });
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(reason);
    db.semester.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      lockSemester(current, semester.id, { reason }),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
  });
  it("TC-PDT-01: mở khóa cần lý do, mutex/fresh/CAS/audit trong transaction; email sau commit đến ĐBCL active GLOBAL", async () => {
    const current = actor(),
      reason = "Sửa dữ liệu sau đối soát",
      lockedAt = new Date();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findUnique.mockResolvedValue({ ...semester, lockedAt });
    db.user.findMany.mockResolvedValue([{ email: "quality@example.invalid" }]);
    let committed = false;
    db.$transaction.mockImplementation(async (callback) => {
      const result = await callback(db);
      committed = true;
      return result;
    });
    sendUnlockMail.mockImplementation(async () => {
      expect(committed).toBe(true);
    });
    await expect(
      unlockSemester(current, semester.id, { reason: "ngắn" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
    const result = await unlockSemester(current, semester.id, { reason });
    expect(result).toMatchObject({
      item: { id: semester.id, lockedAt: null },
      notification: { status: "SENT", sent: 1, failed: 0, auditRecorded: true },
    });
    expect(db.semester.updateMany).toHaveBeenCalledWith({
      where: { id: semester.id, lockedAt },
      data: { lockedAt: null },
    });
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        roles: {
          some: {
            role: "CAN_BO_DBCL",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
            facultyId: null,
            departmentId: null,
          },
        },
      },
      select: { email: true },
    });
    expect(
      db.auditLog.create.mock.calls.map((call) => call[0].data.action),
    ).toEqual(["SEMESTER_UNLOCKED", "SEMESTER_UNLOCK_NOTIFICATION"]);
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(reason);
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      "quality@example.invalid",
    );
    expect(sendUnlockMail).toHaveBeenCalledWith({
      to: "quality@example.invalid",
      semesterCode: semester.code,
      semesterName: semester.name,
      reason,
    });
  });
  it("mở khóa phát hiện trạng thái cũ và mất CAS; không audit hay gửi mail giả", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    await expect(
      unlockSemester(current, semester.id, { reason: "Đối soát dữ liệu lại" }),
    ).rejects.toMatchObject({ code: "SEMESTER_ALREADY_OPEN" });
    db.semester.findUnique.mockResolvedValue({
      ...semester,
      lockedAt: new Date(),
    });
    db.semester.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      unlockSemester(current, semester.id, { reason: "Đối soát dữ liệu lại" }),
    ).rejects.toMatchObject({ code: "SEMESTER_STATE_CHANGED" });
    expect(db.auditLog.create).not.toHaveBeenCalled();
    expect(sendUnlockMail).not.toHaveBeenCalled();
  });
  it("SMTP lỗi sau commit được báo FAILED, ghi audit redacted; không giả rollback hay lộ lỗi/email", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findUnique.mockResolvedValue({
      ...semester,
      lockedAt: new Date(),
    });
    db.user.findMany.mockResolvedValue([{ email: "quality@example.invalid" }]);
    sendUnlockMail.mockRejectedValue(new Error("SMTP secret credential"));
    const result = await unlockSemester(current, semester.id, {
      reason: "Đối soát dữ liệu lại",
    });
    expect(result).toMatchObject({
      item: { lockedAt: null },
      notification: {
        status: "FAILED",
        sent: 0,
        failed: 1,
        auditRecorded: true,
      },
    });
    expect(db.auditLog.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        action: "SEMESTER_UNLOCK_NOTIFICATION",
        redactedSummary: { notificationStatus: "FAILED", sent: 0, failed: 1 },
      }),
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      "secret",
    );
  });
  it("không có ĐBCL nhận thư hoặc không ghi được biên nhận được báo rõ sau mở khóa", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findUnique.mockResolvedValue({
      ...semester,
      lockedAt: new Date(),
    });
    db.auditLog.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("DB unavailable"));
    await expect(
      unlockSemester(current, semester.id, { reason: "Đối soát dữ liệu lại" }),
    ).resolves.toMatchObject({
      notification: {
        status: "NO_RECIPIENT",
        sent: 0,
        failed: 0,
        auditRecorded: false,
      },
    });
    expect(sendUnlockMail).not.toHaveBeenCalled();
  });
  it("không sửa/xóa/khóa lại học kỳ đã khóa qua đường CRUD", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findUnique.mockResolvedValue({
      ...semester,
      lockedAt: new Date(),
    });
    await expect(
      saveCatalog(current, "semesters", semester.id, {
        code: "X",
        name: "X",
        startsOn: "2026-09-01",
        endsOn: "2027-01-31",
      }),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    await expect(
      deleteCatalog(current, "semesters", semester.id),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    await expect(
      lockSemester(current, semester.id, { reason: "Đã đối soát xong" }),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    expect(db.semester.update).not.toHaveBeenCalled();
    expect(db.semester.delete).not.toHaveBeenCalled();
    expect(db.semester.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    "faculties",
    "departments",
    "courses",
    "sections",
    "teaching",
  ] as const)(
    "chặn sửa/xóa %s ảnh hưởng gián tiếp lớp thuộc kỳ khóa",
    async (kind) => {
      const current = actor(
        kind === "faculties" || kind === "departments"
          ? "ADMIN"
          : "PHONG_DAO_TAO",
      );
      db.userSession.findUnique.mockResolvedValue(session(current));
      db.courseSection.count.mockResolvedValue(1);
      const id = {
        faculties: faculty.id,
        departments: department.id,
        courses: course.id,
        sections: section.id,
        teaching: assignmentId,
      }[kind];
      const input = {
        faculties: { code: "X", name: "X" },
        departments: { code: "X", name: "X", facultyId: faculty.id },
        courses: {
          code: "X",
          name: "X",
          departmentId: department.id,
          credits: 3,
        },
        sections: { code: "X", courseId: course.id, semesterId: semester.id },
        teaching: {
          sectionId: section.id,
          teacherId: teacher.id,
          isLead: false,
        },
      }[kind];
      await expect(saveCatalog(current, kind, id, input)).rejects.toMatchObject(
        { code: "SEMESTER_LOCKED" },
      );
      await expect(deleteCatalog(current, kind, id)).rejects.toMatchObject({
        code: "SEMESTER_LOCKED",
      });
      expect(db.auditLog.create).not.toHaveBeenCalled();
    },
  );
  it("không chuyển lớp từ kỳ mở sang kỳ khóa và không tạo lớp ở cây môn ngừng hoạt động", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.semester.findUnique.mockResolvedValue({
      ...semester,
      lockedAt: new Date(),
    });
    await expect(
      saveCatalog(current, "sections", section.id, {
        code: "X",
        semesterId: semester.id,
        courseId: course.id,
      }),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    db.semester.findUnique.mockResolvedValue(semester);
    db.course.findFirst.mockResolvedValue(null);
    await expect(
      saveCatalog(current, "sections", null, {
        code: "X",
        semesterId: semester.id,
        courseId: course.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_COURSE" });
    expect(db.courseSection.create).not.toHaveBeenCalled();
  });
  it("không gán sinh viên/giảng viên bị khóa, không đổi ID phân công", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findFirst.mockResolvedValue(null);
    await expect(
      saveCatalog(current, "teaching", null, {
        sectionId: section.id,
        teacherId: teacher.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_TEACHER" });
    db.user.findFirst.mockResolvedValue(teacher);
    await expect(
      saveCatalog(current, "teaching", assignmentId, {
        sectionId: section.id,
        teacherId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "IMMUTABLE_ASSIGNMENT" });
    expect(db.teachingAssignment.create).not.toHaveBeenCalled();
    expect(db.teachingAssignment.update).not.toHaveBeenCalled();
  });
  it("mỗi lớp tối đa một giảng viên chính, kể cả khi sửa phân công", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.teachingAssignment.count.mockResolvedValue(1);
    await expect(
      saveCatalog(current, "teaching", null, {
        sectionId: section.id,
        teacherId: teacher.id,
        isLead: true,
      }),
    ).rejects.toMatchObject({ code: "LEAD_TEACHER_EXISTS" });
    expect(db.teachingAssignment.create).not.toHaveBeenCalled();
  });
  it("tạo/sửa/xóa đều audit cùng transaction; duplicate/FK trả lỗi nghiệp vụ409", async () => {
    const current = actor("ADMIN");
    db.userSession.findUnique.mockResolvedValue(session(current));
    await saveCatalog(current, "faculties", null, { code: "X", name: "X" });
    await saveCatalog(current, "faculties", faculty.id, {
      code: "X",
      name: "X",
    });
    await deleteCatalog(current, "faculties", faculty.id);
    expect(
      db.auditLog.create.mock.calls.map((call) => call[0].data.action),
    ).toEqual([
      "CATALOG_FACULTIES_CREATED",
      "CATALOG_FACULTIES_UPDATED",
      "CATALOG_FACULTIES_DELETED",
    ]);
    db.faculty.create.mockRejectedValue({
      code: "P2002",
      meta: { secret: "not exposed" },
    });
    await expect(
      saveCatalog(current, "faculties", null, { code: "X", name: "X" }),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_CATALOG" });
    db.faculty.delete.mockRejectedValue({ code: "P2003" });
    await expect(
      deleteCatalog(current, "faculties", faculty.id),
    ).rejects.toMatchObject({ status: 409, code: "CATALOG_IN_USE" });
  });
  it("helpers chia sẻ import kiểm kỳ khóa/cây môn active và cùng mutex", async () => {
    // Đối số chỉ là transaction nội bộ đã được service bảo vệ; không có HTTP truy cập trực tiếp.
    const tx = db as unknown as Parameters<typeof lockCatalogMutations>[0];
    await lockCatalogMutations(tx);
    await assertCatalogSemesterOpen(tx, semester.id);
    await assertCatalogCourseActive(tx, course.id);
    expect(db.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: course.id,
        isActive: true,
        department: { isActive: true, faculty: { isActive: true } },
      },
      select: { id: true },
    });
    db.semester.findUnique.mockResolvedValue(null);
    await expect(
      assertCatalogSemesterOpen(tx, randomUUID()),
    ).rejects.toMatchObject({ code: "INVALID_SEMESTER" });
  });
});
