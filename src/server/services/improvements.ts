import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { actorGrants, isValidGrant } from "../policies/can";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import {
  canReadImprovement,
  canSubmitImprovement,
  canReviewImprovement,
  improvementTarget,
  type ImprovementResource,
} from "../policies/improvement-workflows";
import { lockAdminMutations, objectId, parseInput } from "./access";
import { enqueueDomainNotice } from "./domain-notifications";
import {
  improvementListSchema,
  improvementMutationSchema,
  type ImprovementItem,
  type ImprovementDetail,
  type ImprovementList,
} from "./improvement-types";
import { parseSurveyAggregateDetails } from "./survey-score";
import {
  workflowHash,
  workflowMissing,
  workflowConflict,
  assertWorkflowWritable,
  workflowTransaction,
} from "./workflow-access";

const include = {
  teacher: { select: { displayName: true } },
  cohort: {
    include: {
      campaign: { include: { semester: true } },
      section: {
        include: { teaching: true, course: { include: { department: true } } },
      },
    },
  },
  history: {
    include: { actor: { select: { displayName: true } } },
    orderBy: { occurredAt: "asc" as const },
  },
} satisfies Prisma.ImprovementPlanInclude;
type PlanRow = Prisma.ImprovementPlanGetPayload<{ include: typeof include }>;
const awaitingTeacher = ["CAN_GIAI_TRINH", "CAN_BO_SUNG"] as const;
function resource(row: PlanRow): ImprovementResource {
  return {
    teacherId: row.teacherId,
    departmentId: row.cohort.section.course.departmentId,
    facultyId: row.cohort.section.course.department.facultyId,
    currentTeacherIds: row.cohort.section.teaching.map((t) => t.teacherId),
  };
}
function item(row: PlanRow, now = new Date()): ImprovementItem {
  return {
    id: row.id,
    campaignId: row.campaignId,
    campaignTitle: row.cohort.campaign.title,
    sectionCode: row.cohort.section.code,
    courseName: row.cohort.section.course.name,
    teacherName: row.teacher.displayName,
    status: row.status,
    revision: row.revision,
    dueAt: row.dueAt.toISOString(),
    isOverdue:
      awaitingTeacher.some((status) => status === row.status) &&
      row.dueAt < now,
  };
}
function detail(actor: AuthActor, row: PlanRow): ImprovementDetail {
  const locked = !!row.cohort.campaign.semester.lockedAt;
  return {
    ...item(row),
    explanation: row.explanation,
    actionPlan: row.actionPlan,
    reviewComment: row.reviewComment,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    semesterLocked: locked,
    canSubmit:
      !locked &&
      canSubmitImprovement(actor, resource(row)) &&
      ["CAN_GIAI_TRINH", "CAN_BO_SUNG"].includes(row.status),
    canReview:
      !locked &&
      canReviewImprovement(actor, resource(row)) &&
      row.status === "DA_GUI",
    history: row.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      actorLabel: h.actor.displayName,
      occurredAt: h.occurredAt.toISOString(),
    })),
  };
}
function scope(actor: AuthActor): Prisma.ImprovementPlanWhereInput {
  const grants = actorGrants(actor);
  if (grants.some((g) => ["CAN_BO_DBCL", "LANH_DAO"].includes(g.role)))
    return {};
  const OR: Prisma.ImprovementPlanWhereInput[] = [];
  for (const g of grants) {
    if (g.role === "GIANG_VIEN")
      OR.push({
        teacherId: actor.userId,
        cohort: {
          section: { teaching: { some: { teacherId: actor.userId } } },
        },
      });
    if (g.role === "TRUONG_BO_MON")
      OR.push({
        cohort: { section: { course: { departmentId: g.departmentId! } } },
      });
    if (g.role === "TRUONG_KHOA")
      OR.push({
        cohort: {
          section: { course: { department: { facultyId: g.facultyId! } } },
        },
      });
  }
  return { OR };
}
async function officers(
  tx: Prisma.TransactionClient,
  departmentId: string,
  facultyId: string,
  role: "TRUONG_BO_MON" | "TRUONG_KHOA",
) {
  return (
    await tx.user.findMany({
      where: {
        status: "ACTIVE",
        roles: {
          some: {
            role,
            ...(role === "TRUONG_BO_MON"
              ? { scopeType: "DEPARTMENT", departmentId, facultyId: null }
              : { scopeType: "FACULTY", facultyId, departmentId: null }),
          },
        },
      },
      select: { id: true },
    })
  ).map((u) => u.id);
}

