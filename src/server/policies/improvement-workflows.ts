import type { AuthActor } from "../auth/types";
import { actorGrants, can } from "./can";

export interface ImprovementResource {
  teacherId: string;
  departmentId: string;
  facultyId: string;
  currentTeacherIds: readonly string[];
}
export function canReadImprovement(actor: AuthActor, row: ImprovementResource) {
  if (!can(actor, "improvements:read") || actor.roles.includes("ADMIN"))
    return false;
  return actorGrants(actor).some((grant) => {
    if (["CAN_BO_DBCL", "LANH_DAO"].includes(grant.role)) return true;
    if (grant.role === "TRUONG_BO_MON")
      return grant.departmentId === row.departmentId;
    if (grant.role === "TRUONG_KHOA") return grant.facultyId === row.facultyId;
    return (
      grant.role === "GIANG_VIEN" &&
      actor.userId === row.teacherId &&
      row.currentTeacherIds.includes(actor.userId)
    );
  });
}
export function canSubmitImprovement(
  actor: AuthActor,
  row: ImprovementResource,
) {
  return (
    canReadImprovement(actor, row) &&
    can(actor, "improvements:submit") &&
    actor.userId === row.teacherId &&
    row.currentTeacherIds.includes(actor.userId)
  );
}
export function canReviewImprovement(
  actor: AuthActor,
  row: ImprovementResource,
) {
  return (
    canReadImprovement(actor, row) &&
    can(actor, "improvements:review") &&
    actor.userId !== row.teacherId &&
    actorGrants(actor).some(
      (grant) =>
        grant.role === "TRUONG_BO_MON" &&
        grant.departmentId === row.departmentId,
    )
  );
}
export function improvementTarget(
  status: string,
  action: string,
): "DA_GUI" | "CAN_BO_SUNG" | "DA_XAC_NHAN" | null {
  if (action === "submit" && ["CAN_GIAI_TRINH", "CAN_BO_SUNG"].includes(status))
    return "DA_GUI";
  if (status === "DA_GUI" && action === "supplement") return "CAN_BO_SUNG";
  if (status === "DA_GUI" && action === "confirm") return "DA_XAC_NHAN";
  return null;
}

export function canReadRecommendation(
  actor: AuthActor,
  row: {
    senderId: string;
    recipientId: string;
    departmentId: string;
    facultyId: string;
  },
) {
  if (!can(actor, "exam-recommendations:read") || actor.roles.includes("ADMIN"))
    return false;
  return actorGrants(actor).some(
    (grant) =>
      grant.role === "PHONG_KHAO_THI" ||
      (grant.role === "TRUONG_BO_MON" &&
        grant.departmentId === row.departmentId) ||
      (grant.role === "TRUONG_KHOA" && grant.facultyId === row.facultyId),
  );
}
export function canRespondRecommendation(
  actor: AuthActor,
  row: { recipientId: string; departmentId: string },
) {
  return (
    can(actor, "exam-recommendations:respond") &&
    !actor.roles.includes("ADMIN") &&
    actor.userId === row.recipientId &&
    actorGrants(actor).some(
      (grant) =>
        grant.role === "TRUONG_BO_MON" &&
        grant.departmentId === row.departmentId,
    )
  );
}
