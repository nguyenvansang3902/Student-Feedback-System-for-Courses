import type { Prisma } from "../../generated/prisma/client";
import type { AuthActor } from "../auth/types";
import { AuthError } from "../auth/types";
import {
  anomalySectionWhere,
  canReadSurveyAnomaly,
  canReviewSurveyAnomaly,
} from "../policies/survey-anomalies";
import { objectId, parseInput } from "./access";
import {
  workflowConflict,
  workflowHash,
  workflowMissing,
  workflowTransaction,
  assertWorkflowWritable,
} from "./workflow-access";
import {
  anomalyMetricsSchema,
  anomalyQuerySchema,
  anomalyReviewSchema,
} from "./survey-anomaly-types";
import { addBusinessDays } from "./feedback-deadlines";
import { readWorkflowSettings } from "./workflow-settings";
import { enqueueDomainNotice } from "./domain-notifications";
import { noticeRecipientActor } from "./notification-access";
import { isInspectionOfficer } from "../policies/feedback";
import type { SurveyAnomalyDetail } from "../survey-anomaly-contract";
const include = {
  campaign: { include: { semester: true } },
  section: {
    include: { course: { include: { department: true } }, teaching: true },
  },
  inspectionCase: { select: { id: true } },
  events: {
    include: { actor: { select: { displayName: true } } },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.SurveyAnomalyFlagInclude;
type Row = Prisma.SurveyAnomalyFlagGetPayload<{ include: typeof include }>;
const context = (row: Row) => ({
  departmentId: row.section.course.departmentId,
  facultyId: row.section.course.department.facultyId,
  teacherIds: row.section.teaching.map((item) => item.teacherId),
});
function dto(actor: AuthActor, row: Row): SurveyAnomalyDetail {
  const metrics = anomalyMetricsSchema.safeParse(row.metrics);
  if (
    !metrics.success ||
    metrics.data.responseCount < metrics.data.thresholds.minResponses
  )
    throw new AuthError(
      "Chỉ số cảnh báo chưa hợp lệ.",
      503,
      "ANOMALY_METRICS_INVALID",
    );
  return {
    id: row.id,
    revision: row.revision,
    campaignId: row.campaignId,
    campaignTitle: row.campaign.title,
    sectionCode: row.section.code,
    courseName: row.section.course.name,
    semesterName: row.campaign.semester.name,
    ruleCode: row.ruleCode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    metrics: metrics.data,
    caseId: row.inspectionCase?.id ?? null,
    canReview:
      canReviewSurveyAnomaly(actor, context(row)) &&
      !row.campaign.semester.lockedAt &&
      row.status === "CHO_XEM_XET",
    note: row.note,
    events: row.events.map((entry) => ({
      id: entry.id,
      decision: entry.toStatus,
      note: entry.note,
      actorLabel: entry.actor.displayName,
      occurredAt: entry.occurredAt.toISOString(),
    })),
  };
}
async function read(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  id: string,
) {
  const row = await tx.surveyAnomalyFlag.findUnique({ where: { id }, include });
  if (
    !row ||
    !["DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"].includes(row.campaign.status) ||
    !canReadSurveyAnomaly(actor, context(row))
  )
    workflowMissing();
  return row;
}
export async function listSurveyAnomalies(
  actor: AuthActor,
  input: unknown = {},
) {
  const data = parseInput(anomalyQuerySchema, input);
  return workflowTransaction(actor, "anomalies:list", async (tx, fresh) => {
    const where: Prisma.SurveyAnomalyFlagWhereInput = {
      section: anomalySectionWhere(fresh),
      campaign: { status: { in: ["DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"] } },
      ...(data.campaignId ? { campaignId: data.campaignId } : {}),
      ...(data.status ? { status: data.status } : {}),
    };
    const [rows, total] = await Promise.all([
      tx.surveyAnomalyFlag.findMany({
        where,
        include,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
      }),
      tx.surveyAnomalyFlag.count({ where }),
    ]);
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "SURVEY_ANOMALY_LIST_VIEWED",
        objectType: "SurveyAnomalyFlag",
        redactedSummary: { count: rows.length },
      },
    });
    return {
      items: rows.map((row) => dto(fresh, row)),
      total,
      page: data.page,
      pageSize: data.pageSize,
    };
  });
}
export async function getSurveyAnomaly(actor: AuthActor, id: string) {
  const key = parseInput(objectId, id);
  return workflowTransaction(actor, "anomalies:read", async (tx, fresh) => {
    const row = await read(tx, fresh, key);
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "SURVEY_ANOMALY_VIEWED",
        objectType: "SurveyAnomalyFlag",
        objectId: key,
      },
    });
    return dto(fresh, row);
  });
}
export async function reviewSurveyAnomaly(
  actor: AuthActor,
  id: string,
  input: unknown,
) {
  const key = parseInput(objectId, id),
    data = parseInput(anomalyReviewSchema, input),
    requestHash = workflowHash(data);
  return workflowTransaction(actor, "anomalies:review", async (tx, fresh) => {
    await tx.$queryRaw`SELECT id FROM SurveyAnomalyFlag WHERE id = ${key} FOR UPDATE`;
    const row = await read(tx, fresh, key);
    if (!canReviewSurveyAnomaly(fresh, context(row))) workflowMissing();
    const previous = await tx.surveyAnomalyReviewEvent.findUnique({
      where: { flagId_requestId: { flagId: key, requestId: data.requestId } },
    });
    if (previous) {
      if (
        previous.actorId !== fresh.userId ||
        previous.requestHash !== requestHash
      )
        workflowConflict();
      return dto(fresh, row);
    }
    assertWorkflowWritable(row.campaign.semester.lockedAt);
    if (row.status !== "CHO_XEM_XET" || row.revision !== data.revision)
      workflowConflict();
    const changed = await tx.surveyAnomalyFlag.updateMany({
      where: { id: key, revision: row.revision, status: "CHO_XEM_XET" },
      data: {
        status: data.decision,
        revision: { increment: 1 },
        note: data.note,
        reviewedById: fresh.userId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) workflowConflict();
    await tx.surveyAnomalyReviewEvent.create({
      data: {
        flagId: key,
        actorId: fresh.userId,
        fromStatus: row.status,
        toStatus: data.decision,
        note: data.note,
        requestId: data.requestId,
        requestHash,
      },
    });
    if (data.decision === "CHUYEN_XAC_MINH") {
      if (!isInspectionOfficer(fresh, context(row))) workflowMissing();
      const settings = await readWorkflowSettings(tx),
        now = new Date();
      const created = await tx.inspectionCase.create({
        data: {
          anomalyFlagId: key,
          campaignId: row.campaignId,
          sectionId: row.sectionId,
          source: "BAT_THUONG_KHAO_SAT",
          status: "TIEP_NHAN",
          createdById: fresh.userId,
          assigneeId: fresh.userId,
          acceptDueAt: addBusinessDays(now, settings.inspectionAcceptDays),
          completeDueAt: addBusinessDays(now, settings.inspectionCompleteDays),
          events: {
            create: {
              actorId: fresh.userId,
              fromStatus: null,
              toStatus: "TIEP_NHAN",
              event: "ANOMALY_REFERRED",
              reason: data.note,
            },
          },
        },
      });
      await enqueueDomainNotice(tx, {
        key: `anomaly-case:${key}`,
        targetType: "InspectionCase",
        targetId: created.id,
        title: "Hồ sơ bất thường khảo sát được mở",
        body: "Hồ sơ cần được tiếp nhận và xác minh. Chỉ số cảnh báo không phải kết luận vi phạm.",
        userIds: [fresh.userId],
      });
    }
    if (data.decision === "CAN_LUU_Y") {
      const users = await tx.user.findMany({
          where: { status: "ACTIVE", roles: { some: { role: "CAN_BO_DBCL" } } },
          select: { id: true },
        }),
        ids: string[] = [];
      for (const user of users) {
        const current = await noticeRecipientActor(tx, user.id);
        if (current && !current.roles.includes("ADMIN")) ids.push(user.id);
      }
      await enqueueDomainNotice(tx, {
        key: `anomaly-review:${key}`,
        targetType: "SurveyAnomalyAttention",
        targetId: key,
        title: "Có chỉ số khảo sát cần lưu ý",
        body: "Thanh tra đã ghi nhận chỉ số cần lưu ý trong một đợt khảo sát. Cảnh báo không tự chặn công bố hoặc kết luận vi phạm.",
        userIds: ids,
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: fresh.userId,
        action: "SURVEY_ANOMALY_REVIEWED",
        objectType: "SurveyAnomalyFlag",
        objectId: key,
        redactedSummary: {
          decision: data.decision,
          revision: row.revision + 1,
        },
      },
    });
    return dto(fresh, await read(tx, fresh, key));
  });
}
