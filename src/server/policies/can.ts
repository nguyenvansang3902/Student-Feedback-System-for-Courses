import type { Prisma } from "../../generated/prisma/client";
import type { Role, ScopeType } from "../../generated/prisma/enums";
import { AuthError, type AuthActor } from "../auth/types";

export interface RoleGrant {
  role: Role;
  scopeType: ScopeType;
  facultyId?: string | null;
  departmentId?: string | null;
}

export type PolicyAction =
  | "notifications:list"
  | "notifications:read"
  | "notifications:mutate"
  | "improvements:list"
  | "improvements:read"
  | "improvements:submit"
  | "improvements:review"
  | "exam-recommendations:list"
  | "exam-recommendations:read"
  | "exam-recommendations:create"
  | "exam-recommendations:respond"
  | "feedback:access"
  | "feedback:list"
  | "feedback:read"
  | "feedback:create"
  | "feedback:attach"
  | "feedback:process"
  | "feedback-settings:read"
  | "feedback-settings:write"
  | "inspection:list"
  | "inspection:read"
  | "inspection:assign"
  | "workspace:view"
  | "sections:list"
  | "sections:read"
  | "users:list"
  | "users:read"
  | "users:create"
  | "users:status"
  | "users:roles"
  | "catalog:list"
  | "catalog:read"
  | "catalog:write"
  | "imports:manage"
  | "templates:list"
  | "templates:read"
  | "templates:write"
  | "campaigns:list"
  | "campaigns:read"
  | "campaigns:write"
  | "campaigns:submit"
  | "campaigns:confirm"
  | "campaigns:approve"
  | "campaigns:operate"
  | "campaigns:progress"
  | "student-surveys:list"
  | "student-surveys:read"
  | "student-surveys:submit"
  | "results:read"
  | "results:assessment"
  | "results:aggregate"
  | "results:publish"
  | "results:moderate"
  | "results:incomplete"
  | "results:remind"
  | "campaign-settings:read"
  | "campaign-settings:write"
  | "audit:list"
  | "mfa-policy:read"
  | "mfa-policy:write"
  | "mfa:reset";

export interface SectionResource {
  role?: Role;
  departmentId?: string;
  facultyId?: string;
  studentIds?: readonly string[];
  teacherIds?: readonly string[];
  catalogEntity?:
    | "semesters"
    | "faculties"
    | "departments"
    | "courses"
    | "sections"
    | "teaching"
    | "teachers";
}

const globalRoles = new Set<Role>([
  "SINH_VIEN",
  "GIANG_VIEN",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "ADMIN",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
  "THANH_TRA",
]);
const adminActions = new Set<string>([
  "users:list",
  "users:read",
  "users:create",
  "users:status",
  "users:roles",
  "audit:list",
  "mfa-policy:read",
  "mfa-policy:write",
  "mfa:reset",
]);

/** Một vai trò chỉ có tác dụng khi loại và ID phạm vi khớp chính vai trò đó. */
export function isValidGrant(grant: RoleGrant): boolean {
  if (globalRoles.has(grant.role))
    return (
      grant.scopeType === "GLOBAL" && !grant.facultyId && !grant.departmentId
    );
  if (grant.role === "TRUONG_BO_MON")
    return (
      grant.scopeType === "DEPARTMENT" &&
      !!grant.departmentId &&
      !grant.facultyId
    );
  if (grant.role === "TRUONG_KHOA")
    return (
      grant.scopeType === "FACULTY" && !!grant.facultyId && !grant.departmentId
    );
  return false;
}

export function actorGrants(actor: AuthActor): RoleGrant[] {
  return (actor.assignments ?? []).filter(
    (grant) => actor.roles.includes(grant.role) && isValidGrant(grant),
  );
}

function hasFullSession(actor: AuthActor | null): actor is AuthActor {
  return (
    !!actor &&
    actor.purpose === "FULL" &&
    !actor.mustChangePassword &&
    (!(actor.mfaRequired || actor.roles.includes("ADMIN")) || actor.mfa)
  );
}

