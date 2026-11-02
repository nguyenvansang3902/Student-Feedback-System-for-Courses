import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import { createFeedback, getFeedback } from "../src/server/services/feedback";
import {
  addInspectionNote,
  assignInspectionCase,
  downloadInspectionNoteAttachment,
  getInspectionCase,
  getStudentInspectionResult,
  getTransferredFeedbackSummary,
  listInspectionCases,
  listTransferredFeedbackSummaries,
  transferFeedbackToInspection,
  transitionInspectionCase,
} from "../src/server/services/inspection-workflow";
import { removePrivateAttachment } from "../src/server/feedback/attachment-storage";

// Kiểm marker, URL và UUID máy chủ trước mọi fixture; không dùng main/shadow/DB tuần khác.
const marker = JSON.parse(
  readFileSync(".local/week11-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK11_TEST_DATABASE_URL ?? "");
assert(
  main.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(main.hostname),
);
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
  test.pathname === `/${marker.database}` && test.pathname !== main.pathname,
);
assert(
  test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w11test_`) &&
    /_[a-f0-9]{8}$/.test(test.pathname),
);
for (const key of [
  "SHADOW_DATABASE_URL",
  "W4_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
  "WEEK10_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert(test.pathname !== new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
process.env.FEEDBACK_STORAGE_DIR = ".local/week11-inspection-test-attachments";
const db = getDb(),
  prefix = `W11I${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  courses: string[] = [],
  semesters: string[] = [],
  sections: string[] = [],
  cases: string[] = [];
let verified = false,
  passed = false,
  cleaned = false;
let concurrent:
  { requests: number; succeeded: number; conflicts: number } | undefined;
function save() {
  writeFileSync(
    ".local/week11-inspection-result.json",
    JSON.stringify(
      {
        status: passed && cleaned ? "passed" : "incomplete",
        passed: cases.length,
        cases,
        concurrent,
        cleaned,
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}
function pass(name: string) {
  cases.push(name);
  console.log(`QUA W11-TT-${cases.length.toString().padStart(2, "0")} ${name}`);
  save();
}
function status(expected: number) {
  return (error: unknown) =>
    !!error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === expected;
}
async function client(
  role: Role,
  passwordHash: string,
  extra?: Role,
): Promise<AuthActor> {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          scopeKey: `DEPARTMENT:${departments[0]}`,
          departmentId: departments[0],
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            scopeKey: `FACULTY:${faculties[0]}`,
            facultyId: faculties[0],
          }
        : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const user = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
      displayName: `${prefix} ${role} ${users.length}`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: [
          { role, ...scope },
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
  users.push(user.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        user,
        { ip: "week11-inspection-fixture" },
        "FULL",
        true,
      ),
    )
  ).actor;
}
async function create(
  student: AuthActor,
  category = "KHIEU_NAI_NGHIEM_TRONG",
  isAnonymous = true,
) {
  return createFeedback(student, {
    sectionId: sections[0],
    category,
    severity: category === "KHIEU_NAI_NGHIEM_TRONG" ? "KHIEU_NAI" : "GOP_Y",
    title: `${prefix} Phản hồi giả ${randomUUID().slice(0, 8)}`,
    body: `${prefix} Nội dung sự việc giả phục vụ kiểm thử quy trình, không phải dữ liệu thật.`,
    isAnonymous,
    ...(category === "KHIEU_NAI_NGHIEM_TRONG"
      ? {
          violation: "HANH_VI_KHONG_PHU_HOP",
          identityLevel: "AN_DANH_HOAN_TOAN",
          acknowledgedSerious: true,
        }
      : {}),
    requestId: randomUUID(),
  });
}
async function transition(
  actor: AuthActor,
  caseId: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const current = await getInspectionCase(actor, caseId);
  return transitionInspectionCase(actor, caseId, {
    action,
    revision: current.revision,
    requestId: randomUUID(),
    ...extra,
  });
}
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  const faculty = await db.faculty.create({
    data: { code: `${prefix}-F`, name: "Khoa kiểm thử Thanh tra" },
  });
  faculties.push(faculty.id);
  const department = await db.department.create({
    data: {
      code: `${prefix}-D`,
      name: "Bộ môn kiểm thử Thanh tra",
      facultyId: faculty.id,
    },
  });
  departments.push(department.id);
  const course = await db.course.create({
    data: {
      code: `${prefix}-C`,
      name: "Môn học giả",
      credits: 3,
      departmentId: department.id,
    },
  });
  courses.push(course.id);
  const semester = await db.semester.create({
    data: {
      code: `${prefix}-S`,
      name: "Học kỳ giả",
      startsOn: new Date(Date.now() - 86400000 * 10),
      endsOn: new Date(Date.now() + 86400000 * 90),
    },
  });
  semesters.push(semester.id);
  const section = await db.courseSection.create({
    data: { code: `${prefix}-L`, semesterId: semester.id, courseId: course.id },
  });
  sections.push(section.id);
  const passwordHash = await hash("KiemThu2026!ThanhTra", 12);
  const student = await client("SINH_VIEN", passwordHash),
    stranger = await client("SINH_VIEN", passwordHash),
    inspector = await client("THANH_TRA", passwordHash),
    inspectorOther = await client("THANH_TRA", passwordHash),
    teacher = await client("GIANG_VIEN", passwordHash, "THANH_TRA"),
    head = await client("TRUONG_BO_MON", passwordHash, "THANH_TRA"),
    quality = await client("CAN_BO_DBCL", passwordHash),
    leader = await client("LANH_DAO", passwordHash),
    training = await client("PHONG_DAO_TAO", passwordHash),
    admin = await client("ADMIN", passwordHash);
  await db.enrollment.create({
    data: { sectionId: section.id, studentId: student.userId },
  });
  await db.teachingAssignment.create({
    data: { sectionId: section.id, teacherId: teacher.userId, isLead: true },
  });
  const native = await create(student),
    caseId = native.inspectionId!;
  assert(caseId);
  for (const actor of [teacher, head])
    await assert.rejects(getInspectionCase(actor, caseId), status(404));
  for (const actor of [quality, admin])
    await assert.rejects(getInspectionCase(actor, caseId), status(403));
  assert(
    !(await listInspectionCases(teacher)).items.some(
      (row) => row.id === caseId,
    ),
  );
  assert(
    !(await listInspectionCases(head)).items.some((row) => row.id === caseId),
  );
  pass(
    "BR-61/62: GV và TBM đa vai trò bị loại động; ADMIN/ĐBCL không đọc hồ sơ",
  );
  let current = await getInspectionCase(inspector, caseId);
  assert.equal(current.feedback?.author, null);
  assert.equal(current.feedback?.authorLabel, "Sinh viên ẩn danh");
  current = await assignInspectionCase(inspector, caseId, {
    assigneeId: inspector.userId,
    revision: current.revision,
    requestId: randomUUID(),
    reason: "Phân công cán bộ không có xung đột lợi ích",
  });
  await assert.rejects(
    transition(inspectorOther, caseId, "accept"),
    status(403),
  );
  const accepting = {
    action: "accept",
    revision: current.revision,
    requestId: randomUUID(),
  };
  const accepted = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      transitionInspectionCase(inspector, caseId, {
        ...accepting,
        requestId: randomUUID(),
      }),
    ),
  );
  assert.equal(accepted.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(
    accepted.filter(
      (row) => row.status === "rejected" && status(409)(row.reason),
    ).length,
    5,
  );
  assert.equal(
    await db.inspectionCaseEvent.count({ where: { caseId, event: "ACCEPT" } }),
    1,
  );
  pass("FR-154/BR-22: sáu lệnh tiếp nhận đồng thời tạo đúng một bước xác minh");
  current = await getInspectionCase(inspector, caseId);
  const pdf = Buffer.from("%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF\n");
  const noteInput = {
    revision: current.revision,
    requestId: randomUUID(),
    body: `${prefix} Đã đối chiếu nguồn thông tin giả và ghi nhận biên bản xác minh.`,
  };
  current = await addInspectionNote(inspector, caseId, noteInput, [
    { name: "chung-cu-noi-bo.pdf", content: pdf },
  ]);
  const retried = await addInspectionNote(inspector, caseId, noteInput, [
    { name: "chung-cu-noi-bo.pdf", content: pdf },
  ]);
  assert.equal(retried.revision, current.revision);
  assert.equal(await db.inspectionCaseNote.count({ where: { caseId } }), 1);
  const note = current.notes![0],
    attachment = note.attachments[0];
  assert(!JSON.stringify(current).includes("storageKey"));
  assert(!JSON.stringify(current).includes("chung-cu-noi-bo.pdf"));
  const downloaded = await downloadInspectionNoteAttachment(
    inspector,
    caseId,
    note.id,
    attachment.id,
  );
  assert(downloaded.content.equals(pdf));
  await assert.rejects(
    downloadInspectionNoteAttachment(leader, caseId, note.id, attachment.id),
    status(404),
  );
  await assert.rejects(
    downloadInspectionNoteAttachment(teacher, caseId, note.id, attachment.id),
    status(404),
  );
  assert.equal(
    await db.auditLog.count({
      where: {
        actorId: inspector.userId,
        action: "INSPECTION_INTERNAL_ATTACHMENT_DOWNLOADED",
        objectId: caseId,
      },
    }),
    1,
  );
  const badRevision = current.revision;
  await assert.rejects(
    addInspectionNote(
      inspector,
      caseId,
      {
        revision: badRevision,
        requestId: randomUUID(),
        body: "Ghi chú giả kiểm tra đổi phần mở rộng",
      },
      [{ name: "gia-mao.png", content: pdf }],
    ),
    status(400),
  );
  assert.equal(
    (await getInspectionCase(inspector, caseId)).revision,
    badRevision,
  );
  pass(
    "BR-28/62: ghi chú và PDF nội bộ đúng quyền, hash, retry không trùng, giả mạo bị chặn",
  );
  current = await transition(inspector, caseId, "conclude", {
    conclusion: "CO_CAN_CU",
    reason: `${prefix} Kết luận nội bộ bí mật dựa trên thông tin đã đối chiếu.`,
  });
  assert.equal(current.status, "KET_LUAN");
  assert.deepEqual(await getStudentInspectionResult(student, native.id), {
    status: "KET_LUAN",
    conclusion: null,
    summary: null,
  });
  await assert.rejects(
    getStudentInspectionResult(stranger, native.id),
    status(404),
  );
  const leaderView = await getInspectionCase(leader, caseId);
  assert.equal(leaderView.level, "summary");
  for (const field of [
    "feedback",
    "notes",
    "events",
    "assignee",
    "reason",
    "studentSummary",
  ])
    assert(!(field in leaderView));
  const studentSummary = `${prefix} Nội dung tóm tắt được phép gửi sinh viên sau khi hoàn tất xác minh.`;
  current = await transition(inspector, caseId, "notify", { studentSummary });
  assert.equal(current.status, "THONG_BAO");
  assert.equal(
    (await getStudentInspectionResult(student, native.id)).summary,
    studentSummary,
  );
  const notices = await db.notification.findMany({
    where: { targetId: { in: [caseId, native.id] } },
  });
  assert(notices.some((notice) => notice.userId === student.userId));
  assert(notices.some((notice) => notice.userId === leader.userId));
  assert(
    notices.every(
      (notice) =>
        !notice.body.includes(studentSummary) &&
        !notice.body.includes(noteInput.body),
    ),
  );
  current = await transition(inspector, caseId, "close");
  assert.equal(current.status, "DONG");
  assert.equal((await getFeedback(student, native.id)).status, "DA_DONG");
  pass(
    "FR-156/BR-62/63: kết luận→thông báo→đóng, sinh viên chỉ nhận tóm tắt, LĐ không nhận nội dung",
  );
  const returning = await create(student);
  const returnCaseId = returning.inspectionId!;
  const returned = await transition(inspector, returnCaseId, "return", {
    reason: `${prefix} Nội dung thuộc phản hồi thường, không chuyển nội dung hồ sơ bí mật.`,
    returnCategory: "TO_CHUC_LOP_HOC",
  });
  assert.equal(returned.status, "CHUYEN_LAI");
  const ordinaryReturned = await getFeedback(training, returning.id);
  assert.equal(ordinaryReturned.category, "TO_CHUC_LOP_HOC");
  assert.equal(ordinaryReturned.author, null);
  assert.equal(ordinaryReturned.identityLevel, null);
  assert(
    !JSON.stringify(ordinaryReturned).includes(
      "không chuyển nội dung hồ sơ bí mật",
    ),
  );
  await assert.rejects(getInspectionCase(training, returnCaseId), status(403));
  pass(
    "FR-154: CHUYEN_LAI về luồng thường giữ ẩn danh, không lộ lý do hoặc ghi chú hồ sơ",
  );
  const ordinary = await create(student, "TO_CHUC_LOP_HOC", false);
  const input = {
    revision: ordinary.revision,
    requestId: randomUUID(),
    reason: "Nội dung cần xác minh theo thẩm quyền Thanh tra",
    violation: "HANH_VI_KHONG_PHU_HOP",
  };
  const transferResults = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      transferFeedbackToInspection(training, ordinary.id, {
        ...input,
        requestId: randomUUID(),
      }),
    ),
  );
  const successes = transferResults.filter(
    (result) => result.status === "fulfilled",
  );
  const conflicts = transferResults.filter(
    (result) => result.status === "rejected" && status(409)(result.reason),
  );
  assert.equal(successes.length, 1);
  assert.equal(conflicts.length, 5);
  concurrent = {
    requests: 6,
    succeeded: successes.length,
    conflicts: conflicts.length,
  };
  assert.equal(
    await db.inspectionCase.count({ where: { feedbackId: ordinary.id } }),
    1,
  );
  const summary = await getTransferredFeedbackSummary(training, ordinary.id);
  assert.equal(summary.status, "TIEP_NHAN");
  assert.deepEqual(
    Object.keys(summary).sort(),
    ["id", "caseId", "feedbackId", "source", "status", "conclusion"].sort(),
  );
  assert(
    (await listTransferredFeedbackSummaries(training)).some(
      (row) => row.feedbackId === ordinary.id,
    ),
  );
  await assert.rejects(getFeedback(training, ordinary.id), status(404));
  await assert.rejects(
    getInspectionCase(training, summary.caseId),
    status(403),
  );
  await assert.rejects(
    getTransferredFeedbackSummary(quality, ordinary.id),
    status(404),
  );
  await assert.rejects(getInspectionCase(head, summary.caseId), status(404));
  pass(
    "FR-157/BR-64: sáu lệnh chuyển chỉ tạo một hồ sơ, người chuyển chỉ còn trạng thái/kết luận",
  );
  const before = await db.inspectionCase.findUniqueOrThrow({
    where: { id: summary.caseId },
  });
  await db.teachingAssignment.create({
    data: { sectionId: section.id, teacherId: inspectorOther.userId },
  });
  await assert.rejects(
    getInspectionCase(inspectorOther, summary.caseId),
    status(404),
  );
  assert(
    !(await listInspectionCases(inspectorOther)).items.some(
      (row) => row.id === summary.caseId,
    ),
  );
  assert.equal(
    (
      await db.inspectionCase.findUniqueOrThrow({
        where: { id: summary.caseId },
      })
    ).revision,
    before.revision,
  );
  await db.userSession.update({
    where: { id: inspector.sessionId },
    data: { revokedAt: new Date() },
  });
  await assert.rejects(
    getInspectionCase(inspector, summary.caseId),
    status(401),
  );
  pass(
    "BR-34/61: phân công giảng viên và thu hồi phiên có hiệu lực ngay với hồ sơ hiện có",
  );
  passed = true;
} catch (error) {
  process.exitCode = 1;
  console.error(
    `Kiểm Thanh tra Tuần11 chưa qua: ${error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name : "Lỗi chưa xác định"}`,
  );
} finally {
  if (verified)
    try {
      const owned = await db.feedback.findMany({
          where: { authorId: { in: users } },
          select: { id: true },
        }),
        ids = owned.map((row) => row.id);
      const ownedCases = await db.inspectionCase.findMany({
          where: { feedbackId: { in: ids } },
          select: { id: true },
        }),
        caseIds = ownedCases.map((row) => row.id);
      const notes = await db.inspectionCaseNote.findMany({
        where: { caseId: { in: caseIds } },
        select: { internalFiles: true },
      });
      const fileKeys = notes.flatMap((note) =>
        Array.isArray(note.internalFiles)
          ? (note.internalFiles as unknown as { storageKey: string }[]).map(
              (file) => file.storageKey,
            )
          : [],
      );
      await db.$transaction(
        async (tx) => {
          await tx.emailOutbox.deleteMany({
            where: { notification: { userId: { in: users } } },
          });
          await tx.notification.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.inspectionCaseNote.deleteMany({
            where: { caseId: { in: caseIds } },
          });
          await tx.inspectionCaseEvent.deleteMany({
            where: { caseId: { in: caseIds } },
          });
          await tx.inspectionCase.deleteMany({
            where: { id: { in: caseIds } },
          });
          await tx.slaEscalation.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.feedbackRating.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.attachment.deleteMany({
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
          await tx.feedback.deleteMany({ where: { id: { in: ids } } });
          await tx.auditLog.deleteMany({ where: { actorId: { in: users } } });
          await tx.enrollment.deleteMany({
            where: { sectionId: { in: sections } },
          });
          await tx.teachingAssignment.deleteMany({
            where: { sectionId: { in: sections } },
          });
          await tx.courseSection.deleteMany({
            where: { id: { in: sections } },
          });
          await tx.course.deleteMany({ where: { id: { in: courses } } });
          await tx.semester.deleteMany({ where: { id: { in: semesters } } });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.userSession.deleteMany({ where: { userId: { in: users } } });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          await tx.department.deleteMany({
            where: { id: { in: departments } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: faculties } } });
        },
        { timeout: 30000 },
      );
      for (const key of fileKeys) await removePrivateAttachment(key);
      assert.equal(await db.user.count({ where: { id: { in: users } } }), 0);
      cleaned = true;
    } catch {
      passed = false;
      process.exitCode = 1;
      console.error(
        "Fixture Thanh tra Tuần11 chưa dọn xong; giữ marker và database để kiểm tra.",
      );
    }
  save();
  await db.$disconnect();
}
