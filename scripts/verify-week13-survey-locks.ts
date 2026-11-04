import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { getDb } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
import type { AuthActor } from "../src/server/auth/types";
import { createAuthenticatedSession } from "../src/server/services/auth";
import {
  lockAdminMutations,
  lockAdminReaders,
  revokeUserAccess,
} from "../src/server/services/access";
import { submitStudentSurvey } from "../src/server/services/student-surveys";
import {
  assertLoadDatabase,
  type LoadMarker,
} from "./lib/week13-load-safety.mjs";

const main = new URL(process.env.DATABASE_URL ?? "");
const marker = JSON.parse(
  readFileSync(".local/week13-lock-database.json", "utf8"),
) as LoadMarker;
const target = new URL(main);
target.pathname = `/${marker.database}`;
const loadMarker = JSON.parse(
  readFileSync(".local/week13-load-database.json", "utf8"),
) as LoadMarker;
const load = new URL(main);
load.pathname = `/${loadMarker.database}`;
assertLoadDatabase(main.href, target.href, marker, [
  load.href,
  ...Object.entries(process.env)
    .filter(([key]) => /(?:SHADOW|TEST).*DATABASE_URL/.test(key))
    .map(([, value]) => value)
    .filter((value): value is string => !!value),
]);
process.env.DATABASE_URL = target.href;
const db = getDb(),
  prefix = `K13${randomUUID().replaceAll("-", "").slice(0, 10)}`;
