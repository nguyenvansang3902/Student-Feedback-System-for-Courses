import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
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
  const medium = await run("medium");
  assert.deepEqual(medium, [3, 8, 40, 120, 60, 1500, 4501]);
  results.push("medium: 3/8/40/120/60/1500/4501");
  const frozenSurvey = await surveySnapshot();
  results.push(
    "Đợt mở/đã đóng, task/phiếu ẩn danh, điểm trọng số và 6 trạng thái phản hồi khớp dữ liệu thật",
  );
  const legacyId = demoId("survey-data:template"),
    builtinId = demoId("week6-default-template");
  const selected = await db.surveyTemplate.findMany({
    where: { isDefault: true },
    include: {
      groups: { include: { questions: { include: { options: true } } } },
    },
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, builtinId);
  assert.equal(selected[0].status, "DA_KHOA");
  const builtinQuestions = selected[0].groups.flatMap((g) => g.questions);
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
    [4, 5],
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
  assert.equal(await db.surveyTemplate.count(), 2);
  results.push(
    "FR-35: họ mẫu mặc định mới đủ 5 loại/2 thang Likert, giữ mẫu 3 câu cũ và phiếu/kết quả",
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
