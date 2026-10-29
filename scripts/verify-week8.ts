import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { createConnection } from "mariadb";
import { getDb } from "../src/lib/db";
import type {
  CampaignStatus,
  Role,
  SessionPurpose,
} from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import type {
  StudentSurveyAnswerInput,
  StudentSurveyDetail,
} from "../src/server/services/student-survey-types";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import { hashCampaignCohort } from "../src/server/services/campaign-readiness";
import { issueCatalogCsrf } from "../src/server/auth/csrf";

// Guard phải chạy trước getDb(), mọi ghi, khởi động máy chủ và cleanup.
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
const port = 3008,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb(),
  prefix = `W8${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const password = "KiemThu2026!TuanTam",
  privateText = `${prefix}_PRIVATE_ANSWER không được ghi log hoặc xác nhận`;
const userIds: string[] = [],
  campaignIds: string[] = [],
  templateIds: string[] = [],
  facultyIds: string[] = [],
  departmentIds: string[] = [],
  semesterIds: string[] = [],
  courseIds: string[] = [],
  sectionIds: string[] = [];
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
  outcome = "running",
  current = "Khởi tạo",
  triggerName: string | undefined,
  triggerQuestionId: string | undefined,
  rootCreatedTrigger = false;
let baseline = "",
  concurrentResult:
    | {
        requests: number;
        succeeded: number;
        rejected: number;
        responses: number;
        answers: number;
      }
    | undefined;
let rollbackResult:
  | {
      forcedFailureStatus: number;
      task: string;
      responses: number;
      answers: number;
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
  method?: "GET" | "POST";
};
type Fixture = { id: string; taskId: string; sectionId: string; owner: Client };
function save() {
  writeFileSync(
    ".local/week8-http-result.json",
    JSON.stringify(
      {
        status: outcome,
        passed: cases.length,
        cases,
        concurrentResult,
        rollbackResult,
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
  console.log(`QUA W8-HTTP-${String(cases.length).padStart(2, "0")} ${name}`);
  save();
}
function headers(
  client?: Client,
  options: Options = {},
  post = false,
): Record<string, string> {
  return {
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
    "user-agent": "week8-private-fixture-agent",
    "x-request-id": `${prefix}-private-correlation`,
  };
}
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  options: Options = {},
) {
  const response = await fetch(origin + path, {
    method: options.method ?? (body === undefined ? "GET" : "POST"),
    headers: headers(client, options, body !== undefined),
    body:
      body === undefined
        ? undefined
        : options.raw
          ? String(body)
          : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
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
function noPrivate(value: unknown, includeTask?: string) {
  const text = JSON.stringify(value);
  for (const secret of [
    ...secrets,
    ...userIds,
    `${prefix}-private-correlation`,
    "week8-private-fixture-agent",
    ...(includeTask ? [includeTask] : []),
  ])
    assert(!text.includes(secret), "DTO hoặc metadata có giá trị riêng tư");
}
async function csrf(client: Client) {
  client.csrf = ok(await req("/api/student-surveys/csrf", client)).csrfToken;
  secrets.add(client.csrf);
}
async function issue(
  userId: string,
  role: Role,
  purpose: SessionPurpose = "FULL",
  mfa = role === "ADMIN",
): Promise<Client> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: true },
  });
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(tx, user, { ip: "week8-fixture" }, purpose, mfa),
  );
  const tokens = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  secrets.add(tokens.accessToken);
  if (tokens.refreshToken) secrets.add(tokens.refreshToken);
  return {
    id: user.id,
    role,
    actor: issued.actor,
    access: tokens.accessToken,
    csrf: "",
  };
}
async function createClient(role: Role, ordinal: number, passwordHash: string) {
  const scope =
    role === "TRUONG_KHOA"
      ? {
          scopeType: "FACULTY" as const,
          scopeKey: `FACULTY:${facultyIds[0]}`,
          facultyId: facultyIds[0],
        }
      : role === "TRUONG_BO_MON"
        ? {
            scopeType: "DEPARTMENT" as const,
            scopeKey: `DEPARTMENT:${departmentIds[0]}`,
            departmentId: departmentIds[0],
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
  // FULL/MFA là fixture do service thật phát; suite này không nhận đã nhập TOTP thật.
  return issue(user.id, role);
}
async function createTemplate(creator: Client, name: string, locked = true) {
  const row = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} ${name}`,
      createdById: creator.id,
      status: locked ? "DA_KHOA" : "NHAP",
      lockedAt: locked ? new Date() : null,
      groups: {
        create: {
          title: "Năm loại câu hỏi và thang 1–4/1–5",
          position: 1,
          questions: {
            create: [
              {
                label: "Likert 1–5",
                type: "LIKERT",
                position: 1,
                required: true,
                allowNA: false,
                scaleMin: 1,
                scaleMax: 5,
              },
              {
                label: "Likert 1–4 hoặc Không áp dụng",
                type: "LIKERT",
                position: 2,
                required: true,
                allowNA: true,
                scaleMin: 1,
                scaleMax: 4,
              },
              {
                label: "Chọn một",
                type: "SINGLE_CHOICE",
                position: 3,
                required: true,
                options: {
                  create: [
                    { label: "Một A", position: 1 },
                    { label: "Một B", position: 2 },
                  ],
                },
              },
              {
                label: "Chọn nhiều",
                type: "MULTIPLE_CHOICE",
                position: 4,
                required: true,
                allowNA: true,
                options: {
                  create: [
                    { label: "Nhiều A", position: 1 },
                    { label: "Nhiều B", position: 2 },
                  ],
                },
              },
              {
                label: "Tự luận bắt buộc",
                type: "TEXT",
                position: 5,
                required: true,
                allowNA: true,
              },
              {
                label: "Có hoặc Không",
                type: "BOOLEAN",
                position: 6,
                required: true,
              },
              {
                label: "Tự luận tùy chọn",
                type: "TEXT",
                position: 7,
                required: false,
              },
            ],
          },
        },
      },
    },
    include: {
      groups: {
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  templateIds.push(row.id);
  return row;
}
async function createSemester(suffix: string, locked = false) {
  const row = await db.semester.create({
    data: {
      code: `${prefix}-${suffix}`,
      name: `${prefix} ${suffix}`,
      startsOn: new Date("2026-01-01"),
      endsOn: new Date("2035-12-31"),
      lockedAt: locked ? new Date() : null,
    },
  });
  semesterIds.push(row.id);
  return row;
}
async function fixture(
  owner: Client,
  creator: Client,
  templateId: string,
  extra: {
    status?: CampaignStatus;
    startsAt?: Date;
    endsAt?: Date;
    semesterId?: string;
    sectionId?: string;
    task?: boolean;
  } = {},
): Promise<Fixture> {
  const status = extra.status ?? "DANG_MO";
  let sectionId = extra.sectionId;
  if (!sectionId) {
    const section = await db.courseSection.create({
      data: {
        code: `${prefix}-L${sectionIds.length}`,
        semesterId: extra.semesterId ?? semesterIds[0],
        courseId: courseIds[0],
      },
    });
    sectionId = section.id;
    sectionIds.push(section.id);
  }
  const row = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt ${campaignIds.length}`,
      semesterId: extra.semesterId ?? semesterIds[0],
      templateId,
      scope: "SECTIONS",
      status,
      startsAt: extra.startsAt ?? new Date(Date.now() - 3600000),
      endsAt: extra.endsAt ?? new Date(Date.now() + 3600000),
      openedAt: status === "DANG_MO" ? new Date() : null,
      createdById: creator.id,
      sections: { create: { sectionId } },
    },
  });
  campaignIds.push(row.id);
  const task =
    extra.task === false
      ? null
      : await db.surveyTask.create({
          data: { campaignId: row.id, sectionId, studentId: owner.id },
        });
  return { id: row.id, taskId: task?.id ?? "", sectionId, owner };
}
const submitPath = (item: Fixture) =>
  `/api/student-surveys/${item.taskId}/submit`;
async function counts(item: Fixture) {
  const [responses, answers, task] = await Promise.all([
    db.surveyResponse.count({ where: { campaignId: item.id } }),
    db.surveyAnswer.count({ where: { response: { campaignId: item.id } } }),
    db.surveyTask.findUnique({ where: { id: item.taskId } }),
  ]);
  return { responses, answers, task };
}
async function baselineHash() {
  const [responses, answers] = await Promise.all([
    db.surveyResponse.findMany({
      where: { campaignId: { notIn: campaignIds } },
      orderBy: { id: "asc" },
    }),
    db.surveyAnswer.findMany({
      where: { response: { campaignId: { notIn: campaignIds } } },
      orderBy: { id: "asc" },
    }),
  ]);
  return createHash("sha256")
    .update(JSON.stringify({ responses, answers }))
    .digest("hex");
}
async function assertPendingEmpty(item: Fixture) {
  const state = await counts(item);
  assert.equal(state.task?.status, "PENDING");
  assert.equal(state.task.doneDate, null);
  assert.equal(state.responses, 0);
  assert.equal(state.answers, 0);
}
async function rejected(
  item: Fixture,
  body: unknown,
  status = 400,
  options: Options = {},
) {
  const reply = await req(submitPath(item), item.owner, body, options);
  assert.equal(
    reply.status,
    status,
    `Phải từ chối với ${status}; thực tế ${reply.status}/${reply.data?.code}`,
  );
  assert.equal(reply.response.headers.get("cache-control"), "no-store");
  noPrivate(reply.data, item.taskId);
  await assertPendingEmpty(item);
  return reply;
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function businessDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
async function triggerDdl(sql: string) {
  // CREATE/DROP TRIGGER không được MySQL hỗ trợ trong prepared statement của
  // Prisma adapter. Chỉ DDL fixture dùng text protocol của driver đã cài sẵn.
  const connection = await createConnection({
    host: test.hostname,
    port: Number(test.port || 3306),
    user: decodeURIComponent(test.username),
    password: decodeURIComponent(test.password),
    database: marker.database,
    connectTimeout: 5000,
  });
  try {
    const [identity] = await connection.query<
      { uuid: string; database: string }[]
    >("SELECT @@server_uuid AS uuid, DATABASE() AS `database`");
    assert.equal(identity.uuid, marker.serverUuid);
    assert.equal(identity.database, marker.database);
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}
function rootTriggerDdl(mode: "create" | "drop") {
  assert(triggerName && triggerQuestionId);
  const result = spawnSync(
    process.execPath,
    ["scripts/lib/week8-rollback-trigger.mjs"],
    {
      input: JSON.stringify({
        mode,
        triggerName,
        questionId: triggerQuestionId,
      }),
      encoding: "utf8",
      timeout: 60000,
      windowsHide: true,
      env: process.env,
    },
  );
  // Helper tự kiểm marker, UUID máy chủ, chủ câu hỏi và chỉ DDL trigger fixture.
  // Không phát lại stderr/SQL tùy ý hoặc thông tin kết nối ra báo cáo.
  assert(
    !result.error && result.status === 0,
    `Root helper DDL trigger fixture chưa hoàn tất (${mode}).`,
  );
}

try {
  const [identity] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity.uuid, marker.serverUuid);
  assert.equal(identity.database, marker.database);
  verified = true;
  // list.ensure có thể chuyển các đợt đến hạn: không cho suite tác động fixture phiên khác.
  assert.equal(
    await db.surveyCampaign.count({
      where: { status: { in: ["DA_DUYET", "DANG_MO"] } },
    }),
    0,
    "Cần dọn đợt hoạt động của phiên thử trước; không tự sửa dữ liệu ngoài fixture",
  );
  baseline = await baselineHash();
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new Error("Cổng3008 đang được dùng.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cổng3008"))
      throw error;
  }
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week8-http.log", "w");
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
        SFS_TEST_DIST_DIR: ".next-week8",
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
  assert(ready, "Máy chủ Tuần8 chưa sẵn sàng");
  const faculty = await db.faculty.create({
    data: { code: `${prefix}-F`, name: `${prefix} Khoa giả` },
  });
  facultyIds.push(faculty.id);
  const department = await db.department.create({
    data: {
      code: `${prefix}-D`,
      name: `${prefix} Bộ môn giả`,
      facultyId: faculty.id,
    },
  });
  departmentIds.push(department.id);
  const course = await db.course.create({
    data: {
      code: `${prefix}-C`,
      name: `${prefix} Môn giả`,
      credits: 3,
      departmentId: department.id,
    },
  });
  courseIds.push(course.id);
  await createSemester("S");
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
    ],
    clients = new Map<Role, Client>(),
    passwordHash = await hash(password, 12);
  for (const [index, role] of roles.entries())
    clients.set(role, await createClient(role, index, passwordHash));
  const student = clients.get("SINH_VIEN")!,
    creator = clients.get("CAN_BO_DBCL")!,
    leader = clients.get("LANH_DAO")!,
    pdt = clients.get("PHONG_DAO_TAO")!,
    other = await createClient("SINH_VIEN", 10, passwordHash),
    newlyEnrolled = await createClient("SINH_VIEN", 11, passwordHash);
  await csrf(student);
  await csrf(other);
  await csrf(newlyEnrolled);
  const template = await createTemplate(creator, "Mẫu đầy đủ"),
    foreignTemplate = await createTemplate(creator, "Mẫu khác"),
    q = template.groups[0].questions,
    foreignQ = foreignTemplate.groups[0].questions;
  const answers = (): StudentSurveyAnswerInput[] => [
    { questionId: q[0].id, valueNumber: 5 },
    { questionId: q[1].id, valueNumber: 4 },
    { questionId: q[2].id, valueOptionIds: [q[2].options[0].id] },
    {
      questionId: q[3].id,
      valueOptionIds: q[3].options.map((option) => option.id),
    },
    { questionId: q[4].id, valueText: privateText },
    { questionId: q[5].id, valueBoolean: false },
  ];
  const own = await fixture(student, creator, template.id),
    foreign = await fixture(other, creator, template.id, {
      sectionId: own.sectionId,
    });
  await db.enrollment.createMany({
    data: [
      { sectionId: own.sectionId, studentId: student.id },
      { sectionId: own.sectionId, studentId: other.id },
    ],
  });
  pass(
    "Fixture riêng/đúng marker + UUID máy chủ; 10 vai trò; phiên FULL/MFA do service phát; hai mẫu có đủ 5 loại câu, Likert 1–4/1–5",
  );

  assert.equal((await req("/api/student-surveys")).status, 401);
  for (const role of roles.filter((value) => value !== "SINH_VIEN")) {
    const client = clients.get(role)!;
    for (const path of [
      "/api/student-surveys",
      "/api/student-surveys/csrf",
      `/api/student-surveys/${own.taskId}`,
    ])
      assert.equal(
        (await req(path, client)).status,
        403,
        `Vai trò ${role} bị chặn`,
      );
    assert.equal(
      (await req(submitPath(own), client, { answers: answers() })).status,
      403,
    );
  }
  pass(
    "BR-34: khách401; 9 vai trò ngoài SINH_VIEN bị403 ở list/CSRF/detail/submit, kể cả ADMIN MFA",
  );
  const listed = ok(
    await req("/api/student-surveys?status=PENDING&page=1&pageSize=1", student),
  );
  assert.equal(listed.total, 1);
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].id, own.taskId);
  noPrivate(listed);
  for (const id of [foreign.taskId, randomUUID()]) {
    assert.equal(
      (await req(`/api/student-surveys/${id}`, student)).status,
      404,
    );
    assert.equal(
      (
        await req(`/api/student-surveys/${id}/submit`, student, {
          answers: answers(),
        })
      ).status,
      404,
    );
  }
  const detail: StudentSurveyDetail = ok(
    await req(`/api/student-surveys/${own.taskId}`, student),
  ).item;
  assert.equal(detail.template?.id, template.id);
  assert.equal(detail.template.groups[0].questions.length, 7);
  noPrivate(detail);
  pass(
    "BR-01/34: list/count/pagination chỉ task của actor; foreign/unknown đều404 cả đọc/nộp; form đúng mẫu đã khóa",
  );

  const redirect = await req(`/khao-sat/${own.taskId}/da-nop`, student);
  if ([303, 307, 308].includes(redirect.status))
    assert.equal(
      redirect.response.headers.get("location"),
      `/khao-sat/${own.taskId}`,
    );
  else {
    const html = await redirect.response.text();
    assert(
      html.includes(`NEXT_REDIRECT`) &&
        !html.includes("Cảm ơn bạn đã gửi khảo sát"),
      "Trang PENDING phải chuyển về form, không giả xác nhận",
    );
  }
  pass(
    "FR-54: truy cập thẳng trang đã nộp khi task PENDING phải chuyển về form",
  );

  const wrongPurpose = issueCatalogCsrf(creator.actor);
  secrets.add(wrongPurpose);
  for (const options of [
    { csrf: false },
    { origin: null },
    { origin: "https://outside.invalid" },
    { token: other.csrf },
    { token: wrongPurpose },
  ])
    await rejected(own, { answers: answers() }, 403, options);
  for (const path of [
    "/api/student-surveys/not-a-uuid",
    "/api/student-surveys?extra=true",
    "/api/student-surveys?status=UNKNOWN",
    `/api/student-surveys/${own.taskId}?extra=true`,
  ])
    assert.equal((await req(path, student)).status, 400);
  assert.equal(
    (
      await req(`${submitPath(own)}?extra=true`, student, {
        answers: answers(),
      })
    ).status,
    400,
  );
  await rejected(own, "{}", 415, { raw: true, contentType: "text/plain" });
  await rejected(own, "{", 400, { raw: true });
  await rejected(own, " ".repeat(262145), 413, { raw: true });
  const streamed = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("đ".repeat(131073)));
      controller.close();
    },
  });
  const streamRequest: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: headers(student, {}, true),
    body: streamed,
    duplex: "half",
    signal: AbortSignal.timeout(60000),
  };
  const streamReply = await fetch(origin + submitPath(own), streamRequest);
  assert.equal(streamReply.status, 413);
  noPrivate(await streamReply.json());
  await assertPendingEmpty(own);
  pass(
    "BR-03/34: Origin/CSRF khác phiên/khác chức năng bị chặn; UUID/query/JSON/content-type nghiêm; 256KiB byte thực kể cả stream không Content-Length",
  );

  const invalid: StudentSurveyAnswerInput[][] = [
    answers().slice(1),
    [...answers(), answers()[0]],
    [{ questionId: foreignQ[0].id, valueNumber: 5 }, ...answers().slice(1)],
    answers().map((answer, index) =>
      index === 2
        ? { ...answer, valueOptionIds: [foreignQ[2].options[0].id] }
        : answer,
    ),
    answers().map((answer, index) =>
      index === 0 ? { ...answer, valueNumber: 6 } : answer,
    ),
    answers().map((answer, index) =>
      index === 1 ? { ...answer, valueNumber: 5 } : answer,
    ),
    answers().map((answer, index) =>
      index === 0 ? { ...answer, valueText: privateText } : answer,
    ),
    answers().map((answer, index) =>
      index === 0
        ? { questionId: answer.questionId, isNotApplicable: true }
        : answer,
    ),
    answers().map((answer, index) =>
      index === 4
        ? { ...answer, valueText: privateText + "x".repeat(4001) }
        : answer,
    ),
    answers().map((answer, index) =>
      index === 2
        ? { ...answer, valueOptionIds: q[2].options.map((option) => option.id) }
        : answer,
    ),
    answers().map((answer, index) =>
      index === 3
        ? {
            ...answer,
            valueOptionIds: [q[3].options[0].id, q[3].options[0].id],
          }
        : answer,
    ),
    answers().map((answer, index) =>
      index === 5
        ? { questionId: answer.questionId, valueText: privateText }
        : answer,
    ),
  ];
  for (const values of invalid) {
    const reply = await rejected(own, { answers: values });
    assert.equal(reply.data.code, "INVALID_SURVEY_ANSWERS");
  }
  for (const bridge of [
    "studentId",
    "taskId",
    "responseId",
    "sessionId",
    "requestId",
    "ipAddress",
  ])
    await rejected(own, { answers: answers(), [bridge]: student.id });
  pass(
    "BR-03/04: thiếu/lặp/câu khác mẫu, option khác câu, cả hai thang, mixed-value, NA không cho phép, text quá dài, chọn sai và trường cầu nối đều bị từ chối không echo",
  );

  const beforeAudit = await db.auditLog.count({ where: { objectId: own.id } }),
    beforeQueue = await db.emailOutbox.count();
  const before = new Date(),
    submitted = ok(await req(submitPath(own), student, { answers: answers() })),
    after = new Date();
  assert.deepEqual(submitted, {
    ok: true,
    item: { status: "DONE", doneDate: submitted.item.doneDate },
  });
  assert(
    [businessDay(before), businessDay(after)].includes(submitted.item.doneDate),
  );
  noPrivate(submitted, own.taskId);
  const response = await db.surveyResponse.findFirstOrThrow({
    where: { campaignId: own.id },
    include: { answers: { orderBy: { id: "asc" } } },
  });
  assert(uuid.test(response.id));
  assert.equal(response.answers.length, 6);
  assert.equal(response.sectionId, own.sectionId);
  assert.equal(
    response.submittedDate.toISOString(),
    `${submitted.item.doneDate}T00:00:00.000Z`,
  );
  assert.deepEqual(Object.keys(response).sort(), [
    "answers",
    "campaignId",
    "id",
    "sectionId",
    "submittedDate",
  ]);
  const identityValues = [
    student.id,
    own.taskId,
    student.actor.sessionId,
    student.actor.familyId,
    `${prefix}-private-correlation`,
    "week8-private-fixture-agent",
  ];
  for (const value of identityValues)
    assert(!JSON.stringify(response).includes(value));
  for (const answer of response.answers) {
    assert(uuid.test(answer.id));
    assert.equal(answer.responseId, response.id);
    assert.equal(answer.moderationStatus, "CHO_KIEM_DUYET");
    assert.deepEqual(Object.keys(answer).sort(), [
      "id",
      "isNotApplicable",
      "moderationReason",
      "moderationStatus",
      "questionId",
      "responseId",
      "valueBoolean",
      "valueNumber",
      "valueOptionIds",
      "valueText",
    ]);
  }
  assert.equal(
    response.answers.find((answer) => answer.questionId === q[5].id)
      ?.valueBoolean,
    false,
  );
  assert.equal(
    response.answers.find((answer) => answer.questionId === q[6].id),
    undefined,
  );
  const doneTask = await db.surveyTask.findUniqueOrThrow({
    where: { id: own.taskId },
  });
  assert.equal(doneTask.status, "DONE");
  assert.equal(
    doneTask.doneDate?.toISOString(),
    response.submittedDate.toISOString(),
  );
  assert(!JSON.stringify(doneTask).includes(response.id));
  assert.equal(
    await db.auditLog.count({ where: { objectId: own.id } }),
    beforeAudit,
  );
  assert.equal(await db.emailOutbox.count(), beforeQueue);
  pass(
    "BR-02/03/04: nộp đủ5loại, BOOLEAN=false và bỏ câu tùy chọn; UUIDv4/DATE cùng ngày Việt Nam; DONE/phiếu/6answers nguyên tử, không audit/queue nộp",
  );

  const frozenRows = JSON.stringify(response);
  const twice = await req(submitPath(own), student, {
    answers: answers().map((answer) => ({ ...answer, valueText: privateText })),
  });
  assert.equal(twice.status, 409);
  assert.equal(twice.data.code, "STUDENT_SURVEY_COMPLETED");
  noPrivate(twice.data);
  assert.equal((await counts(own)).responses, 1);
  assert.equal(
    JSON.stringify(
      await db.surveyResponse.findFirstOrThrow({
        where: { campaignId: own.id },
        include: { answers: { orderBy: { id: "asc" } } },
      }),
    ),
    frozenRows,
  );
  const done: StudentSurveyDetail = ok(
    await req(`/api/student-surveys/${own.taskId}`, student),
  ).item;
  assert.equal(done.status, "DONE");
  assert.equal(done.template, null);
  noPrivate(done);
  const doneString = JSON.stringify(done);
  for (const id of [
    response.id,
    ...response.answers.map((answer) => answer.id),
  ])
    assert(!doneString.includes(id));
  assert(!doneString.includes(privateText));
  assert.equal(
    ok(await req("/api/student-surveys?status=DONE", student)).total,
    1,
  );
  const confirmation = await req(`/khao-sat/${own.taskId}/da-nop`, student);
  assert.equal(confirmation.status, 200);
  const confirmationHtml = await confirmation.response.text();
  assert(confirmationHtml.includes("Cảm ơn bạn đã gửi khảo sát"));
  for (const value of [
    privateText,
    response.id,
    ...response.answers.map((answer) => answer.id),
  ])
    assert(!confirmationHtml.includes(value));
  pass(
    "5.6(b)/FR-54: lần2 bị409, phiếu không đổi; DONE detail template=null/không answers hoặc ID; trang xác nhận chỉ trạng thái và ngày",
  );

  const naFixture = await fixture(student, creator, template.id);
  const naAnswers = answers().map((answer, index) =>
    [1, 3, 4].includes(index)
      ? { questionId: answer.questionId, isNotApplicable: true }
      : answer,
  );
  ok(
    await req(submitPath(naFixture), student, {
      answers: [...naAnswers, { questionId: q[6].id, valueText: "  " }],
    }),
  );
  assert.equal(
    await db.surveyAnswer.count({
      where: { response: { campaignId: naFixture.id }, isNotApplicable: true },
    }),
    3,
  );
  assert.equal((await counts(naFixture)).answers, 6);
  pass(
    "BR-04: Không áp dụng hợp lệ thỏa câu bắt buộc, không chép giá trị; câu tùy chọn trống không tạo answer",
  );

  const race = await fixture(student, creator, template.id),
    replies = await Promise.all(
      Array.from({ length: 20 }, () =>
        req(submitPath(race), student, { answers: answers() }),
      ),
    );
  assert.equal(replies.filter((reply) => reply.status === 200).length, 1);
  assert.equal(replies.filter((reply) => reply.status === 409).length, 19);
  const raceCounts = await counts(race);
  assert.equal(raceCounts.responses, 1);
  assert.equal(raceCounts.answers, 6);
  assert.equal(raceCounts.task?.status, "DONE");
  for (const reply of replies) noPrivate(reply.data, race.taskId);
  concurrentResult = {
    requests: 20,
    succeeded: 1,
    rejected: 19,
    responses: raceCounts.responses,
    answers: raceCounts.answers,
  };
  pass(
    "5.6(c)/BR-02: 20 HTTP POST đồng thời trên MySQL thật chỉ1thành công/19bị409, đúng1response+6answers và taskDONE",
  );

  const frozen = await fixture(student, creator, template.id, {
    sectionId: own.sectionId,
  });
  await db.enrollment.update({
    where: {
      sectionId_studentId: { sectionId: own.sectionId, studentId: student.id },
    },
    data: { withdrawnAt: new Date() },
  });
  await db.enrollment.create({
    data: { sectionId: own.sectionId, studentId: newlyEnrolled.id },
  });
  assert.equal(ok(await req("/api/student-surveys", newlyEnrolled)).total, 0);
  assert.equal(
    (await req(`/api/student-surveys/${frozen.taskId}`, newlyEnrolled)).status,
    404,
  );
  assert.equal(
    (await req(submitPath(frozen), newlyEnrolled, { answers: answers() }))
      .status,
    404,
  );
  ok(await req(submitPath(frozen), student, { answers: answers() }));
  assert.equal((await counts(frozen)).responses, 1);
  pass(
    "BR-01/34: rút Enrollment sau chốt vẫn nộp được theo task; thêm Enrollment sau chốt không sinh quyền đọc/nộp hoặc tự tạo task",
  );

  const lockedSemester = await createSemester("LOCK", true),
    unlockedTemplate = await createTemplate(creator, "Mẫu chưa khóa", false);
  for (const unavailable of [
    await fixture(student, creator, template.id, {
      startsAt: new Date(Date.now() + 3600000),
    }),
    await fixture(student, creator, template.id, { status: "DA_DONG" }),
    await fixture(student, creator, template.id, {
      semesterId: lockedSemester.id,
    }),
    await fixture(student, creator, unlockedTemplate.id),
  ])
    await rejected(unavailable, { answers: answers() }, 409);
  const expired = await fixture(student, creator, template.id, {
    endsAt: new Date(Date.now() - 10000),
  });
  await rejected(expired, { answers: answers() }, 409);
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: expired.id } }))
      .status,
    "DA_DONG",
  );
  assert.equal(
    await db.campaignHistory.count({
      where: { campaignId: expired.id, action: "AUTO_CLOSE" },
    }),
    1,
  );
  pass(
    "BR-04/17: trước giờ/đã đóng/kỳ khóa/mẫu chưa khóa đều409; hết hạn tự đóng và commit lifecycle dù giao dịch nộp bị từ chối",
  );

  const lazy = await fixture(other, creator, template.id, {
    status: "DA_DUYET",
    task: false,
    sectionId: own.sectionId,
  });
  const enrollments = await db.enrollment.findMany({
    where: { sectionId: lazy.sectionId, withdrawnAt: null },
    select: { studentId: true },
  });
  const snapshotHash = hashCampaignCohort(
    [lazy.sectionId],
    enrollments.map((row) => ({
      sectionId: lazy.sectionId,
      studentId: row.studentId,
    })),
  );
  await db.surveyCampaign.update({
    where: { id: lazy.id },
    data: { revision: 2, approvedAt: new Date(), approvedById: leader.id },
  });
  await db.campaignDataConfirmation.create({
    data: {
      campaignId: lazy.id,
      campaignRevision: 1,
      status: "DA_XAC_NHAN",
      confirmedById: pdt.id,
      snapshotHash,
      sectionCount: 1,
      pairCount: enrollments.length,
      warnings: [],
    },
  });
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: lazy.id } }),
    0,
  );
  const firstList = ok(await req("/api/student-surveys", newlyEnrolled));
  const newTask = await db.surveyTask.findUniqueOrThrow({
    where: {
      campaignId_sectionId_studentId: {
        campaignId: lazy.id,
        sectionId: lazy.sectionId,
        studentId: newlyEnrolled.id,
      },
    },
  });
  assert(
    firstList.items.some((item: { id: string }) => item.id === newTask.id),
  );
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: lazy.id } }))
      .status,
    "DANG_MO",
  );
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: lazy.id } }),
    enrollments.length,
  );
  ok(await req("/api/student-surveys", newlyEnrolled));
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: lazy.id } }),
    enrollments.length,
  );
  pass(
    "BR-01: truy cập SVlist đầu tiên tự mở đợt đã duyệt đến hạn, confirmationrevision/hash đúng, tạo đủ task một lần không cần daemon",
  );

  const disabled = await createClient("SINH_VIEN", 20, passwordHash),
    revoked = await createClient("SINH_VIEN", 21, passwordHash),
    noGrant = await createClient("SINH_VIEN", 22, passwordHash),
    combined = await createClient("SINH_VIEN", 23, passwordHash);
  for (const client of [disabled, revoked, noGrant, combined])
    await csrf(client);
  const freshTask = await fixture(disabled, creator, template.id),
    revokedTask = await fixture(revoked, creator, template.id),
    grantTask = await fixture(noGrant, creator, template.id);
  await db.user.update({
    where: { id: disabled.id },
    data: { status: "DISABLED" },
  });
  await db.userSession.update({
    where: { id: revoked.actor.sessionId },
    data: { revokedAt: new Date() },
  });
  await db.roleAssignment.deleteMany({ where: { userId: noGrant.id } });
  for (const [item, expected] of [
    [freshTask, 401],
    [revokedTask, 401],
    [grantTask, 403],
  ] as const) {
    assert.equal(
      (await req(`/api/student-surveys/${item.taskId}`, item.owner)).status,
      expected,
    );
    assert.equal(
      (await req(submitPath(item), item.owner, { answers: answers() })).status,
      expected,
    );
    await assertPendingEmpty(item);
  }
  for (const purpose of [
    "PASSWORD_CHANGE",
    "MFA_SETUP",
    "MFA_VERIFY",
  ] as const) {
    const restricted = await issue(student.id, "SINH_VIEN", purpose, false);
    assert.equal((await req("/api/student-surveys", restricted)).status, 401);
  }
  await db.roleAssignment.create({
    data: {
      userId: combined.id,
      role: "ADMIN",
      scopeType: "GLOBAL",
      scopeKey: "GLOBAL",
    },
  });
  assert.equal((await req("/api/student-surveys", combined)).status, 401);
  const combinedMfa = await issue(combined.id, "SINH_VIEN", "FULL", true);
  await csrf(combinedMfa);
  assert.equal((await req("/api/student-surveys", combinedMfa)).status, 200);
  pass(
    "BR-34: khóa tài khoản/thu hồi phiên/grant có hiệu lực ngay; purpose hạn chế bị401; thêm ADMIN làm phiên SV thiếuMFA bị chặn, phiênMFA mới được phép",
  );

  const rollback = await fixture(student, creator, template.id);
  triggerName = `w8_${prefix.toLowerCase()}_answer_fail`;
  assert(/^[a-z0-9_]{1,64}$/.test(triggerName));
  assert(uuid.test(q[4].id));
  triggerQuestionId = q[4].id;
  try {
    await triggerDdl(
      `CREATE TRIGGER \`${triggerName}\` BEFORE INSERT ON \`SurveyAnswer\` FOR EACH ROW BEGIN IF NEW.questionId = '${q[4].id}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'W8 controlled answer failure'; END IF; END`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("1419") || message.includes("SUPER privilege")) {
      rootCreatedTrigger = true;
      rootTriggerDdl("create");
    } else throw error;
  }
  const rollbackReply = await req(submitPath(rollback), student, {
    answers: answers(),
  });
  assert.equal(rollbackReply.status, 500);
  assert.equal(rollbackReply.data.code, "STUDENT_SURVEY_FAILED");
  noPrivate(rollbackReply.data);
  assert(!JSON.stringify(rollbackReply.data).includes("SQL"));
  await assertPendingEmpty(rollback);
  rollbackResult = {
    forcedFailureStatus: 500,
    task: "PENDING",
    responses: 0,
    answers: 0,
    retrySucceeded: false,
  };
  if (rootCreatedTrigger) rootTriggerDdl("drop");
  else await triggerDdl(`DROP TRIGGER \`${triggerName}\``);
  triggerName = undefined;
  triggerQuestionId = undefined;
  rootCreatedTrigger = false;
  ok(await req(submitPath(rollback), student, { answers: answers() }));
  assert.equal((await counts(rollback)).responses, 1);
  assert.equal((await counts(rollback)).answers, 6);
  rollbackResult.retrySucceeded = true;
  pass(
    "BR-02/03: trigger MySQL cưỡng bức lỗi chèn answer rollback taskPENDING/0response/0answer; lỗi HTTP được che, bỏ trigger rồi nộp lại thành công",
  );

  const responseRows = await db.surveyResponse.findMany({
      where: { campaignId: { in: campaignIds } },
      include: { answers: true },
    }),
    allResponseIds = responseRows.flatMap((row) => [
      row.id,
      ...row.answers.map((answer) => answer.id),
    ]);
  const audit = await db.auditLog.findMany({
    where: {
      OR: [{ actorId: { in: userIds } }, { objectId: { in: campaignIds } }],
    },
  });
  for (const entry of audit) {
    assert.equal(entry.actorId, null);
    assert(["CAMPAIGN_OPENED", "CAMPAIGN_CLOSED"].includes(entry.action));
  }
  const notifications = await db.notification.findMany({
      where: { targetId: { in: campaignIds } },
    }),
    queued = await db.emailOutbox.findMany({
      where: { notification: { targetId: { in: campaignIds } } },
    });
  const sideChannels = JSON.stringify({ audit, notifications, queued });
  assert(!sideChannels.includes(privateText));
  for (const id of allResponseIds) assert(!sideChannels.includes(id));
  const log = readFileSync(".local/week8-http.log", "utf8");
  for (const secret of secrets)
    assert(
      !log.includes(secret),
      "Log HTTP chứa nội dung/định danh/token của fixture",
    );
  for (const id of allResponseIds) assert(!log.includes(id));
  assert.equal(
    await baselineHash(),
    baseline,
    "Phiếu/answer cũ không bị thay đổi",
  );
  pass(
    "5.6(d)/BR-03/30: DTO/xác nhận/log/audit/queue không nội dung/ID phiếu hoặc cầu nối; audit chỉ lifecycle hệ thống; hash phiếu/answer cũ giữ nguyên (export Tuần12 chưa có)",
  );
  outcome = "passed";
  console.log(`HTTP/MySQL Tuần8: ${cases.length}/${cases.length} nhóm qua.`);
  save();
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
      if (triggerName) {
        assert(/^[a-z0-9_]{1,64}$/.test(triggerName));
        if (rootCreatedTrigger) rootTriggerDdl("drop");
        else await triggerDdl(`DROP TRIGGER IF EXISTS \`${triggerName}\``);
      }
      // Chỉ ID fixture lấy từ lần chạy; không reset/drop DB, không đụng seed hoặc phiếu cũ.
      await db.$transaction(
        async (tx) => {
          await tx.surveyAnswer.deleteMany({
            where: { response: { campaignId: { in: campaignIds } } },
          });
          await tx.surveyResponse.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.emailOutbox.deleteMany({
            where: {
              notification: {
                targetId: { in: campaignIds },
                targetType: "SurveyCampaign",
              },
            },
          });
          await tx.notification.deleteMany({
            where: {
              OR: [
                { targetType: "SurveyCampaign", targetId: { in: campaignIds } },
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
                    in: [...campaignIds, ...templateIds, ...semesterIds],
                  },
                },
              ],
            },
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
        },
        { timeout: 30000 },
      );
      assert.equal(await db.user.count({ where: { id: { in: userIds } } }), 0);
      assert.equal(
        await db.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
        0,
      );
      assert.equal(
        await db.surveyResponse.count({
          where: { campaignId: { in: campaignIds } },
        }),
        0,
      );
      if (baseline)
        assert.equal(
          await baselineHash(),
          baseline,
          "Dữ liệu phiếu/answer cũ giữ nguyên sau cleanup",
        );
      cleaned = true;
    } catch (error) {
      cleaned = false;
      outcome = "failed";
      process.exitCode = 1;
      console.error(
        `Chưa dọn xong fixture Tuần8: ${error instanceof Error ? error.name : "lỗi DB"}`,
      );
    }
  if (verified) save();
  await db.$disconnect();
}
