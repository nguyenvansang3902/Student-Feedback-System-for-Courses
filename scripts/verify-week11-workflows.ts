import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import {
  ensureDueImprovements,
  ensureRequiredImprovements,
  getImprovement,
  listImprovements,
  mutateImprovement,
  remindDomainWorkflows,
} from "../src/server/services/improvements";
import { lockAdminMutations } from "../src/server/services/access";
import {
  createExamRecommendation,
  getExamRecommendation,
  getRecommendationOptions,
  listExamRecommendations,
  respondExamRecommendation,
} from "../src/server/services/exam-recommendations";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
} from "../src/server/services/survey-score";

// Phải xác minh đích thử trước getDb, tạo fixture và dọn dữ liệu.
const marker = JSON.parse(
  readFileSync(".local/week11-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK11_TEST_DATABASE_URL ?? "");
assert(
  main.protocol === "mysql:" &&
    ["127.0.0.1", "localhost"].includes(main.hostname),
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
  "WEEK10_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert(test.pathname !== new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
const db = getDb(),
  prefix = `W11WF${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  semesters: string[] = [],
  courses: string[] = [],
  sections: string[] = [],
  templates: string[] = [],
  campaigns: string[] = [],
  plans: string[] = [],
  recommendations: string[] = [];
const cases: string[] = [];
let verified = false,
  cleaned = false,
  passed = false;
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử workflow Tuần 11 trên dữ liệu giả riêng",
};
function save() {
  writeFileSync(
    ".local/week11-workflows-result.json",
    JSON.stringify(
      {
        status: passed ? "passed" : "failed",
        cases,
        passed: cases.length,
        cleaned,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
function pass(name: string) {
  cases.push(name);
  console.log(
    `QUA W11-WORKFLOW-${cases.length.toString().padStart(2, "0")} ${name}`,
  );
}
async function identity(
  role: Role,
  index: number,
  passwordHash: string,
): Promise<AuthActor> {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          scopeKey: `DEPARTMENT:${departments[index]}`,
          departmentId: departments[index],
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            scopeKey: `FACULTY:${faculties[index]}`,
            facultyId: faculties[index],
          }
        : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const user = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
      displayName: `${prefix} ${role}`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: { role, ...scope } },
    },
    include: { roles: true },
  });
  users.push(user.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        user,
        { ip: "week11-workflow-fixture" },
        "FULL",
        true,
      ),
    )
  ).actor;
}
const mutation = () => ({ revision: 1, requestId: randomUUID() });
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  for (let i = 0; i < 2; i++) {
    const faculty = await db.faculty.create({
      data: { code: `${prefix}F${i}`, name: `Khoa giả ${i}` },
    });
    faculties.push(faculty.id);
    const department = await db.department.create({
      data: {
        code: `${prefix}D${i}`,
        name: `Bộ môn giả ${i}`,
        facultyId: faculty.id,
      },
    });
    departments.push(department.id);
  }
  const passwordHash = await hash("KiemThuGia!2026", 12);
  const teacher = await identity("GIANG_VIEN", 0, passwordHash),
    teacher2 = await identity("GIANG_VIEN", 0, passwordHash),
    head = await identity("TRUONG_BO_MON", 0, passwordHash),
    otherHead = await identity("TRUONG_BO_MON", 1, passwordHash),
    dean = await identity("TRUONG_KHOA", 0, passwordHash),
    exam = await identity("PHONG_KHAO_THI", 0, passwordHash),
    quality = await identity("CAN_BO_DBCL", 0, passwordHash),
    student = await identity("SINH_VIEN", 0, passwordHash),
    admin = await identity("ADMIN", 0, passwordHash);
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: "Học kỳ giả kiểm Tuần 11",
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2027-02-01"),
    },
  });
  semesters.push(semester.id);
  const course = await db.course.create({
    data: {
      code: `${prefix}C`,
      name: "Môn học giả kiểm quy trình",
      credits: 3,
      departmentId: departments[0],
    },
  });
  courses.push(course.id);
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: "Mẫu giả kiểm giải trình",
      status: "DA_KHOA",
      createdById: quality.userId,
    },
  });
  templates.push(template.id);
  const group = await db.criterionGroup.create({
    data: {
      templateId: template.id,
      title: "Kiểm tra, đánh giá",
      position: 1,
      weight: 1,
      isAssessmentGroup: true,
    },
  });
  const question = await db.question.create({
    data: {
      groupId: group.id,
      label: "Hình thức kiểm tra phù hợp",
      type: "LIKERT",
      position: 1,
      weight: 1,
      scaleMin: 1,
      scaleMax: 5,
      required: true,
    },
  });
  const publishedAt = new Date(Date.now() - 86400000);
  const campaign = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt giả đã công bố`,
      semesterId: semester.id,
      templateId: template.id,
      scope: "GLOBAL",
      startsAt: new Date(Date.now() - 4 * 86400000),
      endsAt: new Date(Date.now() - 2 * 86400000),
      status: "DA_CONG_BO",
      warningScore: 3,
      explanationDays: 14,
      createdById: quality.userId,
      history: {
        create: {
          actorId: quality.userId,
          fromStatus: "DA_TONG_HOP",
          toStatus: "DA_CONG_BO",
          occurredAt: publishedAt,
        },
      },
    },
  });
  campaigns.push(campaign.id);
  for (const [index, owner] of [teacher, teacher2].entries()) {
    const section = await db.courseSection.create({
      data: {
        code: `${prefix}L${index}`,
        courseId: course.id,
        semesterId: semester.id,
        teaching: { create: { teacherId: owner.userId, isLead: true } },
      },
    });
    sections.push(section.id);
    await db.campaignSection.create({
      data: { campaignId: campaign.id, sectionId: section.id },
    });
    const scoreTemplate = {
      groups: [
        {
          id: group.id,
          title: group.title,
          position: 1,
          weight: 1,
          isAssessmentGroup: true,
          questions: [
            {
              id: question.id,
              label: question.label,
              type: "LIKERT" as const,
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
    const score = calculateSurveyScore(
      scoreTemplate,
      [{ questionId: question.id, valueNumber: 2, count: 5 }],
      {
        responseCount: 5,
        taskCount: 5,
        doneTaskCount: 5,
        minResponses: 5,
        minRate: 0.3,
      },
    );
    await db.aggregateResult.create({
      data: {
        campaignId: campaign.id,
        sectionId: section.id,
        responseCount: 5,
        taskCount: 5,
        participationRate: 1,
        overallScore: 2,
        eligibleToPublish: true,
        aggregatedAt: publishedAt,
        details: {
          version: 2,
          templateId: template.id,
          template: scoreTemplate,
          teacherIds: [owner.userId],
          bands: [...DEFAULT_SURVEY_RATING_BANDS],
          score,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
  const initialized = await Promise.all(
    Array.from({ length: 4 }, () =>
      db.$transaction(async (tx) => {
        await lockAdminMutations(tx);
        return ensureRequiredImprovements(tx, campaign.id);
      }),
    ),
  );
  await ensureDueImprovements(consoleActor);
  assert.equal(
    initialized.reduce((sum, x) => sum + x.created, 0),
    2,
  );
  const rows = await db.improvementPlan.findMany({
    where: { campaignId: campaign.id },
    orderBy: { teacherId: "asc" },
  });
  plans.push(...rows.map((r) => r.id));
  assert.equal(rows.length, 2);
  assert(
    rows.every(
      (r) => r.dueAt.getTime() === publishedAt.getTime() + 14 * 86400000,
    ),
  );
  pass(
    "BR-10: bốn job đồng thời chỉ tạo hai giải trình, hạn 14 ngày từ công bố",
  );
  const own = rows.find((r) => r.teacherId === teacher.userId)!,
    other = rows.find((r) => r.teacherId === teacher2.userId)!;
  assert.equal((await listImprovements(teacher, {})).items.length, 1);
  assert.equal((await listImprovements(head, {})).items.length, 2);
  assert.equal((await listImprovements(dean, {})).items.length, 2);
  await assert.rejects(getImprovement(teacher, other.id), { status: 404 });
  await assert.rejects(getImprovement(otherHead, own.id), { status: 404 });
  await assert.rejects(getImprovement(admin, own.id), { status: 403 });
  await assert.rejects(getImprovement(student, own.id), { status: 403 });
  await assert.rejects(getImprovement(exam, own.id), { status: 403 });
  pass(
    "BR-18/34: IDOR và vai trò ngoài phạm vi, không suy quyền giải trình từ ADMIN",
  );
  const first = {
    ...mutation(),
    action: "submit",
    explanation: "Nguyên nhân giả được mô tả rõ để kiểm thử quy trình.",
    actionPlan: "Kế hoạch giả điều chỉnh tài liệu và phương pháp đánh giá.",
  };
  const sent = await Promise.all(
    Array.from({ length: 4 }, () => mutateImprovement(teacher, own.id, first)),
  );
  assert(sent.every((r) => r.status === "DA_GUI"));
  assert.equal(
    await db.improvementHistory.count({ where: { planId: own.id } }),
    1,
  );
  await assert.rejects(
    mutateImprovement(teacher, own.id, {
      ...first,
      explanation: "Nội dung khác nhưng dùng lại mã yêu cầu ban đầu.",
    }),
    { status: 409 },
  );
  pass(
    "BR-10: gửi lặp/đồng thời chỉ thêm một lịch sử, requestId khác nội dung bị chặn",
  );
  await assert.rejects(
    mutateImprovement(head, own.id, {
      revision: 2,
      requestId: randomUUID(),
      action: "supplement",
      comment: "",
    }),
    { status: 400 },
  );
  const supplement = await mutateImprovement(head, own.id, {
    revision: 2,
    requestId: randomUUID(),
    action: "supplement",
    comment: "Cần bổ sung thời hạn cụ thể cho từng hành động.",
  });
  assert.equal(supplement.status, "CAN_BO_SUNG");
  const resent = await mutateImprovement(teacher, own.id, {
    ...first,
    revision: 3,
    requestId: randomUUID(),
  });
  assert.equal(resent.status, "DA_GUI");
  const confirm = {
    revision: 4,
    requestId: randomUUID(),
    action: "confirm",
    comment: "Kế hoạch đáp ứng yêu cầu và có thể theo dõi thực hiện.",
  };
  assert.equal(
    (await mutateImprovement(head, own.id, confirm)).status,
    "DA_XAC_NHAN",
  );
  assert.equal(
    (await mutateImprovement(head, own.id, confirm)).status,
    "DA_XAC_NHAN",
  );
  assert.equal(
    await db.improvementHistory.count({ where: { planId: own.id } }),
    4,
  );
  await assert.rejects(
    mutateImprovement(teacher, own.id, {
      ...first,
      revision: 5,
      requestId: randomUUID(),
    }),
    { status: 409 },
  );
  pass("BR-10: gửi → bổ sung có lý do → gửi lại → xác nhận, lịch sử bất biến");
  await db.semester.update({
    where: { id: semester.id },
    data: { lockedAt: new Date() },
  });
  await assert.rejects(
    mutateImprovement(teacher2, other.id, {
      ...first,
      requestId: randomUUID(),
    }),
    { status: 409 },
  );
  await db.semester.update({
    where: { id: semester.id },
    data: { lockedAt: null },
  });
  pass("BR-17: học kỳ khóa sổ chặn gửi giải trình");
  await db.improvementPlan.update({
    where: { id: other.id },
    data: { dueAt: new Date(Date.now() - 2 * 86400000) },
  });
  assert.equal((await getImprovement(teacher2, other.id)).isOverdue, true);
  const noticesBefore = await db.notification.count({
    where: { targetType: "ImprovementPlan", targetId: other.id },
  });
  await remindDomainWorkflows(consoleActor);
  assert.equal(
    await db.notification.count({
      where: { targetType: "ImprovementPlan", targetId: other.id },
    }),
    noticesBefore,
  );
  pass(
    "FR-82: truy cập đầu tiên nhắc quá hạn, scheduler lặp không tạo trùng trong ngày",
  );
  const options = await getRecommendationOptions(exam);
  assert(
    options.campaigns.some(
      (c) => c.id === campaign.id && c.courses.some((c) => c.id === course.id),
    ),
  );
  const payload = {
    campaignId: campaign.id,
    courseId: course.id,
    recipientId: head.userId,
    body: "Đề nghị rà soát hình thức kiểm tra dựa trên dữ liệu gộp giả.",
    requestId: randomUUID(),
  };
  const created = await Promise.all(
    Array.from({ length: 4 }, () => createExamRecommendation(exam, payload)),
  );
  assert(created.every((r) => r.id === created[0].id));
  recommendations.push(created[0].id);
  assert.equal(
    await db.examReviewRecommendation.count({
      where: { senderId: exam.userId },
    }),
    1,
  );
  const rec = created[0];
  assert.equal(rec.status, "DA_GUI");
  assert(
    Math.abs(new Date(rec.dueAt).getTime() - Date.now() - 14 * 86400000) <
      15000,
  );
  assert(!JSON.stringify(options).includes("sectionId"));
  assert(!JSON.stringify(options).includes("teacherId"));
  assert(!JSON.stringify(options).includes("overallScore"));
  pass(
    "BR-57/58: kiến nghị từ môn đủ dữ liệu gộp, hạn 14 ngày, đồng thời chỉ một hồ sơ",
  );
  await assert.rejects(
    createExamRecommendation(exam, {
      ...payload,
      requestId: randomUUID(),
      recipientId: otherHead.userId,
    }),
    { status: 404 },
  );
  await assert.rejects(getExamRecommendation(otherHead, rec.id), {
    status: 404,
  });
  await assert.rejects(getExamRecommendation(admin, rec.id), { status: 403 });
  await assert.rejects(getExamRecommendation(teacher, rec.id), { status: 403 });
  assert.equal((await listExamRecommendations(head, {})).items.length, 1);
  assert.equal((await listExamRecommendations(dean, {})).items.length, 1);
  pass(
    "BR-58/34: chọn đúng trưởng bộ môn, người ngoài phạm vi và ADMIN bị chặn",
  );
  await db.examReviewRecommendation.update({
    where: { id: rec.id },
    data: { dueAt: new Date(Date.now() - 86400000) },
  });
  assert.equal((await getExamRecommendation(head, rec.id)).isOverdue, true);
  const overdueNotices = await db.notification.findMany({
    where: {
      targetType: "ExamReviewRecommendation",
      targetId: rec.id,
      title: "Kiến nghị rà soát đã quá hạn",
    },
  });
  assert(overdueNotices.some((n) => n.userId === head.userId));
  assert(overdueNotices.some((n) => n.userId === dean.userId));
  const oldCount = overdueNotices.length;
  await remindDomainWorkflows(consoleActor);
  assert.equal(
    await db.notification.count({
      where: {
        targetType: "ExamReviewRecommendation",
        targetId: rec.id,
        title: "Kiến nghị rà soát đã quá hạn",
      },
    }),
    oldCount,
  );
  pass(
    "BR-58/FR-82: quá hạn nhắc trưởng bộ môn và báo trưởng khoa, không nhân đôi",
  );
  await assert.rejects(
    respondExamRecommendation(head, rec.id, {
      ...mutation(),
      outcome: "DA_TIEP_THU",
      reason: "",
    }),
    { status: 400 },
  );
  const response = {
    ...mutation(),
    outcome: "KHONG_TIEP_THU",
    reason:
      "Dữ liệu giả cần được đối chiếu thêm trước khi thay đổi hình thức kiểm tra.",
  };
  const answered = await Promise.all(
    Array.from({ length: 4 }, () =>
      respondExamRecommendation(head, rec.id, response),
    ),
  );
  assert(answered.every((r) => r.status === "DA_PHAN_HOI"));
  assert.equal(answered[0].revision, 2);
  assert.equal(answered[0].outcome, "KHONG_TIEP_THU");
  await assert.rejects(
    respondExamRecommendation(head, rec.id, {
      ...response,
      reason: "Dùng lại mã yêu cầu nhưng đổi nội dung phản hồi.",
    }),
    { status: 409 },
  );
  assert.equal(
    (await getExamRecommendation(exam, rec.id)).responseReason,
    response.reason,
  );
  pass(
    "BR-58: tiếp thu/không tiếp thu có lý do, retry cùng nội dung và CAS đúng",
  );
  await db.roleAssignment.deleteMany({
    where: { userId: head.userId, role: "TRUONG_BO_MON" },
  });
  await assert.rejects(getImprovement(head, own.id), { status: 403 });
  await assert.rejects(getExamRecommendation(head, rec.id), { status: 403 });
  await db.userSession.update({
    where: { id: teacher.sessionId },
    data: { revokedAt: new Date() },
  });
  await assert.rejects(getImprovement(teacher, own.id), { status: 401 });
  pass("BR-34: thu hồi vai trò hoặc phiên có hiệu lực ngay ở tầng service");
  const notices = await db.notification.findMany({
    where: {
      OR: [
        { targetType: "ImprovementPlan", targetId: { in: plans } },
        {
          targetType: "ExamReviewRecommendation",
          targetId: { in: recommendations },
        },
      ],
    },
    include: { email: true },
  });
  assert(notices.length > 0 && notices.every((n) => !!n.email));
  assert(
    notices.every(
      (n) =>
        !n.body.includes(first.explanation) &&
        !n.body.includes(payload.body) &&
        !n.body.includes(response.reason),
    ),
  );
  pass(
    "FR-80/81: thông báo và outbox cùng giao dịch, không sao chép nội dung hồ sơ",
  );
  passed = true;
} catch (error) {
  process.exitCode = 1;
  console.error(
    `Kiểm workflow Tuần11 chưa qua: ${error instanceof Error ? error.name : "Lỗi chưa xác định"}`,
  );
} finally {
  if (verified)
    try {
      const ownedPlans = await db.improvementPlan.findMany({
        where: { campaignId: { in: campaigns } },
        select: { id: true },
      });
      plans.push(...ownedPlans.map((row) => row.id));
      await db.$transaction(
        async (tx) => {
          await lockAdminMutations(tx);
          await tx.emailOutbox.deleteMany({
            where: { notification: { userId: { in: users } } },
          });
          await tx.notification.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.improvementHistory.deleteMany({
            where: { plan: { campaignId: { in: campaigns } } },
          });
          await tx.improvementPlan.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.examReviewRecommendation.deleteMany({
            where: { senderId: { in: users } },
          });
          await tx.aggregateResult.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.campaignHistory.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.campaignSection.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.surveyCampaign.deleteMany({
            where: { id: { in: campaigns } },
          });
          await tx.question.deleteMany({
            where: { group: { templateId: { in: templates } } },
          });
          await tx.criterionGroup.deleteMany({
            where: { templateId: { in: templates } },
          });
          await tx.surveyTemplate.deleteMany({
            where: { id: { in: templates } },
          });
          await tx.teachingAssignment.deleteMany({
            where: { sectionId: { in: sections } },
          });
          await tx.courseSection.deleteMany({
            where: { id: { in: sections } },
          });
          await tx.course.deleteMany({ where: { id: { in: courses } } });
          await tx.semester.deleteMany({ where: { id: { in: semesters } } });
          await tx.auditLog.deleteMany({
            where: {
              OR: [
                { actorId: { in: users } },
                { objectType: "ImprovementPlan", objectId: { in: plans } },
                {
                  objectType: "ExamReviewRecommendation",
                  objectId: { in: recommendations },
                },
              ],
            },
          });
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
      assert.equal(await db.user.count({ where: { id: { in: users } } }), 0);
      cleaned = true;
    } catch (error) {
      passed = false;
      process.exitCode = 1;
      console.error(
        `Fixture workflow chưa dọn xong: ${error instanceof Error ? error.name : "Lỗi DB"}`,
      );
    }
  save();
  await db.$disconnect();
}
