import type { Prisma } from "../../generated/prisma/client";
import type { AuthActor } from "../auth/types";
import { actorGrants, can, isValidGrant } from "../policies/can";
import {
  canReadInspection,
  isInspectionOfficer,
  roleMatchesActiveFeedbackSection,
} from "../policies/feedback";
import {
  canReadImprovement,
  canReadRecommendation,
} from "../policies/improvement-workflows";

const sectionInclude = {
  teaching: { select: { teacherId: true } },
  course: { include: { department: { include: { faculty: true } } } },
} as const satisfies Prisma.CourseSectionInclude;

/** Worker nội bộ đọc lại gán quyền; không biến quyền ADMIN thành quyền nghiệp vụ. */
export async function noticeRecipientActor(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<AuthActor | null> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user || user.status !== "ACTIVE" || user.mustChangePassword) return null;
  const valid = user.roles.filter(isValidGrant);
  const assignments: NonNullable<AuthActor["assignments"]> = [];
  for (const grant of valid) {
    if (
      grant.departmentId &&
      !(await tx.department.findFirst({
        where: {
          id: grant.departmentId,
          isActive: true,
          faculty: { isActive: true },
        },
        select: { id: true },
      }))
    )
      continue;
    if (
      grant.facultyId &&
      !(await tx.faculty.findFirst({
        where: { id: grant.facultyId, isActive: true },
        select: { id: true },
      }))
    )
      continue;
    assignments.push(grant);
  }
  return {
    userId,
    displayName: user.displayName,
    loginCode: user.loginCode,
    email: user.email,
    roles: [...new Set(assignments.map((grant) => grant.role))],
    assignments,
    sessionId: "",
    familyId: "",
    purpose: "FULL",
    mustChangePassword: false,
    mfa: true,
    mfaRequired: false,
  };
}

/** Kiểm tài nguyên khi hiển thị lẫn ngay trước SMTP; notification không phải vé cấp quyền. */
export async function canReadNoticeTarget(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  targetType: string,
  targetId: string | null,
): Promise<boolean> {
  if (!targetId) return false;
  const grants = actorGrants(actor);
  if (targetType === "Feedback") {
    if (!can(actor, "feedback:read")) return false;
    const row = await tx.feedback.findUnique({
      where: { id: targetId },
      include: {
        section: { include: sectionInclude },
        recipients: true,
        inspectionCase: { select: { id: true, status: true } },
      },
    });
    if (!row) return false;
    if (row.authorId === actor.userId && can(actor, "feedback:create"))
      return true;
    const section = {
      departmentId: row.section.course.departmentId,
      facultyId: row.section.course.department.facultyId,
      teacherIds: row.section.teaching.map((item) => item.teacherId),
      departmentActive: row.section.course.department.isActive,
      facultyActive: row.section.course.department.faculty.isActive,
    };
    if (
      row.category === "KHIEU_NAI_NGHIEM_TRONG" ||
      (row.inspectionCase && row.inspectionCase.status !== "CHUYEN_LAI")
    )
      return isInspectionOfficer(actor, section);
    return row.recipients.some(
      (recipient) =>
        recipient.userId === actor.userId &&
        recipient.isActive &&
        grants.some(
          (grant) =>
            (!recipient.accessRole || grant.role === recipient.accessRole) &&
            roleMatchesActiveFeedbackSection(grant, actor.userId, section),
        ),
    );
  }
  if (targetType === "InspectionCase") {
    const row = await tx.inspectionCase.findUnique({
      where: { id: targetId },
      include: { section: { include: sectionInclude } },
    });
    return (
      !!row &&
      canReadInspection(actor, {
        departmentId: row.section.course.departmentId,
        facultyId: row.section.course.department.facultyId,
        teacherIds: row.section.teaching.map((item) => item.teacherId),
      })
    );
  }
  if (targetType === "ImprovementPlan") {
    if (actor.roles.includes("ADMIN")) return false;
    const row = await tx.improvementPlan.findUnique({
      where: { id: targetId },
      include: {
        cohort: {
          include: {
            section: { include: sectionInclude },
            campaign: { select: { status: true } },
          },
        },
      },
    });
    if (!row || !["DA_CONG_BO", "LUU_TRU"].includes(row.cohort.campaign.status))
      return false;
    const section = row.cohort.section;
    return canReadImprovement(actor, {
      teacherId: row.teacherId,
      departmentId: section.course.departmentId,
      facultyId: section.course.department.facultyId,
      currentTeacherIds: section.teaching.map(
        (assignment) => assignment.teacherId,
      ),
    });
  }
  if (targetType === "ExamReviewRecommendation") {
    if (actor.roles.includes("ADMIN")) return false;
    const row = await tx.examReviewRecommendation.findUnique({
      where: { id: targetId },
      include: {
        course: { include: { department: { include: { faculty: true } } } },
      },
    });
    return (
      !!row &&
      canReadRecommendation(actor, {
        senderId: row.senderId,
        recipientId: row.recipientId,
        departmentId: row.course.departmentId,
        facultyId: row.course.department.facultyId,
      })
    );
  }
  if (targetType === "SurveyCampaign") {
    const campaign = await tx.surveyCampaign.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!campaign) return false;
    if (can(actor, "campaigns:read")) return true;
    if (
      can(actor, "student-surveys:read") &&
      (await tx.surveyTask.findFirst({
        where: { campaignId: targetId, studentId: actor.userId },
        select: { id: true },
      }))
    )
      return true;
    return false;
  }
  return false;
}

export function notificationTargetHref(
  targetType: string,
  targetId: string | null,
): string | null {
  if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) return null;
  switch (targetType) {
    case "Feedback":
      return `/phan-hoi/${targetId}`;
    case "InspectionCase":
      return `/thanh-tra/${targetId}`;
    case "ImprovementPlan":
      return `/giai-trinh/${targetId}`;
    case "ExamReviewRecommendation":
      return `/kien-nghi/${targetId}`;
    case "SurveyCampaign":
      return "/tai-khoan";
    default:
      return null;
  }
}
