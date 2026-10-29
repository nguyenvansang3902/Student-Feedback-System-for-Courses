import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import type { CampaignScope } from "../../generated/prisma/enums";
import { AuthError } from "../auth/types";
import { readSurveySettings } from "./survey-settings";
import type {
  CampaignReadiness,
  CampaignReadinessIssue,
} from "./campaign-types";

export interface CampaignScopeData {
  id: string;
  revision: number;
  semesterId: string;
  scope: CampaignScope;
  facultyId: string | null;
  departmentId: string | null;
  minResponses: number;
  semester: { lockedAt: Date | null };
}
export interface CohortSection {
  id: string;
  code: string;
  courseName: string;
  teacherIds: string[];
  students: { studentId: string; status: string; email: string | null }[];
}
export interface CampaignCohort {
  sections: CohortSection[];
  pairs: { sectionId: string; studentId: string }[];
  snapshotHash: string;
}

/** Hash includes empty classes too; ordering of database rows never affects the result. */
export function hashCampaignCohort(
  sectionIds: readonly string[],
  pairs: readonly { sectionId: string; studentId: string }[],
): string {
  const sections = [...new Set(sectionIds)].sort();
  const sortedPairs = pairs
    .map(({ sectionId, studentId }) => [sectionId, studentId])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return createHash("sha256")
    .update(JSON.stringify({ v: 1, sections, pairs: sortedPairs }))
    .digest("hex");
}

export async function resolveCampaignCohort(
  tx: Prisma.TransactionClient,
  campaign: CampaignScopeData,
): Promise<CampaignCohort> {
  const where: Prisma.CourseSectionWhereInput = {
    semesterId: campaign.semesterId,
    ...(campaign.scope === "FACULTY"
      ? { course: { department: { facultyId: campaign.facultyId! } } }
      : campaign.scope === "DEPARTMENT"
        ? { course: { departmentId: campaign.departmentId! } }
        : campaign.scope === "SECTIONS"
          ? { campaigns: { some: { campaignId: campaign.id } } }
          : {}),
  };
  const rows = await tx.courseSection.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      course: { select: { name: true } },
      teaching: { select: { teacherId: true } },
      enrollments: {
        where: { withdrawnAt: null },
        select: {
          studentId: true,
          student: { select: { status: true, email: true } },
        },
      },
    },
  });
  const sections: CohortSection[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    courseName: row.course.name,
    teacherIds: row.teaching.map((item) => item.teacherId),
    students: row.enrollments.map((item) => ({
      studentId: item.studentId,
      status: item.student.status,
      email: item.student.email,
    })),
  }));
  const pairs = sections.flatMap((section) =>
    section.students.map((student) => ({
      sectionId: section.id,
      studentId: student.studentId,
    })),
  );
  return {
    sections,
    pairs,
    snapshotHash: hashCampaignCohort(
      sections.map((section) => section.id),
      pairs,
    ),
  };
}

export function evaluateCampaignReadiness(
  campaign: Pick<
    CampaignScopeData,
    "id" | "revision" | "minResponses" | "semester"
  >,
  cohort: CampaignCohort,
  multiTeacherWarningThreshold: number,
  now = new Date(),
): CampaignReadiness {
  const blockers: CampaignReadinessIssue[] = [],
    warnings: CampaignReadinessIssue[] = [];
  function issue(
    code: CampaignReadinessIssue["code"],
    severity: CampaignReadinessIssue["severity"],
    section: CohortSection | null,
    message: string,
    count: number,
  ) {
    (severity === "BLOCKING" ? blockers : warnings).push({
      code,
      severity,
      sectionId: section?.id ?? null,
      sectionCode: section?.code ?? null,
      message,
      count,
    });
  }
  if (campaign.semester.lockedAt)
    issue("RS-03", "BLOCKING", null, "Học kỳ đã khóa sổ.", 1);
  for (const section of cohort.sections) {
    if (!section.teacherIds.length)
      issue(
        "RS-01",
        "BLOCKING",
        section,
        "Lớp chưa có giảng viên phụ trách.",
        0,
      );
    if (!section.students.length)
      issue("RS-02", "BLOCKING", section, "Lớp chưa có sinh viên đăng ký.", 0);
    if (section.teacherIds.length >= multiTeacherWarningThreshold)
      issue(
        "RS-04",
        "WARNING",
        section,
        "Lớp có nhiều giảng viên; khảo sát đánh giá ở mức lớp.",
        section.teacherIds.length,
      );
    if (section.students.length < campaign.minResponses)
      issue(
        "RS-05",
        "WARNING",
        section,
        "Số sinh viên nhỏ hơn ngưỡng phiếu tối thiểu để công bố.",
        section.students.length,
      );
    const unavailable = section.students.filter(
      (student) => student.status !== "ACTIVE" || !student.email?.trim(),
    ).length;
    if (unavailable)
      issue(
        "RS-06",
        "WARNING",
        section,
        "Có sinh viên chưa có tài khoản hoạt động hoặc thiếu email nhận nhắc.",
        unavailable,
      );
  }
  return {
    campaignId: campaign.id,
    revision: campaign.revision,
    checkedAt: now.toISOString(),
    snapshotHash: cohort.snapshotHash,
    sectionCount: cohort.sections.length,
    pairCount: cohort.pairs.length,
    canConfirm: !blockers.length && cohort.sections.length > 0,
    blockers,
    warnings,
  };
}

export async function readCampaignReadiness(
  tx: Prisma.TransactionClient,
  campaign: CampaignScopeData,
  now = new Date(),
) {
  const cohort = await resolveCampaignCohort(tx, campaign);
  const settings = await readSurveySettings(tx);
  const readiness = evaluateCampaignReadiness(
    campaign,
    cohort,
    settings.multiTeacherWarningThreshold,
    now,
  );
  return { cohort, readiness };
}

export function assertReadinessConfirmable(
  readiness: CampaignReadiness,
  reason?: string,
) {
  if (!readiness.sectionCount)
    throw new AuthError(
      "Phạm vi chưa có lớp học phần. Hãy trả về ĐBCL để chỉnh sửa.",
      409,
      "CAMPAIGN_EMPTY_SCOPE",
    );
  if (readiness.blockers.length)
    throw new AuthError(
      "Dữ liệu còn lỗi chặn; không thể xác nhận.",
      409,
      "READINESS_BLOCKED",
    );
  if (readiness.warnings.length && (!reason || reason.trim().length < 10))
    throw new AuthError(
      "Cần ghi chú ít nhất 10 ký tự khi xác nhận dữ liệu có cảnh báo.",
      400,
      "WARNING_NOTE_REQUIRED",
    );
}
