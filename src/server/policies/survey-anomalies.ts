import type { Prisma } from "../../generated/prisma/client";
import type { AuthActor } from "../auth/types";
import { actorGrants, can } from "./can";
import { hasInspectionConflict, type FeedbackSectionContext } from "./feedback";
export function canReadSurveyAnomaly(
  actor: AuthActor,
  section: FeedbackSectionContext,
) {
  return can(actor, "anomalies:read") && !hasInspectionConflict(actor, section);
}
export function canReviewSurveyAnomaly(
  actor: AuthActor,
  section: FeedbackSectionContext,
) {
  return can(actor, "anomalies:review") && canReadSurveyAnomaly(actor, section);
}
/** Cùng điều kiện xung đột cho list/count và truy cập theo ID. */
export function anomalySectionWhere(
  actor: AuthActor,
): Prisma.CourseSectionWhereInput {
  const grants = actorGrants(actor);
  return {
    NOT: [
      { teaching: { some: { teacherId: actor.userId } } },
      {
        course: {
          departmentId: {
            in: grants
              .filter((g) => g.role === "TRUONG_BO_MON")
              .map((g) => g.departmentId)
              .filter((id): id is string => !!id),
          },
        },
      },
      {
        course: {
          department: {
            facultyId: {
              in: grants
                .filter((g) => g.role === "TRUONG_KHOA")
                .map((g) => g.facultyId)
                .filter((id): id is string => !!id),
            },
          },
        },
      },
    ],
  };
}
