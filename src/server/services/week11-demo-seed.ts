import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { demoId } from "./demo-seed";
import { addBusinessDays } from "./feedback-deadlines";
import { readWorkflowSettings } from "./workflow-settings";
import {
  calculateSurveyScore,
  parseSurveyAggregateDetails,
} from "./survey-score";
import { ensureRequiredImprovements } from "./improvements";
export const WEEK11_DEMO_MARKER = "W11_DEMO_WORKFLOW_V1";
/** Chỉ thêm bundle giả mới; không chuyển trạng thái các hồ sơ đã có của Tuần10. */
export async function seedWeek11WorkflowData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
) {
  authorizeConsole(actor);
  if (process.env.NODE_ENV === "production")
    throw new Error("Bundle giả không dùng trong production.");
  if (await tx.systemSetting.findUnique({ where: { key: WEEK11_DEMO_MARKER } }))
    return { created: false, feedback: 1, cases: 1 };
  const sectionId = demoId("week11:section"),
    feedbackId = demoId("week11:feedback"),
    caseId = demoId("week11:case");
  if (
    (await tx.courseSection.findUnique({ where: { id: sectionId } })) ||
    (await tx.feedback.findUnique({ where: { id: feedbackId } }))
  )
    throw new Error(
      "Bundle giả trùng mã khi chưa có marker; giữ nguyên dữ liệu.",
    );
  const semesterId = demoId("semester:2026-1"),
    studentId = demoId("SV:0"),
    teacherId = demoId("GV:0"),
    inspectorId = demoId("TT2026001");
  const semester = await tx.semester.findUniqueOrThrow({
    where: { id: semesterId },
  });
  if (semester.lockedAt) throw new Error("Học kỳ demo đã khóa.");
  const users = await tx.user.findMany({
    where: {
      id: { in: [studentId, teacherId, inspectorId] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (users.length !== 3) throw new Error("Thiếu tài khoản demo tiền đề.");
  const now = new Date(),
    settings = await readWorkflowSettings(tx);
  await tx.courseSection.create({
    data: {
      id: sectionId,
      code: "DEMO-W11-LHP01",
      courseId: demoId("course:0"),
      semesterId,
      teaching: { create: { teacherId, isLead: true } },
      enrollments: {
        create: {
          studentId,
          registeredAt: new Date(now.getTime() - 5 * 86400000),
        },
      },
    },
  });
  await tx.feedback.create({
    data: {
      id: feedbackId,
      sectionId,
      authorId: studentId,
      assigneeId: inspectorId,
      category: "KHIEU_NAI_NGHIEM_TRONG",
      severity: "KHIEU_NAI",
      title: "DEMO — Khiếu nại đang xác minh",
      body: "Dữ liệu giả: sinh viên đề nghị xác minh việc thực hiện thời lượng môn học theo đề cương. Nội dung phục vụ minh họa quy trình, không phản ánh cá nhân thực tế.",
      identityLevel: "AN_DANH_HOAN_TOAN",
      isAnonymous: true,
      status: "DANG_XU_LY",
      acceptedAt: now,
      acceptDueAt: addBusinessDays(now, settings.inspectionAcceptDays),
      replyDueAt: addBusinessDays(now, settings.inspectionCompleteDays),
      recipients: {
        create: {
          userId: inspectorId,
          accessRole: "THANH_TRA",
          isPrimary: true,
        },
      },
      history: {
        create: {
          actorId: studentId,
          event: "GUI",
          fromStatus: "MOI",
          toStatus: "DANG_XU_LY",
          reason: "Dữ liệu DEMO cho quy trình Tuần11.",
        },
      },
    },
  });
  await tx.inspectionCase.create({
    data: {
      id: caseId,
      feedbackId,
      sectionId,
      source: "PHAN_HOI_NGHIEM_TRONG",
      violation: "VI_PHAM_QUY_CHE_GIANG_DAY",
      status: "XAC_MINH",
      assigneeId: inspectorId,
      createdById: studentId,
      acceptDueAt: addBusinessDays(now, settings.inspectionAcceptDays),
      completeDueAt: addBusinessDays(now, settings.inspectionCompleteDays),
      acceptedAt: now,
      events: {
        create: [
          {
            actorId: studentId,
            event: "CREATED",
            occurredAt: new Date(now.getTime() - 1000),
            fromStatus: null,
            toStatus: "TIEP_NHAN",
          },
          {
            actorId: inspectorId,
            event: "ACCEPTED",
            occurredAt: now,
            fromStatus: "TIEP_NHAN",
            toStatus: "XAC_MINH",
            reason: "Tiếp nhận hồ sơ DEMO.",
          },
        ],
      },
      notes: {
        create: {
          authorId: inspectorId,
          body: "Ghi chú nội bộ DEMO: đang đối chiếu đề cương và lịch giảng dạy giả định.",
        },
      },
    },
  });
  const source = await tx.aggregateResult.findUniqueOrThrow({
    where: { id: demoId("week9:result:0") },
  });
  const snapshot = parseSurveyAggregateDetails(source.details),
    campaignId = demoId("week11:campaign");
  if (!snapshot)
    throw new Error("Thiếu bản chụp mẫu demo để tính điểm đúng công thức.");
  const today = new Date(
    new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10) +
      "T00:00:00Z",
  );
  const studentIds = Array.from({ length: 5 }, (_, i) => demoId("SV:" + i));
  await tx.enrollment.createMany({
    data: studentIds.slice(1).map((id) => ({
      sectionId,
      studentId: id,
      registeredAt: new Date(now.getTime() - 5 * 86400000),
    })),
  });
  await tx.surveyCampaign.create({
    data: {
      id: campaignId,
      title: "DEMO — Đợt có yêu cầu giải trình",
      semesterId,
      templateId: snapshot.templateId,
      scope: "SECTIONS",
      status: "DA_CONG_BO",
      revision: 8,
      minResponses: 5,
      minRate: 0.3,
      warningScore: 3,
      explanationDays: 14,
      createdById: demoId("DBCL2026001"),
      approvedById: demoId("LD2026001"),
      approvedAt: new Date(now.getTime() - 3 * 86400000),
      startsAt: new Date(now.getTime() - 2 * 86400000),
      endsAt: new Date(now.getTime() - 60000),
    },
  });
  await tx.campaignSection.create({ data: { campaignId, sectionId } });
  await tx.surveyTask.createMany({
    data: studentIds.map((id) => ({
      id: randomUUID(),
      campaignId,
      sectionId,
      studentId: id,
      status: "DONE" as const,
      doneDate: today,
    })),
  });
  const responses = Array.from({ length: 5 }, () => ({
    id: randomUUID(),
    campaignId,
    sectionId,
    submittedDate: today,
  }));
  await tx.surveyResponse.createMany({ data: responses });
  const questions = snapshot.template.groups.flatMap((g) => g.questions);
  if (questions.some((q) => !["LIKERT", "TEXT"].includes(q.type)))
    throw new Error("Mẫu demo không đúng bộ câu hỏi tiền đề.");
  await tx.surveyAnswer.createMany({
    data: responses.flatMap((response) =>
      questions.map((q) => ({
        id: randomUUID(),
        responseId: response.id,
        questionId: q.id,
        ...(q.type === "LIKERT"
          ? { valueNumber: 2 }
          : {
              valueText:
                "DEMO: đề nghị bổ sung bài thực hành và giải thích ví dụ.",
              moderationStatus: "HIEN_THI" as const,
              moderationReason: "Nội dung giả lịch sự dùng minh họa.",
            }),
      })),
    ),
  });
  const score = calculateSurveyScore(
    snapshot.template,
    questions.map((q) =>
      q.type === "LIKERT"
        ? { questionId: q.id, valueNumber: 2, count: 5 }
        : { questionId: q.id, hasText: true, count: 5 },
    ),
    {
      responseCount: 5,
      taskCount: 5,
      doneTaskCount: 5,
      minResponses: 5,
      minRate: 0.3,
    },
    snapshot.bands,
  );
  await tx.aggregateResult.create({
    data: {
      id: demoId("week11:result"),
      campaignId,
      sectionId,
      responseCount: 5,
      taskCount: 5,
      participationRate: score.participationRate,
      overallScore: score.overallScore,
      eligibleToPublish: score.eligibleToPublish,
      details: JSON.parse(
        JSON.stringify({ ...snapshot, teacherIds: [teacherId], score }),
      ),
      aggregatedAt: now,
    },
  });
  await tx.campaignHistory.create({
    data: {
      campaignId,
      actorId: demoId("DBCL2026001"),
      fromStatus: "DA_TONG_HOP",
      toStatus: "DA_CONG_BO",
      action: "RESULTS_PUBLISH",
      campaignRevision: 8,
      occurredAt: now,
    },
  });
  await ensureRequiredImprovements(tx, campaignId, now);
  await tx.systemSetting.create({
    data: {
      key: WEEK11_DEMO_MARKER,
      value: { version: 1, feedback: 1, cases: 1, campaigns: 1, responses: 5 },
    },
  });
  await tx.auditLog.create({
    data: {
      action: "WEEK11_DEMO_SEEDED",
      objectType: "System",
      redactedSummary: {
        console: true,
        feedback: 1,
        cases: 1,
        onlyFakeData: true,
      },
    },
  });
  return { created: true, feedback: 1, cases: 1 };
}
