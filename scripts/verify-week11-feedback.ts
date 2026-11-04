import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import {
  createFeedback,
  getFeedback,
  transitionFeedback,
} from "../src/server/services/feedback";
import { updateFeedbackSatisfaction } from "../src/server/services/feedback-satisfaction";
import { ensureDueFeedback } from "../src/server/services/feedback-sla";
import { addBusinessDays } from "../src/server/services/feedback-deadlines";
import {
  updateWorkflowSettings,
  getWorkflowSettings,
} from "../src/server/services/workflow-settings";
const marker = JSON.parse(
  readFileSync(".local/week11-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL!),
  test = new URL(process.env.WEEK11_TEST_DATABASE_URL!);
assert(
  marker.purpose === "isolated-week11-tests" &&
    marker.mainDatabase === main.pathname.slice(1),
);
assert(
  test.host === main.host &&
    test.username === main.username &&
    test.password === main.password,
);
assert(
  test.pathname === `/${marker.database}` &&
    test.pathname !== main.pathname &&
    /^\/\w+_w11test_[a-f0-9]{8}$/.test(test.pathname),
);
assert(["127.0.0.1", "localhost"].includes(test.hostname));
process.env.DATABASE_URL = test.href;
const db = getDb(),
  prefix = "W11F" + randomUUID().slice(0, 8);
const users: string[] = [],
  passed: string[] = [];
let facultyId = "",
  departmentId = "",
  semesterId = "",
  courseId = "",
  sectionId = "",
  cleaned = false;
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử SLA và phản hồi nâng cao Tuần11",
};
const failStatus = (n: number) => (e: unknown) =>
  !!e && typeof e === "object" && "status" in e && e.status === n;
function pass(s: string) {
  passed.push(s);
  console.log(`QUA W11-FB-${passed.length} ${s}`);
}
async function user(role: Role): Promise<AuthActor> {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          scopeKey: "DEPARTMENT:" + departmentId,
          departmentId,
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            scopeKey: "FACULTY:" + facultyId,
            facultyId,
          }
        : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const u = await db.user.create({
    data: {
      loginCode: prefix + "-" + users.length,
      email: (prefix + "-" + users.length + "@fixture.invalid").toLowerCase(),
      displayName: "Tài khoản kiểm thử " + role,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: { role, ...scope } },
    },
    include: { roles: true },
  });
  users.push(u.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        u,
        { ip: "week11-feedback-fixture" },
        "FULL",
        true,
      ),
    )
  ).actor;
}
async function create(
  actor: AuthActor,
  category = "GIANG_DAY",
  requestId = randomUUID(),
) {
  return createFeedback(actor, {
    sectionId,
    category,
    severity: category === "KHIEU_NAI_NGHIEM_TRONG" ? "KHIEU_NAI" : "GOP_Y",
    ...(category === "KHIEU_NAI_NGHIEM_TRONG"
      ? { violation: "KHAC_NGHIEM_TRONG", acknowledgedSerious: true }
      : {}),
    title: "Phản hồi giả kiểm thử Tuần11",
    body: "Nội dung giả kiểm thử quy trình phản hồi nâng cao.",
    isAnonymous: true,
    requestId,
  });
}
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  facultyId = (
    await db.faculty.create({
      data: { code: prefix + "F", name: "Khoa thử SLA" },
    })
  ).id;
  departmentId = (
    await db.department.create({
      data: { code: prefix + "D", name: "Bộ môn thử SLA", facultyId },
    })
  ).id;
  courseId = (
    await db.course.create({
      data: {
        code: prefix + "C",
        name: "Môn giả SLA",
        credits: 3,
        departmentId,
      },
    })
  ).id;
  semesterId = (
    await db.semester.create({
      data: {
        code: prefix + "S",
        name: "Học kỳ thử",
        startsOn: new Date(Date.now() - 10 * 86400000),
        endsOn: new Date(Date.now() + 90 * 86400000),
      },
    })
  ).id;
  sectionId = (
    await db.courseSection.create({
      data: { code: prefix + "L", courseId, semesterId },
    })
  ).id;
  const student = await user("SINH_VIEN"),
    other = await user("SINH_VIEN"),
    teacher = await user("GIANG_VIEN"),
    head = await user("TRUONG_BO_MON"),
    dean = await user("TRUONG_KHOA"),
    quality = await user("CAN_BO_DBCL"),
    training = await user("PHONG_DAO_TAO"),
    leader = await user("LANH_DAO");
  await db.teachingAssignment.create({
    data: { sectionId, teacherId: teacher.userId, isLead: true },
  });
  await db.enrollment.createMany({
    data: [student, other].map((x) => ({ sectionId, studentId: x.userId })),
  });
  const requestId = randomUUID();
  const simultaneous = await Promise.all(
    Array.from({ length: 6 }, () => create(student, "GIANG_DAY", requestId)),
  );
  assert.equal(new Set(simultaneous.map((x) => x.id)).size, 1);
  const first = simultaneous[0];
  pass("BR-26/30 sáu yêu cầu tạo cùng requestId chỉ có một phản hồi");
  const duplicate = await create(student);
  assert.equal(duplicate.duplicateWarning, true);
  for (let i = 0; i < 3; i++) await create(student);
  await assert.rejects(create(student), failStatus(429));
  pass(
    "BR-26 giới hạn5/ngày cho phản hồi thường, cảnh báo nội dung trùng24giờ",
  );
  let row = await create(other);
  for (const action of ["accept", "start", "answer"]) {
    const current = await getFeedback(teacher, row.id);
    await transitionFeedback(teacher, row.id, {
      action,
      revision: current.revision,
      requestId: randomUUID(),
      ...(action === "answer"
        ? { body: "Nội dung trả lời giả đã hoàn tất kiểm tra." }
        : {}),
    });
  }
  row = await getFeedback(other, row.id);
  assert(row.canRate);
  const rating = {
    revision: row.revision,
    requestId: randomUUID(),
    score: 2,
    comment: "Đề nghị xem xét thêm nội dung đã phản ánh.",
  };
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      updateFeedbackSatisfaction(other, row.id, rating),
    ),
  );
  assert(results.every((x) => x.status === "DA_DONG"));
  assert.equal(
    await db.feedbackRating.count({ where: { feedbackId: row.id } }),
    1,
  );
  assert.equal(
    (await updateFeedbackSatisfaction(other, row.id, rating)).rating?.score,
    2,
  );
  await assert.rejects(
    updateFeedbackSatisfaction(student, row.id, rating),
    failStatus(404),
  );
  pass("BR-25 đánh giá đồng thời một lần, tự đóng và chặn sinh viên khác");
  row = await getFeedback(other, row.id);
  const reopen = {
    revision: row.revision,
    requestId: randomUUID(),
    reason: "Cần làm rõ phần xử lý đã được phản ánh.",
  };
  await updateFeedbackSatisfaction(other, row.id, reopen, true);
  await updateFeedbackSatisfaction(other, row.id, reopen, true);
  assert.equal(
    (await db.feedback.findUniqueOrThrow({ where: { id: row.id } }))
      .reopenCount,
    1,
  );
  await db.feedback.update({
    where: { id: row.id },
    data: { status: "DA_DONG", closedAt: new Date() },
  });
  row = await getFeedback(other, row.id);
  await assert.rejects(
    updateFeedbackSatisfaction(
      other,
      row.id,
      { ...reopen, requestId: randomUUID(), revision: row.revision },
      true,
    ),
    failStatus(409),
  );
  pass("BR-25 mở lại tối đa một lần, retry không tăng số lần");
  await db.feedback.update({
    where: { id: first.id },
    data: {
      acceptDueAt: new Date(Date.now() - 86400000),
      replyDueAt: new Date(Date.now() + 10 * 86400000),
    },
  });
  const now = new Date();
  const escalationDays = (await getWorkflowSettings(quality)).escalationDays;
  // SLA dùng ngày làm việc và chỉ leo thang sau hạn, không tính đúng mốc hạn.
  const afterEscalationDeadline = (processedAt: Date) =>
    new Date(addBusinessDays(processedAt, escalationDays).getTime() + 1);
  await Promise.all(
    Array.from({ length: 6 }, () =>
      ensureDueFeedback(consoleActor, { now, limit: 100 }),
    ),
  );
  let escalated = await db.feedback.findUniqueOrThrow({
    where: { id: first.id },
  });
  assert.equal(escalated.escalationLevel, 1);
  assert.equal(escalated.status, "MOI");
  assert.equal(escalated.assigneeId, head.userId);
  assert.equal(
    await db.slaEscalation.count({ where: { feedbackId: first.id } }),
    1,
  );
  await assert.rejects(getFeedback(teacher, first.id), failStatus(404));
  pass(
    "BR-23 sáu job đồng thời chỉ leo thang một cấp, quá hạn là cờ và thu hồi người nhận cũ",
  );
  let escalationAt = now;
  for (const expected of [dean.userId, quality.userId]) {
    escalationAt = afterEscalationDeadline(escalationAt);
    await ensureDueFeedback(consoleActor, {
      now: escalationAt,
      limit: 100,
    });
    escalated = await db.feedback.findUniqueOrThrow({
      where: { id: first.id },
    });
    assert.equal(escalated.assigneeId, expected);
  }
  pass("BR-23 chuỗi GV→TBM→TK→ĐBCL đúng theo thời hạn giữa các cấp");
  const office = await create(other, "TO_CHUC_LOP_HOC");
  assert(await getFeedback(training, office.id));
  await db.feedback.update({
    where: { id: office.id },
    data: { acceptDueAt: new Date(Date.now() - 86400000) },
  });
  await ensureDueFeedback(consoleActor, { now, limit: 100 });
  await ensureDueFeedback(consoleActor, {
    now: afterEscalationDeadline(now),
    limit: 100,
  });
  const officeRow = await db.feedback.findUniqueOrThrow({
    where: { id: office.id },
  });
  assert.equal(officeRow.assigneeId, leader.userId);
  assert(await getFeedback(leader, office.id));
  pass("BR-54 PĐT→ĐBCL→Lãnh đạo; LĐ chỉ đọc phản hồi được giao");
  const inspector = await user("THANH_TRA");
  const serious = await create(other, "KHIEU_NAI_NGHIEM_TRONG");
  await db.inspectionCase.update({
    where: { id: serious.inspectionId! },
    data: { acceptDueAt: new Date(Date.now() - 86400000) },
  });
  await ensureDueFeedback(consoleActor, { now, limit: 100 });
  assert(
    await db.notification.findFirst({
      where: {
        targetType: "InspectionCase",
        targetId: serious.inspectionId!,
        userId: leader.userId,
      },
    }),
  );
  assert(
    !(await db.notification.findFirst({
      where: {
        targetType: "InspectionCase",
        targetId: serious.inspectionId!,
        userId: head.userId,
      },
    })),
  );
  assert(inspector.userId);
  pass(
    "BR-60/61 hồ sơ3/30 ngày, quá hạn báo LĐ ở mức generic và không gửi người xung đột",
  );
  const exam = await user("PHONG_KHAO_THI"),
    examFeedback = await create(other, "THI_KET_THUC_HOC_PHAN");
  assert(await getFeedback(exam, examFeedback.id));
  await db.feedback.update({
    where: { id: examFeedback.id },
    data: { acceptDueAt: new Date(Date.now() - 86400000) },
  });
  await ensureDueFeedback(consoleActor, { now, limit: 100 });
  await ensureDueFeedback(consoleActor, {
    now: afterEscalationDeadline(now),
    limit: 100,
  });
  assert.equal(
    (await db.feedback.findUniqueOrThrow({ where: { id: examFeedback.id } }))
      .assigneeId,
    leader.userId,
  );
  pass("BR-56 Khảo thí→ĐBCL→Lãnh đạo theo cùng SLA");
  const expired = await create(other);
  await db.feedback.update({
    where: { id: expired.id },
    data: {
      status: "DA_TRA_LOI",
      answeredAt: new Date(Date.now() - 8 * 86400000),
    },
  });
  await assert.rejects(
    updateFeedbackSatisfaction(other, expired.id, {
      revision: expired.revision,
      requestId: randomUUID(),
      score: 1,
    }),
    failStatus(409),
  );
  pass("BR-25 đánh giá sau cửa sổ7ngày bị chặn ở service");
  const ids = Array.from({ length: 7 }, () => randomUUID());
  await db.feedback.createMany({
    data: ids.map((id) => ({
      id,
      sectionId,
      authorId: other.userId,
      category: "GIANG_DAY" as const,
      severity: "GOP_Y" as const,
      title: "Fixture kiểm cursor SLA",
      body: "Nội dung giả cho cursor",
      acceptDueAt: new Date(Date.now() - 86400000),
      replyDueAt: new Date(Date.now() + 9 * 86400000),
    })),
  });
  await db.feedbackRecipient.createMany({
    data: ids.map((feedbackId) => ({
      feedbackId,
      userId: teacher.userId,
      accessRole: "GIANG_VIEN" as const,
    })),
  });
  for (let i = 0; i < 16; i++)
    await ensureDueFeedback(consoleActor, { now, limit: 2 });
  assert.equal(
    await db.feedback.count({
      where: { id: { in: ids }, escalationLevel: { gte: 1 } },
    }),
    ids.length,
  );
  pass("BR-23 cursor đi hết nhiều lô, hồ sơ cuối hàng không bị bỏ đói");
  const inactiveId = randomUUID();
  await db.feedback.create({
    data: {
      id: inactiveId,
      sectionId,
      authorId: other.userId,
      assigneeId: teacher.userId,
      category: "GIANG_DAY",
      severity: "GOP_Y",
      title: "Fixture scope ngừng hoạt động",
      body: "Dữ liệu giả kiểm tra phạm vi.",
      acceptDueAt: new Date(Date.now() - 86400000),
      replyDueAt: new Date(Date.now() + 9 * 86400000),
      recipients: {
        create: { userId: teacher.userId, accessRole: "GIANG_VIEN" },
      },
    },
  });
  await db.department.update({
    where: { id: departmentId },
    data: { isActive: false },
  });
  for (let i = 0; i < 2; i++)
    await ensureDueFeedback(consoleActor, { now, limit: 100 });
  assert.equal(
    (await db.feedback.findUniqueOrThrow({ where: { id: inactiveId } }))
      .assigneeId,
    teacher.userId,
  );
  assert.equal(
    (
      await db.feedbackRecipient.findUniqueOrThrow({
        where: {
          feedbackId_userId: { feedbackId: inactiveId, userId: teacher.userId },
        },
      })
    ).isActive,
    true,
  );
  await db.department.update({
    where: { id: departmentId },
    data: { isActive: true },
  });
  for (let i = 0; i < 2; i++)
    await ensureDueFeedback(consoleActor, { now, limit: 100 });
  assert.equal(
    (await db.feedback.findUniqueOrThrow({ where: { id: inactiveId } }))
      .assigneeId,
    head.userId,
  );
  pass(
    "BR-23/34 không giao người có phạm vi ngừng hoạt động; giữ người cũ và thử lại khi phạm vi hợp lệ",
  );
  const settings = await getWorkflowSettings(quality);
  const updated = await updateWorkflowSettings(quality, {
    ...settings,
    dailyFeedbackLimit: 6,
    requestId: randomUUID(),
  });
  assert.equal(updated.dailyFeedbackLimit, 6);
  await create(student);
  await assert.rejects(
    updateWorkflowSettings(teacher, { ...updated, requestId: randomUUID() }),
    failStatus(403),
  );
  pass("BR-26 SLA/giới hạn cấu hình được bằng đúng vai trò, CAS cấu hình");
  await db.semester.update({
    where: { id: semesterId },
    data: { lockedAt: new Date() },
  });
  await assert.rejects(create(other), failStatus(409));
  pass("BR-17 học kỳ khóa sổ chặn ghi phản hồi");
} finally {
  if (sectionId) {
    const feedbacks = await db.feedback.findMany({
        where: { sectionId },
        select: { id: true },
      }),
      ids = feedbacks.map((x) => x.id);
    await db.$transaction(
      async (tx) => {
        await tx.emailOutbox.deleteMany({
          where: {
            notification: {
              OR: [
                { userId: { in: users } },
                { targetType: "Feedback", targetId: { in: ids } },
              ],
            },
          },
        });
        await tx.notification.deleteMany({
          where: {
            OR: [
              { userId: { in: users } },
              { targetType: "Feedback", targetId: { in: ids } },
            ],
          },
        });
        await tx.slaEscalation.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.feedbackRating.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.feedbackHistory.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.feedbackMessage.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.feedbackRecipient.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.inspectionCaseNote.deleteMany({
          where: { inspectionCase: { feedbackId: { in: ids } } },
        });
        await tx.inspectionCaseEvent.deleteMany({
          where: { inspectionCase: { feedbackId: { in: ids } } },
        });
        await tx.inspectionCase.deleteMany({
          where: { feedbackId: { in: ids } },
        });
        await tx.feedback.deleteMany({ where: { id: { in: ids } } });
        await tx.enrollment.deleteMany({ where: { sectionId } });
        await tx.teachingAssignment.deleteMany({ where: { sectionId } });
        await tx.courseSection.delete({ where: { id: sectionId } });
        await tx.course.delete({ where: { id: courseId } });
        await tx.semester.delete({ where: { id: semesterId } });
        await tx.auditLog.deleteMany({ where: { actorId: { in: users } } });
        await tx.userSession.deleteMany({ where: { userId: { in: users } } });
        await tx.roleAssignment.deleteMany({
          where: { userId: { in: users } },
        });
        await tx.systemSetting.deleteMany({
          where: { key: "WORKFLOW_SETTINGS", updatedById: { in: users } },
        });
        await tx.user.deleteMany({ where: { id: { in: users } } });
        await tx.department.delete({ where: { id: departmentId } });
        await tx.faculty.delete({ where: { id: facultyId } });
        await tx.systemSetting.deleteMany({
          where: { key: "WORKFLOW_SETTINGS", updatedById: { in: users } },
        });
      },
      { timeout: 30000 },
    );
    cleaned = true;
  }
  writeFileSync(
    ".local/week11-feedback-result.json",
    JSON.stringify(
      {
        passed: passed.length,
        cases: passed,
        cleaned,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await db.$disconnect();
}
