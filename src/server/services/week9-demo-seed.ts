import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyAggregateDetails,
  type SurveyScoreTemplate,
} from "./survey-score";

export const WEEK9_DEMO_MARKER = "W9_DEMO_RESULTS_V1";
export interface Week9DemoContext {
  id: (key: string) => string;
  departmentId: string;
  teacherIds: readonly string[];
  studentIds: readonly string[];
  createdById: string;
  approvedById: string;
}
/** Bundle giả riêng; không sửa mẫu khóa, phiếu, đáp án hoặc kết quả đã tồn tại. */
export async function seedWeek9ResultsData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
  context: Week9DemoContext,
) {
  authorizeConsole(actor);
  if (
    process.env.NODE_ENV === "production" ||
    context.teacherIds.length < 2 ||
    context.studentIds.length < 10
  )
    throw new Error(
      "Demo kết quả cần hai giảng viên và mười sinh viên giả ở môi trường cục bộ.",
    );
  const id = (key: string) => context.id(`week9:${key}`);
  if (await tx.systemSetting.findUnique({ where: { key: WEEK9_DEMO_MARKER } }))
    return { created: false, campaigns: 2, sections: 4, responses: 18 };
  const semesterIds = [id("semester:current"), id("semester:prior")],
    campaignIds = [id("campaign:current"), id("campaign:prior")],
    sectionIds = Array.from({ length: 4 }, (_, index) =>
      id(`section:${index}`),
    ),
    templateId = id("template"),
    courseId = id("course");
  const collisions = await Promise.all([
    tx.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
    tx.courseSection.count({ where: { id: { in: sectionIds } } }),
    tx.surveyTemplate.count({ where: { id: templateId } }),
    tx.course.count({
      where: { OR: [{ id: courseId }, { code: "W9-MH001" }] },
    }),
    tx.semester.count({
      where: {
        OR: [
          { id: { in: semesterIds } },
          { code: { in: ["W9-HK-HIEN-TAI", "W9-HK-TRUOC"] } },
        ],
      },
    }),
  ]);
  if (collisions.some(Boolean))
    throw new Error(
      "Bundle Tuần 9 có mã trùng nhưng chưa có marker; giữ nguyên dữ liệu, không ghi đè.",
    );
  const template: SurveyScoreTemplate = {
    groups: [
      {
        id: id("group:teaching"),
        title: "Giảng dạy",
        position: 1,
        weight: 2,
        isAssessmentGroup: false,
        questions: [
          {
            id: id("question:teaching"),
            label: "Nội dung được trình bày rõ ràng",
            type: "LIKERT",
            position: 1,
            weight: 1,
            scaleMin: 1,
            scaleMax: 5,
            options: [],
          },
          {
            id: id("question:text"),
            label: "Góp ý về môn học",
            type: "TEXT",
            position: 2,
            weight: 1,
            scaleMin: null,
            scaleMax: null,
            options: [],
          },
        ],
      },
      {
        id: id("group:assessment"),
        title: "Kiểm tra, đánh giá",
        position: 2,
        weight: 1,
        isAssessmentGroup: true,
        questions: [
          {
            id: id("question:assessment"),
            label: "Tiêu chí đánh giá được thông báo rõ",
            type: "LIKERT",
            position: 1,
            weight: 1,
            scaleMin: 1,
            scaleMax: 5,
            options: [],
          },
        ],
      },
    ],
  };
  await tx.surveyTemplate.create({
    data: {
      id: templateId,
      familyId: id("template-family"),
      name: "Khảo sát môn học — dữ liệu kết quả giả",
      version: 1,
      status: "DA_KHOA",
      lockedAt: new Date(),
      createdById: context.createdById,
      groups: {
        create: template.groups.map((group) => ({
          id: group.id,
          title: group.title,
          position: group.position,
          weight: Number(group.weight),
          isAssessmentGroup: group.isAssessmentGroup,
          questions: {
            create: group.questions.map((q) => ({
              id: q.id,
              label: q.label,
              type: q.type,
              position: q.position,
              weight: Number(q.weight),
              required: q.type === "LIKERT",
              allowNA: true,
              scaleMin: q.scaleMin,
              scaleMax: q.scaleMax,
            })),
          },
        })),
      },
    },
  });
  await tx.course.create({
    data: {
      id: courseId,
      code: "W9-MH001",
      name: "Phương pháp học tập (giả lập)",
      credits: 3,
      departmentId: context.departmentId,
    },
  });
  await tx.semester.createMany({
    data: [
      {
        id: semesterIds[0],
        code: "W9-HK-HIEN-TAI",
        name: "Học kỳ kết quả minh họa",
        startsOn: new Date("2026-09-30"),
        endsOn: new Date("2027-01-15"),
      },
      {
        id: semesterIds[1],
        code: "W9-HK-TRUOC",
        name: "Học kỳ trước để đối chiếu",
        startsOn: new Date("2026-02-01"),
        endsOn: new Date("2026-06-30"),
      },
    ],
  });
  await tx.courseSection.createMany({
    data: sectionIds.map((sectionId, index) => ({
      id: sectionId,
      courseId,
      semesterId: semesterIds[index === 3 ? 1 : 0],
      code: ["W9-LHP01", "W9-LHP02", "W9-IT-MAU", "W9-KY-TRUOC"][index],
    })),
  });
  await tx.teachingAssignment.createMany({
    data: sectionIds.map((sectionId, index) => ({
      sectionId,
      teacherId: context.teacherIds[index % 2],
    })),
  });
  await tx.enrollment.createMany({
    data: sectionIds.flatMap((sectionId, index) =>
      context.studentIds
        .slice(0, 10)
        .map((studentId, si) => ({
          id: id(`enrollment:${index}:${si}`),
          sectionId,
          studentId,
        })),
    ),
  });
  for (let ci = 0; ci < 2; ci++) {
    const campaignId = campaignIds[ci],
      year = 2026,
      today = new Date(`2026-${ci ? "05" : "10"}-15T00:00:00Z`);
    await tx.surveyCampaign.create({
      data: {
        id: campaignId,
        title: ci
          ? "Kết quả học kỳ trước (giả lập)"
          : "Kết quả khảo sát môn học (giả lập Tuần 9)",
        semesterId: semesterIds[ci],
        templateId,
        scope: "SECTIONS",
        status: "DA_CONG_BO",
        revision: 8,
        minResponses: 5,
        minRate: 0.3,
        createdById: context.createdById,
        approvedById: context.approvedById,
        approvedAt: new Date(`${year}-${ci ? "05" : "10"}-01T00:00:00Z`),
        startsAt: new Date(`${year}-${ci ? "05" : "10"}-02T00:00:00Z`),
        endsAt: new Date(`${year}-${ci ? "05" : "10"}-20T00:00:00Z`),
      },
    });
    const indexes = ci ? [3] : [0, 1, 2];
    for (const index of indexes) {
      const sectionId = sectionIds[index],
        responseCount = index === 2 ? 3 : 5,
        teacherId = context.teacherIds[index % 2];
      await tx.campaignSection.create({ data: { campaignId, sectionId } });
      await tx.surveyTask.createMany({
        data: context.studentIds
          .slice(0, 10)
          .map((studentId, si) => ({
            id: id(`task:${index}:${si}`),
            campaignId,
            sectionId,
            studentId,
            status: si < responseCount ? "DONE" : "PENDING",
            doneDate: si < responseCount ? today : null,
          })),
      });
      // Không lưu cặp sinh viên–phiếu: UUID phiếu/đáp án ngẫu nhiên và chỉ có ngày.
      const responses = Array.from({ length: responseCount }, () => ({
        id: randomUUID(),
        campaignId,
        sectionId,
        submittedDate: today,
      }));
      await tx.surveyResponse.createMany({ data: responses });
      const teachingValue = index === 1 ? 5 : 4,
        assessmentValue = index === 3 ? 3 : 4;
      await tx.surveyAnswer.createMany({
        data: responses.flatMap((response) => [
          {
            id: randomUUID(),
            responseId: response.id,
            questionId: id("question:teaching"),
            valueNumber: teachingValue,
          },
          {
            id: randomUUID(),
            responseId: response.id,
            questionId: id("question:assessment"),
            valueNumber: assessmentValue,
          },
          {
            id: randomUUID(),
            responseId: response.id,
            questionId: id("question:text"),
            valueText: "Mong có thêm bài tập thực hành trên lớp.",
            moderationStatus: "HIEN_THI" as const,
            moderationReason: "Góp ý phù hợp, dữ liệu giả phục vụ demo.",
          },
        ]),
      });
      const score = calculateSurveyScore(
        template,
        [
          {
            questionId: id("question:teaching"),
            valueNumber: teachingValue,
            count: responseCount,
          },
          {
            questionId: id("question:assessment"),
            valueNumber: assessmentValue,
            count: responseCount,
          },
          {
            questionId: id("question:text"),
            hasText: true,
            count: responseCount,
          },
        ],
        {
          responseCount,
          taskCount: 10,
          doneTaskCount: responseCount,
          minResponses: 5,
          minRate: 0.3,
        },
      );
      const details: SurveyAggregateDetails = {
        version: 2,
        templateId,
        template,
        teacherIds: [teacherId],
        bands: [...DEFAULT_SURVEY_RATING_BANDS],
        score,
      };
      await tx.aggregateResult.create({
        data: {
          id: id(`result:${index}`),
          campaignId,
          sectionId,
          responseCount,
          taskCount: 10,
          participationRate: score.participationRate,
          overallScore: score.overallScore,
          eligibleToPublish: score.eligibleToPublish,
          details: details as unknown as Prisma.InputJsonObject,
          aggregatedAt: new Date(),
        },
      });
    }
    await tx.campaignHistory.create({
      data: {
        id: id(`history:${ci}`),
        campaignId,
        actorId: context.createdById,
        fromStatus: "DA_TONG_HOP",
        toStatus: "DA_CONG_BO",
        action: "DEMO_SEED",
        campaignRevision: 8,
        reason: "Dữ liệu giả để thử quyền xem kết quả Tuần 9.",
      },
    });
  }
  await tx.systemSetting.create({
    data: {
      key: WEEK9_DEMO_MARKER,
      value: { version: 1, fake: true, campaignIds },
    },
  });
  return { created: true, campaigns: 2, sections: 4, responses: 18 };
}
