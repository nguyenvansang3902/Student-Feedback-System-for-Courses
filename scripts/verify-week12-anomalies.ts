import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import { lockAdminMutations } from "../src/server/services/access";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyScoreTemplate,
} from "../src/server/services/survey-score";
import { ensureCampaignAnomalies } from "../src/server/services/survey-anomaly-detection";
import {
  getSurveyAnomaly,
  listSurveyAnomalies,
  reviewSurveyAnomaly,
} from "../src/server/services/survey-anomalies";
import {
  getAnomalySettings,
  updateAnomalySettings,
} from "../src/server/services/survey-anomaly-settings";
import {
  getInspectionCase,
  transitionInspectionCase,
  addInspectionNote,
} from "../src/server/services/inspection-workflow";
import { publishSurveyResults } from "../src/server/services/survey-results-mutations";
import {
  canReadNoticeTarget,
  noticeRecipientActor,
} from "../src/server/services/notification-access";
const marker = JSON.parse(
    readFileSync(".local/week12-test-database.json", "utf8"),
  ),
  main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK12_TEST_DATABASE_URL ?? "");
assert(
  main.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(main.hostname),
);
assert(
  marker.purpose === "isolated-week12-tests" &&
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
  test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w12test_`) &&
    /_[a-f0-9]{8}$/.test(test.pathname),
);
for (const key of [
  "SHADOW_DATABASE_URL",
  "W4_TEST_DATABASE_URL",
  "WEEK10_TEST_DATABASE_URL",
  "WEEK11_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert(test.pathname !== new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
const db = getDb(),
  prefix = `W12A${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  students: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  courses: string[] = [],
  semesters: string[] = [],
  templates: string[] = [],
  sections: string[] = [],
  campaigns: string[] = [],
  cases: string[] = [];
let verified = false,
  passed = false,
  cleaned = false,
  settingsBefore: Awaited<ReturnType<typeof db.systemSetting.findUnique>> =
    null;
function save() {
  writeFileSync(
    ".local/week12-anomalies-result.json",
    JSON.stringify(
      {
        status: passed && cleaned ? "passed" : "incomplete",
        passed: cases.length,
        cases,
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
  console.log(`QUA W12-A${cases.length.toString().padStart(2, "0")} ${name}`);
  save();
}
const status = (expected: number) => (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  "status" in error &&
  error.status === expected;
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
      : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const row = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      displayName: `${prefix} ${role}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
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
  users.push(row.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        row,
        { ip: "week12-anomaly-fixture" },
        "FULL",
        true,
      ),
    )
  ).actor;
}
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  settingsBefore = await db.systemSetting.findUnique({
    where: { key: "SURVEY_ANOMALY_SETTINGS" },
  });
  const faculty = await db.faculty.create({
    data: { code: prefix + "F", name: "Khoa giả bất thường" },
  });
  faculties.push(faculty.id);
  const department = await db.department.create({
    data: { code: prefix + "D", name: "Bộ môn giả", facultyId: faculty.id },
  });
  departments.push(department.id);
  const course = await db.course.create({
    data: {
      code: prefix + "C",
      name: "Môn giả kiểm bất thường",
      credits: 3,
      departmentId: department.id,
    },
  });
  courses.push(course.id);
  const passwordHash = await hash("KiemThu2026!BatThuong", 12),
    quality = await client("CAN_BO_DBCL", passwordHash),
    inspector = await client("THANH_TRA", passwordHash),
    teacher = await client("GIANG_VIEN", passwordHash, "THANH_TRA"),
    head = await client("TRUONG_BO_MON", passwordHash, "THANH_TRA"),
    leader = await client("LANH_DAO", passwordHash),
    admin = await client("ADMIN", passwordHash);
  for (let i = 0; i < 20; i++) {
    const value = await client("SINH_VIEN", passwordHash);
    students.push(value.userId);
  }
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: "Mẫu hai câu giả",
      status: "DA_KHOA",
      createdById: quality.userId,
    },
  });
  templates.push(template.id);
  const group = await db.criterionGroup.create({
    data: {
      templateId: template.id,
      title: "Giảng dạy",
      position: 1,
      weight: 1,
    },
  });
  const questions = await Promise.all(
    [1, 2].map((position) =>
      db.question.create({
        data: {
          groupId: group.id,
          label: `Câu giả ${position}`,
          type: "LIKERT",
          position,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
        },
      }),
    ),
  );
  const scoreTemplate: SurveyScoreTemplate = {
    groups: [
      {
        id: group.id,
        title: group.title,
        position: 1,
        weight: 1,
        isAssessmentGroup: false,
        questions: questions.map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          position: q.position,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        })),
      },
    ],
  };
  const now = Date.now();
  const latestSemester = await db.semester.findFirst({
    orderBy: [{ startsOn: "desc" }, { id: "asc" }],
    select: { startsOn: true },
  });
  // BR-65 chọn kỳ liền trước toàn hệ thống. Giữ cặp fixture liền nhau,
  // không giả định database chưa có các học kỳ được E2E giữ lại.
  const semesterBase = Math.max(
    new Date(new Date(now).toISOString().slice(0, 10)).getTime(),
    latestSemester?.startsOn.getTime() ?? 0,
  );
  for (let index = 0; index < 2; index++) {
    const semester = await db.semester.create({
      data: {
        code: prefix + "S" + index,
        name: index ? "Kỳ hiện tại giả" : "Kỳ trước giả",
        startsOn: new Date(semesterBase + (index + 1) * 86400000),
        endsOn: new Date(semesterBase + (index + 90) * 86400000),
      },
    });
    semesters.push(semester.id);
    const campaign = await db.surveyCampaign.create({
      data: {
        title: prefix + " Đợt giả " + index,
        semesterId: semester.id,
        templateId: template.id,
        scope: "SECTIONS",
        startsAt: new Date(now - 5 * 86400000),
        endsAt: new Date(now - 86400000),
        status: index ? "DA_TONG_HOP" : "DA_CONG_BO",
        createdById: quality.userId,
        minResponses: 5,
        minRate: 0.3,
      },
    });
    campaigns.push(campaign.id);
    const cohorts = index
      ? [
          [10, 7],
          [9, 9],
          [10, 6],
        ]
      : [[10, 0]];
    for (const [ordinal, [count, uniform]] of cohorts.entries()) {
      const section = await db.courseSection.create({
        data: {
          code: prefix + `L${index}${ordinal}`,
          courseId: course.id,
          semesterId: semester.id,
          teaching: { create: { teacherId: teacher.userId, isLead: true } },
        },
      });
      sections.push(section.id);
      await db.campaignSection.create({
        data: { campaignId: campaign.id, sectionId: section.id },
      });
      await db.surveyTask.createMany({
        data: students.map((studentId, i) => ({
          campaignId: campaign.id,
          sectionId: section.id,
          studentId,
          status: i < count ? "DONE" : "PENDING",
          doneDate:
            i < count ? new Date(new Date().toISOString().slice(0, 10)) : null,
        })),
      });
      const answers: { questionId: string; valueNumber: number }[] = [];
      for (let i = 0; i < count; i++) {
        const values = index ? (i < uniform ? [2, 2] : [1, 3]) : [4, 5];
        const response = await db.surveyResponse.create({
          data: {
            campaignId: campaign.id,
            sectionId: section.id,
            submittedDate: new Date(new Date().toISOString().slice(0, 10)),
          },
        });
        await db.surveyAnswer.createMany({
          data: questions.map((q, j) => ({
            responseId: response.id,
            questionId: q.id,
            valueNumber: values[j],
          })),
        });
        answers.push(
          ...questions.map((q, j) => ({
            questionId: q.id,
            valueNumber: values[j],
          })),
        );
      }
      const score = calculateSurveyScore(scoreTemplate, answers, {
        responseCount: count,
        taskCount: 20,
        doneTaskCount: count,
        minResponses: 5,
        minRate: 0.3,
      });
      await db.aggregateResult.create({
        data: {
          campaignId: campaign.id,
          sectionId: section.id,
          responseCount: count,
          taskCount: 20,
          participationRate: score.participationRate,
          overallScore: score.overallScore,
          eligibleToPublish: score.eligibleToPublish,
          aggregatedAt: new Date(),
          details: {
            version: 2,
            templateId: template.id,
            template: scoreTemplate,
            teacherIds: [teacher.userId],
            bands: DEFAULT_SURVEY_RATING_BANDS,
            score,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }
  const fixtureCurrent = await db.semester.findUniqueOrThrow({
    where: { id: semesters[1] },
    select: { startsOn: true },
  });
  assert.equal(
    (
      await db.semester.findFirstOrThrow({
        where: { startsOn: { lt: fixtureCurrent.startsOn } },
        orderBy: [{ startsOn: "desc" }, { id: "asc" }],
        select: { id: true },
      })
    ).id,
    semesters[0],
    "Cặp kỳ fixture phải liền nhau kể cả khi còn dữ liệu E2E của kỳ khác.",
  );
  const runs = await Promise.all(
    Array.from({ length: 6 }, () =>
      db.$transaction(
        async (tx) => {
          await lockAdminMutations(tx);
          return ensureCampaignAnomalies(tx, campaigns[1]);
        },
        { maxWait: 15000, timeout: 120000 },
      ),
    ),
  );
  assert.equal(
    runs.reduce((sum, row) => sum + row.created, 0),
    3,
  );
  assert.equal(
    await db.surveyAnomalyFlag.count({ where: { campaignId: campaigns[1] } }),
    3,
  );
  pass("BR-65: sáu job đồng thời chỉ tạo ba cờ theo rule, không nhân bản");
  assert.equal(
    await db.surveyAnomalyFlag.count({ where: { sectionId: sections[2] } }),
    0,
  );
  assert.equal(
    await db.surveyAnomalyFlag.count({
      where: { sectionId: sections[3], ruleCode: "UNIFORM_LIKERT" },
    }),
    0,
  );
  const flag = await db.surveyAnomalyFlag.findUniqueOrThrow({
    where: {
      campaignId_sectionId_ruleCode: {
        campaignId: campaigns[1],
        sectionId: sections[1],
        ruleCode: "UNIFORM_LIKERT",
      },
    },
  });
  const view = await getSurveyAnomaly(inspector, flag.id);
  assert.equal(view.metrics.uniformRate, 0.7);
  assert.equal(view.metrics.scoreDeltaAbs, 2.5);
  assert.equal(view.metrics.responseCount, 10);
  for (const value of [
    ...students,
    teacher.userId,
    "overallScore",
    "teacherIds",
    "answers",
    "comments",
  ])
    assert(!JSON.stringify(view).includes(value));
  pass(
    "BR-65/67: biên9/10phiếu và6/7phiếuđồngnhất, delta cùngmôn/mẫu2.5, DTO khôngđiểm/danh tính",
  );
  for (const current of [teacher, head])
    await assert.rejects(getSurveyAnomaly(current, flag.id), status(404));
  for (const current of [quality, leader, admin])
    await assert.rejects(getSurveyAnomaly(current, flag.id), status(403));
  assert(
    !(await listSurveyAnomalies(teacher)).items.some(
      (row) => row.id === flag.id,
    ),
  );
  pass(
    "BR-61/65/68: TT đa vai trò xung đột404, ADMIN/ĐBCL/LĐ không đọc chỉ số",
  );
  const decisions = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      reviewSurveyAnomaly(inspector, flag.id, {
        revision: 1,
        requestId: randomUUID(),
        decision: "CHUYEN_XAC_MINH",
        note: "Đề nghị xác minh cách tổ chức khảo sát từ các chỉ số giả.",
      }),
    ),
  );
  assert.equal(decisions.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(
    decisions.filter(
      (row) => row.status === "rejected" && status(409)(row.reason),
    ).length,
    5,
  );
  assert.equal(
    await db.surveyAnomalyReviewEvent.count({ where: { flagId: flag.id } }),
    1,
  );
  const inspection = await db.inspectionCase.findUniqueOrThrow({
    where: { anomalyFlagId: flag.id },
  });
  assert.equal(inspection.source, "BAT_THUONG_KHAO_SAT");
  assert.equal(inspection.feedbackId, null);
  pass(
    "BR-65: sáu quyết định đồng thời tạo một lịch sử và duy nhất một hồ sơ BAT_THUONG",
  );
  const event = await db.surveyAnomalyReviewEvent.findFirstOrThrow({
    where: { flagId: flag.id },
  });
  await reviewSurveyAnomaly(inspector, flag.id, {
    revision: 1,
    requestId: event.requestId,
    decision: "CHUYEN_XAC_MINH",
    note: event.note,
  });
  assert.equal(
    await db.inspectionCase.count({ where: { anomalyFlagId: flag.id } }),
    1,
  );
  await assert.rejects(
    reviewSurveyAnomaly(inspector, flag.id, {
      revision: 1,
      requestId: event.requestId,
      decision: "BINH_THUONG",
      note: event.note,
    }),
    status(409),
  );
  pass("BR-65: retry giữ nguyên biên nhận, requestId thay dữ liệu bị chặn");
  let caseView = await getInspectionCase(inspector, inspection.id);
  assert(!caseView.allowedActions.includes("return"));
  await assert.rejects(
    transitionInspectionCase(inspector, inspection.id, {
      revision: caseView.revision,
      requestId: randomUUID(),
      action: "return",
      returnCategory: "GIANG_DAY",
      reason: "Không có sinh viên gửi để chuyển phản hồi.",
    }),
    status(409),
  );
  caseView = await transitionInspectionCase(inspector, inspection.id, {
    revision: caseView.revision,
    requestId: randomUUID(),
    action: "accept",
  });
  caseView = await addInspectionNote(inspector, inspection.id, {
    revision: caseView.revision,
    requestId: randomUUID(),
    body: "Đã đối chiếu tài liệu giả để xác minh chỉ số khảo sát.",
  });
  caseView = await transitionInspectionCase(inspector, inspection.id, {
    revision: caseView.revision,
    requestId: randomUUID(),
    action: "conclude",
    conclusion: "CO_CAN_CU",
    reason: "Kết luận giả dựa trên thông tin đối chiếu nội bộ.",
  });
  caseView = await transitionInspectionCase(inspector, inspection.id, {
    revision: caseView.revision,
    requestId: randomUUID(),
    action: "notify",
  });
  caseView = await transitionInspectionCase(inspector, inspection.id, {
    revision: caseView.revision,
    requestId: randomUUID(),
    action: "close",
  });
  assert.equal(caseView.status, "DONG");
  assert.equal(
    await db.notification.count({
      where: { userId: { in: students }, targetId: inspection.id },
    }),
    0,
  );
  const leaderSummary = await getInspectionCase(leader, inspection.id);
  assert.equal(leaderSummary.level, "summary");
  assert(!("anomaly" in leaderSummary));
  pass(
    "BR-60/62/65: hồ sơ khôngfeedback đi hết xác minh→đóng, khôngstudentnotice, LĐchỉsummary",
  );
  const attention = await db.surveyAnomalyFlag.findFirstOrThrow({
    where: { campaignId: campaigns[1], status: "CHO_XEM_XET" },
  });
  await reviewSurveyAnomaly(inspector, attention.id, {
    revision: 1,
    requestId: randomUUID(),
    decision: "CAN_LUU_Y",
    note: "Đề nghị Đảm bảo chất lượng lưu ý khi tổ chức khảo sát.",
  });
  assert(
    (await db.notification.count({
      where: {
        userId: quality.userId,
        targetType: "SurveyAnomalyAttention",
        targetId: attention.id,
      },
    })) > 0,
  );
  assert.equal(
    await db.$transaction((tx) =>
      canReadNoticeTarget(tx, quality, "SurveyAnomalyFlag", attention.id),
    ),
    false,
  );
  pass("BR-65: CAN_LUU_Y thông báo generic cho ĐBCL, không cấp quyền chỉ số");
  assert.equal(
    await db.$transaction((tx) =>
      canReadNoticeTarget(tx, quality, "SurveyAnomalyAttention", attention.id),
    ),
    true,
  );
  await publishSurveyResults(quality, campaigns[1], {
    expectedRevision: 1,
    requestId: randomUUID(),
  });
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: campaigns[1] } }))
      .status,
    "DA_CONG_BO",
  );
  pass("BR-65: cảnh báo/đangxácminh không chặn công bố");
  const settings = await getAnomalySettings(quality);
  await updateAnomalySettings(quality, {
    ...settings,
    uniformRate: 0.8,
    requestId: randomUUID(),
  });
  assert.equal(
    (await getSurveyAnomaly(inspector, flag.id)).metrics.thresholds.uniformRate,
    0.7,
  );
  await assert.rejects(getAnomalySettings(inspector), status(403));
  await db.roleAssignment.deleteMany({
    where: { userId: quality.userId, role: "CAN_BO_DBCL" },
  });
  assert.equal(
    await db.$transaction(async (tx) => {
      const fresh = await noticeRecipientActor(tx, quality.userId);
      return (
        !!fresh &&
        canReadNoticeTarget(tx, fresh, "SurveyAnomalyAttention", attention.id)
      );
    }),
    false,
  );
  pass("BR-65: cấu hình đúng vai trò, cờ cũ giữ snapshot ngưỡng");
  passed = true;
} catch (error) {
  process.exitCode = 1;
  console.error(
    `Kiểm bất thường Tuần12 chưa qua: ${error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name : "Lỗi chưa xác định"}`,
  );
} finally {
  if (verified)
    try {
      await db.$transaction(
        async (tx) => {
          const flags = await tx.surveyAnomalyFlag.findMany({
              where: { campaignId: { in: campaigns } },
              select: { id: true },
            }),
            flagIds = flags.map((row) => row.id);
          const inspections = await tx.inspectionCase.findMany({
              where: { anomalyFlagId: { in: flagIds } },
              select: { id: true },
            }),
            caseIds = inspections.map((row) => row.id);
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
          await tx.surveyAnomalyReviewEvent.deleteMany({
            where: { flagId: { in: flagIds } },
          });
          await tx.surveyAnomalyFlag.deleteMany({
            where: { id: { in: flagIds } },
          });
          await tx.improvementHistory.deleteMany({
            where: { plan: { campaignId: { in: campaigns } } },
          });
          await tx.improvementPlan.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.aggregateResult.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.surveyAnswer.deleteMany({
            where: { response: { campaignId: { in: campaigns } } },
          });
          await tx.surveyResponse.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.surveyTask.deleteMany({
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
          await tx.questionOption.deleteMany({
            where: { question: { group: { templateId: { in: templates } } } },
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
          await tx.auditLog.deleteMany({
            where: {
              OR: [
                { actorId: { in: users } },
                { objectId: { in: [...flagIds, ...caseIds] } },
              ],
            },
          });
          if (settingsBefore)
            await tx.systemSetting.upsert({
              where: { key: "SURVEY_ANOMALY_SETTINGS" },
              create: {
                ...settingsBefore,
                value: settingsBefore.value as Prisma.InputJsonValue,
              },
              update: {
                ...settingsBefore,
                value: settingsBefore.value as Prisma.InputJsonValue,
              },
            });
          else
            await tx.systemSetting.deleteMany({
              where: { key: "SURVEY_ANOMALY_SETTINGS" },
            });
          await tx.userSession.deleteMany({ where: { userId: { in: users } } });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          await tx.department.deleteMany({
            where: { id: { in: departments } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: faculties } } });
        },
        { timeout: 60000 },
      );
      cleaned = true;
    } catch {
      passed = false;
      process.exitCode = 1;
      console.error(
        "Fixture bất thường Tuần12 chưa dọn xong; giữ database và marker để kiểm tra.",
      );
    }
  save();
  await db.$disconnect();
}
