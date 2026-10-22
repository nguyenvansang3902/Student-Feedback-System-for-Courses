import { randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CampaignStatus,
  FeedbackEvent,
  FeedbackStatus,
} from "../../generated/prisma/enums";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";

export interface DemoSurveyContext {
  id: (key: string) => string;
  teacherId: string;
  studentIds: readonly string[];
  sectionIds: readonly string[];
  semesterId: string;
  createdById: string;
  approvedById: string;
}
export interface DemoSurveySeedResult {
  templates: number;
  campaigns: number;
  cohorts: number;
  responses: number;
  answers: number;
  feedback: number;
}
type DemoSurveySize = "small" | "medium" | "large";
const dayMs = 86_400_000;
const shiftDate = (date: Date, days: number) =>
  new Date(date.getTime() + days * dayMs);
function workingDays(date: Date, days: number): Date {
  let result = new Date(date);
  while (days > 0) {
    result = shiftDate(result, 1);
    if (![0, 6].includes(result.getUTCDay())) days--;
  }
  return result;
}
function shuffled<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

/** Chỉ fixture theo quyền console; không cung cấp API hoặc chuyển trạng thái nghiệp vụ. */
export async function seedDemoSurveyData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
  context: DemoSurveyContext,
  size: DemoSurveySize,
): Promise<DemoSurveySeedResult> {
  authorizeConsole(actor);
  if (
    process.env.NODE_ENV === "production" ||
    !["small", "medium", "large"].includes(size)
  )
    throw new Error("Dữ liệu khảo sát/phản hồi giả chỉ dành cho demo cục bộ.");
  if (
    !context.studentIds.length ||
    !context.sectionIds.length ||
    context.createdById === context.approvedById
  )
    throw new Error(
      "Seed cần lớp/sinh viên giả và hai người tạo/duyệt khác nhau.",
    );
  // Caller đã khóa mutex, kiểm local-only và học kỳ mở trong cùng transaction.
  const id = (key: string) => context.id(`survey-data:${key}`);
  const templateId = id("template"),
    groupId = id("group"),
    q1 = id("question:likert1"),
    q2 = id("question:likert2"),
    qText = id("question:text");
  const openId = id("campaign:open"),
    closedId = id("campaign:closed");
  const feedbackStatuses: FeedbackStatus[] = [
    "MOI",
    "DA_TIEP_NHAN",
    "DANG_XU_LY",
    "DA_TRA_LOI",
    "DA_DONG",
    "TU_CHOI",
  ];
  const existingCampaigns = new Set(
    (
      await Promise.all(
        [openId, closedId].map(async (campaignId) =>
          (await tx.surveyCampaign.findUnique({
            where: { id: campaignId },
            select: { id: true },
          }))
            ? campaignId
            : null,
        ),
      )
    ).filter((campaignId) => campaignId !== null),
  );
  const existingFeedbacks = new Set(
    (
      await Promise.all(
        feedbackStatuses.map(async (status) => {
          const feedbackId = id(`feedback:${status}`);
          return (await tx.feedback.findUnique({
            where: { id: feedbackId },
            select: { id: true },
          }))
            ? feedbackId
            : null;
        }),
      )
    ).filter((feedbackId) => feedbackId !== null),
  );
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const responseDate = shiftDate(today, -8),
    closedEnd = shiftDate(today, -7);
  const sections = context.sectionIds.slice(0, size === "small" ? 2 : 3);
  // Chỉ danh sách mới cần đối chiếu đăng ký hiện tại. Đợt đã chốt không phụ thuộc
  // việc sinh viên rút/đăng ký thêm lớp sau đó, kể cả khi seed lại hoặc tăng size.
  const needsCampaigns = existingCampaigns.size < 2;
  const needsFeedback = existingFeedbacks.size < feedbackStatuses.length;
  const enrollmentSections = needsCampaigns
    ? sections
    : needsFeedback
      ? [sections[0]]
      : [];
  const enrolled = enrollmentSections.length
    ? await tx.enrollment.findMany({
        where: {
          sectionId: { in: enrollmentSections },
          studentId: { in: [...context.studentIds] },
          withdrawnAt: null,
        },
        select: { sectionId: true, studentId: true },
        orderBy: [{ sectionId: "asc" }, { studentId: "asc" }],
      })
    : [];
  const studentsBySection = new Map(
    sections.map((sectionId) => [
      sectionId,
      enrolled
        .filter((row) => row.sectionId === sectionId)
        .map((row) => row.studentId),
    ]),
  );
  if (
    needsCampaigns &&
    [...studentsBySection.values()].some((students) => students.length < 5)
  )
    throw new Error(
      "Mỗi lớp khảo sát demo cần ít nhất năm sinh viên đã đăng ký.",
    );
  if (needsFeedback && !studentsBySection.get(sections[0])!.length)
    throw new Error(
      "Phản hồi demo mới cần sinh viên đã đăng ký lớp nhận phản hồi.",
    );

  if (
    !(await tx.surveyTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    }))
  ) {
    await tx.surveyTemplate.create({
      data: {
        id: templateId,
        familyId: id("template-family"),
        version: 1,
        name: "Phiếu khảo sát minh họa (dữ liệu giả)",
        status: "DA_KHOA",
        isDefault: true,
        createdById: context.createdById,
        createdAt: shiftDate(today, -25),
        lockedAt: shiftDate(today, -23),
      },
    });
    await tx.criterionGroup.create({
      data: {
        id: groupId,
        templateId,
        title: "Chất lượng giảng dạy (giả lập)",
        position: 1,
        weight: 1,
      },
    });
    await tx.question.createMany({
      data: [
        {
          id: q1,
          groupId,
          label: "Giảng viên trình bày rõ ràng (minh họa)",
          type: "LIKERT",
          position: 1,
          required: true,
          allowNA: false,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
        },
        {
          id: q2,
          groupId,
          label: "Hoạt động học tập hỗ trợ hiểu bài (minh họa)",
          type: "LIKERT",
          position: 2,
          required: true,
          allowNA: false,
          weight: 2,
          scaleMin: 1,
          scaleMax: 5,
        },
        {
          id: qText,
          groupId,
          label: "Góp ý cải thiện (chỉ dữ liệu giả)",
          type: "TEXT",
          position: 3,
          required: false,
          allowNA: false,
          weight: 1,
          scaleMin: null,
          scaleMax: null,
        },
      ],
    });
  }

  for (const isClosed of [true, false]) {
    const campaignId = isClosed ? closedId : openId;
    // Danh sách chốt, trạng thái, kết quả và nội dung cũ không bị thay đổi khi seed lại/đổi size.
    if (existingCampaigns.has(campaignId)) continue;
    const startsAt = isClosed ? shiftDate(today, -21) : shiftDate(today, -1);
    const endsAt = isClosed ? closedEnd : shiftDate(today, 14);
    const approvedAt = shiftDate(startsAt, -1),
      createdAt = shiftDate(startsAt, -3);
    await tx.surveyCampaign.create({
      data: {
        id: campaignId,
        title: isClosed
          ? "Đợt đã đóng, có kết quả minh họa (giả lập)"
          : "Đợt đang mở minh họa (giả lập)",
        semesterId: context.semesterId,
        templateId,
        scope: "SECTIONS",
        startsAt,
        endsAt,
        status: isClosed ? "DA_CONG_BO" : "DANG_MO",
        minResponses: 5,
        minRate: 0.3,
        warningScore: 3,
        explanationDays: 14,
        mandatory: false,
        createdById: context.createdById,
        approvedById: context.approvedById,
        approvedAt,
        createdAt,
      },
    });
    const history: {
      from: CampaignStatus;
      to: CampaignStatus;
      when: Date;
      actorId: string;
    }[] = [
      {
        from: "NHAP",
        to: "CHO_DUYET",
        when: shiftDate(startsAt, -2),
        actorId: context.createdById,
      },
      {
        from: "CHO_DUYET",
        to: "DA_DUYET",
        when: approvedAt,
        actorId: context.approvedById,
      },
      {
        from: "DA_DUYET",
        to: "DANG_MO",
        when: startsAt,
        actorId: context.createdById,
      },
    ];
    if (isClosed)
      history.push(
        {
          from: "DANG_MO",
          to: "DA_DONG",
          when: endsAt,
          actorId: context.createdById,
        },
        {
          from: "DA_DONG",
          to: "DA_TONG_HOP",
          when: shiftDate(endsAt, 1),
          actorId: context.createdById,
        },
        {
          from: "DA_TONG_HOP",
          to: "DA_CONG_BO",
          when: shiftDate(endsAt, 2),
          actorId: context.createdById,
        },
      );
    await tx.campaignHistory.createMany({
      data: history.map((entry, index) => ({
        id: id(`campaign-history:${isClosed ? "closed" : "open"}:${index}`),
        campaignId,
        actorId: entry.actorId,
        fromStatus: entry.from,
        toStatus: entry.to,
        occurredAt: entry.when,
        reason:
          "Lịch sử minh họa được tạo bởi seed; không phải thao tác thực tế.",
      })),
    });
    await tx.campaignSection.createMany({
      data: sections.map((sectionId) => ({ campaignId, sectionId })),
    });
    for (const sectionId of sections) {
      const students = studentsBySection.get(sectionId)!;
      const doneCount = isClosed
        ? Math.max(5, Math.floor(students.length * 0.7))
        : 0;
      await tx.surveyTask.createMany({
        data: students.map((studentId, index) => ({
          id: id(`task:${campaignId}:${sectionId}:${studentId}`),
          campaignId,
          sectionId,
          studentId,
          status: index < doneCount ? "DONE" : "PENDING",
          doneDate: index < doneCount ? responseDate : null,
        })),
      });
      if (!isClosed) continue;
      // Vùng ẩn danh tách khỏi vòng lặp sinh viên. Không tạo map người/task -> response.
      // UUID random, cùng ngày theo nhóm và thứ tự ghi được trộn độc lập.
      const responses = Array.from({ length: doneCount }, () => ({
        id: randomUUID(),
        campaignId,
        sectionId,
        submittedDate: responseDate,
      }));
      const answers: Prisma.SurveyAnswerCreateManyInput[] = [];
      let sum1 = 0,
        sum2 = 0;
      for (let index = 0; index < responses.length; index++) {
        const responseId = responses[index].id,
          value1 = [3, 4, 5][index % 3],
          value2 = [4, 5, 3][index % 3];
        sum1 += value1;
        sum2 += value2;
        answers.push(
          {
            id: randomUUID(),
            responseId,
            questionId: q1,
            valueNumber: value1,
            moderationStatus: "CHO_KIEM_DUYET",
          },
          {
            id: randomUUID(),
            responseId,
            questionId: q2,
            valueNumber: value2,
            moderationStatus: "CHO_KIEM_DUYET",
          },
          {
            id: randomUUID(),
            responseId,
            questionId: qText,
            valueText:
              "Đề xuất bổ sung ví dụ thực hành. Đây hoàn toàn là góp ý giả lập.",
            moderationStatus: index % 3 === 0 ? "CHO_KIEM_DUYET" : "HIEN_THI",
          },
        );
      }
      await tx.surveyResponse.createMany({ data: shuffled(responses) });
      await tx.surveyAnswer.createMany({ data: shuffled(answers) });
      const mean1 = sum1 / doneCount,
        mean2 = sum2 / doneCount,
        groupScore = (mean1 + 2 * mean2) / 3;
      await tx.aggregateResult.create({
        data: {
          id: id(`aggregate:${sectionId}`),
          campaignId,
          sectionId,
          responseCount: doneCount,
          taskCount: students.length,
          participationRate: Number((doneCount / students.length).toFixed(4)),
          overallScore: Number(groupScore.toFixed(2)),
          eligibleToPublish:
            doneCount >= 5 && doneCount / students.length >= 0.3,
          aggregatedAt: shiftDate(endsAt, 1),
          details: {
            version: 1,
            groups: [
              {
                groupId,
                weight: 1,
                score: groupScore,
                questions: [
                  {
                    questionId: q1,
                    weight: 1,
                    validCount: doneCount,
                    sum: sum1,
                    mean: mean1,
                  },
                  {
                    questionId: q2,
                    weight: 2,
                    validCount: doneCount,
                    sum: sum2,
                    mean: mean2,
                  },
                ],
              },
            ],
          },
        },
      });
    }
  }

  const feedbackAuthors = studentsBySection.get(sections[0])!;
  for (let index = 0; index < feedbackStatuses.length; index++) {
    const status = feedbackStatuses[index],
      feedbackId = id(`feedback:${status}`);
    if (existingFeedbacks.has(feedbackId)) continue;
    // Lùi đủ ngày lịch để các sự kiện đã xảy ra không rơi vào tương lai khi
    // hôm nay là cuối tuần. Hạn SLA chưa đến vẫn được phép nằm trong tương lai.
    const authorId = feedbackAuthors[index % feedbackAuthors.length],
      createdAt = shiftDate(today, [0, -3, -14, -7, -10, -4][index]);
    const acceptedAt = workingDays(createdAt, 1),
      processingAt = workingDays(createdAt, 2),
      answeredAt = workingDays(createdAt, 3),
      closedAt = workingDays(createdAt, 4);
    const hasAnswer = status === "DA_TRA_LOI" || status === "DA_DONG";
    const body =
      "Phản hồi minh họa về việc bổ sung bài tập và ví dụ cho môn học. Nội dung và tài khoản đều giả lập.";
    await tx.feedback.create({
      data: {
        id: feedbackId,
        sectionId: sections[0],
        authorId,
        assigneeId: context.teacherId,
        category: "GIANG_DAY",
        severity: index % 2 ? "DE_XUAT" : "GOP_Y",
        title: `Phản hồi minh họa ${index + 1} (giả lập)`,
        body,
        isAnonymous: index % 2 === 0,
        status,
        isOverdue: status === "DANG_XU_LY",
        isHidden: false,
        isLocked: false,
        escalationLevel: 0,
        reopenCount: 0,
        createdAt,
        acceptDueAt: workingDays(createdAt, 2),
        replyDueAt: workingDays(createdAt, 7),
        answeredAt: hasAnswer ? answeredAt : null,
        closedAt: status === "DA_DONG" ? closedAt : null,
      },
    });
    await tx.feedbackRecipient.create({
      data: { feedbackId, userId: context.teacherId },
    });
    const transitions: {
      event: FeedbackEvent;
      from: FeedbackStatus;
      to: FeedbackStatus;
      actorId: string;
      when: Date;
      reason?: string;
    }[] = [
      {
        event: "GUI",
        from: "MOI",
        to: "MOI",
        actorId: authorId,
        when: createdAt,
      },
    ];
    if (status === "TU_CHOI")
      transitions.push({
        event: "TU_CHOI",
        from: "MOI",
        to: "TU_CHOI",
        actorId: context.teacherId,
        when: acceptedAt,
        reason:
          "Ví dụ giả lập: nội dung nằm ngoài phạm vi xử lý của phản hồi này.",
      });
    else {
      if (index >= 1)
        transitions.push({
          event: "TIEP_NHAN",
          from: "MOI",
          to: "DA_TIEP_NHAN",
          actorId: context.teacherId,
          when: acceptedAt,
        });
      if (index >= 2)
        transitions.push({
          event: "BAT_DAU_XU_LY",
          from: "DA_TIEP_NHAN",
          to: "DANG_XU_LY",
          actorId: context.teacherId,
          when: processingAt,
        });
      if (hasAnswer)
        transitions.push({
          event: "TRA_LOI",
          from: "DANG_XU_LY",
          to: "DA_TRA_LOI",
          actorId: context.teacherId,
          when: answeredAt,
        });
      if (status === "DA_DONG")
        transitions.push({
          event: "DONG",
          from: "DA_TRA_LOI",
          to: "DA_DONG",
          actorId: authorId,
          when: closedAt,
        });
    }
    await tx.feedbackHistory.createMany({
      data: transitions.map((entry, eventIndex) => ({
        id: id(`feedback-history:${status}:${eventIndex}`),
        feedbackId,
        actorId: entry.actorId,
        event: entry.event,
        fromStatus: entry.from,
        toStatus: entry.to,
        occurredAt: entry.when,
        reason: entry.reason ?? null,
      })),
    });
    if (hasAnswer)
      await tx.feedbackMessage.create({
        data: {
          id: id(`feedback-message:${status}`),
          feedbackId,
          authorId: context.teacherId,
          body: "Phản hồi giả lập: giảng viên sẽ bổ sung ví dụ thực hành trong buổi tiếp theo.",
          createdAt: answeredAt,
        },
      });
  }
  const feedbackIds = feedbackStatuses.map((status) =>
    id(`feedback:${status}`),
  );
  const [templates, campaigns, cohorts, responses, answers, feedback] =
    await Promise.all([
      tx.surveyTemplate.count({ where: { id: templateId } }),
      tx.surveyCampaign.count({ where: { id: { in: [openId, closedId] } } }),
      tx.campaignSection.count({
        where: { campaignId: { in: [openId, closedId] } },
      }),
      tx.surveyResponse.count({ where: { campaignId: closedId } }),
      tx.surveyAnswer.count({ where: { response: { campaignId: closedId } } }),
      tx.feedback.count({ where: { id: { in: feedbackIds } } }),
    ]);
  return { templates, campaigns, cohorts, responses, answers, feedback };
}
