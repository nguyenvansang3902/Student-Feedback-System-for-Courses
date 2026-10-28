import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { isValidGrant, requireCan, type RoleGrant } from "../policies/can";
import { assertFreshActor, lockAdminMutations, objectId, pageInput, parseInput, revokeUserAccess } from "./access";

const roles = ["SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"] as const;
const grantInput = z.object({
  role: z.enum(roles), scopeType: z.enum(["GLOBAL", "FACULTY", "DEPARTMENT"]),
  facultyId: z.uuid().nullable().optional(), departmentId: z.uuid().nullable().optional(),
}).strict().refine(isValidGrant, { message: "Vai trò và phạm vi không phù hợp." });
const grantsInput = z.array(grantInput).min(1).max(30).refine((grants) => {
  const keys = grants.map((grant) => `${grant.role}:${grant.scopeType}:${grant.facultyId ?? grant.departmentId ?? ""}`);
  return new Set(keys).size === keys.length;
}, { message: "Vai trò bị trùng." });
const userInput = z.object({
  loginCode: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_.-]+$/),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(1).max(160), roles: grantsInput,
}).strict();
const listInput = pageInput.extend({
  search: z.string().trim().max(100).optional(), status: z.enum(["ACTIVE", "DISABLED", "PENDING_ACTIVATION"]).optional(),
}).strict();

const userSelect = {
  id: true, loginCode: true, email: true, displayName: true, status: true, mustChangePassword: true,
  roles: { select: { role: true, scopeType: true, facultyId: true, departmentId: true }, orderBy: [{ role: "asc" }, { scopeKey: "asc" }] },
} satisfies Prisma.UserSelect;
export type UserDTO = Prisma.UserGetPayload<{ select: typeof userSelect }>;

async function validateGrants(tx: Prisma.TransactionClient, grants: RoleGrant[]) {
  for (const grant of grants) {
    if (grant.facultyId && !(await tx.faculty.findFirst({ where: { id: grant.facultyId, isActive: true }, select: { id: true } })))
      throw new AuthError("Khoa không tồn tại hoặc đã ngừng hoạt động.", 400, "INVALID_SCOPE");
    if (grant.departmentId && !(await tx.department.findFirst({ where: {
      id: grant.departmentId, isActive: true, faculty: { isActive: true },
    }, select: { id: true } })))
      throw new AuthError("Bộ môn không tồn tại hoặc đã ngừng hoạt động.", 400, "INVALID_SCOPE");
  }
  return grants.map((grant) => ({
    role: grant.role, scopeType: grant.scopeType,
    scopeKey: grant.scopeType === "GLOBAL" ? "GLOBAL" : `${grant.scopeType}:${grant.facultyId ?? grant.departmentId}`,
    facultyId: grant.facultyId ?? null, departmentId: grant.departmentId ?? null,
  }));
}

async function ensureAnotherAdmin(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.user.count({ where: { id: { not: userId }, status: "ACTIVE", roles: { some: {
    role: "ADMIN", scopeType: "GLOBAL", scopeKey: "GLOBAL", facultyId: null, departmentId: null,
  } } } });
  if (!count) throw new AuthError("Phải giữ lại ít nhất một quản trị viên đang hoạt động.", 409, "LAST_ADMIN");
}

function safeRoles(grants: RoleGrant[]): Prisma.InputJsonValue {
  return grants.map((grant) => ({ role: grant.role, scopeType: grant.scopeType, facultyId: grant.facultyId ?? null, departmentId: grant.departmentId ?? null }));
}