/** Gọi trong transaction đã khóa ADMIN_MUTATION_LOCK; chỉ dùng điểm lớp đã được phép công bố. */
export async function ensureRequiredImprovements(
  tx: Prisma.TransactionClient,
  campaignId: string,
  now = new Date(),
) {
  const campaign = await tx.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: {
      semester: true,
      history: {
        where: { toStatus: "DA_CONG_BO" },
        orderBy: { occurredAt: "asc" },
        take: 1,
      },
    },
  });
  if (
    !campaign ||
    campaign.status !== "DA_CONG_BO" ||
    campaign.semester.lockedAt
  )
    return { created: 0 };
  const publishedAt = campaign.history[0]?.occurredAt ?? now;
  const results = await tx.aggregateResult.findMany({
    where: {
      campaignId,
      eligibleToPublish: true,
      overallScore: { lt: campaign.warningScore },
    },
    include: {
      cohort: {
        include: {
          section: {
            include: {
              teaching: {
                include: { teacher: { select: { status: true, roles: true } } },
              },
              course: { include: { department: true } },
            },
          },
        },
      },
    },
  });
  let created = 0;
  for (const result of results) {
    const details = parseSurveyAggregateDetails(result.details);
    if (!details)
      throw new AuthError(
        "Bản tổng hợp chưa hợp lệ để tạo yêu cầu giải trình.",
        409,
        "INVALID_AGGREGATE",
      );
    for (const teaching of result.cohort.section.teaching) {
      if (
        !details.teacherIds.includes(teaching.teacherId) ||
        teaching.teacher.status !== "ACTIVE" ||
        !teaching.teacher.roles.some(
          (g) => g.role === "GIANG_VIEN" && isValidGrant(g),
        )
      )
        continue;
      const key = {
        campaignId,
        sectionId: result.sectionId,
        teacherId: teaching.teacherId,
      };
      const existing = await tx.improvementPlan.findUnique({
        where: { campaignId_sectionId_teacherId: key },
        select: { id: true },
      });
      if (existing) continue;
      const plan = await tx.improvementPlan.create({
        data: {
          ...key,
          dueAt: new Date(
            publishedAt.getTime() + campaign.explanationDays * 86400000,
          ),
        },
      });
      const department = result.cohort.section.course.department;
      const userIds = [
        teaching.teacherId,
        ...(await officers(
          tx,
          department.id,
          department.facultyId,
          "TRUONG_BO_MON",
        )),
      ];
      await enqueueDomainNotice(tx, {
        key: `improvement-created:${plan.id}`,
        targetType: "ImprovementPlan",
        targetId: plan.id,
        title: "Yêu cầu giải trình cải tiến",
        body: "Đã có yêu cầu giải trình cho lớp học phần. Xem nội dung và thời hạn trong mục Giải trình cải tiến.",
        userIds,
      });
      await tx.auditLog.create({
        data: {
          action: "IMPROVEMENT_REQUIRED",
          objectType: "ImprovementPlan",
          objectId: plan.id,
          redactedSummary: { campaignId, sectionId: result.sectionId },
        },
      });
      created++;
    }
  }
  return { created };
}
const batchSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(100),
    now: z.date().optional(),
  })
  .strict();
