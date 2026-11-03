import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { demoId } from "./demo-seed";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyScoreTemplate,
} from "./survey-score";
import { ensureCampaignAnomalies } from "./survey-anomaly-detection";

export const WEEK12_DEMO_MARKER = "W12_DEMO_ANOMALY_V1";
/** Bundle mới, không sửa phiếu, trạng thái hay lựa chọn mặc định của seed cũ. */
export async function seedWeek12AnomalyData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
) {
  authorizeConsole(actor);
  if (process.env.NODE_ENV === "production")
    throw Error("Dữ liệu demo không dùng trong production.");
  if (await tx.systemSetting.findUnique({ where: { key: WEEK12_DEMO_MARKER } }))
    return { created: false, campaigns: 1, responses: 10, anomalies: 1 };
  const campaignId = demoId("week12:campaign"),
    sectionId = demoId("week12:section"),
    templateId = demoId("week12:template"),
    groupId = demoId("week12:group"),
    teacherId = demoId("GV:0"),
    semesterId = demoId("semester:2026-1"),
    qualityId = demoId("DBCL2026001");
  if (
    (await tx.surveyCampaign.findUnique({ where: { id: campaignId } })) ||
    (await tx.courseSection.findUnique({ where: { id: sectionId } })) ||
    (await tx.surveyTemplate.findUnique({ where: { id: templateId } }))
  )
    throw Error(
      "Bundle Tuần12 trùng mã khi chưa có marker; giữ nguyên dữ liệu.",
    );
  const semester = await tx.semester.findUniqueOrThrow({
    where: { id: semesterId },
  });
  if (semester.lockedAt)
    throw Error("Học kỳ demo đã khóa, không bổ sung dữ liệu.");
  const students = Array.from({ length: 10 }, (_, index) =>
    demoId(`SV:${index}`),
  );
  if (
    (await tx.user.count({
      where: {
        id: { in: [...students, teacherId, qualityId] },
        status: "ACTIVE",
      },
    })) !== 12
  )
    throw Error("Thiếu tài khoản demo tiền đề đang hoạt động.");
  const now = new Date(),
    today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");
  const questions = [
    {
      id: demoId("week12:question:1"),
      label: "Nội dung kiểm tra phù hợp học phần",
      position: 1,
    },
    {
      id: demoId("week12:question:2"),
      label: "Tiêu chí đánh giá được thông báo rõ",
      position: 2,
    },
  ];
  await tx.surveyTemplate.create({
    data: {
      id: templateId,
      familyId: demoId("week12:family"),
      version: 1,
      name: "DEMO — Mẫu chỉ số khảo sát Tuần12",
      status: "DA_KHOA",
      lockedAt: now,
      createdById: qualityId,
      groups: {
        create: {
          id: groupId,
          title: "Kiểm tra, đánh giá",
          position: 1,
          weight: 1,
          isAssessmentGroup: true,
          questions: {
            create: questions.map((question) => ({
              ...question,
              type: "LIKERT" as const,
              required: true,
              allowNA: false,
              weight: 1,
              scaleMin: 1,
              scaleMax: 5,
            })),
          },
        },
      },
    },
  });
  await tx.courseSection.create({
    data: {
      id: sectionId,
      code: "DEMO-W12-LHP01",
      courseId: demoId("course:0"),
      semesterId,
      teaching: { create: { teacherId, isLead: true } },
      enrollments: {
        create: students.map((studentId) => ({
          studentId,
          registeredAt: new Date(now.getTime() - 5 * 86400000),
        })),
      },
    },
  });
  await tx.surveyCampaign.create({
    data: {
      id: campaignId,
      title: "DEMO — Đợt có cảnh báo khảo sát",
      semesterId,
      templateId,
      scope: "SECTIONS",
      status: "DA_TONG_HOP",
      revision: 7,
      minResponses: 10,
      minRate: 0.3,
      createdById: qualityId,
      approvedById: demoId("LD2026001"),
      approvedAt: new Date(now.getTime() - 3 * 86400000),
      startsAt: new Date(now.getTime() - 2 * 86400000),
      endsAt: new Date(now.getTime() - 60000),
    },
  });
  await tx.campaignSection.create({ data: { campaignId, sectionId } });
  await tx.surveyTask.createMany({
    data: students.map((studentId) => ({
      id: randomUUID(),
      campaignId,
      sectionId,
      studentId,
      status: "DONE",
      doneDate: today,
    })),
  });
  const responses = Array.from({ length: 10 }, () => ({
    id: randomUUID(),
    campaignId,
    sectionId,
    submittedDate: today,
  }));
  await tx.surveyResponse.createMany({ data: responses });
  const answers = responses.flatMap((response, index) =>
    questions.map((question, q) => ({
      id: randomUUID(),
      responseId: response.id,
      questionId: question.id,
      valueNumber: index < 7 || q === 0 ? 2 : 4,
    })),
  );
  await tx.surveyAnswer.createMany({ data: answers });
  const template: SurveyScoreTemplate = {
    groups: [
      {
        id: groupId,
        title: "Kiểm tra, đánh giá",
        position: 1,
        weight: 1,
        isAssessmentGroup: true,
        questions: questions.map((question) => ({
          ...question,
          type: "LIKERT",
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        })),
      },
    ],
  };
  const score = calculateSurveyScore(
    template,
    answers.map((answer) => ({
      questionId: answer.questionId,
      valueNumber: answer.valueNumber,
    })),
    {
      responseCount: 10,
      taskCount: 10,
      doneTaskCount: 10,
      minResponses: 10,
      minRate: 0.3,
    },
    DEFAULT_SURVEY_RATING_BANDS,
  );
  await tx.aggregateResult.create({
    data: {
      id: demoId("week12:aggregate"),
      campaignId,
      sectionId,
      responseCount: 10,
      taskCount: 10,
      participationRate: score.participationRate,
      overallScore: score.overallScore,
      eligibleToPublish: score.eligibleToPublish,
      aggregatedAt: now,
      details: JSON.parse(
        JSON.stringify({
          version: 2,
          templateId,
          template,
          teacherIds: [teacherId],
          bands: DEFAULT_SURVEY_RATING_BANDS,
          score,
        }),
      ),
    },
  });
  await tx.campaignHistory.create({
    data: {
      campaignId,
      actorId: qualityId,
      fromStatus: "DA_DONG",
      toStatus: "DA_TONG_HOP",
      action: "RESULTS_AGGREGATE",
      campaignRevision: 7,
      occurredAt: now,
    },
  });
  const anomalies = await ensureCampaignAnomalies(tx, campaignId);
  await tx.systemSetting.create({
    data: {
      key: WEEK12_DEMO_MARKER,
      value: {
        version: 1,
        campaigns: 1,
        responses: 10,
        anomalies: anomalies.created,
        onlyFakeData: true,
      },
    },
  });
  await tx.auditLog.create({
    data: {
      action: "WEEK12_DEMO_SEEDED",
      objectType: "System",
      redactedSummary: {
        onlyFakeData: true,
        campaigns: 1,
        responses: 10,
        anomalies: anomalies.created,
      },
    },
  });
  return {
    created: true,
    campaigns: 1,
    responses: 10,
    anomalies: anomalies.created,
  };
}
