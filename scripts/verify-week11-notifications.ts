import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import { enqueueDomainNotice } from "../src/server/services/domain-notifications";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processDomainMailOutbox,
} from "../src/server/services/notifications";
import { lockAdminMutations } from "../src/server/services/access";

const marker = JSON.parse(
  readFileSync(".local/week11-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK11_TEST_DATABASE_URL ?? "");
assert.equal(main.protocol, "mysql:");
assert(["localhost", "127.0.0.1"].includes(main.hostname));
assert.equal(marker.purpose, "isolated-week11-tests");
assert.equal(marker.mainDatabase, main.pathname.slice(1));
assert.equal(test.host, main.host);
assert.equal(test.username, main.username);
assert.equal(test.password, main.password);
assert.equal(test.pathname, `/${marker.database}`);
assert.notEqual(test.pathname, main.pathname);
assert(test.pathname.startsWith(`/${main.pathname.slice(1, 34)}_w11test_`));
assert(/_[a-f0-9]{8}$/.test(test.pathname));
for (const key of [
  "SHADOW_DATABASE_URL",
  "W4_TEST_DATABASE_URL",
  "WEEK10_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert.notEqual(test.pathname, new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
const db = getDb(),
  prefix = `W11N${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  feedbackIds: string[] = [],
  caseIds: string[] = [],
  passed: string[] = [];
let verified = false,
  cleaned = false,
  success = false;
let facultyId: string | undefined,
  departmentId: string | undefined,
  semesterId: string | undefined,
  courseId: string | undefined,
  sectionId: string | undefined;
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm định thông báo Tuần11 trên database thử riêng",
};
function save() {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/week11-notifications-result.json",
    JSON.stringify(
      {
        status: success ? "passed" : "incomplete",
        cases: passed,
        passed: passed.length,
        cleaned,
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}
function pass(name: string) {
  passed.push(name);
  console.log(
    `QUA W11-NOTICE-${String(passed.length).padStart(2, "0")} ${name}`,
  );
  save();
}
async function user(
  role: Role,
  passwordHash: string,
  extra?: Role,
): Promise<AuthActor> {
  const row = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
      displayName: `${prefix} ${role}`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: [
          { role, scopeType: "GLOBAL", scopeKey: "GLOBAL" },
          ...(extra
            ? [
                {
                  role: extra,
                  scopeType: "GLOBAL" as const,
                  scopeKey: "GLOBAL",
                },
              ]
            : []),
        ],
      },
    },
    include: { roles: true },
  });
  users.push(row.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        row,
        { ip: "week11-notification-fixture" },
        "FULL",
        role === "ADMIN" || extra === "ADMIN",
      ),
    )
  ).actor;
}
async function feedback(
  author: AuthActor,
  teacher: AuthActor,
  serious = false,
) {
  const row = await db.feedback.create({
    data: {
      sectionId: sectionId!,
      authorId: author.userId,
      title: `${prefix} Nội dung giả riêng tư`,
      body: "PRIVATE_PAYLOAD_KHONG_DUA_VAO_NOTIFICATION_HAY_EMAIL",
      category: serious ? "KHIEU_NAI_NGHIEM_TRONG" : "GIANG_DAY",
      severity: serious ? "KHIEU_NAI" : "GOP_Y",
      isAnonymous: true,
      ...(serious ? { identityLevel: "AN_DANH_HOAN_TOAN" } : {}),
      acceptDueAt: new Date(Date.now() + 86400000),
      replyDueAt: new Date(Date.now() + 604800000),
      recipients: {
        create: {
          userId: teacher.userId,
          isActive: true,
          isPrimary: true,
          accessRole: serious ? "THANH_TRA" : "GIANG_VIEN",
        },
      },
    },
  });
  feedbackIds.push(row.id);
  return row;
}
async function queue(feedbackId: string, userIds: string[], key: string) {
  return db.$transaction(async (tx) => {
    await lockAdminMutations(tx);
    return enqueueDomainNotice(tx, {
      key,
      targetType: "Feedback",
      targetId: feedbackId,
      title: "Phản hồi có cập nhật",
      body: "Đăng nhập hệ thống để xem nội dung theo quyền truy cập.",
      userIds,
    });
  });
}
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  const passwordHash = await hash(`Fixture-${randomUUID()}`, 12);
  const student = await user("SINH_VIEN", passwordHash),
    otherStudent = await user("SINH_VIEN", passwordHash),
    teacher = await user("GIANG_VIEN", passwordHash),
    inspector = await user("THANH_TRA", passwordHash),
    conflicted = await user("GIANG_VIEN", passwordHash, "THANH_TRA"),
    admin = await user("ADMIN", passwordHash);
  const faculty = await db.faculty.create({
    data: { code: `${prefix}F`, name: `${prefix} Khoa giả` },
  });
  facultyId = faculty.id;
  const department = await db.department.create({
    data: { code: `${prefix}D`, name: `${prefix} Bộ môn giả`, facultyId },
  });
  departmentId = department.id;
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: `${prefix} Học kỳ giả`,
      startsOn: new Date("2026-01-01"),
      endsOn: new Date("2027-01-01"),
    },
  });
  semesterId = semester.id;
  const course = await db.course.create({
    data: {
      code: `${prefix}C`,
      name: `${prefix} Môn giả`,
      credits: 3,
      departmentId,
    },
  });
  courseId = course.id;
  const section = await db.courseSection.create({
    data: {
      code: `${prefix}L`,
      courseId,
      semesterId,
      teaching: {
        create: [
          { teacherId: teacher.userId, isLead: true },
          { teacherId: conflicted.userId },
        ],
      },
    },
  });
  sectionId = section.id;
  const normal = await feedback(student, teacher),
    serious = await feedback(student, inspector, true);
  const inspection = await db.inspectionCase.create({
    data: {
      feedbackId: serious.id,
      sectionId,
      source: "PHAN_HOI_NGHIEM_TRONG",
      violation: "HANH_VI_KHONG_PHU_HOP",
      acceptDueAt: new Date(Date.now() + 86400000),
      completeDueAt: new Date(Date.now() + 2592000000),
    },
  });
  caseIds.push(inspection.id);
  const duplicateKey = `notice-fixture:${prefix}:duplicate`;
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () =>
      queue(
        normal.id,
        [student.userId, teacher.userId, student.userId],
        duplicateKey,
      ),
    ),
  );
  assert.equal(
    concurrent.reduce((sum, result) => sum + result.queued, 0),
    2,
  );
  assert.equal(
    await db.notification.count({
      where: {
        userId: { in: [student.userId, teacher.userId] },
        targetId: normal.id,
      },
    }),
    2,
  );
  pass(
    "8 transaction xếp cùng sự kiện chỉ tạo 2 notification/outbox cho 2 người nhận",
  );
  const studentList = await listNotifications(student, {}),
    teacherList = await listNotifications(teacher, {});
  assert.equal(studentList.total, 1);
  assert.equal(teacherList.total, 1);
  assert.equal((await listNotifications(otherStudent, {})).total, 0);
  assert(!JSON.stringify(studentList).includes(normal.body));
  await assert.rejects(
    () => markNotificationRead(otherStudent, { id: studentList.items[0].id }),
    { status: 404 },
  );
  pass(
    "SV chỉ đọc và đánh dấu thông báo của mình, không có nội dung phản hồi trong payload",
  );
  const marks = await Promise.all(
    Array.from({ length: 6 }, () =>
      markNotificationRead(student, { id: studentList.items[0].id }),
    ),
  );
  assert.equal(
    marks.reduce((sum, result) => sum + result.changed, 0),
    1,
  );
  assert.equal(
    (await listNotifications(student, { unreadOnly: "true" })).total,
    0,
  );
  pass("6 thao tác đánh dấu đồng thời chỉ đổi readAt một lần");
  await db.feedbackRecipient.updateMany({
    where: { feedbackId: normal.id, userId: teacher.userId },
    data: { isActive: false },
  });
  assert.equal((await listNotifications(teacher, {})).total, 0);
  assert.equal((await markAllNotificationsRead(teacher, {})).changed, 0);
  pass("thu hồi người nhận ẩn cả nội dung, tổng số và bộ đếm chưa đọc");
  await queue(
    serious.id,
    [inspector.userId, conflicted.userId, admin.userId],
    `notice-fixture:${prefix}:serious`,
  );
  assert.equal((await listNotifications(inspector, {})).total, 1);
  assert.equal((await listNotifications(conflicted, {})).total, 0);
  assert.equal((await listNotifications(admin, {})).total, 0);
  pass(
    "Thanh tra không xung đột đọc được; GV kiêm Thanh tra và ADMIN không thấy notification hồ sơ",
  );
  const dispatched = await Promise.all([
    processDomainMailOutbox(consoleActor, { limit: 50 }),
    processDomainMailOutbox(consoleActor, { limit: 50 }),
  ]);
  assert(dispatched.reduce((sum, result) => sum + result.sent, 0) >= 2);
  const outbox = await db.emailOutbox.findMany({
    where: { notification: { userId: { in: users } } },
    include: { notification: true },
  });
  const sent = outbox.filter((row) => row.status === "SENT"),
    suppressed = outbox.filter(
      (row) => row.status === "FAILED" && row.attempts === 5,
    );
  assert.equal(sent.length, 2);
  assert.equal(suppressed.length, 3);
  assert(sent.every((row) => row.attempts === 1));
  assert.equal(
    sent.filter((row) => row.notification.userId === teacher.userId).length,
    0,
  );
  pass(
    "hai worker song song gửi một thư/người đủ quyền, chặn 3 người đã mất quyền hoặc xung đột",
  );
  const messages = (await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100", {
      signal: AbortSignal.timeout(10000),
    })
  ).json()) as { messages: { ID: string; To: { Address: string }[] }[] };
  const email = messages.messages.find((message) =>
    message.To.some((to) => to.Address === student.email),
  );
  assert(email, "Chưa thấy thư fixture trong Mailpit");
  const detail = (await (
    await fetch(`http://127.0.0.1:8025/api/v1/message/${email.ID}`, {
      signal: AbortSignal.timeout(10000),
    })
  ).json()) as { Subject: string; Text: string; HTML: string };
  assert(detail.Text.includes("Thông báo"));
  assert(!JSON.stringify(detail).includes(normal.body));
  assert(!JSON.stringify(detail).includes(student.loginCode));
  pass(
    "Mailpit nhận email generic không có nội dung phản hồi, tài khoản hoặc danh tính sinh viên",
  );
  await processDomainMailOutbox(consoleActor, { limit: 50 });
  assert.equal(
    await db.emailOutbox.count({
      where: {
        notification: { userId: { in: users } },
        status: "SENT",
        attempts: { gt: 1 },
      },
    }),
    0,
  );
  pass(
    "worker chạy lại không gửi thêm những thư đã SENT hoặc bị từ chối vĩnh viễn",
  );
  const secondNormal = await feedback(student, teacher);
  const sameRequestKey = `feedback-satisfaction:${randomUUID()}`;
  const ownWhere = {
    userId: student.userId,
    targetId: { in: [normal.id, secondNormal.id] },
  };
  const beforeNotices = await db.notification.count({ where: ownWhere });
  const beforeOutbox = await db.emailOutbox.count({
    where: { notification: ownWhere },
  });
  const crossResource = await Promise.all(
    [normal.id, secondNormal.id, normal.id, secondNormal.id].map((targetId) =>
      queue(targetId, [student.userId], sameRequestKey),
    ),
  );
  assert.equal(
    crossResource.reduce((sum, result) => sum + result.queued, 0),
    2,
  );
  assert.equal(
    await db.notification.count({ where: ownWhere }),
    beforeNotices + 2,
  );
  assert.equal(
    await db.emailOutbox.count({ where: { notification: ownWhere } }),
    beforeOutbox + 2,
  );
  pass(
    "cùng UUID yêu cầu/người nhận ở hai phản hồi vẫn giữ hai notification/outbox riêng, retry không nhân đôi",
  );
  await db.userSession.updateMany({
    where: { userId: student.userId },
    data: { revokedAt: new Date() },
  });
  await assert.rejects(() => listNotifications(student, {}), { status: 401 });
  pass("phiên đã thu hồi không truy cập hộp thông báo");
  success = true;
} finally {
  if (verified)
    try {
      await db.$transaction(
        async (tx) => {
          const notificationIds = (
            await tx.notification.findMany({
              where: { userId: { in: users } },
              select: { id: true },
            })
          ).map((row) => row.id);
          await tx.emailOutbox.deleteMany({
            where: { notificationId: { in: notificationIds } },
          });
          await tx.notification.deleteMany({
            where: { id: { in: notificationIds } },
          });
          await tx.inspectionCaseEvent.deleteMany({
            where: { caseId: { in: caseIds } },
          });
          await tx.inspectionCase.deleteMany({
            where: { id: { in: caseIds } },
          });
          await tx.feedbackRecipient.deleteMany({
            where: { feedbackId: { in: feedbackIds } },
          });
          await tx.feedback.deleteMany({ where: { id: { in: feedbackIds } } });
          if (sectionId) {
            await tx.teachingAssignment.deleteMany({ where: { sectionId } });
            await tx.courseSection.deleteMany({ where: { id: sectionId } });
          }
          if (courseId) await tx.course.deleteMany({ where: { id: courseId } });
          if (semesterId)
            await tx.semester.deleteMany({ where: { id: semesterId } });
          await tx.userSession.deleteMany({ where: { userId: { in: users } } });
          await tx.auditLog.deleteMany({ where: { actorId: { in: users } } });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          if (departmentId)
            await tx.department.deleteMany({ where: { id: departmentId } });
          if (facultyId)
            await tx.faculty.deleteMany({ where: { id: facultyId } });
        },
        { maxWait: 15000, timeout: 30000 },
      );
      cleaned = true;
    } finally {
      save();
      await db.$disconnect();
    }
  else {
    save();
    await db.$disconnect();
  }
}
assert(success && cleaned, "Kiểm thử hoặc dọn fixture chưa hoàn tất");
console.log(
  `Tuần11 notification: ${passed.length} nhóm kiểm qua; fixture đã dọn, không đổi database main.`,
);