/** Từ chối mặc định. Không suy ra quyền nghiệp vụ từ ADMIN. */
export function can(
  actor: AuthActor | null,
  action: PolicyAction | string,
  resource?: SectionResource,
): boolean {
  if (!hasFullSession(actor)) return false;
  const grants = actorGrants(actor);
  if (
    action.startsWith("improvements:") &&
    ![
      "improvements:list",
      "improvements:read",
      "improvements:submit",
      "improvements:review",
    ].includes(action)
  )
    return false;
  if (
    action.startsWith("exam-recommendations:") &&
    ![
      "exam-recommendations:list",
      "exam-recommendations:read",
      "exam-recommendations:create",
      "exam-recommendations:respond",
    ].includes(action)
  )
    return false;
  if (
    action.startsWith("feedback:") &&
    ![
      "feedback:access",
      "feedback:list",
      "feedback:read",
      "feedback:create",
      "feedback:attach",
      "feedback:process",
    ].includes(action)
  )
    return false;
  if (
    action.startsWith("inspection:") &&
    !["inspection:list", "inspection:read", "inspection:assign"].includes(
      action,
    )
  )
    return false;
  if (
    action.startsWith("feedback-settings:") &&
    !["feedback-settings:read", "feedback-settings:write"].includes(action)
  )
    return false;
  if (
    [
      "notifications:list",
      "notifications:read",
      "notifications:mutate",
    ].includes(action)
  )
    return grants.length > 0;
  if (
    action.startsWith("improvements:") ||
    action.startsWith("exam-recommendations:")
  ) {
    if (actor.roles.includes("ADMIN")) return false;
    const roles = action.startsWith("improvements:")
      ? action === "improvements:submit"
        ? ["GIANG_VIEN"]
        : action === "improvements:review"
          ? ["TRUONG_BO_MON"]
          : [
              "GIANG_VIEN",
              "TRUONG_BO_MON",
              "TRUONG_KHOA",
              "CAN_BO_DBCL",
              "LANH_DAO",
            ]
      : action === "exam-recommendations:create"
        ? ["PHONG_KHAO_THI"]
        : action === "exam-recommendations:respond"
          ? ["TRUONG_BO_MON"]
          : ["PHONG_KHAO_THI", "TRUONG_BO_MON", "TRUONG_KHOA"];
    return grants.some((grant) => roles.includes(grant.role));
  }
  if (
    action.startsWith("feedback:") ||
    action.startsWith("inspection:") ||
    action.startsWith("feedback-settings:")
  ) {
    if (actor.roles.includes("ADMIN")) return false;
    if (action.startsWith("inspection:")) {
      if (actor.roles.includes("CAN_BO_DBCL")) return false;
      return grants.some(
        (grant) =>
          grant.role === "THANH_TRA" ||
          (action !== "inspection:assign" && grant.role === "LANH_DAO"),
      );
    }
    if (action.startsWith("feedback-settings:"))
      return grants.some((grant) => grant.role === "CAN_BO_DBCL");
    if (action === "feedback:access") return grants.length > 0;
    if (action === "feedback:create" || action === "feedback:attach")
      return grants.some((grant) => grant.role === "SINH_VIEN");
    const handlers = [
      "GIANG_VIEN",
      "TRUONG_BO_MON",
      "TRUONG_KHOA",
      "CAN_BO_DBCL",
      "PHONG_DAO_TAO",
      "PHONG_KHAO_THI",
      "THANH_TRA",
      "LANH_DAO",
    ];
    return grants.some(
      (grant) =>
        handlers.includes(grant.role) ||
        (action !== "feedback:process" && grant.role === "SINH_VIEN"),
    );
  }
  if (action === "results:assessment")
    return grants.some((grant) => grant.role === "PHONG_KHAO_THI");
  if (
    ["results:aggregate", "results:publish", "results:moderate"].includes(
      action,
    )
  )
    return grants.some((grant) => grant.role === "CAN_BO_DBCL");
  if (["results:read", "results:incomplete", "results:remind"].includes(action))
    return grants.some((grant) => {
      if (grant.role === "CAN_BO_DBCL") return true;
      if (action === "results:read" && grant.role === "LANH_DAO") return true;
      if (!resource)
        return [
          "TRUONG_BO_MON",
          "TRUONG_KHOA",
          ...(action === "results:read" ? ["GIANG_VIEN"] : []),
        ].includes(grant.role);
      if (grant.role === "TRUONG_BO_MON")
        return grant.departmentId === resource.departmentId;
      if (grant.role === "TRUONG_KHOA")
        return grant.facultyId === resource.facultyId;
      return (
        action === "results:read" &&
        grant.role === "GIANG_VIEN" &&
        !!resource.teacherIds?.includes(actor.userId)
      );
    });
  if (adminActions.has(action))
    return actor.mfa && grants.some((grant) => grant.role === "ADMIN");
  if (
    [
      "student-surveys:list",
      "student-surveys:read",
      "student-surveys:submit",
    ].includes(action)
  )
    return grants.some((grant) => grant.role === "SINH_VIEN");
  if (action === "campaign-settings:write")
    return actor.mfa && grants.some((grant) => grant.role === "ADMIN");
  if (action === "campaign-settings:read")
    return grants.some((grant) =>
      ["ADMIN", "CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(
        grant.role,
      ),
    );
  if (["campaigns:list", "campaigns:read"].includes(action))
    return grants.some((grant) =>
      ["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(grant.role),
    );
  if (
    ["campaigns:write", "campaigns:submit", "campaigns:operate"].includes(
      action,
    )
  )
    return grants.some((grant) => grant.role === "CAN_BO_DBCL");
  if (action === "campaigns:confirm")
    return grants.some((grant) => grant.role === "PHONG_DAO_TAO");
  if (action === "campaigns:approve")
    return grants.some((grant) => grant.role === "LANH_DAO");
  if (action === "campaigns:progress")
    return grants.some((grant) =>
      ["CAN_BO_DBCL", "LANH_DAO"].includes(grant.role),
    );
  if (["templates:list", "templates:read", "templates:write"].includes(action))
    return grants.some((grant) => grant.role === "CAN_BO_DBCL");
  if (action === "imports:manage")
    return grants.some((grant) => grant.role === "PHONG_DAO_TAO");
  if (["catalog:list", "catalog:read", "catalog:write"].includes(action)) {
    const entity = resource?.catalogEntity;
    const organization = entity === "faculties" || entity === "departments";
    return grants.some((grant) => {
      if (action === "catalog:write") {
        // Mọi service ghi phải truyền entity; quyền mở menu không cấp quyền ghi.
        if (!entity) return false;
        return organization
          ? grant.role === "ADMIN" && actor.mfa
          : entity !== "teachers" && grant.role === "PHONG_DAO_TAO";
      }
      // PĐT cần khoa/bộ môn để chọn liên kết. DBCL đọc danh mục khi soạn mẫu/khảo sát.
      if (grant.role === "PHONG_DAO_TAO" || grant.role === "CAN_BO_DBCL")
        return true;
      return grant.role === "ADMIN" && actor.mfa && (!entity || organization);
    });
  }
  if (action === "workspace:view")
    return grants.some(
      (grant) => !resource?.role || grant.role === resource.role,
    );
  if (action !== "sections:list" && action !== "sections:read") return false;
  return grants.some((grant) => {
    if (
      grant.role === "CAN_BO_DBCL" ||
      grant.role === "LANH_DAO" ||
      grant.role === "PHONG_DAO_TAO"
    )
      return true;
    if (!resource)
      return [
        "SINH_VIEN",
        "GIANG_VIEN",
        "TRUONG_BO_MON",
        "TRUONG_KHOA",
      ].includes(grant.role);
    if (grant.role === "SINH_VIEN")
      return !!resource.studentIds?.includes(actor.userId);
    if (grant.role === "GIANG_VIEN")
      return !!resource.teacherIds?.includes(actor.userId);
    if (grant.role === "TRUONG_BO_MON")
      return grant.departmentId === resource.departmentId;
    if (grant.role === "TRUONG_KHOA")
      return grant.facultyId === resource.facultyId;
    return false;
  });
}

export function requireCan(
  actor: AuthActor | null,
  action: PolicyAction,
  resource?: SectionResource,
): asserts actor is AuthActor {
  if (!can(actor, action, resource))
    throw new AuthError(
      "Không có quyền thực hiện thao tác này.",
      actor ? 403 : 401,
      "FORBIDDEN",
    );
}

/** Dùng chung cho list/count/detail; điều kiện nằm ngay trong truy vấn DB. */
export function sectionScopeWhere(
  actor: AuthActor,
): Prisma.CourseSectionWhereInput {
  if (!can(actor, "sections:list")) return { id: { in: [] } };
  const OR: Prisma.CourseSectionWhereInput[] = [];
  for (const grant of actorGrants(actor)) {
    switch (grant.role) {
      case "SINH_VIEN":
        OR.push({
          enrollments: { some: { studentId: actor.userId, withdrawnAt: null } },
        });
        break;
      case "GIANG_VIEN":
        OR.push({ teaching: { some: { teacherId: actor.userId } } });
        break;
      case "TRUONG_BO_MON":
        OR.push({ course: { departmentId: grant.departmentId! } });
        break;
      case "TRUONG_KHOA":
        OR.push({ course: { department: { facultyId: grant.facultyId! } } });
        break;
      case "CAN_BO_DBCL":
      case "LANH_DAO":
      case "PHONG_DAO_TAO":
        return {};
    }
  }
  return OR.length ? { OR } : { id: { in: [] } };
}

/** Phạm vi kết quả độc lập danh mục; quyền Khảo thí không mở rộng quyền xem lớp. */
export function resultSectionScopeWhere(
  actor: AuthActor,
  action:
    "results:read" | "results:incomplete" | "results:remind" = "results:read",
): Prisma.CourseSectionWhereInput {
  if (!can(actor, action)) return { id: { in: [] } };
  const OR: Prisma.CourseSectionWhereInput[] = [];
  for (const grant of actorGrants(actor)) {
    if (
      grant.role === "CAN_BO_DBCL" ||
      (action === "results:read" && grant.role === "LANH_DAO")
    )
      return {};
    if (action === "results:read" && grant.role === "GIANG_VIEN")
      OR.push({ teaching: { some: { teacherId: actor.userId } } });
    if (grant.role === "TRUONG_BO_MON")
      OR.push({ course: { departmentId: grant.departmentId! } });
    if (grant.role === "TRUONG_KHOA")
      OR.push({ course: { department: { facultyId: grant.facultyId! } } });
  }
  return OR.length ? { OR } : { id: { in: [] } };
}
