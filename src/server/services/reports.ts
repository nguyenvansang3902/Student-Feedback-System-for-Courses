import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import type { Role, CampaignStatus } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { can, requireCan } from "../policies/can";
import {
  canManageReportSettings,
  feedbackReportRoles,
  reportRolesForActor,
  reportSectionScope,
  reportSurveyStages,
  selectReportRole,
  surveyReportRoles,
} from "../policies/reports";
import { assertFreshActor, lockAdminMutations, parseInput } from "./access";
import { readCampaignReadiness } from "./campaign-readiness";
import {
  feedbackMetricRow,
  inspectionMetricRow,
  suppressComplementaryTotals,
} from "./reports-metrics";
import { readReportSettings } from "./reports-settings";
import {
  assessmentContributingTeachers,
  parseSurveyAggregateDetails,
  poolSurveyScores,
  type SurveyAggregateDetails,
} from "./survey-score";
import {
  reportFormats,
  reportsQuerySchema,
  type ReportColumn,
  type ReportRow,
  type ReportSection,
  type ReportsDashboard,
  type ReportsOptions,
  type ReportsQuery,
  type ReportsSettings,
} from "./reports-types";

export * from "./reports-types";
export {
  getReportsSettings,
  updateReportsSettings,
  getReportSettings,
  updateReportSettings,
} from "./reports-settings";
function missing(): never {
  throw new AuthError(
    "Không tìm thấy dữ liệu báo cáo trong phạm vi được phép.",
    404,
    "REPORT_NOT_FOUND",
  );
}
async function transaction<T>(
  actor: AuthActor,
  action: "reports:read" | "reports:export",
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
) {
  requireCan(actor, action);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, action);
      return operation(tx, fresh);
    },
    { maxWait: 15000, timeout: 60000 },
  );
}
function sectionFilters(query: ReportsQuery): Prisma.CourseSectionWhereInput {
  return {
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    course: {
      ...(query.courseId ? { id: query.courseId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.facultyId
        ? { department: { facultyId: query.facultyId } }
        : {}),
    },
  };
}
function scopedSections(
  actor: AuthActor,
  role: Role,
  query: ReportsQuery,
): Prisma.CourseSectionWhereInput {
  return { AND: [reportSectionScope(actor, role), sectionFilters(query)] };
}
function campaignWhere(
  actor: AuthActor,
  role: Role,
  query: ReportsQuery,
): Prisma.SurveyCampaignWhereInput {
  const stages: CampaignStatus[] =
    role === "PHONG_DAO_TAO"
      ? [
          "NHAP",
          "CHO_XAC_NHAN_DL",
          "CHO_DUYET",
          "DA_DUYET",
          "DANG_MO",
          "DA_DONG",
          "DA_TONG_HOP",
          "DA_CONG_BO",
          "LUU_TRU",
          "HUY",
        ]
      : reportSurveyStages(role);
  return {
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    ...(query.campaignId ? { id: query.campaignId } : {}),
    ...(role === "SINH_VIEN"
      ? { sections: { some: { tasks: { some: { studentId: actor.userId } } } } }
      : { status: { in: stages } }),
    ...(["PHONG_DAO_TAO", "CAN_BO_DBCL", "LANH_DAO", "SINH_VIEN"].includes(role)
      ? {}
      : { sections: { some: { section: reportSectionScope(actor, role) } } }),
  };
}
async function normalizedQuery(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  input: ReportsQuery,
): Promise<ReportsQuery & { role: Role }> {
  const role = selectReportRole(actor, input.role);
  if (role === "ADMIN") return { role };
  const query = { ...input, role };
  if (query.campaignId) {
    const campaign = await tx.surveyCampaign.findFirst({
      where: campaignWhere(actor, role, query),
      select: { semesterId: true },
    });
    if (!campaign) missing();
    query.semesterId = campaign.semesterId;
  }
  for (const key of [
    "semesterId",
    "facultyId",
    "departmentId",
    "courseId",
  ] as const) {
    if (
      query[key] &&
      !(await tx.courseSection.findFirst({
        where: scopedSections(actor, role, { [key]: query[key] }),
        select: { id: true },
      }))
    )
      missing();
  }
  // Kiểm cả tổ hợp để mã của đơn vị hợp lệ không được ghép chéo thành một bộ lọc vượt phạm vi.
  if (
    (query.facultyId || query.departmentId || query.courseId) &&
    !(await tx.courseSection.findFirst({
      where: scopedSections(actor, role, query),
      select: { id: true },
    }))
  )
    missing();
  return query;
}
const sectionMetaSelect = {
  id: true,
  semesterId: true,
  semester: { select: { id: true, name: true, startsOn: true } },
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      departmentId: true,
      department: {
        select: {
          id: true,
          name: true,
          facultyId: true,
          faculty: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const satisfies Prisma.CourseSectionSelect;
type SectionMeta = Prisma.CourseSectionGetPayload<{
  select: typeof sectionMetaSelect;
}>;
function optionsFromSections(rows: SectionMeta[]) {
  const semesters = new Map<string, { id: string; name: string }>(),
    faculties = new Map<string, { id: string; name: string }>(),
    departments = new Map<
      string,
      { id: string; name: string; facultyId: string }
    >(),
    courses = new Map<
      string,
      { id: string; name: string; departmentId: string }
    >();
  for (const row of rows) {
    const course = row.course,
      dept = course.department;
    semesters.set(row.semester.id, {
      id: row.semester.id,
      name: row.semester.name,
    });
    faculties.set(dept.faculty.id, dept.faculty);
    departments.set(dept.id, {
      id: dept.id,
      name: dept.name,
      facultyId: dept.facultyId,
    });
    courses.set(course.id, {
      id: course.id,
      name: course.name,
      departmentId: course.departmentId,
    });
  }
  const sort = <T extends { name: string }>(values: Iterable<T>) =>
    [...values].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return {
    semesters: sort(semesters.values()),
    faculties: sort(faculties.values()),
    departments: sort(departments.values()),
    courses: sort(courses.values()),
  };
}
export async function getReportOptions(
  actor: AuthActor,
  input: unknown = {},
): Promise<ReportsOptions> {
  const data = parseInput(reportsQuerySchema, input);
  return transaction(actor, "reports:read", async (tx, fresh) => {
    const query = await normalizedQuery(tx, fresh, data),
      role = query.role;
    const capabilities = {
      export: can(fresh, "reports:export"),
      settingsRead:
        can(fresh, "reports:settings:read") && canManageReportSettings(fresh),
      settingsWrite:
        can(fresh, "reports:settings:write") && canManageReportSettings(fresh),
    };
    if (role === "ADMIN")
      return {
        roles: ["ADMIN"],
        defaultRole: role,
        semesters: [],
        campaigns: [],
        faculties: [],
        departments: [],
        courses: [],
        capabilities,
        exportFormats: [...reportFormats],
      };
    const [sections, campaigns] = await Promise.all([
      tx.courseSection.findMany({
        where: reportSectionScope(fresh, role),
        select: sectionMetaSelect,
        orderBy: { id: "asc" },
      }),
      tx.surveyCampaign.findMany({
        where: campaignWhere(fresh, role, { ...query, campaignId: undefined }),
        select: { id: true, title: true, semesterId: true },
        orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      }),
    ]);
    return {
      roles: reportRolesForActor(fresh),
      defaultRole: role,
      ...optionsFromSections(sections),
      campaigns,
      capabilities,
      exportFormats: [...reportFormats],
    };
  });
}
const feedbackColumns: ReportColumn[] = [
  { key: "count", label: "Số phản hồi", format: "count" },
  { key: "open", label: "Đang xử lý", format: "count" },
  { key: "answered", label: "Đã trả lời", format: "count" },
  { key: "closed", label: "Đã đóng", format: "count" },
  { key: "rejected", label: "Từ chối", format: "count" },
  { key: "overdue", label: "Đang quá hạn", format: "count" },
  {
    key: "overdueRate",
    label: "Tỷ lệ đang quá hạn / đang xử lý",
    format: "percent",
  },
  {
    key: "lateReplies",
    label: "Lần trả lời gần nhất trễ hạn",
    format: "count",
  },
  {
    key: "lateReplyRate",
    label: "Tỷ lệ trả lời trễ / đã có mốc trả lời",
    format: "percent",
  },
  {
    key: "averageCloseDays",
    label: "Xử lý trung bình (ngày lịch)",
    format: "days",
  },
  { key: "averageSatisfaction", label: "Hài lòng trung bình", format: "score" },
];
const categoryLabels: Record<string, string> = {
  GIANG_DAY: "Giảng dạy",
  NOI_DUNG_DE_CUONG: "Nội dung, đề cương",
  TAI_LIEU: "Tài liệu",
  KIEM_TRA_DANH_GIA: "Kiểm tra, đánh giá",
  THI_KET_THUC_HOC_PHAN: "Thi kết thúc học phần",
  TO_CHUC_LOP_HOC: "Tổ chức lớp học",
  KHAC: "Khác",
};
function section(
  key: string,
  title: string,
  columns: ReportColumn[],
  rows: ReportRow[],
  message: string | null = null,
): ReportSection {
  return {
    key,
    title,
    columns,
    rows,
    message:
      message ??
      (!rows.length ? "Chưa có dữ liệu trong phạm vi đã chọn." : null),
  };
}
async function feedbackSections(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  query: ReportsQuery & { role: Role },
  settings: ReportsSettings,
  now: Date,
): Promise<ReportSection[]> {
  // Các nhóm cố định theo học kỳ/môn/loại; đợt chỉ chọn học kỳ, không ghép phản hồi với phiếu ẩn danh.
  const where: Prisma.FeedbackWhereInput = {
    section: scopedSections(actor, query.role, query),
    category:
      query.role === "PHONG_DAO_TAO"
        ? "TO_CHUC_LOP_HOC"
        : query.role === "PHONG_KHAO_THI"
          ? "THI_KET_THUC_HOC_PHAN"
          : { not: "KHIEU_NAI_NGHIEM_TRONG" },
    OR: [
      { inspectionCase: { is: null } },
      { inspectionCase: { is: { status: "CHUYEN_LAI" } } },
    ],
    ...(query.role === "GIANG_VIEN"
      ? {
          recipients: {
            some: {
              userId: actor.userId,
              isActive: true,
              OR: [{ accessRole: "GIANG_VIEN" }, { accessRole: null }],
            },
          },
        }
      : {}),
  };
  const rows = await tx.feedback.findMany({
    where,
    select: {
      category: true,
      status: true,
      createdAt: true,
      acceptDueAt: true,
      replyDueAt: true,
      acceptedAt: true,
      answeredAt: true,
      closedAt: true,
      rating: { select: { score: true } },
      section: { select: sectionMetaSelect },
    },
    orderBy: { id: "asc" },
  });
  const groups = new Map<
    string,
    {
      label: string;
      semesterId: string;
      semesterName: string;
      values: typeof rows;
    }
  >();
  for (const row of rows) {
    const key = `${row.section.semesterId}:${row.section.course.id}:${row.category}`;
    if (!groups.has(key))
      groups.set(key, {
        label: `${row.section.semester.name} · ${row.section.course.name} · ${categoryLabels[row.category] ?? "Khác"}`,
        semesterId: row.section.semesterId,
        semesterName: row.section.semester.name,
        values: [],
      });
    groups.get(key)!.values.push(row);
  }
  const leaves = [...groups].map(([key, value]) =>
    feedbackMetricRow(
      key,
      value.label,
      value.values,
      settings.minFeedbackRecords,
      now,
    ),
  );
  const periods = new Map<
    string,
    { name: string; values: typeof rows; leaves: ReportRow[] }
  >();
  for (const [index, group] of [...groups.values()].entries()) {
    if (!periods.has(group.semesterId))
      periods.set(group.semesterId, {
        name: group.semesterName,
        values: [],
        leaves: [],
      });
    const period = periods.get(group.semesterId)!;
    period.values.push(...group.values);
    period.leaves.push(leaves[index]);
  }
  const totals = [...periods].map(([key, value]) =>
    suppressComplementaryTotals(
      feedbackMetricRow(
        key,
        value.name,
        value.values,
        settings.minFeedbackRecords,
        now,
      ),
      value.leaves,
    ),
  );
  return [
    section(
      "feedback-processing",
      "Xử lý phản hồi theo học kỳ, môn và loại",
      feedbackColumns,
      leaves,
    ),
    section(
      "feedback-periods",
      "So sánh xử lý phản hồi theo học kỳ",
      feedbackColumns,
      totals,
    ),
  ];
}
async function inspectionSection(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  query: ReportsQuery & { role: Role },
  settings: ReportsSettings,
  now: Date,
): Promise<ReportSection> {
  const where: Prisma.InspectionCaseWhereInput = {
    section: {
      AND: [reportSectionScope(actor, "THANH_TRA"), sectionFilters(query)],
    },
  };
  const rows = await tx.inspectionCase.findMany({
    where,
    select: {
      source: true,
      violation: true,
      status: true,
      conclusion: true,
      createdAt: true,
      acceptDueAt: true,
      completeDueAt: true,
      acceptedAt: true,
      closedAt: true,
      section: {
        select: { semesterId: true, semester: { select: { name: true } } },
      },
    },
    orderBy: { id: "asc" },
  });
  const groups = new Map<string, { label: string; values: typeof rows }>();
  const violationLabels: Record<string, string> = {
    VI_PHAM_QUY_CHE_GIANG_DAY: "Quy chế giảng dạy",
    GAY_AP_LUC_KHI_KHAO_SAT: "Áp lực khi khảo sát",
    HANH_VI_KHONG_PHU_HOP: "Hành vi không phù hợp",
    VI_PHAM_QUY_CHE_THI_KIEM_TRA: "Quy chế thi, kiểm tra",
    KHAC_NGHIEM_TRONG: "Khác",
    BAT_THUONG_KHAO_SAT: "Bất thường khảo sát",
  };
  for (const row of rows) {
    const kind = row.violation ?? row.source,
      key = `${row.section.semesterId}:${kind}`;
    if (!groups.has(key))
      groups.set(key, {
        label: `${row.section.semester.name} · ${violationLabels[kind] ?? "Hồ sơ chuyển tiếp"}`,
        values: [],
      });
    groups.get(key)!.values.push(row);
  }
  const leaves = [...groups].map(([key, value]) =>
    inspectionMetricRow(
      key,
      value.label,
      value.values,
      settings.minInspectionCases,
      now,
    ),
  );
  const columns: ReportColumn[] = [
    { key: "count", label: "Số hồ sơ", format: "count" },
    { key: "TIEP_NHAN", label: "Tiếp nhận", format: "count" },
    { key: "XAC_MINH", label: "Xác minh", format: "count" },
    { key: "KET_LUAN", label: "Kết luận", format: "count" },
    { key: "THONG_BAO", label: "Thông báo", format: "count" },
    { key: "DONG", label: "Đã đóng", format: "count" },
    { key: "TU_CHOI", label: "Từ chối", format: "count" },
    { key: "CHUYEN_LAI", label: "Chuyển lại", format: "count" },
    { key: "overdue", label: "Đang quá hạn", format: "count" },
    {
      key: "overdueRate",
      label: "Tỷ lệ quá hạn / hồ sơ đang mở",
      format: "percent",
    },
    { key: "completedLate", label: "Hoàn tất trễ hạn", format: "count" },
    {
      key: "completedLateRate",
      label: "Tỷ lệ trễ / hồ sơ đã đóng",
      format: "percent",
    },
    {
      key: "averageCloseDays",
      label: "Xử lý trung bình (ngày lịch)",
      format: "days",
    },
  ];
  return section(
    "inspection-statistics",
    "Thống kê hồ sơ Thanh tra",
    columns,
    leaves,
  );
}
async function readinessSection(
  tx: Prisma.TransactionClient,
  query: ReportsQuery & { role: Role },
): Promise<ReportSection> {
  const campaigns = await tx.surveyCampaign.findMany({
    where: {
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.campaignId ? { id: query.campaignId } : {}),
    },
    include: { semester: { select: { lockedAt: true } } },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
  });
  const rows: ReportRow[] = [];
  const matchingSections =
    query.facultyId || query.departmentId || query.courseId
      ? new Set(
          (
            await tx.courseSection.findMany({
              where: sectionFilters(query),
              select: { id: true },
            })
          ).map((row) => row.id),
        )
      : null;
  for (const campaign of campaigns) {
    const { cohort, readiness } = await readCampaignReadiness(tx, campaign);
    if (
      matchingSections &&
      !cohort.sections.some((row) => matchingSections.has(row.id))
    )
      continue;
    const errors = new Set(
      readiness.blockers.flatMap((issue) =>
        issue.sectionId ? [issue.sectionId] : [],
      ),
    );
    rows.push({
      key: campaign.id,
      label: campaign.title,
      suppressed: false,
      cells: {
        status: campaign.status,
        sectionCount: readiness.sectionCount,
        blockedSections: errors.size,
        blockingIssues: readiness.blockers.length,
        warningIssues: readiness.warnings.length,
        readiness: readiness.canConfirm
          ? "Đủ điều kiện dữ liệu"
          : "Còn lỗi cần xử lý",
      },
    });
  }
  return section(
    "training-readiness",
    "Độ sẵn sàng dữ liệu khảo sát",
    [
      { key: "status", label: "Trạng thái đợt", format: "text" },
      { key: "sectionCount", label: "Số lớp", format: "count" },
      { key: "blockedSections", label: "Lớp có lỗi chặn", format: "count" },
      { key: "blockingIssues", label: "Lỗi chặn", format: "count" },
      { key: "warningIssues", label: "Cảnh báo", format: "count" },
      { key: "readiness", label: "Dữ liệu", format: "text" },
    ],
    rows,
    rows.length ? "Độ sẵn sàng được tính cho toàn bộ từng đợt khảo sát." : null,
  );
}
async function surveySections(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  query: ReportsQuery & { role: Role },
): Promise<ReportSection[]> {
  const cohorts = await tx.campaignSection.findMany({
    where: {
      section: scopedSections(actor, query.role, query),
      campaign: {
        ...campaignWhere(actor, query.role, query),
        status: { in: reportSurveyStages(query.role) },
      },
    },
    select: {
      sectionId: true,
      section: { select: { ...sectionMetaSelect, code: true } },
      campaign: {
        select: {
          id: true,
          title: true,
          minResponses: true,
          minRate: true,
          semester: { select: { name: true } },
        },
      },
      result: { select: { details: true } },
    },
    orderBy: [{ campaignId: "asc" }, { sectionId: "asc" }],
  });
  const assessment = query.role === "PHONG_KHAO_THI";
  type Group = {
    label: string;
    details: SurveyAggregateDetails[];
    minimum: number;
    minRate: string;
    level: string;
    children: Set<string>;
    invalidDetails: boolean;
  };
  const groups = new Map<string, Group>();
  for (const cohort of cohorts) {
    const details = parseSurveyAggregateDetails(cohort.result?.details);
    const course = cohort.section.course,
      dept = course.department;
    const metas = [
      ...(!assessment
        ? [{ level: "CLASS", id: cohort.sectionId, name: cohort.section.code }]
        : []),
      ...(assessment
        ? [{ level: "COURSE", id: course.id, name: course.name }]
        : []),
      { level: "DEPARTMENT", id: dept.id, name: dept.name },
      { level: "FACULTY", id: dept.facultyId, name: dept.faculty.name },
    ];
    for (const meta of metas) {
      const key = `${cohort.campaign.id}:${meta.level}:${meta.id}`;
      if (!groups.has(key))
        groups.set(key, {
          label: `${cohort.campaign.semester.name} · ${cohort.campaign.title} · ${meta.name}`,
          details: [],
          minimum: cohort.campaign.minResponses,
          minRate: cohort.campaign.minRate.toString(),
          level: meta.level,
          children: new Set(),
          invalidDetails: false,
        });
      const group = groups.get(key)!;
      if (details) group.details.push(details);
      else group.invalidDetails = true;
      if (meta.level === "DEPARTMENT")
        group.children.add(
          `${cohort.campaign.id}:${assessment ? "COURSE" : "CLASS"}:${assessment ? course.id : cohort.sectionId}`,
        );
      if (meta.level === "FACULTY")
        group.children.add(`${cohort.campaign.id}:DEPARTMENT:${dept.id}`);
    }
  }
  const levels = assessment
    ? ["COURSE", "DEPARTMENT", "FACULTY"]
    : ["CLASS", "DEPARTMENT", "FACULTY"];
  const output: ReportSection[] = [];
  const pooledGroups = new Map(
    [...groups].map(([key, group]) => [
      key,
      poolSurveyScores(
        group.details,
        { minResponses: group.minimum, minRate: group.minRate },
        assessment,
      ),
    ]),
  );
  const visibility = new Map<string, boolean>();
  function availableGroup(key: string): boolean {
    if (visibility.has(key)) return visibility.get(key)!;
    const group = groups.get(key);
    if (!group) return false;
    const pooled = pooledGroups.get(key);
    const teachers = assessmentContributingTeachers(group.details);
    const visible =
      !group.invalidDetails &&
      !!pooled &&
      pooled.eligibleToPublish &&
      (!assessment || teachers.size >= 2) &&
      [...group.children].every((child) => availableGroup(child));
    visibility.set(key, visible);
    return visible;
  }
  for (const level of levels) {
    const rows: ReportRow[] = [];
    for (const [key, group] of groups) {
      if (group.level !== level) continue;
      const pooled = pooledGroups.get(key);
      const available = availableGroup(key);
      const numeric: Record<string, string | number | null> = {
        responseCount: available ? pooled!.responseCount : null,
        participationRate: available ? pooled!.participationRate : null,
        overallScore: available ? pooled!.overallScore : null,
      };
      rows.push({
        key,
        label: group.label,
        suppressed: !available,
        cells: numeric,
      });
    }
    output.push(
      section(
        `${assessment ? "assessment" : "survey"}-${level.toLowerCase()}`,
        `${assessment ? "Nhóm kiểm tra, đánh giá" : "Kết quả khảo sát"} — ${level === "CLASS" ? "lớp học phần" : level === "COURSE" ? "môn học" : level === "DEPARTMENT" ? "bộ môn" : "khoa"}`,
        [
          { key: "responseCount", label: "Số phiếu", format: "count" },
          {
            key: "participationRate",
            label: "Tỷ lệ tham gia",
            format: "percent",
          },
          {
            key: "overallScore",
            label: assessment ? "Điểm nhóm đánh giá gộp" : "Điểm tổng",
            format: "score",
          },
        ],
        rows,
      ),
    );
  }
  return output;
}
async function buildDashboard(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  data: ReportsQuery,
): Promise<ReportsDashboard> {
  const query = await normalizedQuery(tx, actor, data),
    role = query.role,
    now = new Date();
  const result: ReportsDashboard = {
    role,
    generatedAt: now.toISOString(),
    filters: query,
    sections: [],
    exportable: can(actor, "reports:export"),
    scopeLabel:
      role === "ADMIN"
        ? "Quản trị tài khoản và phiên đăng nhập"
        : "Toàn bộ phạm vi được phân quyền",
  };
  if (role !== "ADMIN") {
    const labels: string[] = [];
    if (query.semesterId) {
      const item = await tx.semester.findUnique({
        where: { id: query.semesterId },
        select: { name: true },
      });
      if (item) labels.push(`Học kỳ: ${item.name}`);
    }
    if (query.campaignId) {
      const item = await tx.surveyCampaign.findUnique({
        where: { id: query.campaignId },
        select: { title: true },
      });
      if (item) labels.push(`Đợt: ${item.title}`);
    }
    if (query.facultyId) {
      const item = await tx.faculty.findUnique({
        where: { id: query.facultyId },
        select: { name: true },
      });
      if (item) labels.push(`Khoa: ${item.name}`);
    }
    if (query.departmentId) {
      const item = await tx.department.findUnique({
        where: { id: query.departmentId },
        select: { name: true },
      });
      if (item) labels.push(`Bộ môn: ${item.name}`);
    }
    if (query.courseId) {
      const item = await tx.course.findUnique({
        where: { id: query.courseId },
        select: { name: true },
      });
      if (item) labels.push(`Môn học: ${item.name}`);
    }
    if (labels.length) result.scopeLabel = labels.join(" · ");
  }
  if (role === "ADMIN") {
    const [all, active, sessions] = await Promise.all([
      tx.user.count(),
      tx.user.count({ where: { status: "ACTIVE" } }),
      tx.userSession.count({
        where: { revokedAt: null, expiresAt: { gt: now }, purpose: "FULL" },
      }),
    ]);
    result.sections.push(
      section(
        "technical-administration",
        "Vận hành tài khoản",
        [{ key: "count", label: "Số lượng", format: "count" }],
        [
          {
            key: "accounts",
            label: "Tài khoản",
            cells: { count: all },
            suppressed: false,
          },
          {
            key: "active",
            label: "Tài khoản hoạt động",
            cells: { count: active },
            suppressed: false,
          },
          {
            key: "sessions",
            label: "Phiên còn hiệu lực",
            cells: { count: sessions },
            suppressed: false,
          },
        ],
      ),
    );
    return result;
  }
  if (role === "SINH_VIEN") {
    const [tasks, done, open, closed] = await Promise.all([
      tx.surveyTask.count({
        where: {
          studentId: actor.userId,
          cohort: { section: scopedSections(actor, role, query) },
          ...(query.campaignId ? { campaignId: query.campaignId } : {}),
        },
      }),
      tx.surveyTask.count({
        where: {
          studentId: actor.userId,
          status: "DONE",
          cohort: { section: scopedSections(actor, role, query) },
          ...(query.campaignId ? { campaignId: query.campaignId } : {}),
        },
      }),
      tx.feedback.count({
        where: {
          authorId: actor.userId,
          status: { in: ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY", "DA_TRA_LOI"] },
          section: scopedSections(actor, role, query),
        },
      }),
      tx.feedback.count({
        where: {
          authorId: actor.userId,
          status: "DA_DONG",
          section: scopedSections(actor, role, query),
        },
      }),
    ]);
    result.sections.push(
      section(
        "student-overview",
        "Khảo sát và phản hồi của sinh viên",
        [{ key: "count", label: "Số lượng", format: "count" }],
        [
          {
            key: "tasks",
            label: "Khảo sát được giao",
            cells: { count: tasks },
            suppressed: false,
          },
          {
            key: "done",
            label: "Khảo sát đã nộp",
            cells: { count: done },
            suppressed: false,
          },
          {
            key: "pending",
            label: "Khảo sát chưa nộp",
            cells: { count: tasks - done },
            suppressed: false,
          },
          {
            key: "open",
            label: "Phản hồi chưa đóng",
            cells: { count: open },
            suppressed: false,
          },
          {
            key: "closed",
            label: "Phản hồi đã đóng",
            cells: { count: closed },
            suppressed: false,
          },
        ],
      ),
    );
    return result;
  }
  const settings = await readReportSettings(tx);
  if (surveyReportRoles.includes(role))
    result.sections.push(...(await surveySections(tx, actor, query)));
  if (feedbackReportRoles.includes(role))
    result.sections.push(
      ...(await feedbackSections(tx, actor, query, settings, now)),
    );
  if (role === "PHONG_DAO_TAO")
    result.sections.push(await readinessSection(tx, query));
  if (
    role === "THANH_TRA" ||
    (role === "LANH_DAO" && can(actor, "inspection:read"))
  )
    result.sections.push(
      await inspectionSection(tx, actor, query, settings, now),
    );
  return result;
}
export async function getReportsDashboard(
  actor: AuthActor,
  input: unknown = {},
): Promise<ReportsDashboard> {
  const data = parseInput(reportsQuerySchema, input);
  return transaction(actor, "reports:read", (tx, fresh) =>
    buildDashboard(tx, fresh, data),
  );
}
export const getReport = getReportsDashboard;
export async function prepareReportsExport(
  actor: AuthActor,
  input: unknown,
): Promise<ReportsDashboard> {
  requireCan(actor, "reports:export");
  const data = parseInput(
    reportsQuerySchema.extend({ format: z.enum(reportFormats) }).strict(),
    input,
  );
  return transaction(actor, "reports:export", async (tx, fresh) => {
    const { format, ...query } = data;
    const dashboard = await buildDashboard(tx, fresh, query);
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "REPORT_EXPORTED",
        objectType: "Report",
        redactedSummary: {
          role: dashboard.role,
          format,
          sections: dashboard.sections.map((section) => section.key),
        },
      },
    });
    return dashboard;
  });
}
