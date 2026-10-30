import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan } from "../policies/can";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  parseInput,
} from "./access";
import {
  calculateSurveyScore,
  parseSurveyAggregateDetails,
  type SurveyAggregateDetails,
  type SurveyScoreTemplate,
} from "./survey-score";
import { readSurveyResultSettings } from "./survey-results-settings";
import type {
  ResultsMutationInput,
  ResultsMutationResult,
} from "./survey-results-types";

export const resultsMutationSchema = z
  .object({
    expectedRevision: z.number().int().min(1).max(2_147_483_646),
    requestId: z.uuid(),
  })
  .strict();

function conflict(): never {
  throw new AuthError(
    "Đợt khảo sát đã thay đổi. Hãy tải lại trước khi tiếp tục.",
    409,
    "RESULT_REVISION_CONFLICT",
  );
}
function invalidState(): never {
  throw new AuthError(
    "Thao tác không phù hợp với trạng thái của đợt khảo sát.",
    409,
    "RESULT_INVALID_STATE",
  );
}
function invalidAggregate(): never {
  throw new AuthError(
    "Dữ liệu tổng hợp chưa nhất quán. Cần kiểm tra lại trước khi công bố.",
    409,
    "INVALID_AGGREGATE",
  );
}

async function mutateResults(
  actor: AuthActor,
  campaignId: string,
  input: ResultsMutationInput,
  action: "AGGREGATE" | "PUBLISH",
): Promise<ResultsMutationResult> {
  const permission =
    action === "AGGREGATE" ? "results:aggregate" : "results:publish";
  requireCan(actor, permission);
  const key = parseInput(objectId, campaignId),
    parsed = parseInput(resultsMutationSchema, input);
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ action, ...parsed }))
    .digest("hex");
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireCan(fresh, permission);
      const campaign = await tx.surveyCampaign.findUnique({
        where: { id: key },
        include: { semester: { select: { lockedAt: true } } },
      });
      if (!campaign)
        throw new AuthError(
          "Không tìm thấy đợt khảo sát.",
          404,
          "CAMPAIGN_NOT_FOUND",
        );
      const previous = await tx.campaignHistory.findUnique({
        where: {
          campaignId_requestId: {
            campaignId: key,
            requestId: parsed.requestId,
          },
        },
      });
      if (previous) {
        if (
          previous.actorId !== fresh.userId ||
          previous.action !== `RESULTS_${action}` ||
          previous.requestHash !== requestHash
        )
          throw new AuthError(
            "Mã yêu cầu đã được sử dụng. Hãy tải lại trang.",
            409,
            "RESULT_REQUEST_CONFLICT",
          );
        return {
          campaignId: key,
          status: campaign.status,
          revision: campaign.revision,
          resultCount: await tx.aggregateResult.count({
            where: { campaignId: key },
          }),
          replayed: true,
        };
      }
      if (campaign.semester.lockedAt)
        throw new AuthError(
          "Học kỳ đã khóa sổ. Dữ liệu chỉ được đọc.",
          409,
          "SEMESTER_LOCKED",
        );
      if (campaign.revision !== parsed.expectedRevision) conflict();
      if (
        campaign.status !== (action === "AGGREGATE" ? "DA_DONG" : "DA_TONG_HOP")
      )
        invalidState();
      const sections = await tx.campaignSection.findMany({
        where: { campaignId: key },
        orderBy: { sectionId: "asc" },
        select: {
          sectionId: true,
          section: { select: { teaching: { select: { teacherId: true } } } },
        },
      });
      if (!sections.length) invalidAggregate();
      if (action === "AGGREGATE") {
        // Không ghi đè bản tổng hợp đã có: một lần tổng hợp, retry dùng lịch sử requestId.
        if (await tx.aggregateResult.count({ where: { campaignId: key } }))
          invalidAggregate();
        const templateRow = await tx.surveyTemplate.findUnique({
          where: { id: campaign.templateId },
          include: {
            groups: {
              orderBy: { position: "asc" },
              include: {
                questions: {
                  orderBy: { position: "asc" },
                  include: { options: { orderBy: { position: "asc" } } },
                },
              },
            },
          },
        });
        if (!templateRow) invalidAggregate();
        const template: SurveyScoreTemplate = {
          groups: templateRow.groups.map((group) => ({
            id: group.id,
            title: group.title,
            position: group.position,
            weight: String(group.weight),
            isAssessmentGroup: group.isAssessmentGroup,
            questions: group.questions.map((question) => ({
              id: question.id,
              label: question.label,
              type: question.type,
              position: question.position,
              weight: String(question.weight),
              scaleMin: question.scaleMin,
              scaleMax: question.scaleMax,
              options: question.options.map(({ id, label, position }) => ({
                id,
                label,
                position,
              })),
            })),
          })),
        };
        const settings = await readSurveyResultSettings(tx),
          now = new Date();
        for (const section of sections) {
          const where = { campaignId: key, sectionId: section.sectionId };
          const [responseCount, taskCount, doneTaskCount, answers] =
            await Promise.all([
              tx.surveyResponse.count({ where }),
              tx.surveyTask.count({ where }),
              tx.surveyTask.count({ where: { ...where, status: "DONE" } }),
              tx.surveyAnswer.findMany({
                where: { response: where },
                select: {
                  questionId: true,
                  isNotApplicable: true,
                  valueNumber: true,
                  valueOptionIds: true,
                  valueBoolean: true,
                  valueText: true,
                },
              }),
            ]);
          let score;
          try {
            score = calculateSurveyScore(
              template,
              answers.map((answer) => ({
                questionId: answer.questionId,
                isNotApplicable: answer.isNotApplicable,
                valueNumber:
                  answer.valueNumber === null
                    ? null
                    : String(answer.valueNumber),
                valueBoolean: answer.valueBoolean,
                valueOptionIds:
                  answer.valueOptionIds === null
                    ? null
                    : (answer.valueOptionIds as string[]),
                hasText: !!answer.valueText?.trim(),
              })),
              {
                responseCount,
                taskCount,
                doneTaskCount,
                minResponses: campaign.minResponses,
                minRate: String(campaign.minRate),
              },
              settings.ratingBands,
            );
          } catch {
            invalidAggregate();
          }
          const details: SurveyAggregateDetails = {
            version: 2,
            templateId: campaign.templateId,
            template,
            teacherIds: [
              ...new Set(
                section.section.teaching.map(
                  (assignment) => assignment.teacherId,
                ),
              ),
            ].sort(),
            bands: settings.ratingBands,
            score,
          };
          await tx.aggregateResult.create({
            data: {
              campaignId: key,
              sectionId: section.sectionId,
              responseCount,
              taskCount,
              participationRate: score.participationRate,
              overallScore: score.overallScore,
              eligibleToPublish: score.eligibleToPublish,
              details: details as unknown as Prisma.InputJsonValue,
              aggregatedAt: now,
            },
          });
        }
      } else {
        const aggregates = await tx.aggregateResult.findMany({
          where: { campaignId: key },
          select: { sectionId: true, details: true },
        });
        if (
          aggregates.length !== sections.length ||
          sections.some(
            (section) =>
              !aggregates.some(
                (result) => result.sectionId === section.sectionId,
              ),
          )
        )
          invalidAggregate();
        for (const aggregate of aggregates) {
          const details = parseSurveyAggregateDetails(aggregate.details);
          if (!details || details.templateId !== campaign.templateId)
            invalidAggregate();
        }
        const textQuestions = await tx.question.findMany({
          where: { type: "TEXT", group: { templateId: campaign.templateId } },
          select: { id: true },
        });
        if (textQuestions.length) {
          const pending = await tx.surveyAnswer.findMany({
            where: {
              response: { campaignId: key },
              questionId: { in: textQuestions.map((question) => question.id) },
              isNotApplicable: false,
              moderationStatus: "CHO_KIEM_DUYET",
              valueText: { not: null },
            },
            select: { valueText: true },
          });
          if (pending.some((answer) => !!answer.valueText?.trim()))
            throw new AuthError(
              "Cần kiểm duyệt hết góp ý tự luận trước khi công bố.",
              409,
              "PENDING_MODERATION",
            );
        }
      }
      const target = action === "AGGREGATE" ? "DA_TONG_HOP" : "DA_CONG_BO";
      const changed = await tx.surveyCampaign.updateMany({
        where: {
          id: key,
          revision: parsed.expectedRevision,
          status: campaign.status,
        },
        data: { status: target, revision: { increment: 1 } },
      });
      if (changed.count !== 1) conflict();
      await tx.campaignHistory.create({
        data: {
          campaignId: key,
          actorId: fresh.userId,
          fromStatus: campaign.status,
          toStatus: target,
          action: `RESULTS_${action}`,
          requestId: parsed.requestId,
          requestHash,
          campaignRevision: campaign.revision + 1,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: fresh.userId,
          action: `SURVEY_RESULTS_${action}`,
          objectType: "SurveyCampaign",
          objectId: key,
          redactedSummary: {
            revision: campaign.revision + 1,
            status: target,
            sectionCount: sections.length,
            success: true,
          },
        },
      });
      return {
        campaignId: key,
        status: target,
        revision: campaign.revision + 1,
        resultCount: sections.length,
        replayed: false,
      };
    },
    { maxWait: 15000, timeout: 120000 },
  );
}

export async function aggregateSurveyResults(
  actor: AuthActor,
  campaignId: string,
  input: ResultsMutationInput,
): Promise<ResultsMutationResult> {
  return mutateResults(actor, campaignId, input, "AGGREGATE");
}
export async function publishSurveyResults(
  actor: AuthActor,
  campaignId: string,
  input: ResultsMutationInput,
): Promise<ResultsMutationResult> {
  return mutateResults(actor, campaignId, input, "PUBLISH");
}