export async function ensureDueImprovements(
  actor: ServerConsoleActor | null,
  input: { limit?: number; now?: Date } = {},
) {
  authorizeConsole(actor);
  const data = parseInput(batchSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      return backfill(tx, data);
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
async function readCursor(tx: Prisma.TransactionClient, key: string) {
  const row = await tx.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return typeof row?.value === "string" ? row.value : "";
}
async function advanceCursor(
  tx: Prisma.TransactionClient,
  key: string,
  rows: { id: string }[],
  limit: number,
) {
  const next = rows.length === limit ? rows.at(-1)!.id : "";
  await tx.systemSetting.upsert({
    where: { key },
    create: { key, value: next },
    update: { value: next },
  });
}
async function backfill(
  tx: Prisma.TransactionClient,
  input: { limit?: number; now?: Date } = {},
) {
  const { limit, now } = parseInput(batchSchema, input),
    key = "IMPROVEMENT_BACKFILL_CURSOR",
    cursor = await readCursor(tx, key);
  const campaigns = await tx.surveyCampaign.findMany({
    where: {
      ...(cursor ? { id: { gt: cursor } } : {}),
      status: "DA_CONG_BO",
      semester: { lockedAt: null },
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: limit,
  });
  let created = 0;
  for (const campaign of campaigns)
    created += (await ensureRequiredImprovements(tx, campaign.id, now)).created;
  await advanceCursor(tx, key, campaigns, limit);
  return { created, checked: campaigns.length };
}
export async function listImprovements(
  actor: AuthActor,
  input: unknown = {},
): Promise<ImprovementList> {
  const data = parseInput(improvementListSchema, input);
  return workflowTransaction(actor, "improvements:list", async (tx, fresh) => {
    await backfill(tx);
    await ensureWorkflowReminders(tx);
    const where: Prisma.ImprovementPlanWhereInput = {
      AND: [
        scope(fresh),
        { cohort: { campaign: { status: { in: ["DA_CONG_BO", "LUU_TRU"] } } } },
        ...(data.status ? [{ status: data.status }] : []),
      ],
    };
    const [rows, total] = await Promise.all([
      tx.improvementPlan.findMany({
        where,
        include,
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
      }),
      tx.improvementPlan.count({ where }),
    ]);
    return {
      items: rows
        .filter((r) => canReadImprovement(fresh, resource(r)))
        .map((r) => item(r)),
      total,
      page: data.page,
      pageSize: data.pageSize,
    };
  });
}
async function read(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
) {
  const row = await tx.improvementPlan.findUnique({ where: { id }, include });
  if (
    !row ||
    !["DA_CONG_BO", "LUU_TRU"].includes(row.cohort.campaign.status) ||
    !canReadImprovement(actor, resource(row))
  )
    workflowMissing();
  return row;
}
export async function getImprovement(
  actor: AuthActor,
  id: string,
): Promise<ImprovementDetail> {
  const key = parseInput(objectId, id);
  return workflowTransaction(actor, "improvements:read", async (tx, fresh) => {
    await backfill(tx);
    await ensureWorkflowReminders(tx);
    return detail(fresh, await read(tx, fresh, key));
  });
}
export async function mutateImprovement(
  actor: AuthActor,
  id: string,
  input: unknown,
): Promise<ImprovementDetail> {
  const key = parseInput(objectId, id),
    data = parseInput(improvementMutationSchema, input),
    hash = workflowHash(data);
  return workflowTransaction(
    actor,
    data.action === "submit" ? "improvements:submit" : "improvements:review",
    async (tx, fresh) => {
      const row = await read(tx, fresh, key),
        context = resource(row);
      if (
        data.action === "submit"
          ? !canSubmitImprovement(fresh, context)
          : !canReviewImprovement(fresh, context)
      )
        workflowMissing();
      const previous = await tx.improvementHistory.findUnique({
        where: { planId_requestId: { planId: key, requestId: data.requestId } },
      });
      if (previous) {
        if (previous.actorId !== fresh.userId || previous.requestHash !== hash)
          workflowConflict();
        return detail(fresh, row);
      }
      assertWorkflowWritable(row.cohort.campaign.semester.lockedAt);
      const target = improvementTarget(row.status, data.action);
      if (!target || data.revision !== row.revision) workflowConflict();
      const now = new Date();
      const changed = await tx.improvementPlan.updateMany({
        where: { id: key, revision: data.revision, status: row.status },
        data: {
          status: target,
          revision: { increment: 1 },
          ...(data.action === "submit"
            ? {
                explanation: data.explanation,
                actionPlan: data.actionPlan,
                submittedAt: now,
                reviewComment: null,
                confirmedById: null,
                confirmedAt: null,
              }
            : {
                reviewComment: data.comment,
                ...(data.action === "confirm"
                  ? { confirmedById: fresh.userId, confirmedAt: now }
                  : { confirmedById: null, confirmedAt: null }),
              }),
        },
      });
      if (changed.count !== 1) workflowConflict();
      await tx.improvementHistory.create({
        data: {
          planId: key,
          actorId: fresh.userId,
          fromStatus: row.status,
          toStatus: target,
          note:
            data.action === "submit"
              ? "Giảng viên đã gửi giải trình và kế hoạch cải tiến."
              : data.comment,
          requestId: data.requestId,
          requestHash: hash,
        },
      });
      const dept = row.cohort.section.course.department;
      const userIds =
        data.action === "submit"
          ? await officers(tx, dept.id, dept.facultyId, "TRUONG_BO_MON")
          : [row.teacherId];
      await enqueueDomainNotice(tx, {
        key: `improvement:${key}:${data.requestId}`,
        targetType: "ImprovementPlan",
        targetId: key,
        title:
          data.action === "submit"
            ? "Giải trình cần xem xét"
            : data.action === "confirm"
              ? "Giải trình đã được xác nhận"
              : "Giải trình cần bổ sung",
        body: "Trạng thái giải trình cải tiến đã thay đổi. Mở hồ sơ để xem nội dung được phép truy cập.",
        userIds,
      });
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: "IMPROVEMENT_UPDATED",
          objectType: "ImprovementPlan",
          objectId: key,
          redactedSummary: { fromStatus: row.status, toStatus: target },
        },
      });
      return detail(fresh, await read(tx, fresh, key));
    },
  );
}

