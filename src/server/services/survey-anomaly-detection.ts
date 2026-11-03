import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { lockAdminMutations } from "./access";
import { parseSurveyAggregateDetails, poolSurveyScores } from "./survey-score";
import {
  scoreShift,
  uniformLikertCount,
  uniformThresholdExceeded,
} from "./survey-anomaly-metrics";
import { readAnomalySettings } from "./survey-anomaly-settings";
import { enqueueDomainNotice } from "./domain-notifications";
import { canReadSurveyAnomaly } from "../policies/survey-anomalies";
import { noticeRecipientActor } from "./notification-access";
import type { AnomalyMetrics } from "../survey-anomaly-contract";

/** Nội bộ transaction đã kiểm actor/mutex. Chỉ sinh chỉ số và cờ; không thay trạng thái đợt hoặc quyết định công bố. */
export async function ensureCampaignAnomalies(
  tx: Prisma.TransactionClient,
  campaignId: string,
) {
  const campaign = await tx.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: { semester: true },
  });
  if (
    !campaign ||
    !["DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"].includes(campaign.status) ||
    campaign.semester.lockedAt
  )
    return { created: 0 };
  const settings = await readAnomalySettings(tx),
    results = await tx.aggregateResult.findMany({
      where: { campaignId, responseCount: { gte: settings.minResponses } },
      include: {
        cohort: {
          include: {
            section: {
              include: {
                course: { include: { department: true } },
                teaching: true,
              },
            },
          },
        },
      },
    });
  const previousSemester = await tx.semester.findFirst({
    where: { startsOn: { lt: campaign.semester.startsOn } },
    orderBy: [{ startsOn: "desc" }, { id: "asc" }],
  });
  const inspectors = await tx.user.findMany({
    where: { status: "ACTIVE", roles: { some: { role: "THANH_TRA" } } },
    select: { id: true },
  });
  let created = 0;
  for (const result of results) {
    const details = parseSurveyAggregateDetails(result.details);
    if (!details || details.templateId !== campaign.templateId) continue;
    const section = result.cohort.section;
    const questionIds = details.template.groups.flatMap((group) =>
      group.questions.filter((q) => q.type === "LIKERT").map((q) => q.id),
    );
    const answerRows =
      questionIds.length >= 2
        ? await tx.surveyAnswer.findMany({
            where: {
              response: { campaignId, sectionId: result.sectionId },
              questionId: { in: questionIds },
            },
            select: {
              responseId: true,
              questionId: true,
              isNotApplicable: true,
              valueNumber: true,
            },
          })
        : [];
    const uniformCount = uniformLikertCount(
      answerRows.map((row) => ({
        ...row,
        valueNumber: row.valueNumber?.toString() ?? null,
      })),
      questionIds,
    );
    let shift: ReturnType<typeof scoreShift> = null;
    if (previousSemester) {
      const previousRows = await tx.aggregateResult.findMany({
        where: {
          cohort: {
            campaign: {
              semesterId: previousSemester.id,
              templateId: campaign.templateId,
              status: { in: ["DA_CONG_BO", "LUU_TRU"] },
            },
            section: { courseId: section.courseId },
          },
        },
        select: { details: true },
      });
      const previousDetails = previousRows.flatMap((row) => {
        const parsed = parseSurveyAggregateDetails(row.details);
        return parsed ? [parsed] : [];
      });
      const pooled = poolSurveyScores(previousDetails, {
        minResponses: settings.minResponses,
        minRate: campaign.minRate.toString(),
      });
      if (pooled?.eligibleToPublish)
        shift = scoreShift(details.score, pooled, settings.scoreDelta);
    }
    const metrics: AnomalyMetrics = {
      version: 1,
      responseCount: result.responseCount,
      participationRate: Number(result.participationRate),
      uniformCount,
      uniformRate:
        questionIds.length >= 2 ? uniformCount / result.responseCount : null,
      scoreDeltaAbs: shift?.value ?? null,
      priorSemesterName: shift ? previousSemester!.name : null,
      thresholds: {
        minResponses: settings.minResponses,
        uniformRate: settings.uniformRate,
        scoreDelta: settings.scoreDelta,
      },
    };
    const rules = [
      ...(questionIds.length >= 2 &&
      uniformThresholdExceeded(
        uniformCount,
        result.responseCount,
        settings.uniformRate,
      )
        ? ["UNIFORM_LIKERT"]
        : []),
      ...(shift?.exceeded ? ["PREVIOUS_SEMESTER_SHIFT"] : []),
    ];
    for (const ruleCode of rules) {
      const exists = await tx.surveyAnomalyFlag.findUnique({
        where: {
          campaignId_sectionId_ruleCode: {
            campaignId,
            sectionId: result.sectionId,
            ruleCode,
          },
        },
        select: { id: true },
      });
      if (exists) continue;
      const flag = await tx.surveyAnomalyFlag.create({
        data: {
          id: randomUUID(),
          campaignId,
          sectionId: result.sectionId,
          ruleCode,
          metrics: metrics as unknown as Prisma.InputJsonValue,
        },
      });
      const context = {
        departmentId: section.course.departmentId,
        facultyId: section.course.department.facultyId,
        teacherIds: section.teaching.map((row) => row.teacherId),
      };
      const recipients: string[] = [];
      for (const user of inspectors) {
        const actor = await noticeRecipientActor(tx, user.id);
        if (actor && canReadSurveyAnomaly(actor, context))
          recipients.push(user.id);
      }
      await enqueueDomainNotice(tx, {
        key: `anomaly-created:${flag.id}`,
        targetType: "SurveyAnomalyFlag",
        targetId: flag.id,
        title: "Cảnh báo khảo sát cần xem xét",
        body: "Có chỉ số khảo sát vượt ngưỡng cấu hình. Cảnh báo không phải kết luận vi phạm.",
        userIds: recipients,
      });
      await tx.auditLog.create({
        data: {
          action: "SURVEY_ANOMALY_CREATED",
          objectType: "SurveyAnomalyFlag",
          objectId: flag.id,
          redactedSummary: {
            ruleCode,
            responseCount: result.responseCount,
            settingsRevision: settings.revision,
          },
        },
      });
      created++;
    }
  }
  return { created };
}
export async function ensureDueSurveyAnomalies(
  actor: ServerConsoleActor | null,
  input: { limit?: number } = {},
) {
  authorizeConsole(actor);
  const limit = Math.min(25, Math.max(1, input.limit ?? 10));
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const cursorRow = await tx.systemSetting.findUnique({
          where: { key: "SURVEY_ANOMALY_CURSOR" },
        }),
        cursor = typeof cursorRow?.value === "string" ? cursorRow.value : "";
      const rows = await tx.surveyCampaign.findMany({
        where: {
          ...(cursor ? { id: { gt: cursor } } : {}),
          status: { in: ["DA_TONG_HOP", "DA_CONG_BO"] },
          semester: { lockedAt: null },
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: limit,
      });
      let created = 0;
      for (const row of rows)
        created += (await ensureCampaignAnomalies(tx, row.id)).created;
      const next = rows.length === limit ? rows.at(-1)!.id : "";
      await tx.systemSetting.upsert({
        where: { key: "SURVEY_ANOMALY_CURSOR" },
        create: { key: "SURVEY_ANOMALY_CURSOR", value: next },
        update: { value: next },
      });
      return { checked: rows.length, created };
    },
    { maxWait: 15000, timeout: 120000 },
  );
}
