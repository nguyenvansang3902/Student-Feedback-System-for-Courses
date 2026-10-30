import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { createHash } from "node:crypto";
import { getDb } from "../src/lib/db";
import {
  assertReadinessConfirmable,
  readCampaignReadiness,
} from "../src/server/services/campaign-readiness";
import {
  seedDemo,
  demoId,
  type DemoSize,
} from "../src/server/services/demo-seed";

const marker = JSON.parse(readFileSync(".local/demo/latest.json", "utf8"));
const main = new URL(process.env.DATABASE_URL!),
  demo = new URL(process.env.DEMO_DATABASE_URL!);
assert(
  marker.purpose === "isolated-demo" &&
    marker.mainDatabase === main.pathname.slice(1) &&
    marker.database === demo.pathname.slice(1),
);
assert(
  main.protocol === "mysql:" &&
    demo.protocol === main.protocol &&
    demo.host === main.host &&
    demo.username === main.username &&
    demo.password === main.password &&
    ["localhost", "127.0.0.1"].includes(demo.hostname),
);
assert(
  demo.pathname !== main.pathname &&
    demo.pathname !== new URL(process.env.SHADOW_DATABASE_URL!).pathname &&
    /_demo_[a-f0-9]{16}$/.test(demo.pathname),
);
process.env.DATABASE_URL = demo.href;
process.env.APP_URL = "http://127.0.0.1:3001";
const db = getDb(),
  actor = {
    kind: "SERVER_CONSOLE" as const,
    reason: "Kiểm thử seed demo trong database riêng",
  };
