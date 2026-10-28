import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import type { Role } from "../src/generated/prisma/enums";
import {
  createUser,
  getUser,
  listUsers,
  replaceUserRoles,
  setUserStatus,
} from "../src/server/services/users";
import {
  getWorkspaceSection,
  listWorkspaceSections,
} from "../src/server/services/workspace";
import {
  listAuditLogs,
  redactAuditSummary,
} from "../src/server/services/audit";
import { getMfaPolicy, setMfaPolicy } from "../src/server/services/mfa-policy";

const { db } = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    userSession: { findUnique: vi.fn(), updateMany: vi.fn() },
    authToken: { updateMany: vi.fn() },
    roleAssignment: { deleteMany: vi.fn(), createMany: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    department: { findFirst: vi.fn(), findMany: vi.fn() },
    faculty: { findFirst: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    courseSection: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));

function actor(role: Role = "ADMIN"): AuthActor {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          facultyId: null,
          departmentId: randomUUID(),
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            facultyId: randomUUID(),
            departmentId: null,
          }
        : { scopeType: "GLOBAL" as const, facultyId: null, departmentId: null };
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "FAKE",
    email: "fake@example.invalid",
    displayName: "Giả",
    roles: [role],
    assignments: [{ role, ...scope }],
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
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.$queryRaw.mockResolvedValue([]);
  db.$executeRaw.mockResolvedValue(1);
  db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN"] });
  db.systemSetting.upsert.mockResolvedValue({});
  db.userSession.updateMany.mockResolvedValue({ count: 1 });
  db.authToken.updateMany.mockResolvedValue({ count: 1 });
  db.auditLog.create.mockResolvedValue({});
  db.department.findFirst.mockResolvedValue({ id: randomUUID() });
  db.faculty.findFirst.mockResolvedValue({ id: randomUUID() });
});

