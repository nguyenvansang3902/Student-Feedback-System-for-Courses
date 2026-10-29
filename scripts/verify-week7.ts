import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import type {
  CampaignDetail,
  CampaignInput,
} from "../src/server/services/campaign-types";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import {
  ensureCampaignState,
  ensureDueCampaigns,
} from "../src/server/services/campaign-lifecycle";

// Guard trước getDb(): chỉ DB thử có marker/đúng MySQL Compose, khác main/shadow.
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
const port = 3006,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb(),
  prefix = `W7${randomUUID().slice(0, 8)}`,
  password = "KiemThu2026!TuanBay";
const userIds: string[] = [],
  campaignIds: string[] = [],
  templateIds: string[] = [],
  facultyIds: string[] = [],
  departmentIds: string[] = [],
  courseIds: string[] = [],
  semesterIds: string[] = [],
  sectionIds: string[] = [];
const dispatchAuditIds: string[] = [];
const cases: string[] = [],
  secrets = new Set(
    [password, process.env.JWT_SECRET!, process.env.MFA_ENCRYPTION_KEY!].filter(
      Boolean,
    ),
  );
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử tự động Tuần7 trên database riêng có marker",
};
const reason = "Đã kiểm tra dữ liệu giả và xác nhận cho phép tiếp tục";
let child: ReturnType<typeof spawn> | undefined,
  fd: number | undefined,
  verifiedDatabase = false,
  cleaned = false,
  outcome = "running",
  current = "Khởi tạo";
type Client = {
  id: string;
  role: Role;
  jar: Map<string, string>;
  csrf: string;
  catalogCsrf: string;
  actor: AuthActor;
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
    ".local/week7-http-result.json",
    JSON.stringify(
      {
        status: outcome,
        passed: cases.length,
        cases,
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
  console.log(`QUA W7-HTTP-${String(cases.length).padStart(2, "0")} ${name}`);
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
          cookie: [...client.jar]
            .map(([key, value]) => `${key}=${value}`)
            .join("; "),
          ...(options.csrf === false
            ? {}
            : { "x-csrf-token": options.token ?? client.csrf }),
        }
      : {}),
  };
}
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  options: Options = {},
) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
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
  if (client)
    for (const cookie of response.headers.getSetCookie()) {
      const match = cookie.match(/^([^=]+)=([^;]*)/)!;
      if (match[2]) client.jar.set(match[1], match[2]);
      else client.jar.delete(match[1]);
    }
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
  return result.data;
}
async function createClient(
  role: Role,
  ordinal: number,
  passwordHash: string,
): Promise<Client> {
  const scoped =
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
      roles: { create: { role, ...scoped } },
    },
    include: { roles: true },
  });
  userIds.push(user.id);
  // Phiên FULL do service thật phát. Cờ MFA ADMIN là fixture; TOTP không được
  // tính là đã kiểm lại bởi suite này (luồng TOTP có suite HTTP Tuần4 riêng).
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(
      tx,
      user,
      { ip: "week7-fixture" },
      "FULL",
      role === "ADMIN",
    ),
  );
  const token = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  for (const value of [token.accessToken, token.refreshToken])
    if (value) secrets.add(value);
  const client: Client = {
    id: user.id,
    role,
    actor: issued.actor,
    jar: new Map([["sfs_access", token.accessToken]]),
    csrf: "",
    catalogCsrf: "",
  };
  if (["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(role)) {
    client.csrf = ok(await req("/api/campaigns/csrf", client)).csrfToken;
    secrets.add(client.csrf);
  }
  if (role === "PHONG_DAO_TAO") {
    client.catalogCsrf = ok(await req("/api/catalog/csrf", client)).csrfToken;
    secrets.add(client.catalogCsrf);
  }
  return client;
}
async function createSemester(suffix: string) {
  const row = await db.semester.create({
    data: {
      code: `${prefix}-${suffix}`,
      name: `${prefix} ${suffix}`,
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2035-12-31"),
    },
  });
  semesterIds.push(row.id);
  return row;
}
async function createSection(
  semesterId: string,
  courseId: string,
  suffix: string,
) {
  const row = await db.courseSection.create({
    data: { semesterId, courseId, code: `${prefix}-${suffix}` },
  });
  sectionIds.push(row.id);
  return row;
}
async function detail(client: Client, id: string): Promise<CampaignDetail> {
  return ok(await req(`/api/campaigns/${id}`, client)).item;
}
function payload(extra: Partial<CampaignInput> = {}): CampaignInput {
  return {
    title: `${prefix} Khảo sát giả`,
    semesterId: semesterIds[0],
    templateId: templateIds[0],
    scope: "SECTIONS",
    sectionIds: [sectionIds[0]],
    startsAt: new Date(Date.now() + 3600000).toISOString(),
    endsAt: new Date(Date.now() + 7200000).toISOString(),
    ...extra,
  };
}
async function create(
  client: Client,
  extra: Partial<CampaignInput> = {},
): Promise<CampaignDetail> {
  const result = ok(
    await req("/api/campaigns", client, payload(extra)),
    201,
  ).item;
  campaignIds.push(result.id);
  return result;
}
async function action(
  client: Client,
  item: CampaignDetail,
  name: string,
  extra: Record<string, unknown> = {},
  requestId = randomUUID(),
): Promise<CampaignDetail> {
  return ok(
    await req(`/api/campaigns/${item.id}/${name}`, client, {
      expectedRevision: item.revision,
      requestId,
      ...extra,
    }),
  ).item;
}
async function submitAndConfirm(
  dbcl: Client,
  pdt: Client,
  extra: Partial<CampaignInput> = {},
) {
  let item = await create(dbcl, extra);
  item = await action(dbcl, item, "submit");
  return action(pdt, item, "confirm", { reason });
}
async function approved(
  dbcl: Client,
  pdt: Client,
  leader: Client,
  extra: Partial<CampaignInput> = {},
) {
  return action(leader, await submitAndConfirm(dbcl, pdt, extra), "approve");
}
async function due(id: string, expired = false) {
  const now = Date.now();
  await db.surveyCampaign.update({
    where: { id },
    data: {
      startsAt: new Date(now - 20000),
      ...(expired ? { endsAt: new Date(now - 10000) } : {}),
    },
  });
}

