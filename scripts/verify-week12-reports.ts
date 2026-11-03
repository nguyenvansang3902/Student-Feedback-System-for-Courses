import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import {
  getReportOptions,
  getReportsDashboard,
  getReportsSettings,
  prepareReportsExport,
  updateReportsSettings,
} from "../src/server/services/reports";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyScoreTemplate,
} from "../src/server/services/survey-score";

const marker = JSON.parse(
  readFileSync(".local/week12-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK12_TEST_DATABASE_URL ?? "");
assert.equal(main.protocol, "mysql:");
assert(["localhost", "127.0.0.1"].includes(main.hostname));
assert.equal(marker.purpose, "isolated-week12-tests");
assert.equal(marker.mainDatabase, main.pathname.slice(1));
assert.equal(test.host, main.host);
assert.equal(test.username, main.username);
assert.equal(test.password, main.password);
assert.equal(test.pathname, `/${marker.database}`);
assert.notEqual(test.pathname, main.pathname);
assert(test.pathname.startsWith(`/${main.pathname.slice(1, 34)}_w12test_`));
assert(/_[a-f0-9]{8}$/.test(test.pathname));
for (const key of [
  "SHADOW_DATABASE_URL",
  "W4_TEST_DATABASE_URL",
  "WEEK10_TEST_DATABASE_URL",
  "WEEK11_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert.notEqual(test.pathname, new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
const db = getDb(),
  prefix = `W12R${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  courses: string[] = [],
  sections: string[] = [],
  feedbackIds: string[] = [],
  caseIds: string[] = [],
  campaigns: string[] = [],
  passed: string[] = [];
let semesterId: string | undefined,
  templateId: string | undefined,
  verified = false,
  cleaned = false,
  success = false;
let settingsBefore: Awaited<ReturnType<typeof db.systemSetting.findUnique>> =
  null;
const secretBody = `${prefix}_CANARY_PRIVATE_BODY`,
  studentName = `${prefix}_CANARY_STUDENT_NAME`;
function save() {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/week12-reports-result.json",
    JSON.stringify(
      {
        status: success ? "passed" : "incomplete",
        passed: passed.length,
        cases: passed,
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
    `QUA W12-REPORT-${String(passed.length).padStart(2, "0")} ${name}`,
  );
  save();
}
async function user(role: Role, passwordHash: string, index = 0) {
  const scoped =
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
  const row = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
      displayName: role === "SINH_VIEN" ? studentName : `${prefix} ${role}`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: { role, ...scoped } },
    },
    include: { roles: true },
  });
  users.push(row.id);
  return (
    await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        row,
        { ip: "week12-reports-fixture" },
        "FULL",
        role === "ADMIN",
      ),
    )
  ).actor;
}
async function addRole(actor: AuthActor, role: Role) {
  await db.roleAssignment.create({
    data: {
      userId: actor.userId,
      role,
      scopeType: "GLOBAL",
      scopeKey: "GLOBAL",
    },
  });
}
function noCanary(dto: unknown, student: AuthActor) {
  const text = JSON.stringify(dto);
  for (const value of [
    student.userId,
    student.loginCode,
    student.email,
    student.displayName,
    secretBody,
  ])
    assert(!text.includes(value), "DTO báo cáo chứa canary riêng tư");
  for (const key of [
    "studentId",
    "authorId",
    "loginCode",
    "email",
    "body",
    "reason",
    "studentSummary",
    "submittedDate",
    "teacherIds",
  ])
    assert(!text.includes(`\"${key}\"`), `DTO chứa trường cấm ${key}`);
}
async function feedback(
  student: AuthActor,
  category:
    | "GIANG_DAY"
    | "TO_CHUC_LOP_HOC"
    | "THI_KET_THUC_HOC_PHAN"
    | "KHIEU_NAI_NGHIEM_TRONG",
  sectionId: string,
  rating = true,
) {
  const now = new Date();
  const row = await db.feedback.create({
    data: {
      sectionId,
      authorId: student.userId,
      title: `${prefix} Phản hồi riêng tư`,
      body: secretBody,
      isAnonymous: true,
      category,
      severity: category === "KHIEU_NAI_NGHIEM_TRONG" ? "KHIEU_NAI" : "GOP_Y",
      identityLevel:
        category === "KHIEU_NAI_NGHIEM_TRONG" ? "AN_DANH_HOAN_TOAN" : null,
      status: "DA_DONG",
      createdAt: new Date(now.getTime() - 2 * 86400000),
      acceptedAt: new Date(now.getTime() - 86400000),
      answeredAt: new Date(now.getTime() - 3600000),
      closedAt: now,
      acceptDueAt: new Date(now.getTime() + 86400000),
      replyDueAt: new Date(now.getTime() + 5 * 86400000),
      ...(rating ? { rating: { create: { score: 4 } } } : {}),
    },
  });
  feedbackIds.push(row.id);
  return row;
}
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  settingsBefore = await db.systemSetting.findUnique({
    where: { key: "REPORT_SETTINGS" },
  });
  const passwordHash = await hash(`Fixture-${randomUUID()}`, 12);
  for (let i = 0; i < 2; i++) {
    const faculty = await db.faculty.create({
      data: { code: `${prefix}F${i}`, name: `${prefix} Khoa ${i}` },
    });
    faculties.push(faculty.id);
    const dept = await db.department.create({
      data: {
        code: `${prefix}D${i}`,
        name: `${prefix} Bộ môn ${i}`,
        facultyId: faculty.id,
      },
    });
    departments.push(dept.id);
    const course = await db.course.create({
      data: {
        code: `${prefix}C${i}`,
        name: `${prefix} Môn ${i}`,
        credits: 3,
        departmentId: dept.id,
      },
    });
    courses.push(course.id);
  }
  const tinyCourse = await db.course.create({
    data: {
      code: `${prefix}C2`,
      name: `${prefix} Môn ít mẫu`,
      credits: 3,
      departmentId: departments[0],
    },
  });
  courses.push(tinyCourse.id);
  const actors = new Map<Role, AuthActor>();
  for (const role of [
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "ADMIN",
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ] as const)
    actors.set(role, await user(role, passwordHash));
  const student = actors.get("SINH_VIEN")!,
    teacher = actors.get("GIANG_VIEN")!,
    quality = actors.get("CAN_BO_DBCL")!,
    admin = actors.get("ADMIN")!,
    exam = actors.get("PHONG_KHAO_THI")!,
    inspector = actors.get("THANH_TRA")!;
  const teacher2 = await user("GIANG_VIEN", passwordHash),
    outsider = await user("TRUONG_BO_MON", passwordHash, 1);
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: `${prefix} Học kỳ`,
      startsOn: new Date("2026-01-01"),
      endsOn: new Date("2027-01-01"),
    },
  });
  semesterId = semester.id;
  for (let i = 0; i < 4; i++) {
    const owner = i === 0 ? teacher : teacher2;
    const section = await db.courseSection.create({
      data: {
        code: `${prefix}L${i}`,
        courseId: courses[i === 2 ? 1 : i === 3 ? 2 : 0],
        semesterId,
        teaching: { create: { teacherId: owner.userId, isLead: true } },
        enrollments: { create: { studentId: student.userId } },
      },
    });
    sections.push(section.id);
  }
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} Mẫu`,
      status: "DA_KHOA",
      createdById: quality.userId,
    },
  });
  templateId = template.id;
  const groups = [];
  for (let i = 0; i < 2; i++) {
    const group = await db.criterionGroup.create({
      data: {
        templateId,
        title: i === 0 ? "Giảng dạy" : "Kiểm tra, đánh giá",
        position: i + 1,
        weight: 1,
        isAssessmentGroup: i === 1,
      },
    });
    const question = await db.question.create({
      data: {
        groupId: group.id,
        label: i === 0 ? "Nội dung giảng dạy" : "Nội dung kiểm tra",
        position: 1,
        type: "LIKERT",
        weight: 1,
        scaleMin: 1,
        scaleMax: 5,
      },
    });
    groups.push({ ...group, question });
  }
  const scoreTemplate: SurveyScoreTemplate = {
    groups: groups.map((group) => ({
      id: group.id,
      title: group.title,
      position: group.position,
      weight: 1,
      isAssessmentGroup: group.isAssessmentGroup,
      questions: [
        {
          id: group.question.id,
          label: group.question.label,
          type: "LIKERT",
          position: 1,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
      ],
    })),
  };
  for (const status of ["DA_CONG_BO", "DA_TONG_HOP", "DA_DONG"] as const) {
    const campaign = await db.surveyCampaign.create({
      data: {
        title: `${prefix} ${status}`,
        semesterId,
        templateId,
        scope: "GLOBAL",
        startsAt: new Date(Date.now() - 5 * 86400000),
        endsAt: new Date(Date.now() - 3 * 86400000),
        status,
        minResponses: 5,
        minRate: 0.3,
        createdById: quality.userId,
      },
    });
    campaigns.push(campaign.id);
    for (let i = 0; i < 4; i++) {
      await db.campaignSection.create({
        data: { campaignId: campaign.id, sectionId: sections[i] },
      });
      const n = i === 0 ? 5 : i === 3 ? 1 : 10,
        owner = i === 0 ? teacher : teacher2;
      const score = calculateSurveyScore(
        scoreTemplate,
        [
          { questionId: groups[0].question.id, valueNumber: 1, count: n },
          {
            questionId: groups[1].question.id,
            valueNumber: i === 0 ? 5 : 3,
            count: n,
          },
        ],
        {
          responseCount: n,
          taskCount: n,
          doneTaskCount: n,
          minResponses: 5,
          minRate: 0.3,
        },
      );
      await db.aggregateResult.create({
        data: {
          campaignId: campaign.id,
          sectionId: sections[i],
          responseCount: n,
          taskCount: n,
          participationRate: 1,
          overallScore: score.overallScore!,
          eligibleToPublish: score.eligibleToPublish,
          aggregatedAt: new Date(),
          details: {
            version: 2,
            templateId,
            template: scoreTemplate,
            teacherIds: [owner.userId],
            bands: [...DEFAULT_SURVEY_RATING_BANDS],
            score,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }
  await db.surveyTask.createMany({
    data: [
      {
        campaignId: campaigns[0],
        sectionId: sections[0],
        studentId: student.userId,
        status: "PENDING",
      },
      {
        campaignId: campaigns[0],
        sectionId: sections[1],
        studentId: student.userId,
        status: "DONE",
        doneDate: new Date(),
      },
    ],
  });
  for (const category of [
    "GIANG_DAY",
    "TO_CHUC_LOP_HOC",
    "THI_KET_THUC_HOC_PHAN",
  ] as const)
    for (let i = 0; i < 5; i++) {
      const row = await feedback(student, category, sections[0]);
      if (category === "GIANG_DAY")
        await db.feedbackRecipient.create({
          data: {
            feedbackId: row.id,
            userId: teacher.userId,
            accessRole: "GIANG_VIEN",
          },
        });
    }
  await feedback(student, "TO_CHUC_LOP_HOC", sections[2]);
  for (let i = 0; i < 6; i++) {
    const row = await feedback(
      student,
      "KHIEU_NAI_NGHIEM_TRONG",
      sections[0],
      false,
    );
    const createdAt = new Date(Date.now() - 2 * 86400000);
    const item = await db.inspectionCase.create({
      data: {
        feedbackId: row.id,
        sectionId: sections[0],
        source: "PHAN_HOI_NGHIEM_TRONG",
        violation:
          i < 5 ? "HANH_VI_KHONG_PHU_HOP" : "VI_PHAM_QUY_CHE_THI_KIEM_TRA",
        status: "DONG",
        conclusion: "CO_CAN_CU",
        reason: secretBody,
        studentSummary: secretBody,
        createdAt,
        acceptedAt: createdAt,
        closedAt: new Date(),
        acceptDueAt: new Date(Date.now() + 86400000),
        completeDueAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    caseIds.push(item.id);
  }
  for (const [role, actor] of actors) {
    const dto = await getReportsDashboard(actor, { role, semesterId });
    assert.equal(dto.role, role);
    noCanary(dto, student);
  }
  pass(
    "mười vai trò nhận dashboard đúng loại, DTO không có canary sinh viên hoặc nội dung riêng tư",
  );
  const own = await getReportsDashboard(student, {
    role: "SINH_VIEN",
    semesterId,
  });
  const cells = own.sections[0].rows;
  assert.equal(cells.find((row) => row.key === "tasks")?.cells.count, 2);
  assert.equal(cells.find((row) => row.key === "done")?.cells.count, 1);
  assert(!own.sections.some((section) => section.key.startsWith("survey-")));
  pass("sinh viên chỉ có task/phản hồi của mình, không có điểm khảo sát");
  const gv = await getReportsDashboard(teacher, {
    role: "GIANG_VIEN",
    semesterId,
  });
  assert(!JSON.stringify(gv).includes(sections[1]));
  assert(!JSON.stringify(gv).includes(campaigns[1]));
  await assert.rejects(
    () =>
      getReportsDashboard(teacher, {
        role: "GIANG_VIEN",
        courseId: courses[1],
      }),
    { status: 404 },
  );
  await assert.rejects(
    () =>
      getReportsDashboard(outsider, {
        role: "TRUONG_BO_MON",
        courseId: courses[0],
      }),
    { status: 404 },
  );
  pass("GV/TBM không đọc lớp/đơn vị ngoài scope hoặc dữ liệu trước công bố");
  const assessment = await getReportsDashboard(exam, {
    role: "PHONG_KHAO_THI",
    semesterId,
    courseId: courses[0],
  });
  const courseRow = assessment.sections.find(
    (section) => section.key === "assessment-course",
  )!.rows[0];
  assert.equal(courseRow.cells.overallScore, 3.67);
  assert.equal(courseRow.cells.responseCount, 15);
  assert(!JSON.stringify(assessment).includes(sections[0]));
  assert(!JSON.stringify(assessment).includes(teacher.userId));
  assert(!JSON.stringify(assessment).includes(campaigns[1]));
  const singleton = await getReportsDashboard(exam, {
    role: "PHONG_KHAO_THI",
    semesterId,
    courseId: courses[1],
  });
  assert(
    singleton.sections
      .find((section) => section.key === "assessment-course")!
      .rows.every((row) => row.suppressed && row.cells.overallScore === null),
  );
  pass(
    "Khảo thí pool 5×5 và 10×3 thành3,67, ngưỡng2GV và công bố, không có lớp/GV/tự luận",
  );
  const headReport = await getReportsDashboard(actors.get("TRUONG_BO_MON")!, {
    role: "TRUONG_BO_MON",
    semesterId,
    campaignId: campaigns[0],
  });
  assert(
    headReport.sections
      .find((section) => section.key === "survey-class")!
      .rows.some((row) => row.suppressed),
  );
  assert(
    headReport.sections
      .find((section) => section.key === "survey-department")!
      .rows.every((row) => row.suppressed && row.cells.overallScore === null),
  );
  assert(
    headReport.sections
      .find((section) => section.key === "survey-faculty")!
      .rows.every((row) => row.suppressed && row.cells.responseCount === null),
  );
  const allExam = await getReportsDashboard(exam, {
    role: "PHONG_KHAO_THI",
    semesterId,
    campaignId: campaigns[0],
  });
  assert(
    allExam.sections
      .find((section) => section.key === "assessment-course")!
      .rows.some((row) => !row.suppressed),
  );
  assert(
    allExam.sections
      .find((section) => section.key === "assessment-department")!
      .rows.every((row) => row.suppressed && row.cells.responseCount === null),
  );
  pass(
    "lớp/môn ít mẫu bị che kéo theo tổng bộ môn/khoa bị che, không trừ tổng để suy ra ô nhỏ",
  );
  const original = await db.aggregateResult.findUniqueOrThrow({
    where: {
      campaignId_sectionId: {
        campaignId: campaigns[0],
        sectionId: sections[1],
      },
    },
  });
  const allNA = calculateSurveyScore(
    scoreTemplate,
    [
      { questionId: groups[0].question.id, valueNumber: 1, count: 10 },
      { questionId: groups[1].question.id, isNotApplicable: true, count: 10 },
    ],
    {
      responseCount: 10,
      taskCount: 10,
      doneTaskCount: 10,
      minResponses: 5,
      minRate: 0.3,
    },
  );
  await db.aggregateResult.update({
    where: { id: original.id },
    data: {
      details: {
        version: 2,
        templateId,
        template: scoreTemplate,
        teacherIds: [teacher2.userId],
        bands: [...DEFAULT_SURVEY_RATING_BANDS],
        score: allNA,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  try {
    const allNAReport = await getReportsDashboard(exam, {
      role: "PHONG_KHAO_THI",
      semesterId,
      campaignId: campaigns[0],
      courseId: courses[0],
    });
    assert(
      allNAReport.sections
        .find((section) => section.key === "assessment-course")!
        .rows.every((row) => row.suppressed && row.cells.overallScore === null),
    );
  } finally {
    await db.aggregateResult.update({
      where: { id: original.id },
      data: { details: original.details as Prisma.InputJsonValue },
    });
  }
  pass(
    "giảng viên có phiếu nhưng mọi câu LIKERT nhóm đánh giá đều NA không được tính vào ngưỡng hai GV",
  );
  const dtoTraining = await getReportsDashboard(actors.get("PHONG_DAO_TAO")!, {
    role: "PHONG_DAO_TAO",
    semesterId,
  });
  const leaves = dtoTraining.sections.find(
    (section) => section.key === "feedback-processing",
  )!.rows;
  assert(leaves.some((row) => row.cells.count === 5));
  assert(
    leaves.some(
      (row) =>
        row.suppressed &&
        Object.values(row.cells).every((value) => value === null),
    ),
  );
  assert(
    dtoTraining.sections
      .find((section) => section.key === "feedback-periods")!
      .rows.every((row) => row.cells.count === null),
  );
  assert(
    dtoTraining.sections.some(
      (section) => section.key === "training-readiness",
    ),
  );
  pass(
    "PĐT chỉ phản hồi tổ chức lớp, readiness không roster; ô nhỏ và tổng suy ngược cùng bị ẩn",
  );
  const tt = await getReportsDashboard(inspector, {
    role: "THANH_TRA",
    semesterId,
  });
  const caseRows = tt.sections.find(
    (section) => section.key === "inspection-statistics",
  )!.rows;
  assert(caseRows.some((row) => row.cells.count === 5));
  assert(caseRows.some((row) => row.suppressed && row.cells.count === null));
  assert(!tt.sections.some((section) => section.key.startsWith("survey-")));
  pass(
    "Thanh tra chỉ thống kê hồ sơ đủ mẫu; nhóm một hồ sơ không trả count/kết luận/thời gian",
  );
  await addRole(teacher, "THANH_TRA");
  await addRole(actors.get("TRUONG_BO_MON")!, "THANH_TRA");
  for (const conflict of [teacher, actors.get("TRUONG_BO_MON")!]) {
    const dto = await getReportsDashboard(conflict, {
      role: "THANH_TRA",
      semesterId,
    });
    assert.equal(
      dto.sections.find((section) => section.key === "inspection-statistics")!
        .rows.length,
      0,
    );
  }
  pass("TT kiêm GV/TBM bị loại hồ sơ xung đột trước khi gộp và đếm");
  await addRole(admin, "CAN_BO_DBCL");
  await addRole(admin, "THANH_TRA");
  const technical = await getReportsDashboard(admin, {
    role: "THANH_TRA",
    semesterId,
  });
  assert.equal(technical.role, "ADMIN");
  assert.deepEqual(
    technical.sections.map((section) => section.key),
    ["technical-administration"],
  );
  await assert.rejects(() => getReportsSettings(admin), { status: 403 });
  await addRole(quality, "GIANG_VIEN");
  await db.teachingAssignment.create({
    data: { sectionId: sections[0], teacherId: quality.userId },
  });
  const narrow = await getReportsDashboard(quality, {
    role: "GIANG_VIEN",
    semesterId,
  });
  assert(!JSON.stringify(narrow).includes(sections[1]));
  assert(!JSON.stringify(narrow).includes(campaigns[1]));
  pass(
    "ADMIN đa vai trò chỉ vận hành tài khoản; ĐBCL chọn GV không lấy quyền toàn trường hoặc trước công bố",
  );
  const options = await getReportOptions(teacher, { role: "GIANG_VIEN" });
  assert(options.courses.every((course) => course.id === courses[0]));
  noCanary(options, student);
  const auditBefore = await db.auditLog.count({
    where: { action: "REPORT_EXPORTED", actorId: { in: users } },
  });
  for (const role of [
    "PHONG_DAO_TAO",
    "PHONG_KHAO_THI",
    "THANH_TRA",
  ] as const) {
    const dto = await prepareReportsExport(actors.get(role)!, {
      role,
      semesterId,
      format: "csv",
    });
    noCanary(dto, student);
    assert(dto.scopeLabel?.includes(semester.name));
    writeFileSync(
      `.local/week12-report-safe-${role}.json`,
      JSON.stringify(dto, null, 2) + "\n",
    );
  }
  assert.equal(
    await db.auditLog.count({
      where: { action: "REPORT_EXPORTED", actorId: { in: users } },
    }),
    auditBefore + 3,
  );
  pass(
    "BR67 từ MySQL: prepareReportsExport thật cho PĐT/KT/TT lưu DTO an toàn, có nhãn scope và audit trước trả về",
  );
  const settings = await getReportsSettings(quality);
  const updates = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      updateReportsSettings(quality, {
        minFeedbackRecords: 6,
        minInspectionCases: 7,
        revision: settings.revision,
        requestId: randomUUID(),
      }),
    ),
  );
  assert.equal(
    updates.filter((value) => value.status === "fulfilled").length,
    1,
  );
  assert.equal(
    updates.filter((value) => value.status === "rejected").length,
    3,
  );
  pass(
    "bốn cập nhật ngưỡng đồng thời chỉ một thành công; không thay ngưỡng công bố của campaign",
  );
  await db.userSession.updateMany({
    where: { userId: exam.userId },
    data: { revokedAt: new Date() },
  });
  await assert.rejects(
    () => getReportsDashboard(exam, { role: "PHONG_KHAO_THI" }),
    { status: 401 },
  );
  pass("thu hồi phiên chặn báo cáo dù actor cũ vẫn còn trong bộ nhớ");
  success = true;
} finally {
  if (verified)
    try {
      await db.$transaction(
        async (tx) => {
          await tx.inspectionCaseEvent.deleteMany({
            where: { caseId: { in: caseIds } },
          });
          await tx.inspectionCase.deleteMany({
            where: { id: { in: caseIds } },
          });
          await tx.feedbackRating.deleteMany({
            where: { feedbackId: { in: feedbackIds } },
          });
          await tx.feedbackRecipient.deleteMany({
            where: { feedbackId: { in: feedbackIds } },
          });
          await tx.feedback.deleteMany({ where: { id: { in: feedbackIds } } });
          await tx.aggregateResult.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.surveyTask.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.campaignSection.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.surveyCampaign.deleteMany({
            where: { id: { in: campaigns } },
          });
          if (templateId) {
            await tx.question.deleteMany({ where: { group: { templateId } } });
            await tx.criterionGroup.deleteMany({ where: { templateId } });
            await tx.surveyTemplate.deleteMany({ where: { id: templateId } });
          }
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
          if (semesterId)
            await tx.semester.deleteMany({ where: { id: semesterId } });
          if (settingsBefore)
            await tx.systemSetting.upsert({
              where: { key: "REPORT_SETTINGS" },
              create: {
                key: "REPORT_SETTINGS",
                value: settingsBefore.value as Prisma.InputJsonValue,
                updatedById: settingsBefore.updatedById,
                updatedAt: settingsBefore.updatedAt,
              },
              update: {
                value: settingsBefore.value as Prisma.InputJsonValue,
                updatedById: settingsBefore.updatedById,
                updatedAt: settingsBefore.updatedAt,
              },
            });
          else
            await tx.systemSetting.deleteMany({
              where: { key: "REPORT_SETTINGS" },
            });
          await tx.auditLog.deleteMany({ where: { actorId: { in: users } } });
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
assert(success && cleaned, "Kiểm định báo cáo hoặc dọn fixture chưa hoàn tất");
console.log(
  `Tuần12 reports: ${passed.length} nhóm kiểm qua; fixture đã dọn, không đổi main.`,
);