/** Nhắc theo ngày; khóa unique thông báo ngăn job đồng thời tạo bản sao. */
export async function remindDomainWorkflows(
  actor: ServerConsoleActor | null,
  input: { limit?: number; now?: Date } = {},
) {
  authorizeConsole(actor);
  const data = parseInput(batchSchema, input);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      return ensureWorkflowReminders(tx, data);
    },
    { maxWait: 15000, timeout: 30000 },
  );
}

/** Nội bộ: caller đã khóa mutex và kiểm actor; truy cập đầu tiên cũng tạo nhắc hạn. */
export async function ensureWorkflowReminders(
  tx: Prisma.TransactionClient,
  input: { limit?: number; now?: Date } = {},
) {
  const { limit, now = new Date() } = parseInput(batchSchema, input),
    day = now.toISOString().slice(0, 10);
  let queued = 0;
  const planCursorKey = "IMPROVEMENT_REMINDER_CURSOR",
    planCursor = await readCursor(tx, planCursorKey);
  const plans = await tx.improvementPlan.findMany({
    where: {
      ...(planCursor ? { id: { gt: planCursor } } : {}),
      status: { in: [...awaitingTeacher] },
      dueAt: { lte: new Date(now.getTime() + 86400000) },
      cohort: {
        campaign: { status: "DA_CONG_BO", semester: { lockedAt: null } },
      },
    },
    include,
    orderBy: [{ id: "asc" }],
    take: limit,
  });
  for (const row of plans) {
    const dept = row.cohort.section.course.department;
    const userIds = [
      row.teacherId,
      ...(await officers(tx, dept.id, dept.facultyId, "TRUONG_BO_MON")),
    ];
    const notice = await enqueueDomainNotice(tx, {
      key: `improvement-due:${row.id}:${day}`,
      targetType: "ImprovementPlan",
      targetId: row.id,
      title:
        row.dueAt < now ? "Giải trình đã quá hạn" : "Giải trình sắp đến hạn",
      body: "Có yêu cầu giải trình chưa hoàn tất. Xem thời hạn và trạng thái trong mục Giải trình cải tiến.",
      userIds,
    });
    queued += notice.queued;
  }
  await advanceCursor(tx, planCursorKey, plans, limit);
  const recommendationCursorKey = "EXAM_RECOMMENDATION_REMINDER_CURSOR",
    recommendationCursor = await readCursor(tx, recommendationCursorKey);
  const recommendations = await tx.examReviewRecommendation.findMany({
    where: {
      ...(recommendationCursor ? { id: { gt: recommendationCursor } } : {}),
      status: "DA_GUI",
      dueAt: { lt: now },
      campaign: { semester: { lockedAt: null } },
    },
    include: { course: { include: { department: true } } },
    orderBy: [{ id: "asc" }],
    take: limit,
  });
  for (const row of recommendations) {
    const dept = row.course.department;
    const userIds = [
      row.recipientId,
      ...(await officers(tx, dept.id, dept.facultyId, "TRUONG_KHOA")),
    ];
    const notice = await enqueueDomainNotice(tx, {
      key: `exam-review-due:${row.id}:${day}`,
      targetType: "ExamReviewRecommendation",
      targetId: row.id,
      title: "Kiến nghị rà soát đã quá hạn",
      body: "Kiến nghị rà soát chưa được phản hồi đúng hạn. Xem hồ sơ trong mục Kiến nghị rà soát.",
      userIds,
    });
    queued += notice.queued;
  }
  await advanceCursor(tx, recommendationCursorKey, recommendations, limit);
  return { checked: plans.length + recommendations.length, queued };
}