try {
  const identity = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity[0].uuid, marker.serverUuid);
  assert.equal(identity[0].database, marker.database);
  verifiedDatabase = true;
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week7-http.log", "w");
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
        SFS_TEST_DIST_DIR: ".next-week7",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    assert.equal(child.exitCode, null);
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
  assert(ready, "Máy chủ Tuần7 khởi động");
  for (let index = 0; index < 2; index++) {
    const faculty = await db.faculty.create({
      data: { code: `${prefix}-F${index}`, name: `${prefix} Khoa ${index}` },
    });
    facultyIds.push(faculty.id);
    const department = await db.department.create({
      data: {
        code: `${prefix}-D${index}`,
        name: `${prefix} Bộ môn ${index}`,
        facultyId: faculty.id,
      },
    });
    departmentIds.push(department.id);
    const course = await db.course.create({
      data: {
        code: `${prefix}-C${index}`,
        name: `${prefix} Môn ${index}`,
        credits: 3,
        departmentId: department.id,
      },
    });
    courseIds.push(course.id);
  }
  const semester = await createSemester("S1"),
    otherSemester = await createSemester("S2");
  const clients = new Map<Role, Client>();
  const passwordHash = await hash(password, 12);
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
  const dbcl = clients.get("CAN_BO_DBCL")!,
    pdt = clients.get("PHONG_DAO_TAO")!,
    leader = clients.get("LANH_DAO")!,
    student = clients.get("SINH_VIEN")!,
    teacher = clients.get("GIANG_VIEN")!;
  const pending = await createClient("SINH_VIEN", 11, passwordHash),
    disabled = await createClient("SINH_VIEN", 12, passwordHash),
    added = await createClient("SINH_VIEN", 13, passwordHash);
  await db.user.update({
    where: { id: pending.id },
    data: { status: "PENDING_ACTIVATION", email: "" },
  });
  await db.user.update({
    where: { id: disabled.id },
    data: { status: "DISABLED" },
  });
  const teacher2 = await createClient("GIANG_VIEN", 14, passwordHash);
  const good = await createSection(semester.id, courseIds[0], "READY"),
    noTeacher = await createSection(semester.id, courseIds[0], "NO-T"),
    noStudents = await createSection(semester.id, courseIds[0], "NO-S"),
    other = await createSection(semester.id, courseIds[1], "OTHER"),
    foreign = await createSection(otherSemester.id, courseIds[0], "FOREIGN");
  await db.teachingAssignment.createMany({
    data: [
      { sectionId: good.id, teacherId: teacher.id },
      { sectionId: good.id, teacherId: teacher2.id },
      { sectionId: noStudents.id, teacherId: teacher.id },
      { sectionId: other.id, teacherId: teacher.id },
    ],
  });
  await db.enrollment.createMany({
    data: [
      { sectionId: good.id, studentId: student.id },
      { sectionId: good.id, studentId: pending.id },
      { sectionId: good.id, studentId: disabled.id },
      { sectionId: noTeacher.id, studentId: student.id },
      { sectionId: other.id, studentId: student.id },
    ],
  });
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} Mẫu giả`,
      createdById: dbcl.id,
      groups: {
        create: {
          title: "Nhóm tiêu chí giả",
          position: 1,
          weight: 1,
          isAssessmentGroup: true,
          questions: {
            create: {
              type: "LIKERT",
              label: "Đánh giá môn học giả",
              position: 1,
              weight: 1,
              required: true,
              scaleMin: 1,
              scaleMax: 5,
            },
          },
        },
      },
    },
  });
  templateIds.push(template.id);
  pass(
    "Fixture riêng đủ10vai trò, hai khoa/bộ môn, năm lớp và SV pending/disabled; server đúng DB có marker",
  );

  assert.equal((await req("/api/campaigns")).status, 401);
  for (const role of roles) {
    const client = clients.get(role)!;
    const allowed = ["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(role);
    assert.equal(
      (await req("/api/campaigns", client)).status,
      allowed ? 200 : 403,
    );
    if (!allowed)
      assert.equal(
        (await req("/api/campaigns", client, payload())).status,
        403,
      );
  }
  for (const client of [pdt, leader])
    assert.equal((await req("/api/campaigns", client, payload())).status, 403);
  pass(
    "TC-ALL-01: ma trận10vai trò đọc/tạo, ADMIN MFA không được quyền nghiệp vụ; khách bị401",
  );
  for (const options of [
    { csrf: false },
    { origin: null },
    { origin: "https://other.invalid" },
    { token: pdt.csrf },
  ])
    assert.equal(
      (await req("/api/campaigns", dbcl, payload(), options)).status,
      403,
    );
  assert.equal((await req("/api/campaigns/not-a-uuid", dbcl)).status, 400);
  assert.equal((await req(`/api/campaigns/${randomUUID()}`, dbcl)).status, 404);
  assert.equal((await req("/api/campaigns?extra=true", dbcl)).status, 400);
  assert.equal(
    (
      await req("/api/campaigns", dbcl, "{}", {
        raw: true,
        contentType: "text/plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (await req("/api/campaigns", dbcl, "{", { raw: true })).status,
    400,
  );
  assert.equal(
    (await req("/api/campaigns", dbcl, " ".repeat(262145), { raw: true }))
      .status,
    413,
  );
  const streamed = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(" ".repeat(262145)));
      controller.close();
    },
  });
  const request: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: headers(dbcl, {}, true),
    body: streamed,
    duplex: "half",
  };
  assert.equal((await fetch(`${origin}/api/campaigns`, request)).status, 413);
  pass(
    "BR-34: Origin/CSRF phân phiên, UUID/query/JSON/content-type và256KiB byte thật kể cả stream không Content-Length",
  );

  const scopes: CampaignDetail[] = [];
  for (const extra of [
    { scope: "GLOBAL", sectionIds: [] },
    { scope: "FACULTY", facultyId: facultyIds[0], sectionIds: [] },
    { scope: "DEPARTMENT", departmentId: departmentIds[0], sectionIds: [] },
    { scope: "SECTIONS", sectionIds: [good.id] },
  ] as Partial<CampaignInput>[])
    scopes.push(await create(dbcl, extra));
  assert.deepEqual(
    scopes.map((item) => item.sectionCount),
    [4, 3, 3, 1],
  );
  assert.equal(
    (await req("/api/campaigns", dbcl, payload({ sectionIds: [foreign.id] })))
      .status,
    400,
  );
  assert.equal(
    (
      await req(
        "/api/campaigns",
        dbcl,
        payload({ scope: "GLOBAL", sectionIds: [good.id] }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await req("/api/campaigns", dbcl, { ...payload(), unknownField: true }))
      .status,
    400,
  );
  const listed = ok(
    await req(`/api/campaigns?search=${prefix}&pageSize=2&page=2`, dbcl),
  );
  assert.equal(listed.total, 4);
  assert.equal(listed.items.length, 2);
  const options = ok(
    await req(
      `/api/campaigns/options?kind=sections&semesterId=${semester.id}&pageSize=2&page=2`,
      pdt,
    ),
  );
  assert.equal(options.total, 4);
  assert.equal(options.items.length, 2);
  assert(!options.items.some((item: { id: string }) => item.id === foreign.id));
  pass(
    "FR-40/41: bốn phạm vi đúng số lớp hiện tại, paging list/options; không lấy lớp khác kỳ hay payload sai scope",
  );

  const globalReady = ok(
    await req(`/api/campaigns/${scopes[0].id}/readiness`, pdt),
  ).item;
  const codes = new Set(
    [...globalReady.blockers, ...globalReady.warnings].map(
      (item: { code: string }) => item.code,
    ),
  );
  for (const code of ["RS-01", "RS-02", "RS-04", "RS-05", "RS-06"])
    assert(codes.has(code));
  assert.equal(globalReady.canConfirm, false);
  let bad = await action(dbcl, scopes[0], "submit");
  assert.equal(
    (
      await req(`/api/campaigns/${bad.id}/confirm`, pdt, {
        expectedRevision: bad.revision,
        requestId: randomUUID(),
        reason,
      })
    ).data.code,
    "READINESS_BLOCKED",
  );
  assert.equal(
    (
      await req(`/api/campaigns/${bad.id}/return`, pdt, {
        expectedRevision: bad.revision,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  bad = await action(pdt, bad, "return", { reason });
  assert.equal(bad.status, "NHAP");
  assert.equal(bad.latestConfirmation?.status, "TRA_VE");
  pass(
    "TC-PDT-02: RS01/02 chặn, RS04/05/06 cảnh báo; PĐT trả về có lý do và bản chụp bất biến",
  );

  let lockedDraft = await create(dbcl, {
    semesterId: otherSemester.id,
    sectionIds: [foreign.id],
  });
  ok(
    await req(
      `/api/catalog/semesters/${otherSemester.id}/lock`,
      pdt,
      { reason },
      { token: pdt.catalogCsrf },
    ),
  );
  const lockedReady = ok(
    await req(`/api/campaigns/${lockedDraft.id}/readiness`, pdt),
  ).item;
  assert(
    lockedReady.blockers.some(
      (item: { code: string }) => item.code === "RS-03",
    ),
  );
  assert.equal(
    (
      await req(
        "/api/campaigns",
        dbcl,
        payload({ semesterId: otherSemester.id, sectionIds: [foreign.id] }),
      )
    ).data.code,
    "SEMESTER_LOCKED",
  );
  assert.equal(
    (
      await req(`/api/campaigns/${lockedDraft.id}/submit`, dbcl, {
        expectedRevision: lockedDraft.revision,
        requestId: randomUUID(),
      })
    ).data.code,
    "SEMESTER_LOCKED",
  );
  await db.semester.update({
    where: { id: otherSemester.id },
    data: { lockedAt: null },
  });
  lockedDraft = await action(dbcl, lockedDraft, "cancel", { reason });
  assert.equal(lockedDraft.status, "HUY");
  pass(
    "TC-PDT-02/BR-17: RS03 cho học kỳ khóa; chỉ đọc và không tạo/trình đợt khi khóa",
  );

  let primary = await action(dbcl, scopes[3], "submit");
  assert.equal(primary.status, "CHO_XAC_NHAN_DL");
  const noNote = await req(`/api/campaigns/${primary.id}/confirm`, pdt, {
    expectedRevision: primary.revision,
    requestId: randomUUID(),
  });
  assert.equal(noNote.data.code, "WARNING_NOTE_REQUIRED");
  assert.equal(
    (
      await req(`/api/campaigns/${primary.id}/approve`, pdt, {
        expectedRevision: primary.revision,
        requestId: randomUUID(),
      })
    ).status,
    403,
  );
  primary = await action(pdt, primary, "confirm", { reason });
  assert.equal(primary.status, "CHO_DUYET");
  assert.equal(primary.latestConfirmation?.pairCount, 3);
  assert.equal(
    primary.latestConfirmation?.confirmedByName,
    `${prefix} PHONG_DAO_TAO`,
  );
  const confirmSnapshot = await db.campaignDataConfirmation.findFirstOrThrow({
    where: { campaignId: primary.id },
    orderBy: { campaignRevision: "desc" },
  });
  assert.equal(
    (
      await req(`/api/campaigns/${primary.id}/reject`, leader, {
        expectedRevision: primary.revision,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  primary = await action(leader, primary, "approve");
  assert.equal(primary.status, "DA_DUYET");
  assert.equal(
    (await db.surveyTemplate.findUniqueOrThrow({ where: { id: template.id } }))
      .status,
    "DA_KHOA",
  );
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: primary.id } }),
    0,
  );
  const blockedLock = await req(
    `/api/catalog/semesters/${semester.id}/lock`,
    pdt,
    { reason },
    { token: pdt.catalogCsrf },
  );
  assert.equal(blockedLock.data.code, "SEMESTER_HAS_ACTIVE_CAMPAIGN");
  pass(
    "FR-42/BR-05/52: ĐBCL→PĐT xác nhận cảnh báo có note→lãnh đạo duyệt; khóa mẫu và cấm khóa kỳ có đợt đã duyệt",
  );

  await db.enrollment.create({
    data: { sectionId: good.id, studentId: added.id },
  });
  await due(primary.id);
  const opened = await Promise.all(
    Array.from({ length: 20 }, () =>
      ensureCampaignState(consoleActor, primary.id),
    ),
  );
  assert.equal(opened.filter((item) => item.opened).length, 1);
  assert.equal(opened.filter((item) => item.driftDetected).length, 1);
  primary = await detail(dbcl, primary.id);
  assert.equal(primary.status, "DANG_MO");
  assert.equal(primary.dataDriftDetected, true);
  assert.notEqual(primary.openedSnapshotHash, confirmSnapshot.snapshotHash);
  const taskRows = await db.surveyTask.findMany({
    where: { campaignId: primary.id },
    orderBy: { studentId: "asc" },
  });
  assert.equal(taskRows.length, 4);
  assert.deepEqual(
    taskRows.map((item) => item.studentId),
    [student.id, pending.id, disabled.id, added.id].sort(),
  );
  assert(
    taskRows.every(
      (item) => item.status === "PENDING" && item.doneDate === null,
    ),
  );
  assert.equal(
    await db.campaignHistory.count({
      where: { campaignId: primary.id, action: "AUTO_OPEN" },
    }),
    1,
  );
  assert.equal(
    await db.auditLog.count({
      where: { objectId: primary.id, action: "CAMPAIGN_DATA_DRIFT" },
    }),
    1,
  );
  const driftNotices = await db.notification.findMany({
    where: {
      targetType: "SurveyCampaign",
      targetId: primary.id,
      title: "Dữ liệu thay đổi sau khi xác nhận",
    },
    include: { email: true },
  });
  assert(
    driftNotices.some((item) => item.userId === dbcl.id) &&
      driftNotices.some((item) => item.userId === pdt.id),
  );
  assert(
    !driftNotices.some(
      (item) => item.userId === leader.id || item.userId === student.id,
    ),
  );
  assert(driftNotices.every((item) => item.email?.status === "PENDING"));
  const immutableConfirmation =
    await db.campaignDataConfirmation.findUniqueOrThrow({
      where: { id: confirmSnapshot.id },
    });
  assert.deepEqual(immutableConfirmation, confirmSnapshot);
  pass(
    "TC-PDT-03/FR-43/44:20ensure đồng thời chỉ mở/chốt/audit một lần; drift vẫn mở theo4SV hiện tại, queue PĐT/ĐBCL, giữ snapshot",
  );

  await db.enrollment.update({
    where: { sectionId_studentId: { sectionId: good.id, studentId: added.id } },
    data: { withdrawnAt: new Date() },
  });
  await db.courseSection
    .create({
      data: {
        id: randomUUID(),
        semesterId: semester.id,
        courseId: courseIds[0],
        code: `${prefix}-LATE`,
      },
    })
    .then((row) => sectionIds.push(row.id));
  await Promise.all(Array.from({ length: 5 }, () => detail(dbcl, primary.id)));
  assert.deepEqual(
    await db.surveyTask.findMany({
      where: { campaignId: primary.id },
      orderBy: { studentId: "asc" },
    }),
    taskRows,
  );
  assert.equal(
    await db.notification.count({
      where: {
        targetType: "SurveyCampaign",
        targetId: primary.id,
        title: "Dữ liệu thay đổi sau khi xác nhận",
      },
    }),
    driftNotices.length,
  );
  assert.equal(
    (
      await req(
        `/api/catalog/semesters/${semester.id}/lock`,
        pdt,
        { reason },
        { token: pdt.catalogCsrf },
      )
    ).data.code,
    "SEMESTER_HAS_ACTIVE_CAMPAIGN",
  );
  pass(
    "BR-01: đổi đăng ký/thêm lớp sau mở không resync nhiệm vụ/nhân cảnh báo; cấm khóa kỳ đang mở",
  );

  await db.surveyTask.update({
    where: { id: taskRows[0].id },
    data: { status: "DONE", doneDate: new Date("2026-10-29") },
  });
  const progress = ok(
    await req(`/api/campaigns/${primary.id}/progress?page=1&pageSize=1`, dbcl),
  );
  assert.deepEqual(
    [
      progress.total,
      progress.done,
      progress.pending,
      progress.participationRate,
      progress.totalSections,
      progress.items.length,
    ],
    [4, 1, 3, 0.25, 1, 1],
  );
  assert(
    !/studentId|responseId|answer|@fixture/.test(JSON.stringify(progress)),
  );
  assert.equal(
    (await req(`/api/campaigns/${primary.id}/progress`, pdt)).status,
    403,
  );
  ok(await req(`/api/campaigns/${primary.id}/progress`, leader));
  assert.equal(
    await db.surveyResponse.count({ where: { campaignId: primary.id } }),
    0,
  );
  assert.equal(
    await db.aggregateResult.count({ where: { campaignId: primary.id } }),
    0,
  );
  pass(
    "FR-46: tiến độ4task/1DONE=25%, paging lớp; không định danh SV/phiếu/đáp án/tổng hợp, PĐT không xem tiến độ",
  );

  assert.equal(
    (
      await req(`/api/campaigns/${primary.id}/extend`, dbcl, {
        expectedRevision: primary.revision,
        requestId: randomUUID(),
        reason,
        endsAt: primary.endsAt,
      })
    ).data.code,
    "INVALID_EXTENSION",
  );
  const extensionId = randomUUID(),
    extensionInput = {
      expectedRevision: primary.revision,
      requestId: extensionId,
      reason,
      endsAt: new Date(
        new Date(primary.endsAt).getTime() + 3600000,
      ).toISOString(),
    };
  primary = ok(
    await req(`/api/campaigns/${primary.id}/extend`, dbcl, extensionInput),
  ).item;
  const noticeCount = await db.notification.count({
    where: {
      targetType: "SurveyCampaign",
      targetId: primary.id,
      title: "Gia hạn thời gian khảo sát",
    },
  });
  assert.equal(noticeCount, 4);
  const retried = ok(
    await req(`/api/campaigns/${primary.id}/extend`, dbcl, extensionInput),
  ).item;
  assert.equal(retried.revision, primary.revision);
  assert.equal(
    await db.campaignHistory.count({
      where: { campaignId: primary.id, requestId: extensionId },
    }),
    1,
  );
  assert.equal(
    await db.notification.count({
      where: {
        targetType: "SurveyCampaign",
        targetId: primary.id,
        title: "Gia hạn thời gian khảo sát",
      },
    }),
    noticeCount,
  );
  assert.equal(
    (
      await req(`/api/campaigns/${primary.id}/extend`, dbcl, {
        ...extensionInput,
        reason: `${reason} sửa`,
      })
    ).data.code,
    "CAMPAIGN_REQUEST_CONFLICT",
  );
  assert.equal(
    (
      await req(`/api/campaigns/${primary.id}/cancel`, dbcl, {
        expectedRevision: primary.revision,
        requestId: randomUUID(),
        reason,
      })
    ).data.code,
    "CAMPAIGN_INVALID_STATE",
  );
  primary = await action(dbcl, primary, "close", { reason });
  assert.equal(primary.status, "DA_DONG");
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: primary.id } }),
    4,
  );
  pass(
    "FR-45: gia hạn tăng hạn và queue đúng cohort4SV; retry không nhân đôi, reuse key khác payload409; cấm hủy sau mở, đóng sớm giữ task",
  );

  // Simulate a worker crash before SMTP: an expired non-null DateTime lease
  // must be reclaimed by the CLI using the same CAS as live workers.
  const expiredMail = await db.emailOutbox.findFirstOrThrow({
    where: {
      notification: {
        targetType: "SurveyCampaign",
        targetId: primary.id,
        userId: added.id,
      },
    },
  });
  const expiredLease = new Date(Date.now() - 120000);
  await db.emailOutbox.update({
    where: { id: expiredMail.id },
    data: {
      status: "PROCESSING",
      attempts: 1,
      leaseToken: randomUUID(),
      leaseUntil: expiredLease,
      nextAttemptAt: expiredLease,
    },
  });
  const beforeDispatch = new Set(
    (
      await db.auditLog.findMany({
        where: { action: "CAMPAIGN_EMAIL_DISPATCH" },
        select: { id: true },
      })
    ).map((item) => item.id),
  );
  const cli = () =>
    spawnSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/scheduler.ts", "--once"],
      {
        env: { ...process.env, DATABASE_URL: test.href },
        encoding: "utf8",
        timeout: 60000,
        windowsHide: true,
      },
    );
  const firstDispatch = cli();
  assert.equal(firstDispatch.status, 0, "Scheduler CLI lần1 kết thúc0");
  const dispatchSummary = JSON.parse(
    firstDispatch.stdout.trim().split(/\r?\n/).at(-1)!,
  );
  assert.equal(dispatchSummary.mailSent, 4);
  assert.equal(dispatchSummary.mailFailed, 2);
  assert.equal(dispatchSummary.mailClaimed, 6);
  const finalMail = await db.emailOutbox.findMany({
    where: {
      notification: { targetType: "SurveyCampaign", targetId: primary.id },
    },
    include: { notification: true },
  });
  assert.equal(finalMail.filter((item) => item.status === "SENT").length, 4);
  assert(
    finalMail
      .filter((item) =>
        [pending.id, disabled.id].includes(item.notification.userId),
      )
      .every((item) => item.status === "FAILED" && item.attempts === 5),
  );
  assert(
    finalMail.every(
      (item) => item.leaseToken === null && item.leaseUntil === null,
    ),
  );
  const secondDispatch = cli();
  assert.equal(secondDispatch.status, 0, "Scheduler CLI lặp kết thúc0");
  const secondSummary = JSON.parse(
    secondDispatch.stdout.trim().split(/\r?\n/).at(-1)!,
  );
  assert.equal(secondSummary.mailClaimed, 0);
  const afterDispatch = await db.auditLog.findMany({
    where: { action: "CAMPAIGN_EMAIL_DISPATCH" },
    select: { id: true },
  });
  dispatchAuditIds.push(
    ...afterDispatch
      .map((item) => item.id)
      .filter((id) => !beforeDispatch.has(id)),
  );
  assert.deepEqual(
    await db.emailOutbox.findMany({
      where: {
        notification: { targetType: "SurveyCampaign", targetId: primary.id },
      },
      include: { notification: true },
    }),
    finalMail,
  );
  const schedulerLog =
    firstDispatch.stdout +
    firstDispatch.stderr +
    secondDispatch.stdout +
    secondDispatch.stderr;
  assert(!schedulerLog.includes("@fixture.invalid"));
  for (const secret of secrets) assert(!schedulerLog.includes(secret));
  writeFileSync(".local/week7-scheduler.log", schedulerLog);
  const mailpit = await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100", {
      signal: AbortSignal.timeout(5000),
    })
  ).json();
  for (const ordinal of [0, 4, 7, 13])
    assert(
      mailpit.messages.some((item: { To: { Address: string }[] }) =>
        item.To.some(
          (recipient) =>
            recipient.Address ===
            `${prefix.toLowerCase()}-${ordinal}@fixture.invalid`,
        ),
      ),
      "Mailpit đã nhận thư đúng fixture",
    );
  pass(
    "FR-44/45/144: scheduler CLI --once gửi4SMTP thật vàoMailpit,2địa chỉ/tài khoản không nhận FAILED rõ; retry không gửi lại, lease dọn và log không định danh",
  );

  let rejected = await submitAndConfirm(dbcl, pdt);
  rejected = await action(leader, rejected, "reject", { reason });
  assert.equal(rejected.status, "NHAP");
  rejected = await action(dbcl, rejected, "cancel", { reason });
  assert.equal(rejected.status, "HUY");
  let withdrawn = await approved(dbcl, pdt, leader);
  withdrawn = await action(dbcl, withdrawn, "withdraw", { reason });
  assert.equal(withdrawn.status, "NHAP");
  assert.equal(withdrawn.approvedAt, null);
  assert.equal(
    (await db.surveyTemplate.findUniqueOrThrow({ where: { id: template.id } }))
      .status,
    "DA_KHOA",
  );
  withdrawn = await action(dbcl, withdrawn, "submit");
  assert.equal(withdrawn.status, "CHO_XAC_NHAN_DL");
  assert.equal(
    (
      await req(`/api/campaigns/${withdrawn.id}/approve`, leader, {
        expectedRevision: withdrawn.revision,
        requestId: randomUUID(),
      })
    ).data.code,
    "CAMPAIGN_INVALID_STATE",
  );
  withdrawn = await action(pdt, withdrawn, "confirm", { reason });
  withdrawn = await action(leader, withdrawn, "approve");
  assert.equal(
    await db.campaignDataConfirmation.count({
      where: { campaignId: withdrawn.id, status: "DA_XAC_NHAN" },
    }),
    2,
  );
  pass(
    "FR-42/45: từ chối→nháp/hủy; rút phê duyệt giữ mẫu khóa và bắt buộc vòng PĐT xác nhận mới trước duyệt lại",
  );

  const editable = await create(dbcl);
  const editRequest = randomUUID();
  const edits = await Promise.all([
    req(`/api/campaigns/${editable.id}`, dbcl, {
      ...payload({ title: `${prefix} Bản A` }),
      expectedRevision: editable.revision,
      requestId: editRequest,
    }),
    req(`/api/campaigns/${editable.id}`, dbcl, {
      ...payload({ title: `${prefix} Bản B` }),
      expectedRevision: editable.revision,
      requestId: randomUUID(),
    }),
  ]);
  assert.deepEqual(edits.map((item) => item.status).sort(), [200, 409]);
  assert.equal(
    (await detail(dbcl, editable.id)).revision,
    editable.revision + 1,
  );
  assert.equal(
    await db.campaignHistory.count({
      where: { campaignId: editable.id, action: "UPDATE" },
    }),
    1,
  );
  pass(
    "FR-40/BR-06: hai sửa nháp cùng revision chỉ một thắng, bên còn lại409 và không có history ghi đè",
  );

  let onAccess = await approved(dbcl, pdt, leader);
  await due(onAccess.id);
  onAccess = await detail(dbcl, onAccess.id);
  assert.equal(onAccess.status, "DANG_MO");
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: onAccess.id } }),
    3,
  );
  let catchup = await approved(dbcl, pdt, leader);
  await due(catchup.id, true);
  const catchupNow = Date.now(),
    caught = await ensureCampaignState(consoleActor, catchup.id);
  assert(caught.opened && caught.closed);
  catchup = await detail(dbcl, catchup.id);
  assert.equal(catchup.status, "DA_DONG");
  const autoHistory = await db.campaignHistory.findMany({
    where: {
      campaignId: catchup.id,
      action: { in: ["AUTO_OPEN", "AUTO_CLOSE"] },
    },
    orderBy: { campaignRevision: "asc" },
  });
  assert.deepEqual(
    autoHistory.map((item) => item.action),
    ["AUTO_OPEN", "AUTO_CLOSE"],
  );
  assert(autoHistory.every((item) => item.occurredAt.getTime() >= catchupNow));
  await ensureCampaignState(consoleActor, catchup.id);
  assert.equal(
    await db.campaignHistory.count({
      where: {
        campaignId: catchup.id,
        action: { in: ["AUTO_OPEN", "AUTO_CLOSE"] },
      },
    }),
    2,
  );
  const scheduler = await ensureDueCampaigns(consoleActor);
  assert.equal(scheduler.opened, 0);
  assert.equal(scheduler.closed, 0);
  pass(
    "FR-44/BR-06: không cần daemon, GET đầu tiên tự mở; bỏ lỡ cả cửa sổ thì OPEN→CLOSE đúng chuỗi/giờ thật, scheduler lặp không nhân đôi",
  );

  // Approval itself must catch up if startsAt passed while waiting for approval.
  let late = await submitAndConfirm(dbcl, pdt);
  await due(late.id);
  late = await action(leader, late, "approve");
  assert.equal(late.status, "DANG_MO");
  assert.equal(
    await db.surveyTask.count({ where: { campaignId: late.id } }),
    3,
  );
  pass(
    "FR-44: lãnh đạo duyệt trễ sau startsAt thì mở ngay trong cùng transaction, không chờ lần đọc kế",
  );

  const raceSemester = await createSemester("RACE"),
    raceSection = await createSection(raceSemester.id, courseIds[0], "RACE");
  await db.teachingAssignment.create({
    data: { sectionId: raceSection.id, teacherId: teacher.id },
  });
  await db.enrollment.create({
    data: { sectionId: raceSection.id, studentId: student.id },
  });
  const race = await submitAndConfirm(dbcl, pdt, {
    semesterId: raceSemester.id,
    sectionIds: [raceSection.id],
  });
  const competing = await Promise.all([
    req(
      `/api/catalog/semesters/${raceSemester.id}/lock`,
      pdt,
      { reason },
      { token: pdt.catalogCsrf },
    ),
    req(`/api/campaigns/${race.id}/approve`, leader, {
      expectedRevision: race.revision,
      requestId: randomUUID(),
    }),
  ]);
  assert.deepEqual(competing.map((item) => item.status).sort(), [200, 409]);
  const raceState = await db.semester.findUniqueOrThrow({
      where: { id: raceSemester.id },
    }),
    raceCampaign = await db.surveyCampaign.findUniqueOrThrow({
      where: { id: race.id },
    });
  assert(
    !(
      raceState.lockedAt &&
      ["DA_DUYET", "DANG_MO"].includes(raceCampaign.status)
    ),
  );
  pass(
    "BR-17/51 và quyết định29/10: race khóa kỳ/duyệt dùng chung mutex; không tồn tại kỳ khóa với đợt đã duyệt/đang mở",
  );

  const revoked = await createClient("CAN_BO_DBCL", 15, passwordHash);
  ok(await req("/api/campaigns", revoked));
  await db.roleAssignment.deleteMany({ where: { userId: revoked.id } });
  assert.equal((await req("/api/campaigns", revoked)).status, 403);
  const expired = await createClient("CAN_BO_DBCL", 16, passwordHash);
  await db.userSession.update({
    where: { id: expired.actor.sessionId },
    data: { revokedAt: new Date() },
  });
  assert.equal((await req("/api/campaigns", expired)).status, 401);
  pass(
    "BR-32/34: thu hồi role hoặc phiên có hiệu lực ngay dù access JWT cũ còn hạn",
  );

  const audited = await db.auditLog.findMany({
    where: {
      OR: [{ actorId: { in: userIds } }, { objectId: { in: campaignIds } }],
    },
  });
  const auditText = JSON.stringify(audited);
  assert(
    auditText.includes("CAMPAIGN_CREATED") &&
      auditText.includes("CAMPAIGN_APPROVE") &&
      auditText.includes("CAMPAIGN_OPENED") &&
      auditText.includes("CAMPAIGN_CLOSED") &&
      auditText.includes("CAMPAIGN_EXTEND") &&
      auditText.includes("CAMPAIGN_DATA_DRIFT"),
  );
  for (const secret of secrets) assert(!auditText.includes(secret));
  assert(!auditText.includes(reason));
  assert(!auditText.includes("Đánh giá môn học giả"));
  const log = readFileSync(".local/week7-http.log", "utf8");
  for (const secret of secrets) assert(!log.includes(secret));
  assert(!log.includes(reason));
  assert(!log.includes("Đánh giá môn học giả"));
  pass(
    "BR-30/34: audit đủ tạo/trình/xác nhận/duyệt/mở/drift/gia hạn/đóng; không lý do thô, nội dung phiếu hay JWT/CSRF/mật khẩu trong audit/log",
  );
  outcome = "passed";
  console.log(`HTTP/MySQL Tuần7: ${cases.length}/${cases.length} nhóm qua.`);
  save();
} catch (error) {
  outcome = "failed";
  process.exitCode = 1;
  const message = error instanceof Error ? error.message : "Lỗi chưa xác định";
  console.error(
    `KHÔNG QUA sau ${cases.length} nhóm (${current}): ${[...secrets].some((secret) => message.includes(secret)) ? "Chi tiết được ẩn" : message.slice(0, 350)}`,
  );
  if (verifiedDatabase) save();
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
  if (verifiedDatabase)
    try {
      // ID chính xác thu từ prefix ngẫu nhiên của lần chạy; không truncate/reset,
      // không xóa seed hoặc dữ liệu của lần chạy/người dùng khác.
      const ownedUsers = await db.user.findMany({
        where: { loginCode: { startsWith: `${prefix}-U` } },
        select: { id: true },
      });
      userIds.push(...ownedUsers.map((row) => row.id));
      const ownedCampaigns = await db.surveyCampaign.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      campaignIds.push(...ownedCampaigns.map((row) => row.id));
      await db.$transaction(
        async (tx) => {
          await tx.emailOutbox.deleteMany({
            where: {
              notification: {
                targetType: "SurveyCampaign",
                targetId: { in: campaignIds },
              },
            },
          });
          await tx.notification.deleteMany({
            where: {
              targetType: "SurveyCampaign",
              targetId: { in: campaignIds },
            },
          });
          await tx.auditLog.deleteMany({
            where: {
              OR: [
                { id: { in: dispatchAuditIds } },
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
          await tx.notification.deleteMany({
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
        },
        { timeout: 30000 },
      );
      assert.equal(await db.user.count({ where: { id: { in: userIds } } }), 0);
      assert.equal(
        await db.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
        0,
      );
      assert.equal(
        await db.notification.count({
          where: { targetId: { in: campaignIds } },
        }),
        0,
      );
      cleaned = true;
    } catch (error) {
      cleaned = false;
      outcome = "failed";
      process.exitCode = 1;
      console.error(
        `Chưa dọn xong fixture Tuần7: ${error instanceof Error ? error.name : "lỗi DB"}`,
      );
    }
  if (verifiedDatabase) save();
  await db.$disconnect();
}
