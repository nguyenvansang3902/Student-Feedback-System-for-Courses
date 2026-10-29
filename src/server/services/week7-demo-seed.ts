import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";

export const WEEK7_DEMO_MARKER = "W7_DEMO_READINESS_V1";
export interface Week7DemoContext {
  id: (key: string) => string;
  departmentId: string;
  teacherIds: readonly string[];
  studentIds: readonly string[];
  createdById: string;
  templateId: string;
}

/** Bundle riêng, caller đã khóa mutex. Marker chỉ được ghi sau khi toàn bộ bundle hoàn tất. */
export async function seedWeek7ReadinessData(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
  context: Week7DemoContext,
) {
  authorizeConsole(actor);
  if (process.env.NODE_ENV === "production")
    throw new Error("Dữ liệu sẵn sàng giả chỉ dành cho môi trường phát triển.");
  if (context.teacherIds.length < 2 || context.studentIds.length < 5)
    throw new Error(
      "Bundle Tuần 7 cần ít nhất hai giảng viên và năm sinh viên giả.",
    );
  const id = (key: string) => context.id(`week7:${key}`);
  const campaignIds = [id("campaign:ready"), id("campaign:blocked")];
  const marker = await tx.systemSetting.findUnique({
    where: { key: WEEK7_DEMO_MARKER },
  });
  if (marker) return { created: false, campaigns: 2, sections: 8, newUsers: 0 };

  const pendingUserId = id("pending-student"),
    courseId = id("course");
  const semesterIds = [id("semester:open"), id("semester:locked")];
  const sectionIds = semesterIds.flatMap((_, si) =>
    Array.from({ length: 4 }, (_, index) => id(`section:${si}:${index}`)),
  );
  const collisions = await Promise.all([
    tx.course.count({
      where: { OR: [{ id: courseId }, { code: "W7-MH001" }] },
    }),
    tx.semester.count({
      where: {
        OR: [
          { id: { in: semesterIds } },
          { code: { in: ["W7-HK-MO", "W7-HK-KHOA"] } },
        ],
      },
    }),
    tx.courseSection.count({ where: { id: { in: sectionIds } } }),
    tx.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
    tx.user.count({
      where: {
        OR: [
          { id: pendingUserId },
          { loginCode: "W7-SV2026001" },
          { email: "w7-chua-kich-hoat@seed.demo.invalid" },
        ],
      },
    }),
  ]);
  if (collisions.some(Boolean))
    throw new Error(
      "Mã hoặc ID bundle Tuần 7 đã tồn tại nhưng chưa có marker; giữ nguyên dữ liệu, không tự ghi đè.",
    );

  const now = new Date(),
    startsAt = new Date(now.getTime() + 7 * 86400000),
    endsAt = new Date(now.getTime() + 14 * 86400000);
  await tx.course.create({
    data: {
      id: courseId,
      code: "W7-MH001",
      name: "Môn kiểm tra dữ liệu khảo sát (giả lập Tuần 7)",
      credits: 3,
      departmentId: context.departmentId,
    },
  });
  // Đợt NHAP bên dưới được tạo trước khi khóa kỳ thứ hai; không giả có đợt đã duyệt trên kỳ khóa.
  await tx.semester.createMany({
    data: semesterIds.map((semesterId, index) => ({
      id: semesterId,
      code: index === 0 ? "W7-HK-MO" : "W7-HK-KHOA",
      name:
        index === 0
          ? "Học kỳ thử dữ liệu sẵn sàng Tuần 7"
          : "Học kỳ thử lỗi khóa sổ Tuần 7",
      startsOn: new Date("2026-09-30T00:00:00Z"),
      endsOn: new Date("2027-01-15T00:00:00Z"),
    })),
  });
  await tx.user.create({
    data: {
      id: pendingUserId,
      loginCode: "W7-SV2026001",
      email: "w7-chua-kich-hoat@seed.demo.invalid",
      displayName: "Sinh viên chờ kích hoạt — kiểm RS-06",
      status: "PENDING_ACTIVATION",
      passwordHash: null,
      mustChangePassword: true,
      roles: {
        create: {
          id: id("pending-student-role"),
          role: "SINH_VIEN",
          scopeType: "GLOBAL",
          scopeKey: "GLOBAL",
        },
      },
    },
  });
  const caseCodes = ["W7-RS01", "W7-RS02", "W7-RS04-06", "W7-RS05"];
  await tx.courseSection.createMany({
    data: semesterIds.flatMap((semesterId, si) =>
      caseCodes.map((code, index) => ({
        id: id(`section:${si}:${index}`),
        code,
        courseId,
        semesterId,
      })),
    ),
  });
  const teaching = semesterIds.flatMap((_, si) => [
    {
      sectionId: id(`section:${si}:1`),
      teacherId: context.teacherIds[0],
      isLead: true,
    },
    {
      sectionId: id(`section:${si}:2`),
      teacherId: context.teacherIds[0],
      isLead: true,
    },
    {
      sectionId: id(`section:${si}:2`),
      teacherId: context.teacherIds[1],
      isLead: false,
    },
    {
      sectionId: id(`section:${si}:3`),
      teacherId: context.teacherIds[0],
      isLead: true,
    },
  ]);
  await tx.teachingAssignment.createMany({ data: teaching });
  const normalStudents = [...context.studentIds.slice(0, 5), pendingUserId];
  const enrollments = semesterIds.flatMap((_, si) =>
    [0, 2, 3].flatMap((index) =>
      (index === 3 ? [context.studentIds[0]] : normalStudents).map(
        (studentId, studentIndex) => ({
          id: id(`enrollment:${si}:${index}:${studentIndex}`),
          sectionId: id(`section:${si}:${index}`),
          studentId,
        }),
      ),
    ),
  );
  await tx.enrollment.createMany({ data: enrollments });
  const campaignCommon = {
    templateId: context.templateId,
    startsAt,
    endsAt,
    minResponses: 5,
    minRate: 0.3,
    warningScore: 3,
    explanationDays: 14,
    createdById: context.createdById,
    status: "NHAP" as const,
  };
  await tx.surveyCampaign.createMany({
    data: [
      {
        ...campaignCommon,
        id: campaignIds[0],
        title: "W7 — Dữ liệu có cảnh báo, đủ điều kiện xác nhận",
        scope: "SECTIONS",
        semesterId: semesterIds[0],
      },
      {
        ...campaignCommon,
        id: campaignIds[1],
        title: "W7 — Dữ liệu có lỗi chặn, kiểm đủ RS-01 đến RS-06",
        scope: "GLOBAL",
        semesterId: semesterIds[1],
      },
    ],
  });
  await tx.campaignSection.createMany({
    data: [2, 3].map((index) => ({
      campaignId: campaignIds[0],
      sectionId: id(`section:0:${index}`),
    })),
  });
  await tx.campaignHistory.createMany({
    data: campaignIds.map((campaignId, index) => ({
      id: id(`history:create:${index}`),
      campaignId,
      actorId: null,
      fromStatus: "NHAP",
      toStatus: "NHAP",
      action: "create",
      campaignRevision: 1,
      reason:
        "Khởi tạo dữ liệu giả Tuần 7 bằng console; chưa trình hoặc duyệt đợt.",
    })),
  });
  await tx.semester.update({
    where: { id: semesterIds[1] },
    data: { lockedAt: new Date() },
  });
  await tx.systemSetting.create({
    data: {
      key: WEEK7_DEMO_MARKER,
      value: { version: 1, campaignIds, sectionIds },
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: null,
      action: "DEMO_WEEK7_READINESS_SEEDED",
      objectType: "SurveyCampaign",
      objectId: campaignIds[1],
      redactedSummary: {
        console: true,
        created: 2,
        sectionCount: 8,
        pairCount: enrollments.length,
        newUsers: 1,
      },
    },
  });
  return { created: true, campaigns: 2, sections: 8, newUsers: 1 };
}