const results: string[] = [];
async function week9Snapshot() {
  const campaignIds = [
    demoId("week9:campaign:current"),
    demoId("week9:campaign:prior"),
  ];
  const campaigns = await db.surveyCampaign.findMany({
    where: { id: { in: campaignIds } },
    orderBy: { id: "asc" },
    include: {
      template: { include: { groups: { include: { questions: true } } } },
      sections: {
        orderBy: { sectionId: "asc" },
        include: { result: true, section: { include: { teaching: true } } },
      },
    },
  });
  assert.equal(campaigns.length, 2);
  const current = campaigns.find((campaign) => campaign.id === campaignIds[0])!;
  assert.equal(current.status, "DA_CONG_BO");
  assert.equal(current.sections.length, 3);
  assert.equal(
    new Set(
      current.sections.flatMap((cohort) =>
        cohort.section.teaching.map((assignment) => assignment.teacherId),
      ),
    ).size,
    2,
  );
  assert.equal(
    new Set(current.sections.map((cohort) => cohort.section.courseId)).size,
    1,
  );
  assert(current.template.groups.some((group) => group.isAssessmentGroup));
  assert.equal(
    current.sections.filter((cohort) => cohort.result?.eligibleToPublish)
      .length,
    2,
  );
  assert.equal(
    current.sections.filter(
      (cohort) => cohort.result && !cohort.result.eligibleToPublish,
    ).length,
    1,
  );
  const responses = await db.surveyResponse.findMany({
    where: { campaignId: { in: campaignIds } },
    orderBy: { id: "asc" },
    include: { answers: { orderBy: { id: "asc" } } },
  });
  assert.equal(responses.length, 18);
  assert(responses.every((response) => response.answers.length === 3));
  const tasks = await db.surveyTask.findMany({
    where: { campaignId: { in: campaignIds } },
    orderBy: { id: "asc" },
  });
  assert.equal(tasks.length, 40);
  assert.equal(tasks.filter((task) => task.status === "DONE").length, 18);
  const identities = new Set(
    tasks.flatMap((task) => [task.id, task.studentId]),
  );
  assert(
    responses.every(
      (response) =>
        !identities.has(response.id) &&
        response.answers.every((answer) => !identities.has(answer.id)),
    ),
  );
  return createHash("sha256")
    .update(JSON.stringify({ campaigns, tasks, responses }))
    .digest("hex");
}
async function surveySnapshot() {
  const closedId = demoId("survey-data:campaign:closed"),
    openId = demoId("survey-data:campaign:open");
  const campaigns = await db.surveyCampaign.findMany({
    where: { id: { in: [closedId, openId] } },
  });
  assert.equal(campaigns.length, 2);
  const closed = campaigns.find((c) => c.id === closedId)!,
    open = campaigns.find((c) => c.id === openId)!;
  assert.equal(closed.status, "DA_CONG_BO");
  assert(closed.endsAt.getTime() < Date.now());
  assert.equal(open.status, "DANG_MO");
  assert(
    open.startsAt.getTime() <= Date.now() && open.endsAt.getTime() > Date.now(),
  );
  assert(
    campaigns.every(
      (c) =>
        c.createdById !== c.approvedById &&
        c.approvedAt &&
        c.approvedAt < c.startsAt,
    ),
  );
  const responses = await db.surveyResponse.findMany({
    where: { campaignId: closedId },
    include: { answers: true },
    orderBy: { id: "asc" },
  });
  const tasks = await db.surveyTask.findMany({
    where: { campaignId: { in: [closedId, openId] } },
    orderBy: { id: "asc" },
  });
  const identities = new Set(tasks.flatMap((t) => [t.id, t.studentId]));
  assert(
    responses.length >= 5 &&
      responses.every(
        (r) =>
          r.answers.length === 3 &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
            r.id,
          ) &&
          !identities.has(r.id),
      ),
  );
  assert(
    tasks
      .filter((t) => t.campaignId === openId)
      .every((t) => t.status === "PENDING" && !t.doneDate),
  );
  const q1 = demoId("survey-data:question:likert1"),
    q2 = demoId("survey-data:question:likert2");
  const aggregates = await db.aggregateResult.findMany({
    where: { campaignId: closedId },
    orderBy: { sectionId: "asc" },
  });
  assert.equal(aggregates.length, 3);
  for (const aggregate of aggregates) {
    const own = responses.filter((r) => r.sectionId === aggregate.sectionId),
      cohort = tasks.filter(
        (t) => t.sectionId === aggregate.sectionId && t.campaignId === closedId,
      );
    const done = cohort.filter((t) => t.status === "DONE");
    assert.equal(aggregate.responseCount, own.length);
    assert.equal(aggregate.taskCount, cohort.length);
    assert.equal(own.length, done.length);
    assert.equal(
      Number(aggregate.participationRate),
      Number((done.length / cohort.length).toFixed(4)),
    );
    const mean = (questionId: string) =>
      own.reduce(
        (sum, r) =>
          sum +
          Number(
            r.answers.find((a) => a.questionId === questionId)!.valueNumber,
          ),
        0,
      ) / own.length;
    assert.equal(
      Number(aggregate.overallScore),
      Number(((mean(q1) + 2 * mean(q2)) / 3).toFixed(2)),
    );
    assert.equal(
      aggregate.eligibleToPublish,
      own.length >= 5 && done.length / cohort.length >= 0.3,
    );
  }
  const feedback = await db.feedback.findMany({
    where: {
      id: {
        in: [
          "MOI",
          "DA_TIEP_NHAN",
          "DANG_XU_LY",
          "DA_TRA_LOI",
          "DA_DONG",
          "TU_CHOI",
        ].map((s) => demoId(`survey-data:feedback:${s}`)),
      },
    },
    include: {
      history: { orderBy: { occurredAt: "asc" } },
      messages: true,
      recipients: true,
    },
  });
  assert.equal(feedback.length, 6);
  assert.equal(new Set(feedback.map((f) => f.status)).size, 6);
  for (const f of feedback) {
    assert.equal(f.history.at(-1)?.toStatus, f.status);
    assert(f.recipients.length > 0);
    assert(
      f.history.every(
        (h) =>
          h.occurredAt >= f.createdAt && h.occurredAt.getTime() <= Date.now(),
      ),
    );
    assert.equal(
      f.messages.length > 0,
      ["DA_TRA_LOI", "DA_DONG"].includes(f.status),
    );
  }
  return JSON.stringify({
    responseIds: responses.map((r) => r.id),
    answers: responses.flatMap((r) => r.answers.map((a) => a.id)).sort(),
    taskIds: tasks.map((t) => t.id),
    aggregates,
  });
}
const run = async (size: DemoSize) => {
  await seedDemo(actor, size);
  const rows = await Promise.all([
    db.faculty.count({ where: { code: { startsWith: "DEMO-K" } } }),
    db.department.count({ where: { code: { startsWith: "DEMO-BM" } } }),
    db.course.count({ where: { code: { startsWith: "DEMO-MH" } } }),
    db.courseSection.count({
      where: { semesterId: demoId("semester:2026-1") },
    }),
    db.user.count({ where: { loginCode: { startsWith: "DEMO-GV" } } }),
    db.user.count({ where: { loginCode: { startsWith: "DEMO-SV" } } }),
    db.enrollment.count({
      where: { section: { semesterId: demoId("semester:2026-1") } },
    }),
  ]);
  return rows;
};
try {
  const identity = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity[0].uuid, marker.serverUuid);
  assert.equal(identity[0].database, marker.database);
  const original = await db.user.findUniqueOrThrow({
    where: { loginCode: "DEMO-SV00001" },
  });
  const legacyId = demoId("survey-data:template"),
    previousBuiltinId = demoId("week6-default-template"),
    builtinId = demoId("amendment1-default-template");
  const oldLockedQuery = {
    where: {
      id: { in: [legacyId, previousBuiltinId] },
      status: "DA_KHOA" as const,
    },
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      familyId: true,
      version: true,
      name: true,
      status: true,
      lockedAt: true,
      groups: {
        orderBy: { position: "asc" as const },
        include: {
          questions: {
            orderBy: { position: "asc" as const },
            include: { options: { orderBy: { position: "asc" as const } } },
          },
        },
      },
    },
  };
  const previousLocked = await db.surveyTemplate.findMany(oldLockedQuery);
  const medium = await run("medium");
  const originalWeek9 = await week9Snapshot();
  assert.deepEqual(medium, [3, 8, 40, 120, 60, 1500, 4501]);
  results.push("medium: 3/8/40/120/60/1500/4501");
  const week7Campaigns = await db.surveyCampaign.findMany({
    where: {
      id: {
        in: [demoId("week7:campaign:ready"), demoId("week7:campaign:blocked")],
      },
    },
    include: { semester: { select: { lockedAt: true } } },
    orderBy: { id: "asc" },
  });
  assert.equal(week7Campaigns.length, 2);
  assert(
    week7Campaigns.every(
      (campaign) => campaign.status === "NHAP" && !campaign.approvedAt,
    ),
  );
  const readyCampaign = week7Campaigns.find(
    (campaign) => campaign.id === demoId("week7:campaign:ready"),
  )!;
  const blockedCampaign = week7Campaigns.find(
    (campaign) => campaign.id === demoId("week7:campaign:blocked"),
  )!;
  const week7Snapshot = async () =>
    JSON.stringify({
      campaigns: await db.surveyCampaign.findMany({
        where: { id: { in: week7Campaigns.map((campaign) => campaign.id) } },
        orderBy: { id: "asc" },
        include: {
          history: { orderBy: { id: "asc" } },
          sections: { orderBy: { sectionId: "asc" } },
        },
      }),
      student: await db.user.findUniqueOrThrow({
        where: { loginCode: "W7-SV2026001" },
        include: { roles: { orderBy: { id: "asc" } } },
      }),
      semesters: await db.semester.findMany({
        where: {
          id: { in: week7Campaigns.map((campaign) => campaign.semesterId) },
        },
        orderBy: { id: "asc" },
      }),
    });
  const originalWeek7 = await week7Snapshot();
  const [ready, blocked] = await db.$transaction(async (tx) =>
    Promise.all([
      readCampaignReadiness(tx, readyCampaign),
      readCampaignReadiness(tx, blockedCampaign),
    ]),
  );
  assert.equal(ready.readiness.canConfirm, true);
  assert.deepEqual(
    [...new Set(ready.readiness.warnings.map((issue) => issue.code))].sort(),
    ["RS-04", "RS-05", "RS-06"],
  );
  assert.throws(() => assertReadinessConfirmable(ready.readiness));
  assert.doesNotThrow(() =>
    assertReadinessConfirmable(
      ready.readiness,
      "Ghi chú giả xác nhận các cảnh báo dữ liệu.",
    ),
  );
  assert.equal(blocked.readiness.canConfirm, false);
  assert.deepEqual(
    [
      ...new Set(
        [...blocked.readiness.blockers, ...blocked.readiness.warnings].map(
          (issue) => issue.code,
        ),
      ),
    ].sort(),
    ["RS-01", "RS-02", "RS-03", "RS-04", "RS-05", "RS-06"],
  );
  assert.throws(() =>
    assertReadinessConfirmable(
      blocked.readiness,
      "Ghi chú không được vượt lỗi chặn.",
    ),
  );
  assert.equal(blocked.cohort.sections.length, 4);
  assert.equal(blocked.cohort.pairs.length, 13);
  assert.equal(ready.cohort.pairs.length, 7);
  assert(
    ready.cohort.pairs.some(
      (pair) => pair.studentId === demoId("week7:pending-student"),
    ),
  );
  assert.equal(
    await db.surveyTask.count({
      where: {
        campaignId: { in: week7Campaigns.map((campaign) => campaign.id) },
      },
    }),
    0,
  );
  results.push(
    "TC-PDT-02 phần seed: bundle W7 riêng đủ RS-01–06; cảnh báo cần ghi chú, lỗi chặn không xác nhận; chỉ đọc readiness, không task/SMTP",
  );
  const newOperators = await db.user.findMany({
    where: {
      loginCode: { in: ["PDT2026001", "KT2026001", "TT2026001", "TT2026002"] },
    },
    include: { roles: true },
    orderBy: { loginCode: "asc" },
  });
  assert.deepEqual(
    newOperators.map((user) => [
      user.loginCode,
      ...user.roles.map((grant) => `${grant.role}:${grant.scopeKey}`),
    ]),
    [
      ["KT2026001", "PHONG_KHAO_THI:GLOBAL"],
      ["PDT2026001", "PHONG_DAO_TAO:GLOBAL"],
      ["TT2026001", "THANH_TRA:GLOBAL"],
      ["TT2026002", "THANH_TRA:GLOBAL"],
    ],
  );
  assert(
    newOperators.every((user) => user.status === "ACTIVE" && user.passwordHash),
  );
  results.push(
    "G1: seed bốn tài khoản mới đúng vai trò GLOBAL; hai tài khoản Thanh tra chưa có workflow hồ sơ",
  );
  const frozenSurvey = await surveySnapshot();
  results.push(
    "Đợt mở/đã đóng, task/phiếu ẩn danh, điểm trọng số và 6 trạng thái phản hồi khớp dữ liệu thật",
  );
  assert.deepEqual(
    await db.surveyTemplate.findMany(oldLockedQuery),
    previousLocked,
  );
  const selected = await db.surveyTemplate.findMany({
    where: { isDefault: true },
    include: {
      groups: { include: { questions: { include: { options: true } } } },
    },
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, builtinId);
  assert.equal(selected[0].status, "DA_KHOA");
  assert.equal(selected[0].groups.length, 3);
  assert.deepEqual(
    selected[0].groups
      .filter((group) => group.isAssessmentGroup)
      .map((group) => group.title),
    ["Kiểm tra, đánh giá"],
  );
  const builtinQuestions = selected[0].groups.flatMap((g) => g.questions);
  assert.equal(builtinQuestions.length, 7);
  assert.deepEqual([...new Set(builtinQuestions.map((q) => q.type))].sort(), [
    "BOOLEAN",
    "LIKERT",
    "MULTIPLE_CHOICE",
    "SINGLE_CHOICE",
    "TEXT",
  ]);
  assert.deepEqual(
    builtinQuestions
      .filter((q) => q.type === "LIKERT")
      .map((q) => q.scaleMax)
      .sort(),
    [4, 5, 5],
  );
  const legacyBefore = await db.surveyTemplate.findUniqueOrThrow({
    where: { id: legacyId },
    include: {
      groups: {
        orderBy: { position: "asc" },
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  assert.equal(legacyBefore.groups.flatMap((g) => g.questions).length, 3);
  assert.equal(
    await db.surveyTemplate.count({
      where: { id: { not: demoId("week9:template") } },
    }),
    2 +
      Number(
        previousLocked.some((template) => template.id === previousBuiltinId),
      ),
  );
  assert.equal(
    await db.surveyTemplate.count({ where: { id: demoId("week9:template") } }),
    1,
  );
  results.push(
    "TC-FR148-06/07: họ mẫu mới 3 nhóm/7 câu, đúng 1 nhóm Kiểm tra, đánh giá; giữ nguyên UUID/cây hai họ cũ và phiếu/kết quả",
  );
  const defaultMetadata = await db.surveyTemplate.findMany({
    where: { id: { in: [legacyId, builtinId] } },
    select: { id: true, isDefault: true, revision: true, updatedAt: true },
  });
  await db.$transaction(async (tx) => {
    await tx.surveyTemplate.update({
      where: { id: builtinId },
      data: { isDefault: false, revision: { increment: 1 } },
    });
    await tx.surveyTemplate.update({
      where: { id: legacyId },
      data: { isDefault: true, revision: { increment: 1 } },
    });
  });
  try {
    await run("medium");
    assert.equal(
      (await db.surveyTemplate.findFirstOrThrow({ where: { isDefault: true } }))
        .id,
      legacyId,
    );
  } finally {
    await db.$transaction(async (tx) => {
      for (const item of defaultMetadata) {
        const { id, ...data } = item;
        await tx.surveyTemplate.update({ where: { id }, data });
      }
    });
  }
  assert.deepEqual(
    (
      await db.surveyTemplate.findUniqueOrThrow({
        where: { id: legacyId },
        include: {
          groups: {
            orderBy: { position: "asc" },
            include: {
              questions: {
                orderBy: { position: "asc" },
                include: { options: { orderBy: { position: "asc" } } },
              },
            },
          },
        },
      })
    ).groups,
    legacyBefore.groups,
  );
  assert.deepEqual(
    await db.surveyTemplate.findMany(oldLockedQuery),
    previousLocked,
  );
  results.push(
    "FR-35/BR-05: seed lại giữ lựa chọn mặc định đã đổi và không ghi lại cây câu hỏi cũ",
  );
  const changedHash = await hash("KiemThuMatKhauDaDoi!2026", 12);
  await db.user.update({
    where: { id: original.id },
    data: { passwordHash: changedHash },
  });
  try {
    const repeat = await run("medium");
    assert.deepEqual(repeat, medium);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: original.id } }))
        .passwordHash,
      changedHash,
    );
  } finally {
    await db.user.update({
      where: { id: original.id },
      data: { passwordHash: original.passwordHash },
    });
  }
  results.push("Chạy lại không nhân đôi hoặc đặt lại mật khẩu");
  assert.equal(await surveySnapshot(), frozenSurvey);
  await db.user.update({
    where: { id: original.id },
    data: { status: "DISABLED" },
  });
  try {
    await run("small");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: original.id } })).status,
      "DISABLED",
    );
  } finally {
    await db.user.update({
      where: { id: original.id },
      data: { status: original.status },
    });
  }
  results.push("small: bổ sung an toàn, không xóa dữ liệu/mở lại tài khoản");
  const large = await run("large");
  assert.deepEqual(large, [3, 8, 80, 240, 120, 3000, 9001]);
  results.push("large: 3/8/80/240/120/3000/9001");
  assert.equal(await surveySnapshot(), frozenSurvey);
  results.push(
    "Tăng size giữ nguyên danh sách đã chốt, UUID phiếu/đáp án và kết quả đã có",
  );
  const lead = await db.$queryRaw<
    { total: bigint }[]
  >`SELECT COUNT(*) AS total FROM (SELECT sectionId FROM TeachingAssignment GROUP BY sectionId HAVING SUM(isLead)>1) AS invalidLeads`;
  assert.equal(Number(lead[0].total), 0);
  results.push("Tăng size không tạo hai giảng viên chính trong một lớp");
  assert.equal(await week7Snapshot(), originalWeek7);
  const week7Student = await db.user.findUniqueOrThrow({
    where: { loginCode: "W7-SV2026001" },
  });
  assert.equal(week7Student.passwordHash, null);
  const changedWeek7Hash = await hash("KiemThuMatKhauW7DaDoi!2026", 12);
  await db.user.update({
    where: { id: week7Student.id },
    data: { passwordHash: changedWeek7Hash, status: "DISABLED" },
  });
  try {
    await run("large");
    const preserved = await db.user.findUniqueOrThrow({
      where: { id: week7Student.id },
    });
    assert.equal(preserved.passwordHash, changedWeek7Hash);
    assert.equal(preserved.status, "DISABLED");
  } finally {
    await db.user.update({
      where: { id: week7Student.id },
      data: {
        passwordHash: week7Student.passwordHash,
        status: week7Student.status,
        updatedAt: week7Student.updatedAt,
      },
    });
  }
  assert.equal(await week7Snapshot(), originalWeek7);
  results.push(
    "Seed lại/tăng size giữ bundle W7 và mật khẩu/trạng thái đã đổi; không viết lại lịch sử hoặc dữ liệu khảo sát cũ",
  );
  assert.equal(await week9Snapshot(), originalWeek9);
  results.push(
    "E8 Tuần 9: cùng môn hai giảng viên, nhóm đánh giá, hai lớp đủ mẫu/một lớp thiếu, kỳ trước; 18 phiếu/40 nhiệm vụ, seed lại giữ nguyên hash",
  );
  Object.assign(process.env, { NODE_ENV: "production" });
  await assert.rejects(seedDemo(actor, "small"));
  Object.assign(process.env, { NODE_ENV: "development" });
  await assert.rejects(seedDemo(null, "small"));
  await assert.rejects(seedDemo(actor, "invalid" as DemoSize));
  results.push(
    "Từ chối production, actor không hợp lệ và size sai trước khi ghi",
  );
  const before = await db.user.count();
  await db.semester.update({
    where: { id: demoId("semester:2026-1") },
    data: { lockedAt: new Date() },
  });
  try {
    await assert.rejects(seedDemo(actor, "large"));
    assert.equal(await db.user.count(), before);
  } finally {
    await db.semester.update({
      where: { id: demoId("semester:2026-1") },
      data: { lockedAt: null },
    });
  }
  results.push("Seed từ chối học kỳ khóa và không thêm tài khoản");
  writeFileSync(
    ".local/demo/verification.json",
    JSON.stringify(
      { status: "passed", results, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(
    `Demo MySQL thật: ${results.length}/${results.length} nhóm qua; không thay đổi database chính.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message.slice(0, 160) : "Lỗi";
  console.error(`Kiểm seed không qua: ${message}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