export async function listUsers(actor: AuthActor, input: { page?: number; pageSize?: number; search?: string; status?: string } = {}) {
  requireCan(actor, "users:list");
  const { page, pageSize, search, status } = parseInput(listInput, input);
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "users:list");
    const where: Prisma.UserWhereInput = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ loginCode: { contains: search } }, { email: { contains: search } }, { displayName: { contains: search } }] } : {}),
    };
    const [items, total] = await Promise.all([
      tx.user.findMany({ where, select: userSelect, orderBy: [{ loginCode: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      tx.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function getUser(actor: AuthActor, id: string): Promise<UserDTO> {
  requireCan(actor, "users:read");
  const userId = parseInput(objectId, id);
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "users:read");
    const user = await tx.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new AuthError("Không tìm thấy tài khoản.", 404, "NOT_FOUND");
    return user;
  });
}

export async function createUser(actor: AuthActor, input: { loginCode: string; email: string; displayName: string; roles: RoleGrant[] }): Promise<UserDTO> {
  requireCan(actor, "users:create");
  const parsed = parseInput(userInput, input);
  try {
    return await getDb().$transaction(async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, "users:create");
      const grants = await validateGrants(tx, parsed.roles);
      const user = await tx.user.create({ data: {
        loginCode: parsed.loginCode, email: parsed.email, displayName: parsed.displayName,
        status: "PENDING_ACTIVATION", passwordHash: null, mustChangePassword: true,
        roles: { create: grants },
      }, select: userSelect });
      await tx.auditLog.create({ data: { actorId: fresh.userId, action: "USER_CREATED", objectType: "User", objectId: user.id,
        redactedSummary: { status: "PENDING_ACTIVATION", roles: safeRoles(parsed.roles) } } });
      return user;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new AuthError("Mã định danh hoặc email đã được sử dụng.", 409, "DUPLICATE_USER");
    throw error;
  }
}

export async function setUserStatus(actor: AuthActor, id: string, input: { status: "ACTIVE" | "DISABLED" }): Promise<UserDTO> {
  requireCan(actor, "users:status");
  const userId = parseInput(objectId, id);
  const { status } = parseInput(z.object({ status: z.enum(["ACTIVE", "DISABLED"]) }).strict(), input);
  if (userId === actor.userId && status === "DISABLED")
    throw new AuthError("Không được tự khóa tài khoản đang thao tác.", 409, "SELF_MUTATION");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "users:status");
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, passwordHash: true, roles: true } });
    if (!user) throw new AuthError("Không tìm thấy tài khoản.", 404, "NOT_FOUND");
    if (status === "DISABLED" && user.status === "ACTIVE" && user.roles.some((grant) => grant.role === "ADMIN" && isValidGrant(grant)))
      await ensureAnotherAdmin(tx, userId);
    const nextStatus = status === "ACTIVE" && !user.passwordHash ? "PENDING_ACTIVATION" : status;
    const changed = await tx.user.update({ where: { id: userId }, data: { status: nextStatus }, select: userSelect });
    await revokeUserAccess(tx, userId);
    await tx.auditLog.create({ data: { actorId: fresh.userId, action: "USER_STATUS_CHANGED", objectType: "User", objectId: userId,
      redactedSummary: { before: { status: user.status }, after: { status: nextStatus } } } });
    return changed;
  });
}

export async function replaceUserRoles(actor: AuthActor, id: string, input: { roles: RoleGrant[] }): Promise<UserDTO> {
  requireCan(actor, "users:roles");
  const userId = parseInput(objectId, id);
  const { roles: grants } = parseInput(z.object({ roles: grantsInput }).strict(), input);
  if (userId === actor.userId) throw new AuthError("Hãy nhờ quản trị viên khác thay đổi vai trò của bạn.", 409, "SELF_MUTATION");
  return getDb().$transaction(async (tx) => {
    await lockAdminMutations(tx);
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "users:roles");
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, roles: true } });
    if (!user) throw new AuthError("Không tìm thấy tài khoản.", 404, "NOT_FOUND");
    const normalized = await validateGrants(tx, grants);
    if (user.status === "ACTIVE" && user.roles.some((grant) => grant.role === "ADMIN" && isValidGrant(grant)) && !grants.some((grant) => grant.role === "ADMIN"))
      await ensureAnotherAdmin(tx, userId);
    await tx.roleAssignment.deleteMany({ where: { userId } });
    await tx.roleAssignment.createMany({ data: normalized.map((grant) => ({ ...grant, userId })) });
    await revokeUserAccess(tx, userId);
    await tx.auditLog.create({ data: { actorId: fresh.userId, action: "USER_ROLES_CHANGED", objectType: "User", objectId: userId,
      redactedSummary: { before: { roles: safeRoles(user.roles) }, after: { roles: safeRoles(grants) } } } });
    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  });
}

/** Tùy chọn chọn phạm vi sẵn có; không tạo/sửa danh mục ở Tuần 4. */
export async function getAdminScopes(actor: AuthActor) {
  requireCan(actor, "users:read");
  return getDb().$transaction(async (tx) => {
    requireCan(await assertFreshActor(tx, actor), "users:read");
    const [faculties, departments] = await Promise.all([
      tx.faculty.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" }, take: 201 }),
      tx.department.findMany({ where: { isActive: true, faculty: { isActive: true } }, select: { id: true, code: true, name: true, facultyId: true }, orderBy: { code: "asc" }, take: 201 }),
    ]);
    return { faculties: faculties.slice(0, 200), departments: departments.slice(0, 200), hasMore: faculties.length > 200 || departments.length > 200 };
  });
}
