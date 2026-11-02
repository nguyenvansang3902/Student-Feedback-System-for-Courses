import type { AuthActor } from "../auth/types";
import type { Role } from "../../generated/prisma/enums";
import { actorGrants, can, type RoleGrant } from "./can";

export interface FeedbackSectionContext {
  departmentId: string;
  facultyId: string;
  teacherIds: readonly string[];
}
export function hasInspectionConflict(
  actor: AuthActor,
  section: FeedbackSectionContext,
): boolean {
  return (
    section.teacherIds.includes(actor.userId) ||
    actorGrants(actor).some(
      (grant) =>
        (grant.role === "TRUONG_BO_MON" &&
          grant.departmentId === section.departmentId) ||
        (grant.role === "TRUONG_KHOA" && grant.facultyId === section.facultyId),
    )
  );
}
export function canReadInspection(
  actor: AuthActor,
  section: FeedbackSectionContext,
): boolean {
  return (
    can(actor, "inspection:read") && !hasInspectionConflict(actor, section)
  );
}
export function isInspectionOfficer(
  actor: AuthActor,
  section: FeedbackSectionContext,
): boolean {
  return (
    canReadInspection(actor, section) &&
    actorGrants(actor).some((grant) => grant.role === "THANH_TRA")
  );
}
export function roleMatchesFeedbackSection(
  grant: RoleGrant,
  userId: string,
  section: FeedbackSectionContext,
): boolean {
  if (grant.role === "GIANG_VIEN") return section.teacherIds.includes(userId);
  if (grant.role === "TRUONG_BO_MON")
    return grant.departmentId === section.departmentId;
  if (grant.role === "TRUONG_KHOA")
    return grant.facultyId === section.facultyId;
  return [
    "CAN_BO_DBCL",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "LANH_DAO",
  ].includes(grant.role);
}
/** Quyền trưởng đơn vị yêu cầu cả bộ môn và khoa của chính lớp còn hoạt động. */
export function roleMatchesActiveFeedbackSection(
  grant: RoleGrant,
  userId: string,
  section: FeedbackSectionContext & {
    departmentActive: boolean;
    facultyActive: boolean;
  },
): boolean {
  if (
    (grant.role === "TRUONG_BO_MON" || grant.role === "TRUONG_KHOA") &&
    (!section.departmentActive || !section.facultyActive)
  )
    return false;
  return roleMatchesFeedbackSection(grant, userId, section);
}
export function initialFeedbackRoles(
  category: string,
  severity: string,
): { primary: Role[]; copied: Role[] } {
  switch (category) {
    case "GIANG_DAY":
      return {
        primary: ["GIANG_VIEN"],
        copied: severity === "KHIEU_NAI" ? ["TRUONG_BO_MON"] : [],
      };
    case "TAI_LIEU":
      return {
        primary: ["GIANG_VIEN"],
        copied: severity === "KHIEU_NAI" ? ["TRUONG_BO_MON"] : [],
      };
    case "NOI_DUNG_DE_CUONG":
      return { primary: ["TRUONG_BO_MON"], copied: [] };
    case "KIEM_TRA_DANH_GIA":
      return { primary: ["GIANG_VIEN"], copied: ["TRUONG_BO_MON"] };
    case "THI_KET_THUC_HOC_PHAN":
      return { primary: ["PHONG_KHAO_THI"], copied: [] };
    case "TO_CHUC_LOP_HOC":
      return { primary: ["PHONG_DAO_TAO"], copied: [] };
    case "KHAC":
      return { primary: ["CAN_BO_DBCL"], copied: [] };
    case "KHIEU_NAI_NGHIEM_TRONG":
      return { primary: ["THANH_TRA"], copied: [] };
    default:
      return { primary: [], copied: [] };
  }
}
export function feedbackTransitionTarget(
  status: string,
  action: string,
  isAuthor: boolean,
  isPrimary: boolean,
  isAssignee: boolean,
): string | null {
  if (action === "close")
    return isAuthor && status === "DA_TRA_LOI" ? "DA_DONG" : null;
  if (action === "accept")
    return isPrimary && status === "MOI" ? "DA_TIEP_NHAN" : null;
  if (!isAssignee && !(status === "MOI" && isPrimary)) return null;
  if (action === "start" && status === "DA_TIEP_NHAN") return "DANG_XU_LY";
  if (action === "answer" && status === "DANG_XU_LY") return "DA_TRA_LOI";
  if (
    action === "reject" &&
    ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(status)
  )
    return "TU_CHOI";
  if (
    action === "forward" &&
    ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(status)
  )
    return "MOI";
  return null;
}
