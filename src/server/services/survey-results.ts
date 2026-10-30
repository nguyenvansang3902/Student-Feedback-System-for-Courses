import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import type { CampaignStatus } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import {
  actorGrants,
  can,
  requireCan,
  resultSectionScopeWhere,
} from "../policies/can";
import {
  assertFreshActor,
  lockAdminMutations,
  objectId,
  pageInput,
  parseInput,
} from "./access";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  parseSurveyAggregateDetails,
  poolSurveyScores,
  type SurveyAggregateDetails,
  type SurveyScoreAnswer,
  type SurveyScoreTemplate,
} from "./survey-score";
import type {
  ResultBucket,
  ResultComparison,
  ResultLevel,
  ResultsCampaign,
  ResultsCapabilities,
  ResultsClassDetail,
  ResultsDetail,
  ResultsListInput,
  ResultsPage,
} from "./survey-results-types";

export type * from "./survey-results-types";

const published: CampaignStatus[] = ["DA_CONG_BO", "LUU_TRU"];
const aggregated: CampaignStatus[] = ["DA_TONG_HOP", ...published];
const listSchema = pageInput
  .extend({ search: z.string().trim().max(100).optional() })
  .strict();
const campaignSelect = {
  id: true,
  title: true,
  status: true,
  revision: true,
  semesterId: true,
  templateId: true,
  minResponses: true,
  minRate: true,
  semester: { select: { name: true, startsOn: true, lockedAt: true } },
  template: {
    select: {
      name: true,
      groups: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          weight: true,
          isAssessmentGroup: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              label: true,
              type: true,
              position: true,
              weight: true,
              scaleMin: true,
              scaleMax: true,
              options: {
                orderBy: { position: "asc" },
                select: { id: true, label: true, position: true },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.SurveyCampaignSelect;
const cohortSelect = {
  campaignId: true,
  sectionId: true,
  section: {
    select: {
      id: true,
      code: true,
      courseId: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
              facultyId: true,
              faculty: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  },
  result: { select: { details: true } },
} as const satisfies Prisma.CampaignSectionSelect;
type CampaignRow = Prisma.SurveyCampaignGetPayload<{
  select: typeof campaignSelect;
}>;
type CohortRow = Prisma.CampaignSectionGetPayload<{
  select: typeof cohortSelect;
}>;
interface ScoredCohort {
  row: CohortRow;
  details: SurveyAggregateDetails | null;
}

function notFound(): never {
  throw new AuthError(
    "Không tìm thấy kết quả khảo sát.",
    404,
    "SURVEY_RESULTS_NOT_FOUND",
  );
}
function privileged(actor: AuthActor): boolean {
  return actorGrants(actor).some((grant) =>
    ["CAN_BO_DBCL", "LANH_DAO"].includes(grant.role),
  );
}
export function resultsCapabilities(actor: AuthActor): ResultsCapabilities {
  return {
    standard: can(actor, "results:read"),
    assessment: can(actor, "results:assessment"),
    aggregate: can(actor, "results:aggregate"),
    publish: can(actor, "results:publish"),
    moderate: can(actor, "results:moderate"),
    incomplete: can(actor, "results:incomplete"),
    remind: can(actor, "results:remind"),
  };
}
function requireRead(actor: AuthActor): void {
  if (!can(actor, "results:read")) requireCan(actor, "results:assessment");
}
async function readTransaction<T>(
  actor: AuthActor,
  operation: (tx: Prisma.TransactionClient, fresh: AuthActor) => Promise<T>,
): Promise<T> {
  return getDb().$transaction(
    async (tx) => {
      // Tránh snapshot quyền cũ nếu đang có thay đổi phân công hoặc phiên đăng nhập.
      await lockAdminMutations(tx);
      const fresh = await assertFreshActor(tx, actor);
      requireRead(fresh);
      return operation(tx, fresh);
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
function campaignDto(
  row: CampaignRow,
  actor: AuthActor,
  capabilities = resultsCapabilities(actor),
): ResultsCampaign {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    revision: row.revision,
    semesterId: row.semesterId,
    semesterName: row.semester.name,
    templateId: row.templateId,
    templateName: row.template.name,
    semesterLocked: !!row.semester.lockedAt,
    minResponses: row.minResponses,
    minRate: Number(row.minRate),
    capabilities,
  };
}
async function scopedCapabilities(
  tx: Prisma.TransactionClient,
  actor: AuthActor,
  campaigns: CampaignRow[],
): Promise<Map<string, ResultsCapabilities>> {
  const capabilities = resultsCapabilities(actor);
  const ids = campaigns.map((campaign) => campaign.id);
  const [standardRows, incompleteRows] = await Promise.all([
    capabilities.standard
      ? tx.campaignSection.findMany({
          where: {
            campaignId: { in: ids },
            section: resultSectionScopeWhere(actor),
          },
          distinct: ["campaignId"],
          select: { campaignId: true },
        })
      : [],
    capabilities.incomplete
      ? tx.campaignSection.findMany({
          where: {
            campaignId: { in: ids },
            section: resultSectionScopeWhere(actor, "results:incomplete"),
          },
          distinct: ["campaignId"],
          select: { campaignId: true },
        })
      : [],
  ]);
  const standardIds = new Set(standardRows.map((row) => row.campaignId));
  const incompleteIds = new Set(incompleteRows.map((row) => row.campaignId));
  return new Map(
    campaigns.map((campaign) => [
      campaign.id,
      {
        ...capabilities,
        standard:
          standardIds.has(campaign.id) &&
          (published.includes(campaign.status) ||
            privileged(actor) ||
            (incompleteIds.has(campaign.id) &&
              ["DANG_MO", "DA_DONG", "DA_TONG_HOP"].includes(campaign.status))),
        assessment:
          capabilities.assessment &&
          published.includes(campaign.status) &&
          campaign.template.groups.some((group) => group.isAssessmentGroup),
        incomplete: incompleteIds.has(campaign.id),
        remind: capabilities.remind && incompleteIds.has(campaign.id),
      },
    ]),
  );
}
function standardCampaignWhere(
  actor: AuthActor,
  metadata = true,
): Prisma.SurveyCampaignWhereInput {
  const incompleteMetadata = metadata && can(actor, "results:incomplete");
  return {
    status: {
      in: incompleteMetadata
        ? ["DANG_MO", "DA_DONG", ...aggregated]
        : privileged(actor)
          ? ["DA_DONG", ...aggregated]
          : published,
    },
    sections: { some: { section: resultSectionScopeWhere(actor) } },
  };
}
function assessmentCampaignWhere(): Prisma.SurveyCampaignWhereInput {
  return {
    status: { in: published },
    template: { groups: { some: { isAssessmentGroup: true } } },
  };
}
function visibleCampaignWhere(
  actor: AuthActor,
): Prisma.SurveyCampaignWhereInput {
  const OR: Prisma.SurveyCampaignWhereInput[] = [];
  if (can(actor, "results:read")) OR.push(standardCampaignWhere(actor));
  if (can(actor, "results:assessment")) OR.push(assessmentCampaignWhere());
  return { OR };
}
function templateDto(row: CampaignRow): SurveyScoreTemplate {
  return {
    groups: row.template.groups.map((group) => ({
      ...group,
      weight: group.weight.toString(),
      questions: group.questions.map((question) => ({
        ...question,
        weight: question.weight.toString(),
      })),
    })),
  };
}

/** Không lưu lại/chỉnh sửa dữ liệu seed cũ. Kết quả cũ chỉ được tính tạm trong lần đọc. */
async function scoredCohorts(
  tx: Prisma.TransactionClient,
  campaign: CampaignRow,
  rows: CohortRow[],
): Promise<ScoredCohort[]> {
  const template = templateDto(campaign);
  return Promise.all(
    rows.map(async (row): Promise<ScoredCohort> => {
      if (!row.result || !aggregated.includes(campaign.status))
        return { row, details: null };
      const stored = parseSurveyAggregateDetails(row.result.details);
      if (stored?.templateId === campaign.templateId)
        return { row, details: stored };
      // JSON phiên bản mới hỏng không được lặng lẽ thay bằng dữ liệu khác.
      if (
        row.result.details &&
        typeof row.result.details === "object" &&
        !Array.isArray(row.result.details) &&
        "version" in row.result.details &&
        row.result.details.version === 2
      )
        throw new AuthError(
          "Dữ liệu tổng hợp cần được kiểm tra lại.",
          503,
          "INVALID_SURVEY_AGGREGATE",
        );
      const where = { campaignId: row.campaignId, sectionId: row.sectionId };
      const [responses, taskCount, doneTaskCount] = await Promise.all([
        tx.surveyResponse.findMany({
          where,
          select: {
            answers: {
              select: {
                questionId: true,
                isNotApplicable: true,
                valueNumber: true,
                valueOptionIds: true,
                valueBoolean: true,
                valueText: true,
              },
            },
          },
        }),
        tx.surveyTask.count({ where }),
        tx.surveyTask.count({ where: { ...where, status: "DONE" } }),
      ]);
      const answers: SurveyScoreAnswer[] = responses.flatMap((response) =>
        response.answers.map((answer) => ({
          questionId: answer.questionId,
          isNotApplicable: answer.isNotApplicable,
          valueNumber: answer.valueNumber?.toString() ?? null,
          valueBoolean: answer.valueBoolean,
          valueOptionIds: Array.isArray(answer.valueOptionIds)
            ? (answer.valueOptionIds as string[])
            : null,
          hasText: !!answer.valueText?.trim(),
        })),
      );
      const score = calculateSurveyScore(template, answers, {
        responseCount: responses.length,
        taskCount,
        doneTaskCount,
        minResponses: campaign.minResponses,
        minRate: campaign.minRate.toString(),
      });
      return {
        row,
        details: {
          version: 2,
          templateId: campaign.templateId,
          template,
          teacherIds: [],
          bands: [...DEFAULT_SURVEY_RATING_BANDS],
          score,
        },
      };
    }),
  );
}
function emptyBucket(
  meta: Pick<ResultBucket, "id" | "code" | "name" | "level">,
  message: string,
): ResultBucket {
  return {
    ...meta,
    available: false,
    message,
    responseCount: null,
    taskCount: null,
    participationRate: null,
    overallScore: null,
    rating: null,
    groups: [],
  };
}
function makeBucket(
  meta: Pick<ResultBucket, "id" | "code" | "name" | "level">,
  details: SurveyAggregateDetails[],
  campaign: CampaignRow,
  assessmentOnly: boolean,
  showInsufficientCounts = false,
): ResultBucket {
  if (!aggregated.includes(campaign.status))
    return emptyBucket(meta, "Chưa tổng hợp kết quả");
  if (!details.length) return emptyBucket(meta, "Chưa có dữ liệu tổng hợp");
  const score = poolSurveyScores(
    details,
    {
      minResponses: campaign.minResponses,
      minRate: campaign.minRate.toString(),
    },
    assessmentOnly,
  );
  if (!score) return emptyBucket(meta, "Không có dữ liệu tương thích");
  const teachers = new Set(
    details
      .filter((value) => value.score.responseCount > 0)
      .flatMap((value) => value.teacherIds),
  );
  const available =
    score.eligibleToPublish && (!assessmentOnly || teachers.size >= 2);
  const counts =
    available || showInsufficientCounts
      ? {
          responseCount: score.responseCount,
          taskCount: score.taskCount,
          participationRate: score.participationRate,
        }
      : { responseCount: null, taskCount: null, participationRate: null };
  return {
    ...meta,
    ...counts,
    available,
    message: available
      ? null
      : assessmentOnly
        ? "Chưa đủ dữ liệu gộp"
        : "Chưa đủ mẫu để công bố",
    overallScore: available ? score.overallScore : null,
    rating: available ? score.rating : null,
    // Khảo thí nhận điểm nhóm; không nhận câu tự luận hoặc chi tiết trả lời.
    groups: available
      ? score.groups.map((group) =>
          assessmentOnly ? { ...group, questions: [] } : group,
        )
      : [],
  };
}
function groupedBuckets(
  values: ScoredCohort[],
  campaign: CampaignRow,
  assessmentOnly: boolean,
  showCounts: boolean,
): ResultBucket[] {
  const groups = new Map<
    string,
    {
      meta: Pick<ResultBucket, "id" | "code" | "name" | "level">;
      details: SurveyAggregateDetails[];
    }
  >();
  for (const { row, details } of values) {
    const course = row.section.course,
      department = course.department,
      faculty = department.faculty;
    for (const [level, organization] of [
      ["COURSE", course],
      ["DEPARTMENT", department],
      ["FACULTY", faculty],
    ] as const) {
      if (!assessmentOnly && level === "COURSE") continue;
      const key = `${level}:${organization.id}`;
      if (!groups.has(key))
        groups.set(key, {
          meta: {
            level,
            id: organization.id,
            code: organization.code,
            name: organization.name,
          },
          details: [],
        });
      if (details) groups.get(key)!.details.push(details);
    }
  }
  return [...groups.values()].map(({ meta, details }) =>
    makeBucket(meta, details, campaign, assessmentOnly, showCounts),
  );
}
async function pendingModerationCount(
  tx: Prisma.TransactionClient,
  campaign: CampaignRow,
): Promise<number> {
  const ids = campaign.template.groups.flatMap((group) =>
    group.questions
      .filter((question) => question.type === "TEXT")
      .map((question) => question.id),
  );
  const rows = ids.length
    ? await tx.surveyAnswer.findMany({
        where: {
          questionId: { in: ids },
          isNotApplicable: false,
          valueText: { not: null },
          moderationStatus: "CHO_KIEM_DUYET",
          response: { campaignId: campaign.id },
        },
        select: { valueText: true },
      })
    : [];
  return rows.filter((row) => !!row.valueText?.trim()).length;
}

export async function listSurveyResults(
  actor: AuthActor,
  input: ResultsListInput = {},
): Promise<ResultsPage<ResultsCampaign>> {
  requireRead(actor);
  const { page, pageSize, search } = parseInput(listSchema, input);
  return readTransaction(actor, async (tx, fresh) => {
    const where: Prisma.SurveyCampaignWhereInput = {
      ...visibleCampaignWhere(fresh),
      ...(search ? { title: { contains: search } } : {}),
    };
    const [rows, total] = await Promise.all([
      tx.surveyCampaign.findMany({
        where,
        select: campaignSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.surveyCampaign.count({ where }),
    ]);
    const capabilities = await scopedCapabilities(tx, fresh, rows);
    return {
      items: rows.map((row) =>
        campaignDto(row, fresh, capabilities.get(row.id)),
      ),
      total,
      page,
      pageSize,
    };
  });
}

export async function getSurveyResults(
  actor: AuthActor,
  campaignId: string,
  audience?: "STANDARD" | "ASSESSMENT",
): Promise<ResultsDetail> {
  requireRead(actor);
  const id = parseInput(objectId, campaignId);
  if (audience !== undefined)
    parseInput(z.enum(["STANDARD", "ASSESSMENT"]), audience);
  return readTransaction(actor, async (tx, fresh) => {
    if (audience)
      requireCan(
        fresh,
        audience === "ASSESSMENT" ? "results:assessment" : "results:read",
      );
    const where =
      audience === undefined
        ? visibleCampaignWhere(fresh)
        : audience === "ASSESSMENT"
          ? assessmentCampaignWhere()
          : standardCampaignWhere(fresh);
    const campaign = await tx.surveyCampaign.findFirst({
      where: { id, ...where },
      select: campaignSelect,
    });
    if (!campaign) notFound();
    const capabilities = (await scopedCapabilities(tx, fresh, [campaign])).get(
      campaign.id,
    )!;
    const selected =
      audience ?? (capabilities.standard ? "STANDARD" : "ASSESSMENT");
    if (
      !(selected === "STANDARD"
        ? capabilities.standard
        : capabilities.assessment)
    )
      notFound();
    const rows = await tx.campaignSection.findMany({
      where: {
        campaignId: id,
        ...(selected === "STANDARD"
          ? { section: resultSectionScopeWhere(fresh) }
          : {}),
      },
      select: cohortSelect,
      orderBy: { section: { code: "asc" } },
    });
    const resultReadable =
      aggregated.includes(campaign.status) &&
      (privileged(fresh) || published.includes(campaign.status));
    const scored =
      resultReadable || privileged(fresh)
        ? await scoredCohorts(tx, campaign, rows)
        : [];
    const showCounts = selected === "STANDARD" && privileged(fresh);
    const classBuckets =
      selected === "ASSESSMENT"
        ? []
        : scored.map(({ row, details }) =>
            makeBucket(
              {
                id: row.sectionId,
                level: "CLASS",
                code: row.section.code,
                name: row.section.course.name,
              },
              details ? [details] : [],
              campaign,
              false,
              showCounts,
            ),
          );
    return {
      campaign: campaignDto(campaign, fresh, capabilities),
      audience: selected,
      buckets: [
        ...classBuckets,
        ...groupedBuckets(
          scored,
          campaign,
          selected === "ASSESSMENT",
          showCounts,
        ),
      ],
      pendingModeration:
        selected === "STANDARD" && can(fresh, "results:moderate")
          ? await pendingModerationCount(tx, campaign)
          : null,
    };
  });
}

function shuffle<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}
async function comparison(
  tx: Prisma.TransactionClient,
  campaign: CampaignRow,
  sectionWhere: Prisma.CourseSectionWhereInput,
  level: Exclude<ResultLevel, "CLASS">,
  id: string,
  code: string,
  name: string,
  statuses: CampaignStatus[],
  semesterId = campaign.semesterId,
): Promise<ResultBucket | null> {
  const campaigns = await tx.surveyCampaign.findMany({
    where: {
      semesterId,
      templateId: campaign.templateId,
      status: { in: statuses },
      sections: { some: { section: sectionWhere } },
    },
    select: campaignSelect,
    orderBy: { id: "asc" },
  });
  if (!campaigns.length) return null;
  const rows = await tx.campaignSection.findMany({
    where: {
      campaignId: { in: campaigns.map((value) => value.id) },
      section: sectionWhere,
    },
    select: cohortSelect,
  });
  const details: SurveyAggregateDetails[] = [];
  for (const candidate of campaigns) {
    const scored = await scoredCohorts(
      tx,
      candidate,
      rows.filter((row) => row.campaignId === candidate.id),
    );
    details.push(
      ...scored.flatMap((value) => (value.details ? [value.details] : [])),
    );
  }
  if (!details.length) return null;
  const bucket = makeBucket(
    { id, level, code, name },
    details,
    campaign,
    false,
  );
  const bandSignature = (value: SurveyAggregateDetails) =>
    JSON.stringify(
      value.bands.map((band) => ({
        minScore: Number(band.minScore),
        label: band.label,
      })),
    );
  // Điểm cùng mẫu vẫn gộp được khi cấu hình xếp mức thay đổi. Không chọn một
  // cấu hình ngẫu nhiên theo UUID đợt để gán mức cho dữ liệu nhiều cấu hình.
  if (
    details.some((value) => bandSignature(value) !== bandSignature(details[0]))
  )
    bucket.rating = null;
  return bucket;
}

export async function getSurveyClassResults(
  actor: AuthActor,
  campaignId: string,
  sectionId: string,
): Promise<ResultsClassDetail> {
  requireCan(actor, "results:read");
  const id = parseInput(objectId, campaignId),
    section = parseInput(objectId, sectionId);
  return readTransaction(actor, async (tx, fresh) => {
    requireCan(fresh, "results:read");
    const campaign = await tx.surveyCampaign.findFirst({
      where: { id, ...standardCampaignWhere(fresh, false) },
      select: campaignSelect,
    });
    if (!campaign) notFound();
    const row = await tx.campaignSection.findFirst({
      where: {
        campaignId: id,
        sectionId: section,
        section: resultSectionScopeWhere(fresh),
      },
      select: cohortSelect,
    });
    if (!row) notFound();
    const [{ details }] = await scoredCohorts(tx, campaign, [row]);
    const result = makeBucket(
      {
        id: section,
        level: "CLASS",
        code: row.section.code,
        name: row.section.course.name,
      },
      details ? [details] : [],
      campaign,
      false,
      privileged(fresh),
    );
    const comments: ResultsClassDetail["comments"] = [];
    if (result.available) {
      const questionLabels = new Map(
        campaign.template.groups.flatMap((group) =>
          group.questions
            .filter((question) => question.type === "TEXT")
            .map((question) => [question.id, question.label] as const),
        ),
      );
      if (questionLabels.size) {
        const answers = await tx.surveyAnswer.findMany({
          where: {
            response: { campaignId: id, sectionId: section },
            questionId: { in: [...questionLabels.keys()] },
            isNotApplicable: false,
            moderationStatus: "HIEN_THI",
            valueText: { not: null },
          },
          select: { questionId: true, valueText: true },
        });
        for (const answer of answers)
          if (answer.valueText?.trim())
            comments.push({
              questionLabel: questionLabels.get(answer.questionId)!,
              text: answer.valueText,
            });
      }
    }
    const course = row.section.course,
      department = course.department,
      faculty = department.faculty;
    const comparisons: ResultComparison[] = [];
    for (const [label, level, organization, filter] of [
      [
        "Bộ môn",
        "DEPARTMENT",
        department,
        { course: { departmentId: department.id } },
      ],
      [
        "Khoa",
        "FACULTY",
        faculty,
        { course: { department: { facultyId: faculty.id } } },
      ],
    ] as const) {
      const value = await comparison(
        tx,
        campaign,
        filter,
        level,
        organization.id,
        organization.code,
        organization.name,
        privileged(fresh) ? aggregated : published,
      );
      comparisons.push({
        label,
        result: value,
        message: value ? null : "Không có dữ liệu tương thích",
      });
    }
    const priorSemester = await tx.semester.findFirst({
      where: { startsOn: { lt: campaign.semester.startsOn } },
      orderBy: [{ startsOn: "desc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
    const prior = priorSemester
      ? await comparison(
          tx,
          campaign,
          { courseId: course.id },
          "COURSE",
          course.id,
          course.code,
          course.name,
          published,
          priorSemester.id,
        )
      : null;
    comparisons.push({
      label: priorSemester
        ? `Học kỳ trước: ${priorSemester.name}`
        : "Học kỳ trước",
      result: prior,
      message: prior ? null : "Không có dữ liệu tương thích",
    });
    return {
      campaign: campaignDto(
        campaign,
        fresh,
        (await scopedCapabilities(tx, fresh, [campaign])).get(campaign.id),
      ),
      result,
      comments: shuffle(comments),
      comparisons,
    };
  });
}