describe("FR-10/11/12, BR-30/32/34 — chặn tại service trước dữ liệu", () => {
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
  ])(
    "TC-ALL-01 một phần: %s lớp list/count/detail luôn cùng phạm vi hoặc bị chặn trước DB",
    async (role) => {
      const current = actor(role),
        id = randomUUID();
      if (["ADMIN", "PHONG_KHAO_THI", "THANH_TRA"].includes(role)) {
        await expect(listWorkspaceSections(current)).rejects.toMatchObject({
          status: 403,
        });
        await expect(getWorkspaceSection(current, id)).rejects.toMatchObject({
          status: 403,
        });
        expect(db.$transaction).not.toHaveBeenCalled();
        return;
      }
      db.userSession.findUnique.mockResolvedValue(session(current));
      db.courseSection.findMany.mockResolvedValue([]);
      db.courseSection.count.mockResolvedValue(0);
      db.courseSection.findFirst.mockResolvedValue(null);
      const grant = current.assignments![0];
      const where =
        role === "SINH_VIEN"
          ? {
              OR: [
                {
                  enrollments: {
                    some: { studentId: current.userId, withdrawnAt: null },
                  },
                },
              ],
            }
          : role === "GIANG_VIEN"
            ? { OR: [{ teaching: { some: { teacherId: current.userId } } }] }
            : role === "TRUONG_BO_MON"
              ? { OR: [{ course: { departmentId: grant.departmentId } }] }
              : role === "TRUONG_KHOA"
                ? {
                    OR: [
                      {
                        course: { department: { facultyId: grant.facultyId } },
                      },
                    ],
                  }
                : {};
      await expect(listWorkspaceSections(current)).resolves.toMatchObject({
        total: 0,
      });
      expect(db.courseSection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(db.courseSection.count).toHaveBeenCalledWith({ where });
      await expect(getWorkspaceSection(current, id)).rejects.toMatchObject({
        status: 404,
      });
      expect(db.courseSection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ id }, where] } }),
      );
    },
  );
  it("mọi service quản trị từ chối GV trước transaction/query/ghi", async () => {
    const current = actor("GIANG_VIEN"),
      id = randomUUID();
    const attempts = [
      () => listUsers(current),
      () => getUser(current, id),
      () =>
        createUser(current, {
          loginCode: "FAKE",
          email: "new@example.invalid",
          displayName: "Giả",
          roles: [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
        }),
      () => setUserStatus(current, id, { status: "DISABLED" }),
      () =>
        replaceUserRoles(current, id, {
          roles: [{ role: "ADMIN", scopeType: "GLOBAL" }],
        }),
      () => listAuditLogs(current),
      () => getMfaPolicy(current),
      () => setMfaPolicy(current, { requiredRoles: ["ADMIN"] }),
    ];
    for (const attempt of attempts)
      await expect(attempt()).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("không tin actor.mfa khi phiên DB không xác minh; không đọc dữ liệu người dùng", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue({
      ...session(current),
      mfaVerifiedAt: null,
    });
    await expect(listUsers(current)).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it("vai trò bị thu hồi hoặc phiên revoked/khác chủ/purpose tạm bị chặn", async () => {
    const current = actor(),
      active = session(current);
    for (const changed of [
      { ...active, revokedAt: new Date() },
      { ...active, userId: randomUUID() },
      { ...active, familyId: randomUUID() },
      { ...active, purpose: "MFA_VERIFY" },
      { ...active, user: { ...active.user, status: "DISABLED" } },
      { ...active, user: { ...active.user, roles: [] } },
    ]) {
      db.userSession.findUnique.mockResolvedValue(changed);
      await expect(getUser(current, randomUUID())).rejects.toMatchObject({
        status: expect.any(Number),
      });
    }
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
  it("thay đổi policy áp dụng tức thời cho vai trò ngoài ADMIN", async () => {
    const current = actor("GIANG_VIEN");
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.systemSetting.findUnique.mockResolvedValue({
      value: ["ADMIN", "GIANG_VIEN"],
    });
    await expect(listWorkspaceSections(current)).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    });
    expect(db.courseSection.findMany).not.toHaveBeenCalled();
  });
  it("bộ môn ngừng hoạt động vô hiệu gán phạm vi trong DB trước khi đọc lớp", async () => {
    const current: AuthActor = {
      ...actor("GIANG_VIEN"),
      roles: ["TRUONG_BO_MON"],
      assignments: [
        {
          role: "TRUONG_BO_MON",
          scopeType: "DEPARTMENT",
          departmentId: randomUUID(),
          facultyId: null,
        },
      ],
    };
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.department.findFirst.mockResolvedValue(null);
    await expect(listWorkspaceSections(current)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.courseSection.findMany).not.toHaveBeenCalled();
  });
  it("phân trang/query sai bị chặn, không truy vấn DB", async () => {
    const current = actor();
    for (const input of [
      { page: 0 },
      { pageSize: 51 },
      { page: 1.5 },
      { search: "x".repeat(101) },
    ])
      await expect(listUsers(current, input)).rejects.toMatchObject({
        status: 400,
      });
    await expect(
      listAuditLogs(current, {
        from: "2026-10-22T00:00:00Z",
        to: "2026-10-21T00:00:00Z",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("list/count lớp có cùng filter GV, detail ngoài phạm vi trả404 bằng query cóscope", async () => {
    const current = actor("GIANG_VIEN"),
      id = randomUUID();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.courseSection.findMany.mockResolvedValue([]);
    db.courseSection.count.mockResolvedValue(0);
    await expect(
      listWorkspaceSections(current, { page: 2, pageSize: 10 }),
    ).resolves.toMatchObject({ items: [], total: 0, page: 2, pageSize: 10 });
    const where = {
      OR: [{ teaching: { some: { teacherId: current.userId } } }],
    };
    expect(db.courseSection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 10, take: 10 }),
    );
    expect(db.courseSection.count).toHaveBeenCalledWith({ where });
    db.courseSection.findFirst.mockResolvedValue(null);
    await expect(getWorkspaceSection(current, id)).rejects.toMatchObject({
      status: 404,
    });
    expect(db.courseSection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ id }, where] } }),
    );
  });
  it("ID sai bị chặn trước DB; ADMIN đơn vai trò không truy vấn lớp", async () => {
    await expect(getUser(actor(), "not-a-uuid")).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      getWorkspaceSection(actor("GIANG_VIEN"), "not-a-uuid"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      getWorkspaceSection(actor(), randomUUID()),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("tạo tài khoản chờ kích hoạt không password; scopeKey tự tạo, audit không email/password", async () => {
    const current = actor(),
      id = randomUUID(),
      departmentId = randomUUID();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.create.mockResolvedValue({ id, status: "PENDING_ACTIVATION" });
    await createUser(current, {
      loginCode: "NEW_FAKE",
      email: "New@example.invalid",
      displayName: "Giả",
      roles: [{ role: "TRUONG_BO_MON", scopeType: "DEPARTMENT", departmentId }],
    });
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING_ACTIVATION",
          passwordHash: null,
          roles: {
            create: [
              {
                role: "TRUONG_BO_MON",
                scopeType: "DEPARTMENT",
                scopeKey: `DEPARTMENT:${departmentId}`,
                facultyId: null,
                departmentId,
              },
            ],
          },
        }),
      }),
    );
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      "New@example.invalid",
    );
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      "password",
    );
  });
  it("không gán scope trái vai trò/khôngactive và không cho client gán scopeKey", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    const base = {
      loginCode: "FAKE",
      email: "fake@example.invalid",
      displayName: "Giả",
    };
    await expect(
      createUser(current, {
        ...base,
        roles: [
          { role: "ADMIN", scopeType: "FACULTY", facultyId: randomUUID() },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    db.department.findFirst.mockResolvedValue(null);
    await expect(
      createUser(current, {
        ...base,
        roles: [
          {
            role: "TRUONG_BO_MON",
            scopeType: "DEPARTMENT",
            departmentId: randomUUID(),
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_SCOPE" });
    expect(db.user.create).not.toHaveBeenCalled();
  });
  it("mở tài khoản chưa có password trảPENDING, thu hồi cả phiên và token", async () => {
    const current = actor(),
      id = randomUUID();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findUnique.mockResolvedValue({
      status: "DISABLED",
      passwordHash: null,
      roles: [],
    });
    db.user.update.mockResolvedValue({ id, status: "PENDING_ACTIVATION" });
    await expect(
      setUserStatus(current, id, { status: "ACTIVE" }),
    ).resolves.toMatchObject({ status: "PENDING_ACTIVATION" });
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: id, revokedAt: null } }),
    );
    expect(db.authToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: id, usedAt: null } }),
    );
  });
  it("không tự đổi quyền/tự khóa và không xóa ADMIN active cuối, stablelock trước đọc", async () => {
    const current = actor(),
      id = randomUUID();
    await expect(
      setUserStatus(current, current.userId, { status: "DISABLED" }),
    ).rejects.toMatchObject({ code: "SELF_MUTATION" });
    await expect(
      replaceUserRoles(current, current.userId, {
        roles: [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
      }),
    ).rejects.toMatchObject({ code: "SELF_MUTATION" });
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findUnique.mockResolvedValue({
      status: "ACTIVE",
      roles: [
        {
          role: "ADMIN",
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
      ],
    });
    db.user.count.mockResolvedValue(0);
    await expect(
      replaceUserRoles(current, id, {
        roles: [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
      }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.user.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.roleAssignment.deleteMany).not.toHaveBeenCalled();
  });
  it("mutex quản trị dùng locking INSERT trước mọi consistent read, không ORM upsert rỗng", async () => {
    const current = actor(),
      id = randomUUID();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findUnique.mockResolvedValue({
      status: "DISABLED",
      passwordHash: "hash",
      roles: [],
    });
    db.user.update.mockResolvedValue({ id, status: "ACTIVE" });
    await setUserStatus(current, id, { status: "ACTIVE" });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const sql = db.$executeRaw.mock.calls[0]?.[0].join("");
    expect(sql).toContain("INSERT INTO SystemSetting");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.$queryRaw.mock.invocationCallOrder[0],
    );
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it("đổi gán hợp lệ thu hồi mọi phiên/token và ghi audit tóm tắt trong transaction", async () => {
    const current = actor(),
      id = randomUUID(),
      facultyId = randomUUID();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findUnique.mockResolvedValue({
      status: "ACTIVE",
      roles: [
        {
          role: "GIANG_VIEN",
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
      ],
    });
    db.user.findUniqueOrThrow.mockResolvedValue({
      id,
      roles: [
        {
          role: "TRUONG_KHOA",
          scopeType: "FACULTY",
          facultyId,
          departmentId: null,
        },
      ],
    });
    await expect(
      replaceUserRoles(current, id, {
        roles: [{ role: "TRUONG_KHOA", scopeType: "FACULTY", facultyId }],
      }),
    ).resolves.toMatchObject({ id });
    expect(db.roleAssignment.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: id,
          role: "TRUONG_KHOA",
          scopeType: "FACULTY",
          scopeKey: `FACULTY:${facultyId}`,
          facultyId,
          departmentId: null,
        },
      ],
    });
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: id, revokedAt: null } }),
    );
    expect(db.authToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: id, usedAt: null } }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "USER_ROLES_CHANGED",
        objectId: id,
        redactedSummary: {
          before: {
            roles: [
              {
                role: "GIANG_VIEN",
                scopeType: "GLOBAL",
                facultyId: null,
                departmentId: null,
              },
            ],
          },
          after: {
            roles: [
              {
                role: "TRUONG_KHOA",
                scopeType: "FACULTY",
                facultyId,
                departmentId: null,
              },
            ],
          },
        },
      }),
    });
  });
  it("policy không được bỏADMIN, thêmrole khóaUser trướcupdate vàrevoke phiênchưaMFA", async () => {
    const current = actor(),
      userId = randomUUID();
    await expect(
      setMfaPolicy(current, { requiredRoles: ["GIANG_VIEN"] }),
    ).rejects.toMatchObject({ status: 400 });
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.user.findMany.mockResolvedValue([{ id: userId }]);
    await expect(
      setMfaPolicy(current, { requiredRoles: ["ADMIN", "GIANG_VIEN"] }),
    ).resolves.toEqual({ requiredRoles: ["ADMIN", "GIANG_VIEN"] });
    expect(db.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { in: [userId] },
          revokedAt: null,
          mfaVerifiedAt: null,
        },
      }),
    );
    const calls = db.systemSetting.upsert.mock.calls;
    expect(calls.at(-1)?.[0]).toMatchObject({
      where: { key: "MFA_REQUIRED_ROLES" },
      update: { value: ["ADMIN", "GIANG_VIEN"], updatedById: current.userId },
    });
  });
  it("AuditDTO lược bí mật ngay cả bản ghi cũ, không include quan hệ nhạy cảm", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(current));
    db.auditLog.count.mockResolvedValue(1);
    db.auditLog.findMany.mockResolvedValue([
      {
        id: randomUUID(),
        actorId: current.userId,
        action: "USER_STATUS_CHANGED",
        objectType: "User",
        objectId: randomUUID(),
        occurredAt: new Date("2026-10-22T00:00:00Z"),
        redactedSummary: {
          before: { status: "ACTIVE", password: "secret" },
          after: { status: "DISABLED" },
          token: "abc",
          email: "private@example.invalid",
          content: "Phiếu",
        },
      },
    ]);
    const result = await listAuditLogs(current, {
      action: "USER_STATUS_CHANGED",
    });
    expect(result.items[0]?.redactedSummary).toEqual({
      before: { status: "ACTIVE" },
      after: { status: "DISABLED" },
    });
    expect(result.items[0]?.occurredAt).toBe("2026-10-22T00:00:00.000Z");
    expect(
      redactAuditSummary({
        roles: [{ role: "ADMIN", scopeType: "GLOBAL", token: "secret" }],
      }),
    ).toEqual({ roles: [{ role: "ADMIN", scopeType: "GLOBAL" }] });
    expect(
      redactAuditSummary({
        status: "SecretPassword123",
        method: "x".repeat(43),
      }),
    ).toEqual({ status: null, method: null });
    expect(
      redactAuditSummary({
        reason: "bí mật",
        reasonProvided: true,
        reasonLength: 20,
        requestIpHash: "a".repeat(64),
        source: "server-console",
      }),
    ).toEqual({
      reasonProvided: true,
      reasonLength: 20,
      source: "server-console",
    });
  });
});
