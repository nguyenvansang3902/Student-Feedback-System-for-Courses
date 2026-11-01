import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { feedbackCategories } from "./feedback-types";

export const WEEK10_DEMO_MARKER = "W10_DEMO_FEEDBACK_V1";
interface Context {
  id: (key: string) => string;
  semesterId: string;
  courseId: string;
  teacherId: string;
  studentIds: readonly string[];
  qualityId: string;
  headId: string;
  trainingId: string;
  examId: string;
  inspectorId: string;
}
function due(start: Date, days: number) {
  const value = new Date(start);
  while (days > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    if (![0, 6].includes(new Date(value.getTime() + 7 * 3600000).getUTCDay())) days--;
  }
  return value;
}
/** Bundle riêng chỉ thêm dữ liệu giả; hồ sơ Thanh tra dừng tại TIEP_NHAN. */
export async function seedWeek10FeedbackData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
  context: Context,
) {
  authorizeConsole(actor);
  if (process.env.NODE_ENV === "production" || context.studentIds.length < 2)
    throw new Error("Seed phản hồi chỉ dành cho dữ liệu giả cục bộ.");
  if (await tx.systemSetting.findUnique({ where: { key: WEEK10_DEMO_MARKER } }))
    return { created: false, feedback: 9, cases: 2, sections: 8 };
  const id = (key: string) => context.id(`week10:${key}`);
  const sectionIds = feedbackCategories.map((_, i) => id(`section:${i}`));
  if (
    (await tx.courseSection.count({
      where: {
        OR: [{ id: { in: sectionIds } }, { code: { startsWith: "W10-LHP" } }],
      },
    })) ||
    (await tx.feedback.count({
      where: {
        id: { in: Array.from({ length: 9 }, (_, i) => id(`feedback:${i}`)) },
      },
    }))
  )
    throw new Error(
      "Bundle Tuần10 trùng mã khi chưa có marker; giữ nguyên dữ liệu hiện có.",
    );
  const semester = await tx.semester.findUniqueOrThrow({
    where: { id: context.semesterId },
  });
  if (semester.lockedAt)
    throw new Error("Không thêm dữ liệu vào học kỳ đã khóa.");
  const wanted = [
    context.teacherId,
    ...context.studentIds.slice(0, 2),
    context.qualityId,
    context.headId,
    context.trainingId,
    context.examId,
    context.inspectorId,
  ];
  if (
    (await tx.user.count({
      where: { id: { in: wanted }, status: "ACTIVE" },
    })) !== new Set(wanted).size
  )
    throw new Error("Cần tài khoản demo tiền đề đang hoạt động.");
  await tx.courseSection.createMany({
    data: sectionIds.map((sectionId, i) => ({
      id: sectionId,
      code: `W10-LHP${String(i + 1).padStart(2, "0")}`,
      courseId: context.courseId,
      semesterId: context.semesterId,
    })),
  });
  await tx.teachingAssignment.createMany({
    data: sectionIds.map((sectionId) => ({
      sectionId,
      teacherId: context.teacherId,
      isLead: true,
    })),
  });
  await tx.enrollment.createMany({
    data: sectionIds.flatMap((sectionId) =>
      context.studentIds
        .slice(0, 2)
        .map((studentId) => ({ sectionId, studentId })),
    ),
  });
  const titles = [
    "Góp ý về cách trình bày bài học",
    "Đề nghị bổ sung nội dung đề cương",
    "Tài liệu tham khảo cho học phần",
    "Trao đổi về bài kiểm tra giữa kỳ",
    "Phản hồi về tổ chức thi cuối kỳ",
    "Đề nghị điều chỉnh lịch học",
    "Đề nghị tiếp nhận sự việc nghiêm trọng",
    "Góp ý về thiết bị phòng học",
  ];
  const body =
    "Dữ liệu minh họa cho Tuần 10. Nội dung được tạo giả để kiểm tra quy trình tiếp nhận và trao đổi về môn học, không mô tả người hoặc sự việc có thật.";
  const now = new Date();
  for (let i = 0; i < 9; i++) {
    const category = feedbackCategories[i === 8 ? 6 : i],
      serious = category === "KHIEU_NAI_NGHIEM_TRONG",
      authorId = context.studentIds[i === 8 ? 1 : i % 2],
      feedbackId = id(`feedback:${i}`),
      sectionId = sectionIds[i === 8 ? 6 : i];
    const primary =
      category === "NOI_DUNG_DE_CUONG"
        ? context.headId
        : category === "THI_KET_THUC_HOC_PHAN"
          ? context.examId
          : category === "TO_CHUC_LOP_HOC"
            ? context.trainingId
            : category === "KHAC"
              ? context.qualityId
              : serious
                ? context.inspectorId
                : context.teacherId;
    const accessRole =
      category === "NOI_DUNG_DE_CUONG"
        ? "TRUONG_BO_MON"
        : category === "THI_KET_THUC_HOC_PHAN"
          ? "PHONG_KHAO_THI"
          : category === "TO_CHUC_LOP_HOC"
            ? "PHONG_DAO_TAO"
            : category === "KHAC"
              ? "CAN_BO_DBCL"
              : serious
                ? "THANH_TRA"
                : "GIANG_VIEN";
    await tx.feedback.create({
      data: {
        id: feedbackId,
        sectionId,
        authorId,
        assigneeId: null,
        category,
        severity: serious ? "KHIEU_NAI" : "GOP_Y",
        title:
          i === 8
            ? "Đề nghị tiếp nhận với danh tính dành riêng cho Thanh tra"
            : titles[i],
        body,
        isAnonymous: true,
        identityLevel: serious
          ? i === 8
            ? "CHO_THANH_TRA_BIET"
            : "AN_DANH_HOAN_TOAN"
          : null,
        createdAt: now,
        acceptDueAt: due(now, serious ? 3 : 2),
        replyDueAt: due(
          now,
          serious
            ? 30
            : category === "THI_KET_THUC_HOC_PHAN" ||
                category === "TO_CHUC_LOP_HOC"
              ? 5
              : 7,
        ),
        recipients: {
          create: [
            { userId: primary, isPrimary: true, accessRole },
            ...(category === "KIEM_TRA_DANH_GIA"
              ? [
                  {
                    userId: context.headId,
                    isPrimary: false,
                    accessRole: "TRUONG_BO_MON" as const,
                  },
                ]
              : []),
          ],
        },
        history: {
          create: {
            id: id(`history:${i}`),
            actorId: authorId,
            event: "GUI",
            fromStatus: "MOI",
            toStatus: "MOI",
            toAssigneeId: null,
            occurredAt: now,
          },
        },
      },
    });
    if (serious)
      await tx.inspectionCase.create({
        data: {
          id: id(`case:${i}`),
          feedbackId,
          sectionId,
          source: "PHAN_HOI_NGHIEM_TRONG",
          violation: i === 8 ? "KHAC_NGHIEM_TRONG" : "GAY_AP_LUC_KHI_KHAO_SAT",
          status: "TIEP_NHAN",
          assigneeId: null,
          createdById: authorId,
          createdAt: now,
          acceptDueAt: due(now, 3),
          completeDueAt: due(now, 30),
          events: {
            create: {
              id: id(`case-event:${i}`),
              actorId: authorId,
              toStatus: "TIEP_NHAN",
              event: "CREATED",
              occurredAt: now,
            },
          },
        },
      });
  }
  await tx.systemSetting.create({
    data: {
      key: WEEK10_DEMO_MARKER,
      value: { version: 1, feedback: 9, cases: 2, sections: 8 },
    },
  });
  await tx.auditLog.create({
    data: {
      action: "WEEK10_DEMO_SEEDED",
      objectType: "System",
      redactedSummary: {
        console: true,
        feedback: 9,
        cases: 2,
        onlyInitialInspection: true,
      },
    },
  });
  return { created: true, feedback: 9, cases: 2, sections: 8 };
}
