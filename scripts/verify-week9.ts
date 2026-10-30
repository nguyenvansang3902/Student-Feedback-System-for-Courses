import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { generate } from "otplib";
import type { Prisma } from "../src/generated/prisma/client";
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import { issueAdminCsrf, issueCatalogCsrf } from "../src/server/auth/csrf";
import {
  encryptMfaSecret,
  getMfaKeyVersion,
  newMfaSecret,
} from "../src/server/auth/mfa-crypto";
import { mfaRateKeys } from "../src/server/auth/mfa-rate";
import { lockAdminMutations } from "../src/server/services/access";
import {
  DEFAULT_SURVEY_RESULT_SETTINGS,
  SURVEY_RESULT_SETTINGS_KEY,
} from "../src/server/services/survey-results-settings";

// Xác minh đích trước getDb(), khởi động máy chủ, tạo hoặc dọn bất kỳ fixture nào.
const marker = JSON.parse(
  readFileSync(".local/week4-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.W4_TEST_DATABASE_URL ?? ""),
  shadow = new URL(process.env.SHADOW_DATABASE_URL ?? "");
assert(
  marker.purpose === "isolated-week4-tests" &&
    main.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(main.hostname),
);
assert(
  test.protocol === main.protocol &&
    test.host === main.host &&
    test.username === main.username &&
    test.password === main.password,
);
assert(
  marker.mainDatabase === main.pathname.slice(1) &&
    marker.database === test.pathname.slice(1) &&
    test.pathname !== main.pathname &&
    test.pathname !== shadow.pathname,
);
assert(
  test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w4test_`) &&
    /^[a-f0-9]{8}$/.test(test.pathname.slice(-8)),
);
process.env.DATABASE_URL = test.href;
const port = 3009,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
process.env.AUTH_TRUST_PROXY = "true";
const db = getDb(),
  prefix = `W9${randomUUID().replaceAll("-", "").slice(0, 8)}`,
  fixtureIp = `198.19.${Number.parseInt(prefix.slice(-4, -2), 16)}.${Number.parseInt(prefix.slice(-2), 16)}`;
const password = "KiemThu2026!TuanChin",
  privateText = `${prefix} góp ý riêng tư chỉ dành cho kiểm duyệt`;
const userIds: string[] = [],
  campaignIds: string[] = [],
  templateIds: string[] = [],
  facultyIds: string[] = [],
  departmentIds: string[] = [],
  semesterIds: string[] = [],
  courseIds: string[] = [],
  sectionIds: string[] = [],
  responseIds: string[] = [],
  answerIds: string[] = [];
const secrets = new Set(
  [
    password,
    privateText,
    process.env.JWT_SECRET!,
    process.env.MFA_ENCRYPTION_KEY!,
    decodeURIComponent(test.password),
  ].filter(Boolean),
);
const cases: string[] = [];
let child: ReturnType<typeof spawn> | undefined,
  fd: number | undefined,
  verified = false,
  cleaned = false,
  baseline = "",
  outcome = "running",
  current = "Khởi tạo";
let originalSettings: Awaited<ReturnType<typeof db.systemSetting.findUnique>> =
    null,
  settingsSnapshotTaken = false;
const originalRateBuckets = new Map<
  string,
  Awaited<ReturnType<typeof db.rateLimitBucket.findUnique>>
>();
let configuration:
  | {
      saved: boolean;
      replayRejected: boolean;
      staleRejected: boolean;
      keywordsFlagged: number;
      restored: boolean;
    }
  | undefined;
let concurrency:
  | {
      requests: number;
      succeeded: number;
      rejected: number;
      resultRows: number;
    }
  | undefined;
let rollback:
  | {
      failedStatus: number;
      status: string;
      revision: number;
      resultRows: number;
      historyRows: number;
      auditRows: number;
      retrySucceeded: boolean;
    }
  | undefined;
type Client = {
  id: string;
  role: Role;
  actor: AuthActor;
  access: string;
  csrf: string;
};
type Options = {
  csrf?: boolean;
  token?: string;
  origin?: string | null;
  raw?: boolean;
  contentType?: string;
};
function save() {
  writeFileSync(
    ".local/week9-http-result.json",
    JSON.stringify(
      {
        status: outcome,
        passed: cases.length,
        cases,
        concurrency,
        rollback,
        configuration,
        cleaned,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
function pass(name: string) {
  cases.push(name);
  current = name;
  console.log(`QUA W9-HTTP-${String(cases.length).padStart(2, "0")} ${name}`);
  save();
}
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  options: Options = {},
) {
  const post = body !== undefined;
  const response = await fetch(origin + path, {
    method: post ? "POST" : "GET",
    headers: {
      ...(post
        ? {
            ...(options.origin === null
              ? {}
              : { origin: options.origin ?? origin }),
            "content-type": options.contentType ?? "application/json",
          }
        : {}),
      ...(client
        ? {
            cookie: `sfs_access=${client.access}`,
            ...(options.csrf === false
              ? {}
              : { "x-csrf-token": options.token ?? client.csrf }),
          }
        : {}),
      "user-agent": "week9-private-fixture-agent",
      "x-forwarded-for": fixtureIp,
    },
    body: post
      ? options.raw
        ? String(body)
        : JSON.stringify(body)
      : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  const data = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : null;
  return { status: response.status, data, response };
}
function ok(result: Awaited<ReturnType<typeof req>>, expected = 200) {
  assert.equal(
    result.status,
    expected,
    `HTTP ${result.status}, code=${result.data?.code ?? "non-json"}`,
  );
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  return result.data;
}
function noPrivate(value: unknown, extra: string[] = []) {
  const text = JSON.stringify(value);
  for (const secret of [...secrets, ...responseIds, ...answerIds, ...extra])
    assert(!text.includes(secret), "DTO hoặc metadata có giá trị riêng tư");
}
async function issue(
  userId: string,
  role: Role,
  mfa = role === "ADMIN",
): Promise<Client> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: true },
  });
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(tx, user, { ip: "week9-fixture" }, "FULL", mfa),
  );
  const tokens = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  secrets.add(tokens.accessToken);
  if (tokens.refreshToken) secrets.add(tokens.refreshToken);
  return {
    id: userId,
    role,
    actor: issued.actor,
    access: tokens.accessToken,
    csrf: "",
  };
}
async function createClient(
  role: Role,
  ordinal: number,
  passwordHash: string,
  index = 0,
): Promise<Client> {
  const scope =
    role === "TRUONG_KHOA"
      ? {
          scopeType: "FACULTY" as const,
          scopeKey: `FACULTY:${facultyIds[index]}`,
          facultyId: facultyIds[index],
        }
      : role === "TRUONG_BO_MON"
        ? {
            scopeType: "DEPARTMENT" as const,
            scopeKey: `DEPARTMENT:${departmentIds[index]}`,
            departmentId: departmentIds[index],
          }
        : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const user = await db.user.create({
    data: {
      loginCode: `${prefix}-U${ordinal}`,
      email: `${prefix.toLowerCase()}-${ordinal}@fixture.invalid`,
      displayName: `${prefix} ${role}`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: { role, ...scope } },
    },
  });
  userIds.push(user.id);
  secrets.add(user.loginCode);
  secrets.add(user.email!);
  return issue(user.id, role);
}
async function fingerprint() {
  const [responses, answers, tasks, results] = await Promise.all([
    db.surveyResponse.findMany({
      where: { campaignId: { notIn: campaignIds } },
      orderBy: { id: "asc" },
    }),
    db.surveyAnswer.findMany({
      where: { response: { campaignId: { notIn: campaignIds } } },
      orderBy: { id: "asc" },
    }),
    db.surveyTask.findMany({
      where: { campaignId: { notIn: campaignIds } },
      orderBy: { id: "asc" },
    }),
    db.aggregateResult.findMany({
      where: { campaignId: { notIn: campaignIds } },
      orderBy: { id: "asc" },
    }),
  ]);
  return createHash("sha256")
    .update(JSON.stringify({ responses, answers, tasks, results }))
    .digest("hex");
}
const path = (campaign: string, action = "") =>
  `/api/survey-results/${campaign}${action ? `/${action}` : ""}`;
async function revision(id: string) {
  return (
    await db.surveyCampaign.findUniqueOrThrow({
      where: { id },
      select: { revision: true },
    })
  ).revision;
}
async function action(id: string) {
  return { expectedRevision: await revision(id), requestId: randomUUID() };
}

try {
  const [identity] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity.uuid, marker.serverUuid);
  assert.equal(identity.database, marker.database);
  verified = true;
  originalSettings = await db.systemSetting.findUnique({
    where: { key: SURVEY_RESULT_SETTINGS_KEY },
  });
  settingsSnapshotTaken = true;
  assert.equal(
    await db.surveyCampaign.count({
      where: { status: { in: ["DA_DUYET", "DANG_MO"] } },
    }),
    0,
    "Không chạy khi còn đợt hoạt động ngoài fixture",
  );
  baseline = await fingerprint();
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new Error("Cổng3009 đang được dùng.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cổng3009"))
      throw error;
  }
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week9-http.log", "w");
  save();
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "development",
        SFS_TEST_DIST_DIR: ".next-week9",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    assert.equal(child.exitCode, null, "Máy chủ thử đã thoát");
    try {
      if (
        (
          await fetch(`${origin}/api/health`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  assert(ready, "Máy chủ Tuần9 chưa sẵn sàng");
  for (let index = 0; index < 2; index++) {
    const faculty = await db.faculty.create({
      data: {
        code: `${prefix}-F${index}`,
        name: `${prefix} Khoa giả ${index}`,
      },
    });
    facultyIds.push(faculty.id);
    const department = await db.department.create({
      data: {
        code: `${prefix}-D${index}`,
        name: `${prefix} Bộ môn giả ${index}`,
        facultyId: faculty.id,
      },
    });
    departmentIds.push(department.id);
    const course = await db.course.create({
      data: {
        code: `${prefix}-C${index}`,
        name: `${prefix} Môn giả ${index}`,
        credits: 3,
        departmentId: department.id,
      },
    });
    courseIds.push(course.id);
  }
  const semester = await db.semester.create({
    data: {
      code: `${prefix}-S`,
      name: `${prefix} Học kỳ giả`,
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2035-12-31"),
    },
  });
  semesterIds.push(semester.id);
  const clients = new Map<Role, Client>(),
    passwordHash = await hash(password, 12);
  const roles: Role[] = [
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
  ];
  for (const [index, role] of roles.entries())
    clients.set(role, await createClient(role, index, passwordHash));
  const creator = clients.get("CAN_BO_DBCL")!,
    teacher = clients.get("GIANG_VIEN")!,
    head = clients.get("TRUONG_BO_MON")!,
    dean = clients.get("TRUONG_KHOA")!,
    examiner = clients.get("PHONG_KHAO_THI")!,
    leader = clients.get("LANH_DAO")!,
    pdt = clients.get("PHONG_DAO_TAO")!;
  const secondTeacher = await createClient("GIANG_VIEN", 10, passwordHash),
    combined = await createClient("PHONG_KHAO_THI", 11, passwordHash);
  await db.roleAssignment.create({
    data: {
      userId: combined.id,
      role: "GIANG_VIEN",
      scopeType: "GLOBAL",
      scopeKey: "GLOBAL",
    },
  });
  const combinedClient = await issue(combined.id, "PHONG_KHAO_THI");
  const students = [clients.get("SINH_VIEN")!];
  for (let index = 0; index < 9; index++)
    students.push(await createClient("SINH_VIEN", 12 + index, passwordHash));
  for (const client of [...clients.values(), combinedClient, secondTeacher]) {
    if (
      ["SINH_VIEN", "ADMIN", "PHONG_DAO_TAO", "THANH_TRA"].includes(
        client.role,
      ) ||
      (client.role === "PHONG_KHAO_THI" &&
        !client.actor.roles.includes("GIANG_VIEN"))
    )
      continue;
    client.csrf = ok(await req("/api/survey-results/csrf", client)).csrfToken;
    secrets.add(client.csrf);
  }
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} Mẫu công thức`,
      status: "DA_KHOA",
      lockedAt: new Date(),
      createdById: creator.id,
      groups: {
        create: [
          {
            title: "Nhóm A — Kiểm tra, đánh giá",
            position: 1,
            weight: 2,
            isAssessmentGroup: true,
            questions: {
              create: [
                {
                  label: "Q1",
                  type: "LIKERT",
                  position: 1,
                  weight: 1,
                  required: true,
                  scaleMin: 1,
                  scaleMax: 5,
                },
                {
                  label: "Q2",
                  type: "LIKERT",
                  position: 2,
                  weight: 2,
                  required: true,
                  allowNA: true,
                  scaleMin: 1,
                  scaleMax: 5,
                },
                {
                  label: "Góp ý tự luận",
                  type: "TEXT",
                  position: 3,
                  weight: 1,
                  required: false,
                  allowNA: true,
                },
              ],
            },
          },
          {
            title: "Nhóm B — Giảng dạy",
            position: 2,
            weight: 1,
            isAssessmentGroup: false,
            questions: {
              create: [
                {
                  label: "Q3",
                  type: "LIKERT",
                  position: 1,
                  weight: 1,
                  required: true,
                  scaleMin: 1,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      groups: {
        orderBy: { position: "asc" },
        include: { questions: { orderBy: { position: "asc" } } },
      },
    },
  });
  templateIds.push(template.id);
  const [q1, q2, qt] = template.groups[0].questions,
    q3 = template.groups[1].questions[0];
  for (let index = 0; index < 3; index++) {
    const section = await db.courseSection.create({
      data: {
        code: `${prefix}-L${index}`,
        semesterId: semester.id,
        courseId: courseIds[index === 2 ? 1 : 0],
        teaching: {
          create: { teacherId: index === 1 ? secondTeacher.id : teacher.id },
        },
      },
    });
    sectionIds.push(section.id);
  }
  await db.teachingAssignment.create({
    data: { sectionId: sectionIds[0], teacherId: combined.id },
  });
  // E8 hai giảng viên khác nhau ở cùng môn; lớp thiếu mẫu thuộc khoa khác để kiểm phạm vi.
  const campaign = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt công thức`,
      semesterId: semester.id,
      templateId: template.id,
      scope: "SECTIONS",
      status: "DA_DONG",
      startsAt: new Date(Date.now() - 7200000),
      endsAt: new Date(Date.now() - 3600000),
      minResponses: 4,
      minRate: 0.4,
      createdById: creator.id,
      sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
    },
  });
  campaignIds.push(campaign.id);
  const privateAnswerIds: string[] = [];
  for (let index = 0; index < 3; index++) {
    const count = [4, 5, 3][index];
    await db.surveyTask.createMany({
      data: students.map((student, ordinal) => ({
        campaignId: campaign.id,
        sectionId: sectionIds[index],
        studentId: student.id,
        status: ordinal < count ? "DONE" : "PENDING",
        doneDate: ordinal < count ? new Date("2026-10-30") : null,
      })),
    });
    for (let ordinal = 0; ordinal < count; ordinal++) {
      const id = randomUUID();
      responseIds.push(id);
      await db.surveyResponse.create({
        data: {
          id,
          campaignId: campaign.id,
          sectionId: sectionIds[index],
          submittedDate: new Date("2026-10-30"),
        },
      });
      const numeric =
        index === 0
          ? [[5, 4, 4, 5][ordinal], [3, 4, 5, null][ordinal], 4]
          : [index === 1 ? 5 : 1, index === 1 ? 5 : 1, index === 1 ? 5 : 1];
      const values = [q1, q2, q3].map((question, position) => ({
        id: randomUUID(),
        responseId: id,
        questionId: question.id,
        valueNumber: numeric[position],
        isNotApplicable: numeric[position] === null,
      }));
      answerIds.push(...values.map((answer) => answer.id));
      await db.surveyAnswer.createMany({ data: values });
      if (ordinal === 0) {
        const answer = randomUUID();
        answerIds.push(answer);
        privateAnswerIds.push(answer);
        await db.surveyAnswer.create({
          data: {
            id: answer,
            responseId: id,
            questionId: qt.id,
            valueText: privateText,
          },
        });
      }
    }
  }
  const open = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt nhắc`,
      semesterId: semester.id,
      templateId: template.id,
      scope: "SECTIONS",
      status: "DANG_MO",
      openedAt: new Date(),
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 3600000),
      createdById: creator.id,
      sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
    },
  });
  campaignIds.push(open.id);
  await db.surveyTask.createMany({
    data: sectionIds.flatMap((sectionId) =>
      students.map((student) => ({
        campaignId: open.id,
        sectionId,
        studentId: student.id,
      })),
    ),
  });

  ok(await req("/api/survey-results"), 401);
  for (const role of [
    "SINH_VIEN",
    "ADMIN",
    "PHONG_DAO_TAO",
    "THANH_TRA",
  ] as const)
    ok(await req("/api/survey-results", clients.get(role)), 403);
  for (const client of [teacher, head, dean, examiner])
    ok(
      await req(path(campaign.id, `classes/${sectionIds[0]}`), client),
      client === examiner ? 403 : 404,
    );
  const metadata = ok(await req(path(open.id), head)).item;
  assert.deepEqual(metadata.buckets, []);
  assert(metadata.campaign.capabilities.incomplete);
  pass(
    "BR-08/13/18/34: ma trận vai trò, metadata nhắc trước công bố; GV/trưởng đơn vị chưa nhận điểm, KT không có route lớp",
  );

  const aggregateBody = await action(campaign.id);
  ok(
    await req(path(campaign.id, "aggregate"), creator, aggregateBody, {
      csrf: false,
    }),
    403,
  );
  ok(
    await req(path(campaign.id, "aggregate"), creator, aggregateBody, {
      token: issueCatalogCsrf(creator.actor),
    }),
    403,
  );
  ok(
    await req(path(campaign.id, "aggregate"), creator, aggregateBody, {
      origin: "https://cross-site.invalid",
    }),
    403,
  );
  ok(
    await req(
      path(campaign.id, "aggregate"),
      creator,
      "{".padEnd(262145, " "),
      { raw: true },
    ),
    413,
  );
  ok(
    await req(path(campaign.id, "aggregate"), creator, "{}", {
      raw: true,
      contentType: "text/plain",
    }),
    415,
  );
  assert.equal(
    await db.aggregateResult.count({ where: { campaignId: campaign.id } }),
    0,
  );
  pass(
    "BR-30/34: CSRF đúng miền/phiên, nguồn gửi và giới hạn body chặn trước thay đổi dữ liệu",
  );

  // Lớp UUID đứng cuối được tổng hợp sau hai lớp trước. Dữ liệu giả sai thang
  // cưỡng bức lỗi ở lớp này để xác minh cả các INSERT trước đó bị rollback.
  const invalidSection = [...sectionIds].sort().at(-1)!;
  const invalidAnswer = await db.surveyAnswer.findFirstOrThrow({
    where: {
      questionId: q1.id,
      response: { campaignId: campaign.id, sectionId: invalidSection },
    },
    select: { id: true, valueNumber: true },
  });
  await db.surveyAnswer.update({
    where: { id: invalidAnswer.id },
    data: { valueNumber: 6 },
  });
  const forcedFailure = await req(
    path(campaign.id, "aggregate"),
    creator,
    await action(campaign.id),
  );
  ok(forcedFailure, 409);
  assert.equal(forcedFailure.data.code, "INVALID_AGGREGATE");
  noPrivate(forcedFailure.data);
  const rollbackCampaign = await db.surveyCampaign.findUniqueOrThrow({
    where: { id: campaign.id },
  });
  rollback = {
    failedStatus: forcedFailure.status,
    status: rollbackCampaign.status,
    revision: rollbackCampaign.revision,
    resultRows: await db.aggregateResult.count({
      where: { campaignId: campaign.id },
    }),
    historyRows: await db.campaignHistory.count({
      where: { campaignId: campaign.id, action: "RESULTS_AGGREGATE" },
    }),
    auditRows: await db.auditLog.count({
      where: { objectId: campaign.id, action: "SURVEY_RESULTS_AGGREGATE" },
    }),
    retrySucceeded: false,
  };
  assert.deepEqual(rollback, {
    failedStatus: 409,
    status: "DA_DONG",
    revision: 1,
    resultRows: 0,
    historyRows: 0,
    auditRows: 0,
    retrySucceeded: false,
  });
  await db.surveyAnswer.update({
    where: { id: invalidAnswer.id },
    data: { valueNumber: invalidAnswer.valueNumber },
  });
  pass(
    "BR-11/30: lỗi dữ liệu giả ở lớp tổng hợp cuối rollback toàn giao dịch, giữ DA_DONG/revision1/0 kết quả/0 history/0 audit; HTTP che chi tiết",
  );

  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () =>
      req(path(campaign.id, "aggregate"), creator, {
        ...aggregateBody,
        requestId: randomUUID(),
      }),
    ),
  );
  const succeeded = concurrent.filter((result) => result.status === 200),
    rejected = concurrent.filter((result) => result.status === 409);
  assert.equal(succeeded.length, 1);
  assert.equal(rejected.length, 9);
  const resultRows = await db.aggregateResult.count({
    where: { campaignId: campaign.id },
  });
  assert.equal(resultRows, 3);
  concurrency = {
    requests: 10,
    succeeded: succeeded.length,
    rejected: rejected.length,
    resultRows,
  };
  rollback.retrySucceeded = true;
  const history = await db.campaignHistory.findFirstOrThrow({
    where: { campaignId: campaign.id, action: "RESULTS_AGGREGATE" },
  });
  const replay = ok(
    await req(path(campaign.id, "aggregate"), creator, {
      expectedRevision: aggregateBody.expectedRevision,
      requestId: history.requestId,
    }),
  ).item;
  assert.equal(replay.replayed, true);
  assert.equal(await revision(campaign.id), 2);
  const dbclResults = ok(await req(path(campaign.id), creator)).item;
  const classA = dbclResults.buckets.find(
    (bucket: { level: string; id: string }) =>
      bucket.level === "CLASS" && bucket.id === sectionIds[0],
  );
  assert.equal(classA.overallScore, 4.11);
  assert.equal(classA.participationRate, 0.4);
  assert.equal(classA.groups[0].score, 4.17);
  assert.equal(classA.groups[0].questions[0].mean, 4.5);
  assert.equal(classA.groups[0].questions[1].mean, 4);
  const stored = await db.aggregateResult.findUniqueOrThrow({
    where: {
      campaignId_sectionId: {
        campaignId: campaign.id,
        sectionId: sectionIds[0],
      },
    },
  });
  const snapshot = JSON.stringify(stored.details);
  assert(!snapshot.includes(privateText));
  for (const id of [
    ...students.map((student) => student.id),
    ...responseIds,
    ...answerIds,
  ])
    assert(!snapshot.includes(id));
  pass(
    "TC-AGG-01/BR-07/11/12: tính tay4,11 và40% đúng biên;10 tổng hợp đồng thời1 thành công/9x409, replay không nhân bản; snapshot không cầu nối danh tính",
  );

  const publishBody = await action(campaign.id);
  ok(await req(path(campaign.id, "publish"), creator, publishBody), 409);
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: campaign.id } }))
      .status,
    "DA_TONG_HOP",
  );
  const queue = ok(await req(path(campaign.id, "moderation"), creator));
  assert.equal(queue.total, 3);
  for (const item of queue.items) {
    assert(privateAnswerIds.includes(item.id));
    assert.equal(item.text, privateText);
    assert(!("responseId" in item));
    assert(!("submittedDate" in item));
  }
  for (const [index, item] of queue.items.entries()) {
    ok(
      await req(path(campaign.id, "moderation"), creator, {
        answerId: item.id,
        status: index === 0 ? "DA_AN" : "HIEN_THI",
        reason: "",
      }),
      400,
    );
    const decision = {
      answerId: item.id,
      status: index === 0 ? "DA_AN" : "HIEN_THI",
      reason: "Nội dung mẫu đã được xem xét.",
    };
    ok(await req(path(campaign.id, "moderation"), creator, decision));
    ok(await req(path(campaign.id, "moderation"), creator, decision));
    ok(
      await req(path(campaign.id, "moderation"), creator, {
        ...decision,
        reason: "Thay đổi quyết định sau duyệt.",
      }),
      409,
    );
  }
  assert.equal(
    await db.auditLog.count({
      where: { action: "SURVEY_TEXT_MODERATED", actorId: creator.id },
    }),
    3,
  );
  assert(
    (await db.surveyAnswer.count({
      where: {
        response: { campaignId: campaign.id },
        questionId: q1.id,
        moderationStatus: "CHO_KIEM_DUYET",
      },
    })) > 0,
  );
  ok(await req(path(campaign.id, "publish"), leader, publishBody), 403);
  ok(await req(path(campaign.id, "publish"), creator, publishBody));
  assert.equal(
    ok(await req(path(campaign.id, "publish"), creator, publishBody)).item
      .replayed,
    true,
  );
  pass(
    "BR-09/18: công bố bị chặn bởiTEXT chưa duyệt; lý do bắt buộc, CAS/idempotent quyết định; nonTEXT mặc định chờ không chặn công bố",
  );

  const teacherResults = ok(await req(path(campaign.id), teacher)).item;
  const classIds = teacherResults.buckets
    .filter((bucket: { level: string }) => bucket.level === "CLASS")
    .map((bucket: { id: string }) => bucket.id);
  assert(
    classIds.includes(sectionIds[0]) &&
      classIds.includes(sectionIds[2]) &&
      !classIds.includes(sectionIds[1]),
  );
  ok(await req(path(campaign.id, `classes/${sectionIds[1]}`), teacher), 404);
  ok(await req(path(campaign.id, `classes/${randomUUID()}`), teacher), 404);
  for (const client of [head, dean]) {
    const detail = ok(await req(path(campaign.id), client)).item;
    assert(!JSON.stringify(detail).includes(sectionIds[2]));
    ok(await req(path(campaign.id, `classes/${sectionIds[2]}`), client), 404);
  }
  const insufficient = ok(
    await req(path(campaign.id, `classes/${sectionIds[2]}`), teacher),
  ).item;
  assert.equal(insufficient.result.message, "Chưa đủ mẫu để công bố");
  assert.equal(insufficient.result.overallScore, null);
  assert.deepEqual(insufficient.result.groups, []);
  assert.deepEqual(insufficient.comments, []);
  const classResult = ok(
    await req(path(campaign.id, `classes/${sectionIds[0]}`), teacher),
  ).item;
  assert.equal(classResult.result.overallScore, 4.11);
  assert.equal(classResult.comparisons[0].result.overallScore, 4.64);
  for (const comment of classResult.comments)
    assert.deepEqual(Object.keys(comment).sort(), ["questionLabel", "text"]);
  noPrivate({ ...classResult, comments: [] }, [...userIds]);
  pass(
    "BR-03/07/08/34/FR-64: GV chỉ lớp mình, TBM/TK đúng đơn vị, IDOR404; lớp thiếu mẫu ẩnđiểm/TEXT, so sánh gộp toànphiếu4,64",
  );

  // Thay phân công sau tổng hợp để kiểm ngưỡng KT dùng snapshot, quyền GV dùng phân công hiện tại.
  await db.teachingAssignment.deleteMany({
    where: {
      sectionId: { in: sectionIds },
      teacherId: { in: [teacher.id, secondTeacher.id, combined.id] },
    },
  });
  const assessment = ok(await req(path(campaign.id), examiner)).item;
  const assessmentCourse = assessment.buckets.find(
    (bucket: { level: string; id: string }) =>
      bucket.level === "COURSE" && bucket.id === courseIds[0],
  );
  assert.equal(assessmentCourse.overallScore, 4.68);
  assert.equal(assessmentCourse.groups.length, 1);
  assert.deepEqual(assessmentCourse.groups[0].questions, []);
  const insufficientCourse = assessment.buckets.find(
    (bucket: { level: string; id: string }) =>
      bucket.level === "COURSE" && bucket.id === courseIds[1],
  );
  assert.equal(insufficientCourse.message, "Chưa đủ dữ liệu gộp");
  assert.equal(insufficientCourse.responseCount, null);
  noPrivate(assessment, [...userIds, ...sectionIds]);
  const assessmentText = JSON.stringify(assessment);
  for (const key of [
    "CLASS",
    "teacherIds",
    "responseId",
    "answerId",
    "valueText",
    "Nhóm B",
  ])
    assert(!assessmentText.includes(key));
  ok(await req(path(campaign.id, `classes/${sectionIds[0]}`), examiner), 403);
  ok(await req(path(campaign.id, `classes/${sectionIds[0]}`), teacher), 404);
  // Trả lại phân công fixture để kiểm union GV+KT không mở rộng thành lớp khác.
  await db.teachingAssignment.createMany({
    data: [
      { sectionId: sectionIds[0], teacherId: teacher.id },
      { sectionId: sectionIds[0], teacherId: combined.id },
      { sectionId: sectionIds[1], teacherId: secondTeacher.id },
      { sectionId: sectionIds[2], teacherId: teacher.id },
    ],
  });
  const combinedStandard = ok(
    await req(path(campaign.id) + "?audience=STANDARD", combinedClient),
  ).item;
  assert.equal(
    combinedStandard.buckets.filter(
      (bucket: { level: string }) => bucket.level === "CLASS",
    ).length,
    1,
  );
  ok(
    await req(path(campaign.id, `classes/${sectionIds[1]}`), combinedClient),
    404,
  );
  assert.equal(
    ok(await req(path(campaign.id) + "?audience=ASSESSMENT", combinedClient))
      .item.audience,
    "ASSESSMENT",
  );
  pass(
    "TC-KT-01/BR-57:≥2 GV snapshot cùngmôn; điểm nhóm4,68, không lớp/GV/TEXT; thiếu mẫuẩn; union KT+GV không nới quyền lớp",
  );

  const beforeAudit = await db.auditLog.count({
    where: { action: "SURVEY_INCOMPLETE_VIEWED", actorId: head.id },
  });
  const pending = ok(
    await req(path(open.id, "incomplete") + "?pageSize=50", head),
  );
  assert.equal(pending.total, 20);
  assert(
    pending.items.every(
      (item: { sectionId: string }) => item.sectionId !== sectionIds[2],
    ),
  );
  const pendingText = JSON.stringify(pending);
  for (const forbidden of [
    privateText,
    "valueNumber",
    "responseId",
    ...answerIds,
  ])
    assert(!pendingText.includes(forbidden));
  ok(await req(path(open.id, "incomplete") + "?page=999", head));
  assert.equal(
    await db.auditLog.count({
      where: { action: "SURVEY_INCOMPLETE_VIEWED", actorId: head.id },
    }),
    beforeAudit + 2,
  );
  ok(await req(path(open.id, "incomplete"), teacher), 403);
  ok(
    await req(
      path(open.id, "incomplete") + `?sectionId=${sectionIds[2]}`,
      head,
    ),
    404,
  );
  const reminder = ok(
    await req(path(open.id, "remind"), head, { sectionId: sectionIds[0] }),
  ).item;
  assert.equal(reminder.queued, 10);
  const duplicateReminder = ok(
    await req(path(open.id, "remind"), creator, { sectionId: sectionIds[1] }),
  ).item;
  assert.equal(duplicateReminder.queued, 0);
  assert.equal(
    await db.notification.count({
      where: { targetId: open.id, title: "Nhắc hoàn thành khảo sát" },
    }),
    10,
  );
  assert.equal(
    await db.emailOutbox.count({
      where: {
        notification: { targetId: open.id, title: "Nhắc hoàn thành khảo sát" },
      },
    }),
    10,
  );
  pass(
    "BR-13: chỉ trạng thái pending, scope riêng, mỗi lầnxem kểcảtrangrỗng cóaudit; nhắc2lớp/2vai trò vẫn1lần/ngày/SV/đợt",
  );

  const pdtCsrf = ok(await req("/api/catalog/csrf", pdt)).csrfToken;
  ok(
    await req(
      `/api/catalog/semesters/${semester.id}/lock`,
      pdt,
      { reason: "Kiểm thử khóa học kỳ khi còn đợt mở." },
      { token: pdtCsrf },
    ),
    409,
  );
  const campaignCsrf = ok(await req("/api/campaigns/csrf", creator)).csrfToken;
  ok(
    await req(
      `/api/campaigns/${open.id}/close`,
      creator,
      {
        ...(await action(open.id)),
        reason: "Đóng đợt fixture để kiểm thử khóa sổ.",
      },
      { token: campaignCsrf },
    ),
  );
  ok(
    await req(
      `/api/catalog/semesters/${semester.id}/lock`,
      pdt,
      { reason: "Kiểm thử lưu trữ đợt đã công bố khi khóa sổ." },
      { token: pdtCsrf },
    ),
  );
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: campaign.id } }))
      .status,
    "LUU_TRU",
  );
  assert.equal(
    ok(await req(path(campaign.id), teacher)).item.campaign.status,
    "LUU_TRU",
  );
  assert.equal(
    ok(await req(path(campaign.id), examiner)).item.audience,
    "ASSESSMENT",
  );
  ok(
    await req(path(open.id, "aggregate"), creator, await action(open.id)),
    409,
  );
  ok(await req(path(open.id, "remind"), creator, {}), 409);
  ok(
    await req(
      `/api/catalog/semesters/${semester.id}/unlock`,
      pdt,
      { reason: "Mở khóa fixture để kiểm tra không hồi quy lưu trữ." },
      { token: pdtCsrf },
    ),
  );
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: campaign.id } }))
      .status,
    "LUU_TRU",
  );
  pass(
    "BR-17/51: chặn khóa khi đangmở; sauđóng khóa kỳ tựlưu trữ đợt côngbố, vẫnđọc; cấmghi vàmởkhóa khônglùi trạngthái",
  );

  await db.userSession.update({
    where: { id: teacher.actor.sessionId },
    data: { revokedAt: new Date() },
  });
  ok(await req(path(campaign.id), teacher), 401);
  await db.roleAssignment.deleteMany({
    where: { userId: secondTeacher.id, role: "GIANG_VIEN" },
  });
  ok(await req(path(campaign.id), secondTeacher), 403);
  pass(
    "BR-34: thu hồi phiên hoặc vai trò có hiệu lực trên request tiếp theo, không tin JWT cũ",
  );

  const settingsPath = "/api/admin/survey-result-settings",
    admin = clients.get("ADMIN")!;
  ok(await req(settingsPath), 401);
  ok(await req(settingsPath, creator), 403);
  const initialSettings = ok(await req(settingsPath, admin)).item;
  assert.deepEqual(
    {
      ratingBands: initialSettings.ratingBands,
      sensitiveKeywords: initialSettings.sensitiveKeywords,
    },
    originalSettings?.value ?? DEFAULT_SURVEY_RESULT_SETTINGS,
  );
  const totpSecret = newMfaSecret();
  secrets.add(totpSecret);
  await db.totpCredential.create({
    data: {
      userId: admin.id,
      encryptedSecret: encryptMfaSecret(totpSecret, admin.id),
      keyVersion: getMfaKeyVersion(),
      enabledAt: new Date(),
    },
  });
  for (const key of mfaRateKeys(admin.id, fixtureIp))
    originalRateBuckets.set(
      key,
      await db.rateLimitBucket.findUnique({ where: { keyHash: key } }),
    );
  const adminToken = ok(await req("/api/admin/csrf", admin)).csrfToken;
  secrets.add(adminToken);
  const changedSettings = {
    ratingBands: DEFAULT_SURVEY_RESULT_SETTINGS.ratingBands.map(
      (band, index) => ({
        ...band,
        minScore: index === 0 ? 4.6 : band.minScore,
      }),
    ),
    sensitiveKeywords: [privateText],
  };
  const stepUpCode = await generate({
    secret: totpSecret,
    digits: 6,
    period: 30,
    epoch: Math.floor(Date.now() / 1000),
  });
  secrets.add(stepUpCode);
  const settingsBody = {
    ...changedSettings,
    expectedUpdatedAt: initialSettings.updatedAt,
    stepUpCode,
  };
  ok(await req(settingsPath, admin, settingsBody, { csrf: false }), 403);
  ok(
    await req(settingsPath, admin, settingsBody, {
      token: issueAdminCsrf({ ...admin.actor, sessionId: randomUUID() }),
    }),
    403,
  );
  const wrongCode = `${(Number(stepUpCode[0]) + 1) % 10}${stepUpCode.slice(1)}`;
  secrets.add(wrongCode);
  ok(
    await req(
      settingsPath,
      admin,
      { ...settingsBody, stepUpCode: wrongCode },
      { token: adminToken },
    ),
    400,
  );
  assert.equal(
    (await db.totpCredential.findUniqueOrThrow({ where: { userId: admin.id } }))
      .lastUsedStep,
    null,
  );
  const savedSettings = ok(
    await req(settingsPath, admin, settingsBody, { token: adminToken }),
  ).item;
  assert.deepEqual(
    {
      ratingBands: savedSettings.ratingBands,
      sensitiveKeywords: savedSettings.sensitiveKeywords,
    },
    changedSettings,
  );
  assert(
    savedSettings.updatedAt &&
      savedSettings.updatedAt !== initialSettings.updatedAt,
  );
  assert.notEqual(
    (await db.totpCredential.findUniqueOrThrow({ where: { userId: admin.id } }))
      .lastUsedStep,
    null,
  );
  const replaySettings = await req(
    settingsPath,
    admin,
    {
      ...changedSettings,
      expectedUpdatedAt: savedSettings.updatedAt,
      stepUpCode,
    },
    { token: adminToken },
  );
  ok(replaySettings, 400);
  assert.equal(replaySettings.data.code, "INVALID_MFA_CODE");
  const secondAdmin = await createClient("ADMIN", 25, passwordHash),
    secondSecret = newMfaSecret();
  secrets.add(secondSecret);
  await db.totpCredential.create({
    data: {
      userId: secondAdmin.id,
      encryptedSecret: encryptMfaSecret(secondSecret, secondAdmin.id),
      keyVersion: getMfaKeyVersion(),
      enabledAt: new Date(),
    },
  });
  for (const key of mfaRateKeys(secondAdmin.id, fixtureIp))
    if (!originalRateBuckets.has(key))
      originalRateBuckets.set(
        key,
        await db.rateLimitBucket.findUnique({ where: { keyHash: key } }),
      );
  const secondAdminToken = ok(
    await req("/api/admin/csrf", secondAdmin),
  ).csrfToken;
  secrets.add(secondAdminToken);
  const secondCode = await generate({
    secret: secondSecret,
    digits: 6,
    period: 30,
    epoch: Math.floor(Date.now() / 1000),
  });
  secrets.add(secondCode);
  const staleSettings = await req(
    settingsPath,
    secondAdmin,
    { ...settingsBody, stepUpCode: secondCode },
    { token: secondAdminToken },
  );
  ok(staleSettings, 409);
  assert.equal(staleSettings.data.code, "RESULT_SETTINGS_CONFLICT");
  assert.deepEqual(ok(await req(settingsPath, admin)).item, savedSettings);
  assert.equal(
    await db.auditLog.count({
      where: {
        actorId: { in: [admin.id, secondAdmin.id] },
        action: "SURVEY_RESULT_SETTINGS_CHANGED",
      },
    }),
    1,
  );
  const flaggedQueue = ok(await req(path(campaign.id, "moderation"), creator));
  assert.equal(flaggedQueue.total, 3);
  assert(
    flaggedQueue.items.every((item: { flagged: boolean }) => item.flagged),
  );
  const storedSetting = await db.systemSetting.findUniqueOrThrow({
    where: { key: SURVEY_RESULT_SETTINGS_KEY },
  });
  assert.deepEqual(storedSetting.value, changedSettings);
  assert.equal(storedSetting.updatedById, admin.id);
  configuration = {
    saved: true,
    replayRejected: true,
    staleRejected: true,
    keywordsFlagged: flaggedQueue.total,
    restored: false,
  };
  pass(
    "BR-09/11/32/34: ADMIN lưu cấu hình mức và từ khóa bằng TOTP thật; chặn CSRF thiếu/sai phiên, sai mã/replay; ADMIN thứ hai gặp CAS409, ba góp ý được gắn cờ, chỉ một audit cấu hình",
  );

  const audit = await db.auditLog.findMany({
    where: {
      OR: [
        { actorId: { in: userIds } },
        { objectId: { in: [...campaignIds, ...answerIds, semester.id] } },
      ],
    },
  });
  const notices = await db.notification.findMany({
    where: { targetId: { in: campaignIds } },
  });
  const sideChannels = JSON.stringify({ audit, notices });
  assert(!sideChannels.includes(privateText));
  for (const id of responseIds) assert(!sideChannels.includes(id));
  const log = readFileSync(".local/week9-http.log", "utf8");
  for (const secret of secrets)
    assert(!log.includes(secret), "Log máy chủ có dữ liệu riêng tư");
  for (const id of [...responseIds, ...answerIds])
    assert(!log.includes(id), "Log máy chủ chứa ID trả lời");
  assert.equal(
    await fingerprint(),
    baseline,
    "Dữ liệu ngoài fixture đã thay đổi",
  );
  pass(
    "BR-03/30: log/audit/notification không chứa nội dungphiếu hoặcresponseID, auditmoderation chỉscalaranswer; hashdữliệucũgiữnguyên",
  );
  outcome = "passed";
  console.log(`HTTP/MySQL Tuần9: ${cases.length}/${cases.length} nhóm qua.`);
  save();
  if (process.env.W9_UI_HOLD === "1") {
    const uiCampaign = await db.surveyCampaign.create({
      data: {
        title: `${prefix} Đợt kiểm thử giao diện`,
        semesterId: semester.id,
        templateId: template.id,
        scope: "SECTIONS",
        status: "DA_DONG",
        startsAt: new Date(Date.now() - 7200000),
        endsAt: new Date(Date.now() - 3600000),
        minResponses: 4,
        minRate: 0.4,
        createdById: creator.id,
        sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
      },
    });
    campaignIds.push(uiCampaign.id);
    const tasks = await db.surveyTask.findMany({
      where: { campaignId: campaign.id },
    });
    await db.surveyTask.createMany({
      data: tasks.map((task) => ({
        campaignId: uiCampaign.id,
        sectionId: task.sectionId,
        studentId: task.studentId,
        status: task.status,
        doneDate: task.doneDate,
      })),
    });
    const responses = await db.surveyResponse.findMany({
      where: { campaignId: campaign.id },
      include: { answers: true },
    });
    for (const response of responses) {
      const id = randomUUID();
      responseIds.push(id);
      await db.surveyResponse.create({
        data: {
          id,
          campaignId: uiCampaign.id,
          sectionId: response.sectionId,
          submittedDate: response.submittedDate,
        },
      });
      const values = response.answers.map((answer) => ({
        id: randomUUID(),
        responseId: id,
        questionId: answer.questionId,
        valueNumber: answer.valueNumber,
        valueText: answer.valueText,
        valueOptionIds: answer.valueOptionIds ?? undefined,
        valueBoolean: answer.valueBoolean,
        isNotApplicable: answer.isNotApplicable,
        moderationStatus: "CHO_KIEM_DUYET" as const,
      }));
      answerIds.push(...values.map((answer) => answer.id));
      await db.surveyAnswer.createMany({ data: values });
    }
    const uiOpen = await db.surveyCampaign.create({
      data: {
        title: `${prefix} Đợt nhắc giao diện`,
        semesterId: semester.id,
        templateId: template.id,
        scope: "SECTIONS",
        status: "DANG_MO",
        openedAt: new Date(),
        startsAt: new Date(Date.now() - 3600000),
        endsAt: new Date(Date.now() + 3600000),
        createdById: creator.id,
        sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
      },
    });
    campaignIds.push(uiOpen.id);
    await db.surveyTask.createMany({
      data: sectionIds.flatMap((sectionId) =>
        students.map((student) => ({
          campaignId: uiOpen.id,
          sectionId,
          studentId: student.id,
        })),
      ),
    });
    await db.roleAssignment.create({
      data: {
        userId: secondTeacher.id,
        role: "GIANG_VIEN",
        scopeType: "GLOBAL",
        scopeKey: "GLOBAL",
      },
    });
    const uiClients: Record<string, { access: string; userId: string }> = {};
    for (const [role, client] of clients) {
      const fresh = await issue(client.id, role);
      uiClients[role] = { access: fresh.access, userId: fresh.id };
    }
    const uiCombined = await issue(combined.id, "PHONG_KHAO_THI");
    uiClients.COMBINED = { access: uiCombined.access, userId: uiCombined.id };
    const runId = randomUUID(),
      contextAt = Date.now();
    writeFileSync(
      ".local/week9-ui-context.json",
      JSON.stringify(
        {
          runId,
          origin,
          campaignId: campaign.id,
          uiCampaignId: uiCampaign.id,
          openCampaignId: uiOpen.id,
          closedCampaignId: open.id,
          sectionIds,
          courseIds,
          semesterId: semester.id,
          clients: uiClients,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log(
      "Fixture giao diện Tuần9 sẵn sàng; chờ hoàn tất kiểm tra trong tối đa15 phút.",
    );
    let uiDone = false;
    while (Date.now() - contextAt < 900_000) {
      if (existsSync(".local/week9-ui-done.json")) {
        const done = JSON.parse(
          readFileSync(".local/week9-ui-done.json", "utf8"),
        );
        if (done.runId === runId) {
          assert.equal(done.status, "passed", "Kiểm thử giao diện chưa qua");
          uiDone = true;
          break;
        }
      }
      await delay(1000);
    }
    assert(uiDone, "Hết thời gian chờ kiểm thử giao diện");
    assert.equal(
      await fingerprint(),
      baseline,
      "Dữ liệu ngoài fixture thay đổi sau UI",
    );
    console.log("Kiểm thử giao diện báo hoàn tất; đang dọn fixture.");
  }
} catch (error) {
  outcome = "failed";
  process.exitCode = 1;
  const message = error instanceof Error ? error.message : "Lỗi chưa xác định";
  console.error(
    `KHÔNG QUA sau ${cases.length} nhóm (${current}): ${[...secrets].some((secret) => message.includes(secret)) ? "Chi tiết được ẩn" : message.slice(0, 350)}`,
  );
  if (verified) save();
} finally {
  if (child?.pid)
    try {
      if (process.platform === "win32")
        execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          stdio: "ignore",
          windowsHide: true,
        });
      else process.kill(-child.pid, "SIGTERM");
    } catch {}
  if (fd !== undefined) closeSync(fd);
  if (verified)
    try {
      await db.$transaction(
        async (tx) => {
          await lockAdminMutations(tx);
          if (settingsSnapshotTaken) {
            const currentSettings = await tx.systemSetting.findUnique({
              where: { key: SURVEY_RESULT_SETTINGS_KEY },
            });
            assert(
              !currentSettings ||
                userIds.includes(currentSettings.updatedById ?? "") ||
                JSON.stringify(currentSettings) ===
                  JSON.stringify(originalSettings),
              "Không ghi đè cấu hình do phiên khác thay đổi",
            );
            if (originalSettings) {
              const { key, value, updatedById, updatedAt } = originalSettings;
              await tx.systemSetting.upsert({
                where: { key },
                create: {
                  key,
                  value: value as Prisma.InputJsonValue,
                  updatedById,
                  updatedAt,
                },
                update: {
                  value: value as Prisma.InputJsonValue,
                  updatedById,
                  updatedAt,
                },
              });
            } else if (currentSettings)
              await tx.systemSetting.delete({
                where: { key: SURVEY_RESULT_SETTINGS_KEY },
              });
          }
          await tx.surveyAnswer.deleteMany({
            where: { response: { campaignId: { in: campaignIds } } },
          });
          await tx.surveyResponse.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.emailOutbox.deleteMany({
            where: { notification: { targetId: { in: campaignIds } } },
          });
          await tx.notification.deleteMany({
            where: {
              OR: [
                { targetId: { in: campaignIds } },
                { userId: { in: userIds } },
              ],
            },
          });
          await tx.auditLog.deleteMany({
            where: {
              OR: [
                { actorId: { in: userIds } },
                {
                  objectId: {
                    in: [
                      ...campaignIds,
                      ...answerIds,
                      ...semesterIds,
                      ...templateIds,
                    ],
                  },
                },
              ],
            },
          });
          await tx.aggregateResult.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.surveyTask.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.campaignDataConfirmation.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.campaignHistory.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.campaignSection.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.surveyCampaign.deleteMany({
            where: { id: { in: campaignIds } },
          });
          await tx.questionOption.deleteMany({
            where: { question: { group: { templateId: { in: templateIds } } } },
          });
          await tx.question.deleteMany({
            where: { group: { templateId: { in: templateIds } } },
          });
          await tx.criterionGroup.deleteMany({
            where: { templateId: { in: templateIds } },
          });
          await tx.surveyTemplate.deleteMany({
            where: { id: { in: templateIds } },
          });
          await tx.teachingAssignment.deleteMany({
            where: { sectionId: { in: sectionIds } },
          });
          await tx.enrollment.deleteMany({
            where: { sectionId: { in: sectionIds } },
          });
          await tx.courseSection.deleteMany({
            where: { id: { in: sectionIds } },
          });
          await tx.course.deleteMany({ where: { id: { in: courseIds } } });
          await tx.semester.deleteMany({ where: { id: { in: semesterIds } } });
          await tx.totpRecoveryCode.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.totpCredential.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.userSession.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.authToken.deleteMany({ where: { userId: { in: userIds } } });
          await tx.user.deleteMany({ where: { id: { in: userIds } } });
          await tx.department.deleteMany({
            where: { id: { in: departmentIds } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: facultyIds } } });
          for (const [keyHash, original] of originalRateBuckets) {
            if (original)
              await tx.rateLimitBucket.upsert({
                where: { keyHash },
                create: original,
                update: {
                  attempts: original.attempts,
                  windowStart: original.windowStart,
                  lockedUntil: original.lockedUntil,
                },
              });
            else await tx.rateLimitBucket.deleteMany({ where: { keyHash } });
          }
        },
        { timeout: 30_000 },
      );
      assert.equal(await db.user.count({ where: { id: { in: userIds } } }), 0);
      assert.equal(
        await db.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
        0,
      );
      assert.equal(
        await fingerprint(),
        baseline,
        "Dữ liệu ngoài fixture thay đổi sau cleanup",
      );
      if (settingsSnapshotTaken)
        assert.deepEqual(
          await db.systemSetting.findUnique({
            where: { key: SURVEY_RESULT_SETTINGS_KEY },
          }),
          originalSettings,
        );
      for (const [keyHash, original] of originalRateBuckets)
        assert.deepEqual(
          await db.rateLimitBucket.findUnique({ where: { keyHash } }),
          original,
        );
      if (configuration) configuration.restored = true;
      cleaned = true;
    } catch (error) {
      cleaned = false;
      outcome = "failed";
      process.exitCode = 1;
      console.error(
        `Chưa dọn xong fixture Tuần9: ${error instanceof Error ? error.name : "lỗi DB"}`,
      );
    }
  if (verified) save();
  await db.$disconnect();
}
