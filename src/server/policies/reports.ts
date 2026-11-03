import type { Prisma } from "../../generated/prisma/client";
import type { Role } from "../../generated/prisma/enums";
import { AuthError, type AuthActor } from "../auth/types";
import { actorGrants, can } from "./can";

const priority: Role[] = [
  "ADMIN",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
  "THANH_TRA",
  "TRUONG_KHOA",
  "TRUONG_BO_MON",
  "GIANG_VIEN",
  "SINH_VIEN",
];
export function reportRolesForActor(actor: AuthActor): Role[] {
  if (!can(actor, "reports:read")) return [];
  if (actor.roles.includes("ADMIN")) return ["ADMIN"];
  const grants = actorGrants(actor);
  return priority.filter(
    (role) =>
      grants.some((grant) => grant.role === role) &&
      !(role === "THANH_TRA" && actor.roles.includes("CAN_BO_DBCL")),
  );
}
export function selectReportRole(actor: AuthActor, requested?: Role): Role {
  const roles = reportRolesForActor(actor);
  if (roles.includes("ADMIN")) return "ADMIN";
  if (requested ? !roles.includes(requested) : !roles.length)
    throw new AuthError(
      "Không có quyền xem báo cáo trong vai trò đã chọn.",
      403,
      "REPORT_ROLE_FORBIDDEN",
    );
  return requested ?? roles[0];
}
export function canManageReportSettings(actor: AuthActor): boolean {
  return (
    !actor.roles.includes("ADMIN") &&
    actorGrants(actor).some((grant) => grant.role === "CAN_BO_DBCL")
  );
}
export function reportSectionScope(
  actor: AuthActor,
  role: Role,
): Prisma.CourseSectionWhereInput {
  const grants = actorGrants(actor).filter((grant) => grant.role === role);
  switch (role) {
    case "SINH_VIEN":
      return {
        OR: [
          { enrollments: { some: { studentId: actor.userId } } },
          {
            campaigns: {
              some: { tasks: { some: { studentId: actor.userId } } },
            },
          },
        ],
      };
    case "GIANG_VIEN":
      return { teaching: { some: { teacherId: actor.userId } } };
    case "TRUONG_BO_MON":
      return {
        course: {
          departmentId: { in: grants.map((grant) => grant.departmentId!) },
          department: { isActive: true, faculty: { isActive: true } },
        },
      };
    case "TRUONG_KHOA":
      return {
        course: {
          department: {
            facultyId: { in: grants.map((grant) => grant.facultyId!) },
            isActive: true,
            faculty: { isActive: true },
          },
        },
      };
    case "THANH_TRA": {
      const all = actorGrants(actor);
      return {
        teaching: { none: { teacherId: actor.userId } },
        course: {
          departmentId: {
            notIn: all
              .filter((grant) => grant.role === "TRUONG_BO_MON")
              .map((grant) => grant.departmentId!),
          },
          department: {
            facultyId: {
              notIn: all
                .filter((grant) => grant.role === "TRUONG_KHOA")
                .map((grant) => grant.facultyId!),
            },
          },
        },
      };
    }
    case "CAN_BO_DBCL":
    case "LANH_DAO":
    case "PHONG_DAO_TAO":
    case "PHONG_KHAO_THI":
      return {};
    default:
      return { id: { in: [] } };
  }
}
export function reportSurveyStages(
  role: Role,
): ("DA_TONG_HOP" | "DA_CONG_BO" | "LUU_TRU")[] {
  return role === "CAN_BO_DBCL" || role === "LANH_DAO"
    ? ["DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"]
    : ["DA_CONG_BO", "LUU_TRU"];
}
export const surveyReportRoles: readonly Role[] = [
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "PHONG_KHAO_THI",
];
export const feedbackReportRoles: readonly Role[] = [
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
];