const userIds: string[] = [];
const cases: Record<string, unknown>[] = [];
const result: Record<string, unknown> = {
  run: prefix,
  startedAt: new Date().toISOString(),
  status: "running",
  method:
    "Real MySQL interactive transactions/services; controlled transaction-delegate delay/failure injection only for boundary/rollback; no browser/HTTP claim",
  fixtureRetention:
    "Separate marker-guarded proof database; fixture retained, sessions revoked and accounts disabled",
};
let verified = false,
  revoked = false;
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function bounded<T>(
  promise: Promise<T>,
  milliseconds = 5000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Hết thời gian chờ điều phối khóa fixture.")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function save() {
  writeFileSync(
    ".local/week13-survey-lock-result.json",
    JSON.stringify(
      {
        ...result,
        cases,
        sessionsRevokedAndUsersDisabled: revoked,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}
function passed(name: string, proof: Record<string, unknown>) {
  cases.push({ name, ...proof });
  save();
  console.log(`QUA W13-LOCK-${cases.length} ${name}`);
}
type Student = { id: string; actor: AuthActor };
type TxOperation = (tx: Prisma.TransactionClient) => Promise<unknown>;
type TxOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};
type Hooks = { templateRead?: () => Promise<void>; failAnswers?: boolean };
async function withTransactionHooks<T>(
  hooks: Hooks,
  operation: () => Promise<T>,
): Promise<T> {
  const cache = globalThis as unknown as {
    studentFeedbackDb?: ReturnType<typeof getDb>;
  };
  const original = cache.studentFeedbackDb;
  const execute = db.$transaction.bind(db) as (
    operation: TxOperation,
    options?: TxOptions,
  ) => Promise<unknown>;
  const wrapped = new Proxy(db, {
    get(target, property, receiver) {
      if (property === "$transaction")
        return (operation: TxOperation, options?: TxOptions) =>
          execute(
            (tx) =>
              operation(
                new Proxy(tx, {
                  get(target, property, receiver) {
                    if (property === "surveyTemplate" && hooks.templateRead)
                      return new Proxy(target.surveyTemplate, {
                        get(delegate, method, receiver) {
                          if (method === "findUnique")
                            return async (
                              args: Prisma.SurveyTemplateFindUniqueArgs,
                            ) => {
                              const row = await delegate.findUnique(args);
                              await hooks.templateRead!();
                              return row;
                            };
                          return Reflect.get(delegate, method, receiver);
                        },
                      });
                    if (property === "surveyAnswer" && hooks.failAnswers)
                      return new Proxy(target.surveyAnswer, {
                        get(delegate, method, receiver) {
                          if (method === "createMany")
                            return async () => {
                              throw new Error(
                                "Lỗi chèn đáp án fixture có chủ ý.",
                              );
                            };
                          return Reflect.get(delegate, method, receiver);
                        },
                      });
                    return Reflect.get(target, property, receiver);
                  },
                }),
              ),
            options,
          );
      return Reflect.get(target, property, receiver);
    },
  });
  cache.studentFeedbackDb = wrapped;
  try {
    return await operation();
  } finally {
    cache.studentFeedbackDb = original;
  }
}
try {
  const [identity] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(identity.uuid, marker.serverUuid);
  assert.equal(identity.database, marker.database);
  verified = true;
  const creator = await db.user.create({
    data: {
      loginCode: `${prefix}Q`,
      email: `${prefix.toLowerCase()}-q@lock.invalid`,
      displayName: "ĐBCL kiểm khóa giả",
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: {
          role: "CAN_BO_DBCL",
          scopeType: "GLOBAL",
          scopeKey: "GLOBAL",
        },
      },
    },
  });
  userIds.push(creator.id);
  const faculty = await db.faculty.create({
    data: { code: `${prefix}F`, name: "Khoa kiểm khóa giả" },
  });
  const department = await db.department.create({
    data: {
      code: `${prefix}D`,
      name: "Bộ môn kiểm khóa giả",
      facultyId: faculty.id,
    },
  });
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: "Học kỳ kiểm khóa giả",
      startsOn: new Date(Date.now() - 86400000),
      endsOn: new Date(Date.now() + 86400000),
    },
  });
  const course = await db.course.create({
    data: {
      code: `${prefix}C`,
      name: "Môn kiểm khóa giả",
      credits: 3,
      departmentId: department.id,
    },
  });
  const section = await db.courseSection.create({
    data: { code: `${prefix}L`, courseId: course.id, semesterId: semester.id },
  });
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: "Mẫu kiểm khóa giả",
      status: "DA_KHOA",
      lockedAt: new Date(),
      createdById: creator.id,
      groups: {
        create: {
          title: "Nhóm kiểm khóa giả",
          position: 1,
          questions: {
            create: {
              label: "Đánh giá giả",
              type: "LIKERT",
              required: true,
              allowNA: false,
              position: 1,
              scaleMin: 1,
              scaleMax: 5,
            },
          },
        },
      },
    },
    include: { groups: { include: { questions: true } } },
  });
  const input = {
    answers: [
      { questionId: template.groups[0].questions[0].id, valueNumber: 4 },
    ],
  };
  async function student(): Promise<Student> {
    const user = await db.user.create({
      data: {
        loginCode: `${prefix}U${userIds.length}`,
        email: `${prefix.toLowerCase()}-${userIds.length}@lock.invalid`,
        displayName: "Sinh viên kiểm khóa giả",
        status: "ACTIVE",
        mustChangePassword: false,
        roles: {
          create: {
            role: "SINH_VIEN",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
          },
        },
      },
      include: { roles: true },
    });
    userIds.push(user.id);
    const session = await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        user,
        { ip: "week13-lock-fixture" },
        "FULL",
        false,
      ),
    );
    return { id: user.id, actor: session.actor };
  }
  async function campaign(students: Student[]) {
    const row = await db.surveyCampaign.create({
      data: {
        title: `${prefix} Đợt kiểm khóa`,
        semesterId: semester.id,
        templateId: template.id,
        scope: "SECTIONS",
        status: "DANG_MO",
        startsAt: new Date(Date.now() - 60000),
        endsAt: new Date(Date.now() + 3600000),
        openedAt: new Date(),
        createdById: creator.id,
        sections: { create: { sectionId: section.id } },
      },
    });
    const tasks = [];
    for (const item of students)
      tasks.push(
        await db.surveyTask.create({
          data: {
            campaignId: row.id,
            sectionId: section.id,
            studentId: item.id,
          },
        }),
      );
    return { id: row.id, tasks };
  }
  async function counts(id: string) {
    return {
      responses: await db.surveyResponse.count({ where: { campaignId: id } }),
      answers: await db.surveyAnswer.count({
        where: { response: { campaignId: id } },
      }),
      done: await db.surveyTask.count({
        where: { campaignId: id, status: "DONE" },
      }),
    };
  }

  const guardBefore = await db.systemSetting.count({
    where: { key: "ADMIN_MUTATION_LOCK" },
  });
  const coldStudent = await student(),
    cold = await campaign([coldStudent]);
  await submitStudentSurvey(coldStudent.actor, cold.tasks[0].id, input);
  assert.equal(
    await db.systemSetting.count({ where: { key: "ADMIN_MUTATION_LOCK" } }),
    1,
  );
  assert.deepEqual(await counts(cold.id), {
    responses: 1,
    answers: 1,
    done: 1,
  });
  passed("Guard ban đầu/fallback không nâng S thành X", {
    guardAbsentAtStart: guardBefore === 0,
    coldStartMeasured: guardBefore === 0,
    note: guardBefore
      ? "Guard đã có từ lượt cũ; không nhận lặp lại cold-start"
      : "Lượt đầu tạo guard qua fallback độc quyền rồi nộp đúng một phiếu",
  });

  const sEntered = gate(),
    sRelease = gate();
  const holder = db.$transaction(async (tx) => {
    assert(await lockAdminReaders(tx));
    sEntered.release();
    await bounded(sRelease.promise);
  });
  let writerEntered = false;
  try {
    await bounded(sEntered.promise);
    await bounded(
      db.$transaction(async (tx) => {
        assert(await lockAdminReaders(tx));
      }),
    );
    const writerStarted = gate();
    const writer = db.$transaction(async (tx) => {
      writerStarted.release();
      await lockAdminMutations(tx);
      writerEntered = true;
    });
    await bounded(writerStarted.promise);
    await delay(150);
    assert.equal(writerEntered, false);
    sRelease.release();
    await holder;
    await bounded(writer);
    assert.equal(writerEntered, true);
  } finally {
    sRelease.release();
    await holder;
  }
  passed("S/S tương thích và S đang giữ chặn X", {
    sharedReadersOverlapped: true,
    writerBlockedWhileSharedHeld: true,
    writerProgressedAfterRelease: writerEntered,
  });

  const parallelStudents = [await student(), await student()],
    parallel = await campaign(parallelStudents);
  const bothTemplates = gate();
  let readersAtTemplate = 0;
  await withTransactionHooks(
    {
      templateRead: async () => {
        readersAtTemplate++;
        if (readersAtTemplate === 2) bothTemplates.release();
        await bounded(bothTemplates.promise);
      },
    },
    () =>
      Promise.all(
        parallelStudents.map((item, index) =>
          submitStudentSurvey(item.actor, parallel.tasks[index].id, input),
        ),
      ),
  );
  assert.equal(readersAtTemplate, 2);
  assert.deepEqual(await counts(parallel.id), {
    responses: 2,
    answers: 2,
    done: 2,
  });
  passed("Hai nhiệm vụ riêng cùng tiến tới đọc mẫu dưới S", {
    concurrentTemplateReaders: readersAtTemplate,
    ...(await counts(parallel.id)),
  });

  for (const mutation of ["roles", "session"] as const) {
    const owner = await student(),
      item = await campaign([owner]);
    const mutationEntered = gate(),
      mutationRelease = gate();
    let settled = false;
    const writer = db.$transaction(async (tx) => {
      await lockAdminMutations(tx);
      if (mutation === "roles")
        await tx.roleAssignment.deleteMany({ where: { userId: owner.id } });
      else await revokeUserAccess(tx, owner.id);
      mutationEntered.release();
      await bounded(mutationRelease.promise);
    });
    let attempt: Promise<{ status: number }> | undefined;
    try {
      await bounded(mutationEntered.promise);
      attempt = submitStudentSurvey(owner.actor, item.tasks[0].id, input).then(
        () => {
          settled = true;
          return { status: 200 };
        },
        (error: unknown) => {
          settled = true;
          return {
            status:
              error && typeof error === "object" && "status" in error
                ? Number(error.status)
                : 0,
          };
        },
      );
      await delay(150);
      assert.equal(settled, false);
      mutationRelease.release();
      await writer;
      assert.equal(
        (await bounded(attempt)).status,
        mutation === "roles" ? 403 : 401,
      );
      assert.deepEqual(await counts(item.id), {
        responses: 0,
        answers: 0,
        done: 0,
      });
    } finally {
      mutationRelease.release();
      await writer;
      if (attempt) await attempt;
    }
    passed(`Đọc mới sau X thay đổi ${mutation}`, {
      staleActorDenied: true,
      expectedStatus: mutation === "roles" ? 403 : 401,
      ...(await counts(item.id)),
    });
  }

  const racingOwner = await student(),
    racing = await campaign([racingOwner]);
  const attempts = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      submitStudentSurvey(racingOwner.actor, racing.tasks[0].id, input),
    ),
  );
  assert.equal(
    attempts.filter((item) => item.status === "fulfilled").length,
    1,
  );
  const rejected = attempts.filter(
    (item): item is PromiseRejectedResult => item.status === "rejected",
  );
  assert.equal(rejected.length, 19);
  assert(rejected.every((item) => item.reason?.status === 409));
  assert.deepEqual(await counts(racing.id), {
    responses: 1,
    answers: 1,
    done: 1,
  });
  passed("BR-02 hai mươi lần cùng task chỉ một CAS thắng", {
    fulfilled: 1,
    rejected409: 19,
    ...(await counts(racing.id)),
  });

  const rollbackOwner = await student(),
    rollback = await campaign([rollbackOwner]);
  await assert.rejects(
    withTransactionHooks({ failAnswers: true }, () =>
      submitStudentSurvey(rollbackOwner.actor, rollback.tasks[0].id, input),
    ),
    { status: 500 },
  );
  assert.deepEqual(await counts(rollback.id), {
    responses: 0,
    answers: 0,
    done: 0,
  });
  const pending = await db.surveyTask.findUniqueOrThrow({
    where: { id: rollback.tasks[0].id },
    select: { status: true, doneDate: true },
  });
  assert.equal(pending.status, "PENDING");
  assert.equal(pending.doneDate, null);
  await submitStudentSurvey(rollbackOwner.actor, rollback.tasks[0].id, input);
  assert.deepEqual(await counts(rollback.id), {
    responses: 1,
    answers: 1,
    done: 1,
  });
  passed("BR-02 lỗi insert answer rollback MySQL và thử lại thành công", {
    pendingAndEmptyAfterFailure: true,
    ...(await counts(rollback.id)),
  });

  const deadlineOwner = await student(),
    deadline = await campaign([deadlineOwner]);
  const endsAt = new Date(Date.now() + 1000);
  let delayedWhileOpen = false;
  await db.surveyCampaign.update({
    where: { id: deadline.id },
    data: { endsAt },
  });
  await assert.rejects(
    withTransactionHooks(
      {
        templateRead: async () => {
          assert(
            Date.now() <= endsAt.getTime(),
            "Chưa vào đọc mẫu trước biên hạn; không nhận đã kiểm mốc thứ hai.",
          );
          delayedWhileOpen = true;
          await delay(Math.max(0, endsAt.getTime() - Date.now()) + 10);
        },
      },
      () =>
        submitStudentSurvey(deadlineOwner.actor, deadline.tasks[0].id, input),
    ),
    { status: 409, code: "STUDENT_SURVEY_UNAVAILABLE" },
  );
  assert(delayedWhileOpen);
  assert.deepEqual(await counts(deadline.id), {
    responses: 0,
    answers: 0,
    done: 0,
  });
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: deadline.id } }))
      .status,
    "DA_DONG",
  );
  assert.equal(
    await db.campaignHistory.count({
      where: { campaignId: deadline.id, action: "AUTO_CLOSE" },
    }),
    1,
  );
  passed("BR-04 hết hạn sau đọc mẫu nhả S rồi commit AUTO_CLOSE bằng X", {
    delayedTemplateRead: true,
    autoCloseEvents: 1,
    ...(await counts(deadline.id)),
  });

  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.failureKind =
    error instanceof assert.AssertionError ? "assertion" : "runtime";
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z_0-9]{1,50}$/.test(error.code)
  )
    result.failureCode = error.code;
  console.error(
    "Kiểm khóa Tuần13 chưa hoàn tất; không xuất SQL hoặc thông tin riêng.",
  );
  process.exitCode = 1;
} finally {
  if (verified && userIds.length) {
    await db.userSession.updateMany({
      where: { userId: { in: userIds } },
      data: { revokedAt: new Date() },
    });
    await db.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: "DISABLED" },
    });
    revoked = true;
  }
  result.finishedAt = new Date().toISOString();
  save();
  await db.$disconnect();
}
