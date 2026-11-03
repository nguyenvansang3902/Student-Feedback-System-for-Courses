import type { Prisma } from "../../generated/prisma/client";
import type { AuthActor } from "../auth/types";
import { actorGrants } from "../policies/can";
import {
  canReadRecommendation,
  canRespondRecommendation,
} from "../policies/improvement-workflows";
import { objectId, parseInput } from "./access";
import { enqueueDomainNotice } from "./domain-notifications";
import {
  recommendationCreateSchema,
  recommendationListSchema,
  recommendationRespondSchema,
  type RecommendationOptions,
  type RecommendationItem,
  type RecommendationDetail,
  type RecommendationList,
} from "./improvement-types";
import {
  assessmentContributingTeachers,
  hasAssessmentContribution,
  parseSurveyAggregateDetails,
  type SurveyAggregateDetails,
} from "./survey-score";
import { readWorkflowSettings } from "./workflow-settings";
import { ensureWorkflowReminders } from "./improvements";
import {
  assertWorkflowWritable,
  workflowConflict,
  workflowHash,
  workflowMissing,
  workflowTransaction,
} from "./workflow-access";

const include = {
  campaign: { include: { semester: true } },
  course: { include: { department: true } },
  recipient: { select: { displayName: true } },
} satisfies Prisma.ExamReviewRecommendationInclude;
type RecommendationRow = Prisma.ExamReviewRecommendationGetPayload<{
  include: typeof include;
}>;
function context(row: RecommendationRow) {
  return {
    senderId: row.senderId,
    recipientId: row.recipientId,
    departmentId: row.course.departmentId,
    facultyId: row.course.department.facultyId,
  };
}
function item(row: RecommendationRow): RecommendationItem {
  return {
    id: row.id,
    campaignId: row.campaignId,
    campaignTitle: row.campaign.title,
    courseName: row.course.name,
    departmentName: row.course.department.name,
    recipientName: row.recipient.displayName,
    status: row.status,
    revision: row.revision,
    dueAt: row.dueAt.toISOString(),
    isOverdue: row.status === "DA_GUI" && row.dueAt < new Date(),
  };
}
function detail(
  actor: AuthActor,
  row: RecommendationRow,
): RecommendationDetail {
  return {
    ...item(row),
    body: row.body,
    outcome: row.outcome,
    responseReason: row.responseReason,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    semesterLocked: !!row.campaign.semester.lockedAt,
    canRespond:
      row.status === "DA_GUI" &&
      !row.campaign.semester.lockedAt &&
      canRespondRecommendation(actor, context(row)),
  };
}
function scope(actor: AuthActor): Prisma.ExamReviewRecommendationWhereInput {
  const grants = actorGrants(actor);
  if (grants.some((g) => g.role === "PHONG_KHAO_THI")) return {};
  return {
    OR: grants.flatMap<Prisma.ExamReviewRecommendationWhereInput>((g) =>
      g.role === "TRUONG_BO_MON"
        ? [{ course: { departmentId: g.departmentId! } }]
        : g.role === "TRUONG_KHOA"
          ? [{ course: { department: { facultyId: g.facultyId! } } }]
          : [],
    ),
  };
}
export function hasRecommendationEvidence(
  rows: { details: unknown; responseCount: number }[],
  minResponses: number,
) {
  const contributing: SurveyAggregateDetails[] = [];
  let count = 0;
  for (const row of rows) {
    const details = parseSurveyAggregateDetails(row.details);
    if (
      !details ||
      row.responseCount <= 0 ||
      !hasAssessmentContribution(details)
    )
      continue;
    contributing.push(details);
    count += row.responseCount;
  }
  return (
    assessmentContributingTeachers(contributing).size >= 2 &&
    count >= minResponses
  );
}
async function publishedCourses(
  tx: Prisma.TransactionClient,
  campaignId?: string,
) {
  const campaigns = await tx.surveyCampaign.findMany({
    where: {
      ...(campaignId ? { id: campaignId } : {}),
      status: "DA_CONG_BO",
      semester: { lockedAt: null },
    },
    select: {
      id: true,
      title: true,
      minResponses: true,
      sections: {
        where: {
          section: {
            course: {
              isActive: true,
              department: { isActive: true, faculty: { isActive: true } },
            },
          },
        },
        include: {
          result: true,
          section: { include: { course: { include: { department: true } } } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const output: RecommendationOptions["campaigns"] = [];
  for (const campaign of campaigns) {
    const courses: RecommendationOptions["campaigns"][number]["courses"] = [];
    const courseIds = [
      ...new Set(campaign.sections.map((s) => s.section.courseId)),
    ];
    for (const courseId of courseIds) {
      const cohorts = campaign.sections.filter(
          (s) => s.section.courseId === courseId,
        ),
        course = cohorts[0].section.course;
      if (
        !hasRecommendationEvidence(
          cohorts.flatMap((s) => (s.result ? [s.result] : [])),
          campaign.minResponses,
        )
      )
        continue;
      const recipients = await tx.user.findMany({
        where: {
          status: "ACTIVE",
          roles: {
            some: {
              role: "TRUONG_BO_MON",
              scopeType: "DEPARTMENT",
              departmentId: course.departmentId,
              facultyId: null,
            },
          },
        },
        select: { id: true, displayName: true },
        orderBy: { id: "asc" },
      });
      if (recipients.length)
        courses.push({ id: course.id, name: course.name, recipients });
    }
    if (courses.length)
      output.push({ id: campaign.id, title: campaign.title, courses });
  }
  return output;
}
export async function getRecommendationOptions(
  actor: AuthActor,
): Promise<RecommendationOptions> {
  return workflowTransaction(
    actor,
    "exam-recommendations:create",
    async (tx) => ({ campaigns: await publishedCourses(tx) }),
  );
}
export async function listExamRecommendations(
  actor: AuthActor,
  input: unknown = {},
): Promise<RecommendationList> {
  const data = parseInput(recommendationListSchema, input);
  return workflowTransaction(
    actor,
    "exam-recommendations:list",
    async (tx, fresh) => {
      await ensureWorkflowReminders(tx);
      const where: Prisma.ExamReviewRecommendationWhereInput = {
        AND: [scope(fresh), ...(data.status ? [{ status: data.status }] : [])],
      };
      const [rows, total] = await Promise.all([
        tx.examReviewRecommendation.findMany({
          where,
          include,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
        }),
        tx.examReviewRecommendation.count({ where }),
      ]);
      return {
        items: rows
          .filter((r) => canReadRecommendation(fresh, context(r)))
          .map(item),
        total,
        page: data.page,
        pageSize: data.pageSize,
      };
    },
  );
}
async function read(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
) {
  const row = await tx.examReviewRecommendation.findUnique({
    where: { id },
    include,
  });
  if (!row || !canReadRecommendation(actor, context(row))) workflowMissing();
  return row;
}
export async function getExamRecommendation(
  actor: AuthActor,
  id: string,
): Promise<RecommendationDetail> {
  const key = parseInput(objectId, id);
  return workflowTransaction(
    actor,
    "exam-recommendations:read",
    async (tx, fresh) => {
      await ensureWorkflowReminders(tx);
      return detail(fresh, await read(tx, fresh, key));
    },
  );
}
export async function createExamRecommendation(
  actor: AuthActor,
  input: unknown,
): Promise<RecommendationDetail> {
  const data = parseInput(recommendationCreateSchema, input),
    hash = workflowHash(data);
  return workflowTransaction(
    actor,
    "exam-recommendations:create",
    async (tx, fresh) => {
      const old = await tx.examReviewRecommendation.findUnique({
        where: {
          senderId_requestId: {
            senderId: fresh.userId,
            requestId: data.requestId,
          },
        },
        include,
      });
      if (old) {
        if (
          old.requestHash !== hash ||
          !canReadRecommendation(fresh, context(old))
        )
          workflowConflict();
        return detail(fresh, old);
      }
      const options = await publishedCourses(tx, data.campaignId),
        course = options[0]?.courses.find((c) => c.id === data.courseId);
      if (!course || !course.recipients.some((r) => r.id === data.recipientId))
        workflowMissing();
      const settings = await readWorkflowSettings(tx),
        now = new Date();
      const row = await tx.examReviewRecommendation.create({
        data: {
          campaignId: data.campaignId,
          courseId: data.courseId,
          recipientId: data.recipientId,
          senderId: fresh.userId,
          body: data.body,
          requestId: data.requestId,
          requestHash: hash,
          dueAt: new Date(now.getTime() + settings.examReviewDays * 86400000),
        },
        include,
      });
      await enqueueDomainNotice(tx, {
        key: `exam-review-created:${row.id}`,
        targetType: "ExamReviewRecommendation",
        targetId: row.id,
        title: "Kiến nghị rà soát mới",
        body: "Phòng Khảo thí đã gửi kiến nghị rà soát. Mở hồ sơ để xem nội dung và thời hạn phản hồi.",
        userIds: [row.recipientId],
      });
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "EXAM_RECOMMENDATION_CREATED",
          objectType: "ExamReviewRecommendation",
          objectId: row.id,
          redactedSummary: {
            campaignId: data.campaignId,
            courseId: data.courseId,
          },
        },
      });
      return detail(fresh, row);
    },
  );
}
export async function respondExamRecommendation(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<RecommendationDetail> {
  const key = parseInput(objectId, id),
    data = parseInput(recommendationRespondSchema, input),
    hash = workflowHash(data);
  return workflowTransaction(
    actor,
    "exam-recommendations:respond",
    async (tx, fresh) => {
      const row = await read(tx, fresh, key);
      if (!canRespondRecommendation(fresh, context(row))) workflowMissing();
      if (row.responseRequestId === data.requestId) {
        if (row.responseRequestHash !== hash) workflowConflict();
        return detail(fresh, row);
      }
      assertWorkflowWritable(row.campaign.semester.lockedAt);
      if (row.status !== "DA_GUI" || row.revision !== data.revision)
        workflowConflict();
      const changed = await tx.examReviewRecommendation.updateMany({
        where: { id: key, status: "DA_GUI", revision: data.revision },
        data: {
          status: "DA_PHAN_HOI",
          outcome: data.outcome,
          responseReason: data.reason,
          respondedAt: new Date(),
          revision: { increment: 1 },
          responseRequestId: data.requestId,
          responseRequestHash: hash,
        },
      });
      if (changed.count !== 1) workflowConflict();
      await enqueueDomainNotice(tx, {
        key: `exam-review-responded:${key}`,
        targetType: "ExamReviewRecommendation",
        targetId: key,
        title: "Kiến nghị rà soát đã có phản hồi",
        body: "Trưởng bộ môn đã phản hồi kiến nghị rà soát. Mở hồ sơ để xem kết quả và lý do.",
        userIds: [row.senderId],
      });
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "EXAM_RECOMMENDATION_RESPONDED",
          objectType: "ExamReviewRecommendation",
          objectId: key,
          redactedSummary: { outcome: data.outcome },
        },
      });
      return detail(fresh, await read(tx, fresh, key));
    },
  );
}
