import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import type { Role } from "../src/generated/prisma/enums";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import type {
  TemplateDetail,
  TemplateInput,
} from "../src/server/services/templates";

// Chỉ tái dùng DB kiểm thử có marker; không truy cập/ghi main hoặc DB demo.
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
const port = 3005,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb(),
  prefix = `W6${randomUUID().slice(0, 8)}`,
  password = "KiemThu2026!TuanSau";
const users: string[] = [],
  templates: string[] = [],
  campaigns: string[] = [],
  responses: string[] = [],
  tasks: string[] = [];
const faculties: string[] = [],
  departments: string[] = [],
  courses: string[] = [],
  semesters: string[] = [],
  sections: string[] = [];
const cases: string[] = [],
  secrets = new Set(
    [password, process.env.JWT_SECRET!, process.env.MFA_ENCRYPTION_KEY!].filter(
      Boolean,
    ),
  );
let oldDefaults: { id: string; revision: number; updatedAt: Date }[] = [];
let child: ReturnType<typeof spawn> | undefined,
  fd: number | undefined,
  cleaned = false,
  verifiedDatabase = false;
let outcome = "running",
  current = "Khởi tạo";
type Client = {
  jar: Map<string, string>;
  csrf: string;
  id: string;
  role: Role;
};
type Options = { csrf?: boolean; origin?: string | null; token?: string };
function save() {
  writeFileSync(
    ".local/week6-http-result.json",
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
  console.log(`QUA W6-HTTP-${String(cases.length).padStart(2, "0")} ${name}`);
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
          "content-type": "application/json",
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
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  if (client)
    for (const cookie of response.headers.getSetCookie()) {
      const match = cookie.match(/^([^=]+)=([^;]*)/)!;
      if (match[2]) client.jar.set(match[1], match[2]);
      else client.jar.delete(match[1]);
    }
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json() : null;
  return { status: response.status, data, response };
}
async function createClient(
  role: Role,
  ordinal: number,
  extraAdmin = false,
): Promise<Client> {
  const scoped =
    role === "TRUONG_KHOA"
      ? {
          scopeType: "FACULTY" as const,
          scopeKey: `FACULTY:${faculties[0]}`,
          facultyId: faculties[0],
        }
      : role === "TRUONG_BO_MON"
        ? {
            scopeType: "DEPARTMENT" as const,
            scopeKey: `DEPARTMENT:${departments[0]}`,
            departmentId: departments[0],
          }
        : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
  const user = await db.user.create({
    data: {
      loginCode: `${prefix}-U${ordinal}`,
      email: `${prefix.toLowerCase()}-${ordinal}@fixture.invalid`,
      displayName: `${prefix} ${role}`,
      passwordHash: await hash(password, 12),
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: [
          { role, ...scoped },
          ...(extraAdmin
            ? [
                {
                  role: "ADMIN" as const,
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
  // Phiên FULL thật do cùng service phát; MFA ADMIN là fixture, TOTP đã kiểm ở Tuần 4.
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(
      tx,
      user,
      { ip: "week6-fixture" },
      "FULL",
      role === "ADMIN" || extraAdmin,
    ),
  );
  const token = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  const client: Client = {
    jar: new Map([["sfs_access", token.accessToken]]),
    csrf: "",
    id: user.id,
    role,
  };
  for (const value of [token.accessToken, token.refreshToken])
    if (value) secrets.add(value);
  if (role === "CAN_BO_DBCL") {
    const csrf = await req("/api/templates/csrf", client);
    assert.equal(csrf.status, 200, "Phát CSRF ĐBCL");
    client.csrf = csrf.data.csrfToken;
    secrets.add(client.csrf);
  }
  return client;
}
function payload(suffix = "Mẫu đủ loại"): TemplateInput {
  return {
    name: `${prefix} ${suffix}`,
    groups: [
      {
        title: `${prefix} Nhóm hai`,
        position: 2,
        weight: 1.2345,
        isAssessmentGroup: true,
        questions: [
          {
            label: `${prefix} Có không`,
            type: "BOOLEAN",
            position: 3,
            required: true,
            allowNA: true,
            weight: 0.25,
            options: [],
          },
          {
            label: `${prefix} Tự luận`,
            type: "TEXT",
            position: 1,
            required: false,
            allowNA: true,
            weight: 1,
            options: [],
          },
          {
            label: `${prefix} Likert bốn`,
            type: "LIKERT",
            position: 2,
            required: false,
            allowNA: false,
            weight: 1.5,
            scaleMin: 1,
            scaleMax: 4,
            options: [],
          },
        ],
      },
      {
        title: `${prefix} Nhóm một`,
        position: 1,
        weight: 2,
        isAssessmentGroup: false,
        questions: [
          {
            label: `${prefix} Chọn nhiều`,
            type: "MULTIPLE_CHOICE",
            position: 3,
            required: false,
            allowNA: true,
            weight: 0.0001,
            options: [
              { label: `${prefix} Nhiều B`, position: 2 },
              { label: `${prefix} Nhiều A`, position: 1 },
            ],
          },
          {
            label: `${prefix} Likert năm`,
            type: "LIKERT",
            position: 1,
            required: true,
            allowNA: true,
            weight: 1000,
            options: [],
          },
          {
            label: `${prefix} Chọn một`,
            type: "SINGLE_CHOICE",
            position: 2,
            required: true,
            allowNA: false,
            weight: 2,
            options: [
              { label: `${prefix} Một C`, position: 3 },
              { label: `${prefix} Một A`, position: 1 },
              { label: `${prefix} Một B`, position: 2 },
            ],
          },
        ],
      },
    ],
  };
}
async function createTemplate(
  client: Client,
  suffix: string,
): Promise<TemplateDetail> {
  const result = await req("/api/templates", client, payload(suffix));
  assert.equal(result.status, 201, "Tạo mẫu qua HTTP");
  templates.push(result.data.item.id);
  return result.data.item;
}
async function readTemplate(
  client: Client,
  id: string,
): Promise<TemplateDetail> {
  const result = await req(`/api/templates/${id}`, client);
  assert.equal(result.status, 200);
  return result.data.item;
}
function content(item: TemplateDetail) {
  return JSON.stringify({ name: item.name, groups: item.groups });
}
function allIds(item: TemplateDetail): string[] {
  return [
    item.id,
    ...item.groups.flatMap((group) => [
      group.id,
      ...group.questions.flatMap((question) => [
        question.id,
        ...question.options.map((option) => option.id),
      ]),
    ]),
  ];
}
async function countWrites() {
  return {
    tasks: await db.surveyTask.count(),
    responses: await db.surveyResponse.count(),
    answers: await db.surveyAnswer.count(),
    audit: await db.auditLog.count(),
  };
}

try {
  const identity = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity[0].uuid, marker.serverUuid);
  assert.equal(identity[0].database, marker.database);
  verifiedDatabase = true;
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week6-http.log", "w");
  save();
  oldDefaults = await db.surveyTemplate.findMany({
    where: { isDefault: true },
    select: { id: true, revision: true, updatedAt: true },
  });
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
        SFS_TEST_DIST_DIR: ".next-week6",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let index = 0; index < 90; index++) {
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
  assert(ready, "Máy chủ kiểm thử khởi động");
  const faculty = await db.faculty.create({
    data: { code: `${prefix}-K`, name: `${prefix} Khoa` },
  });
  faculties.push(faculty.id);
  const department = await db.department.create({
    data: {
      code: `${prefix}-BM`,
      name: `${prefix} Bộ môn`,
      facultyId: faculty.id,
    },
  });
  departments.push(department.id);
  const clients: Client[] = [];
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
    clients.push(await createClient(role, index + 1));
  const quality = clients[4],
    student = clients[0],
    otherQuality = await createClient("CAN_BO_DBCL", 11),
    combined = await createClient("CAN_BO_DBCL", 12, true);
  assert.equal((await req("/api/templates")).status, 401);
  assert.equal((await req("/mau-phieu")).status, 307);
  for (const client of clients) {
    assert.equal(
      (await req("/api/templates", client)).status,
      client.role === "CAN_BO_DBCL" ? 200 : 403,
    );
    assert.equal(
      (await req("/api/templates/csrf", client)).status,
      client.role === "CAN_BO_DBCL" ? 200 : 403,
    );
  }
  pass(
    "TC-ALL-01 / BR-34: đủ mười vai trò, phạm vi trưởng khoa/bộ môn hợp lệ, chỉ ĐBCL được list/CSRF; ADMIN đã MFA không có quyền ngầm",
  );

  const before = await db.surveyTemplate.count();
  for (const options of [
    { csrf: false },
    { origin: null },
    { origin: "https://evil.invalid" },
    { token: otherQuality.csrf },
  ])
    assert.equal(
      (await req("/api/templates", quality, payload(), options)).status,
      403,
    );
  const catalogToken = (await req("/api/catalog/csrf", clients[7])).data
    .csrfToken;
  const adminToken = (await req("/api/admin/csrf", combined)).data.csrfToken;
  secrets.add(catalogToken);
  secrets.add(adminToken);
  assert.equal(
    (await req("/api/templates", quality, payload(), { token: catalogToken }))
      .status,
    403,
  );
  assert.equal(
    (await req("/api/templates", combined, payload(), { token: adminToken }))
      .status,
    403,
  );
  assert.equal(await db.surveyTemplate.count(), before);
  pass(
    "CSRF thiếu/sai phiên/sai miền catalog-admin và Origin thiếu/ngoại lai đều 403 trước ghi",
  );

  const huge = `${JSON.stringify(payload())}${" ".repeat(262_145)}`;
  assert.equal(
    (
      await fetch(origin + "/api/templates", {
        method: "POST",
        headers: headers(quality, {}, true),
        body: huge,
      })
    ).status,
    413,
  );
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < 6; index++)
        controller.enqueue(encoder.encode(" ".repeat(50_000)));
      controller.close();
    },
  });
  const streamed: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: headers(quality, {}, true),
    body: stream,
    duplex: "half",
  };
  assert.equal((await fetch(origin + "/api/templates", streamed)).status, 413);
  const wrongType = headers(quality, {}, true);
  wrongType["content-type"] = "text/plain";
  assert.equal(
    (
      await fetch(origin + "/api/templates", {
        method: "POST",
        headers: wrongType,
        body: "{}",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(origin + "/api/templates", {
        method: "POST",
        headers: headers(quality, {}, true),
        body: "{",
      })
    ).status,
    400,
  );
  assert.equal(await db.surveyTemplate.count(), before);
  pass(
    "Giới hạn 256 KiB theo Content-Length lẫn stream không có độ dài; JSON lỗi/Content-Type sai không ghi",
  );

  const original = await createTemplate(quality, "Mẫu gốc");
  assert.equal(original.version, 1);
  assert.equal(original.revision, 1);
  assert.equal(original.status, "NHAP");
  assert(!original.isDefault && !original.isLocked);
  const saved = await readTemplate(quality, original.id);
  assert.deepEqual(
    saved.groups.map((group) => group.position),
    [1, 2],
  );
  assert.deepEqual(
    saved.groups[0].questions.map((question) => question.position),
    [1, 2, 3],
  );
  assert.deepEqual(
    saved.groups[0].questions[1].options.map((option) => option.position),
    [1, 2, 3],
  );
  assert.equal(saved.groups[1].weight, 1.2345);
  assert.deepEqual(
    saved.groups.map((group) => group.isAssessmentGroup),
    [false, true],
  );
  assert.deepEqual(
    (
      await db.criterionGroup.findMany({
        where: { templateId: saved.id },
        orderBy: { position: "asc" },
      })
    ).map((group) => group.isAssessmentGroup),
    [false, true],
  );
  const editor = await req(`/mau-phieu/${saved.id}`, quality);
  assert.equal(editor.status, 200);
  const editorHtml = await editor.response.text();
  assert(
    editorHtml.includes(`group-assessment-${saved.groups[1].id}`) &&
      editorHtml.includes("Nhóm tiêu chí kiểm tra, đánh giá"),
  );
  assert.equal(saved.groups[0].questions[0].scaleMax, 5);
  assert.equal(saved.groups[1].questions[1].scaleMax, 4);
  assert(
    saved.groups[0].questions[0].required &&
      saved.groups[0].questions[0].allowNA,
  );
  assert(!saved.groups[1].questions[0].required);
  assert.equal(
    new Set(
      saved.groups.flatMap((group) =>
        group.questions.map((question) => question.type),
      ),
    ).size,
    5,
  );
  assert.equal(saved.groups[0].questions[2].weight, 0.0001);
  assert.equal(saved.groups[0].questions[0].weight, 1000);
  pass(
    "TC-FR148-01/02 / FR-30/31: cờ kiểm tra, đánh giá lưu DB/DTO đúng nhóm sau sắp thứ tự, form ĐBCL có ô chọn; đủ năm loại và hai thang Likert",
  );

  for (const denied of clients.filter(
    (client) => client.role !== "CAN_BO_DBCL",
  )) {
    assert.equal((await req(`/api/templates/${saved.id}`, denied)).status, 403);
    assert.equal(
      (
        await req(`/api/templates/${saved.id}`, denied, {
          ...payload(),
          expectedRevision: 1,
        })
      ).status,
      403,
    );
    for (const action of ["lock", "clone", "version", "default"])
      assert.equal(
        (
          await req(`/api/templates/${saved.id}/${action}`, denied, {
            expectedRevision: 1,
          })
        ).status,
        403,
      );
    for (const page of [
      `/mau-phieu/${saved.id}`,
      `/mau-phieu/${saved.id}/xem-truoc`,
    ]) {
      const response = await req(page, denied);
      assert.equal(response.status, 307);
      assert.equal(response.response.headers.get("location"), "/tai-khoan");
    }
  }
  pass(
    "TC-ALL-01 / BR-34: mọi đường ID đọc/sửa/khóa/nhân bản/phiên bản/mặc định và SSR xem trước đều chặn chín vai trò khác",
  );

  const absent = randomUUID();
  for (const id of [absent, "bad-id"]) {
    const code = id === absent ? 404 : 400;
    assert.equal((await req(`/api/templates/${id}`, quality)).status, code);
    assert.equal(
      (
        await req(`/api/templates/${id}`, quality, {
          ...payload(),
          expectedRevision: 1,
        })
      ).status,
      code,
    );
    for (const action of ["lock", "clone", "version", "default"])
      assert.equal(
        (
          await req(`/api/templates/${id}/${action}`, quality, {
            expectedRevision: 1,
          })
        ).status,
        code,
      );
  }
  assert.equal(
    (await req(`/mau-phieu/${absent}/xem-truoc`, quality)).status,
    404,
  );
  assert.equal((await req("/api/templates?pageSize=51", quality)).status, 400);
  assert.equal(
    (await req("/api/templates?isDefault=maybe", quality)).status,
    400,
  );
  pass(
    "Mọi ID không tồn tại trả 404, UUID sai trả 400, SSR 404 và query phân trang/bộ lọc sai bị từ chối",
  );

  const invalids: unknown[] = [];
  for (const weight of [0, -1, 0.00001, 1000.0001]) {
    const item = payload();
    item.groups[0].weight = weight;
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups[1].position = item.groups[0].position;
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups[0].questions[1].position = item.groups[0].questions[0].position;
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups[1].questions[0].options![1].position =
      item.groups[1].questions[0].options![0].position;
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups[0].questions[2].scaleMax = 7;
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups = Array.from({ length: 21 }, (_, index) => ({
      ...item.groups[0],
      position: index + 1,
    }));
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups = [
      {
        ...item.groups[0],
        questions: Array.from({ length: 101 }, (_, index) => ({
          ...item.groups[0].questions[0],
          position: index + 1,
        })),
      },
    ];
    invalids.push(item);
  }
  {
    const item = payload();
    item.groups[1].questions[0].options = Array.from(
      { length: 21 },
      (_, index) => ({
        label: `${prefix} Lựa chọn ${index}`,
        position: index + 1,
      }),
    );
    invalids.push(item);
  }
  {
    const item = payload();
    invalids.push({ ...item, isDefault: true });
  }
  for (const isAssessmentGroup of ["true", "false", 0, 1, null]) {
    const item = payload();
    invalids.push({
      ...item,
      groups: [{ ...item.groups[0], isAssessmentGroup }],
    });
  }
  const untouched = content(await readTemplate(quality, saved.id)),
    templateCount = await db.surveyTemplate.count(),
    groupCount = await db.criterionGroup.count();
  for (const item of invalids) {
    assert.equal((await req("/api/templates", quality, item)).status, 400);
    assert.equal(
      (
        await req(`/api/templates/${saved.id}`, quality, {
          ...(item as object),
          expectedRevision: 1,
        })
      ).status,
      400,
    );
  }
  assert.equal(await db.surveyTemplate.count(), templateCount);
  assert.equal(await db.criterionGroup.count(), groupCount);
  assert.equal(content(await readTemplate(quality, saved.id)), untouched);
  pass(
    "FR-30/31: dữ liệu vượt giới hạn, trùng thứ tự, trọng số/thang sai và chèn quyền đều 400, không ghi một phần",
  );

  const listed = await req(
    `/api/templates?search=${prefix}&page=1&pageSize=2`,
    quality,
  );
  assert.equal(listed.status, 200);
  assert(listed.data.items.length <= 2 && listed.data.total >= 1);
  assert(
    !("groups" in listed.data.items[0]) &&
      !("createdById" in listed.data.items[0]),
  );
  pass(
    "Danh sách phân trang/tìm kiếm trả số tổng và metadata gọn, không có nội dung câu hỏi hoặc định danh người tạo",
  );

  const updatedPayload = payload("Đã lưu");
  updatedPayload.groups[0].isAssessmentGroup = false;
  updatedPayload.groups[1].isAssessmentGroup = true;
  const changed = await req(`/api/templates/${saved.id}`, quality, {
    ...updatedPayload,
    expectedRevision: saved.revision,
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.item.revision, 2);
  assert.deepEqual(
    changed.data.item.groups.map(
      (group: { isAssessmentGroup: boolean }) => group.isAssessmentGroup,
    ),
    [true, false],
  );
  assert.equal(
    (
      await req(`/api/templates/${saved.id}`, quality, {
        ...payload("Ghi đè cũ"),
        expectedRevision: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await readTemplate(quality, saved.id)).name,
    `${prefix} Đã lưu`,
  );
  pass("CAS revision tăng sau lưu, phiên cũ không ghi đè dữ liệu mới");

  const race = await createTemplate(quality, "Hai lần lưu đồng thời");
  const updates = await Promise.all([
    req(`/api/templates/${race.id}`, quality, {
      ...payload("Thắng A"),
      expectedRevision: 1,
    }),
    req(`/api/templates/${race.id}`, otherQuality, {
      ...payload("Thắng B"),
      expectedRevision: 1,
    }),
  ]);
  assert.deepEqual(updates.map((result) => result.status).sort(), [200, 409]);
  const winner = updates.find((result) => result.status === 200)!.data.item;
  const raceFinal = await readTemplate(quality, race.id);
  assert.equal(raceFinal.revision, 2);
  assert.equal(raceFinal.name, winner.name);
  pass(
    "MySQL thật: hai request lưu đồng thời cùng revision chỉ có một bên thắng, không mất cập nhật",
  );

  const lockRace = await createTemplate(quality, "Khóa cạnh tranh với lưu");
  const competition = await Promise.all([
    req(`/api/templates/${lockRace.id}/lock`, quality, { expectedRevision: 1 }),
    req(`/api/templates/${lockRace.id}`, otherQuality, {
      ...payload("Lưu cạnh tranh khóa"),
      expectedRevision: 1,
    }),
  ]);
  assert.deepEqual(
    competition.map((result) => result.status).sort(),
    [200, 409],
  );
  const raceState = await readTemplate(quality, lockRace.id);
  assert.equal(raceState.revision, 2);
  assert.equal(raceState.isLocked, competition[0].status === 200);
  pass(
    "BR-05/MySQL thật: khóa và sửa cùng revision chỉ một bên thắng, trạng thái cuối khớp thao tác thắng",
  );

  const locking = await readTemplate(quality, saved.id),
    lockedResult = await req(`/api/templates/${saved.id}/lock`, quality, {
      expectedRevision: locking.revision,
    });
  assert.equal(lockedResult.status, 200);
  const locked: TemplateDetail = lockedResult.data.item;
  const lockedContent = content(locked);
  assert.equal(locked.status, "DA_KHOA");
  assert(locked.isLocked && locked.lockedAt);
  const changeLockedFlag = payload("Cố đổi cờ nhóm đã khóa");
  changeLockedFlag.groups[0].isAssessmentGroup = false;
  assert.equal(
    (
      await req(`/api/templates/${locked.id}`, quality, {
        ...changeLockedFlag,
        expectedRevision: locked.revision,
      })
    ).status,
    409,
  );
  const lockedEditorHtml = await (
    await req(`/mau-phieu/${locked.id}`, quality)
  ).response.text();
  assert(
    lockedEditorHtml.includes("Nhóm tiêu chí kiểm tra, đánh giá") &&
      !lockedEditorHtml.includes("group-assessment-"),
  );
  assert.equal(
    (
      await req(`/api/templates/${locked.id}`, quality, {
        ...payload("Cố sửa khóa"),
        expectedRevision: locked.revision,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req(`/api/templates/${locked.id}/lock`, quality, {
        expectedRevision: locked.revision,
      })
    ).status,
    409,
  );
  assert.equal(content(await readTemplate(quality, locked.id)), lockedContent);
  pass(
    "TC-FR148-05 / BR-05: mẫu khóa hiển thị cờ, không cho đổi cờ/nội dung/UUID hoặc mở khóa lại",
  );

  const versions = await Promise.all([
    req(`/api/templates/${locked.id}/version`, quality, {
      expectedRevision: locked.revision,
      name: `${prefix} Phiên bản A`,
    }),
    req(`/api/templates/${locked.id}/version`, otherQuality, {
      expectedRevision: locked.revision,
      name: `${prefix} Phiên bản B`,
    }),
  ]);
  for (const result of versions) {
    assert.equal(result.status, 201);
    templates.push(result.data.item.id);
  }
  assert.deepEqual(
    versions.map((result) => result.data.item.version).sort(),
    [2, 3],
  );
  const originalIds = new Set(allIds(locked));
  for (const result of versions) {
    const item: TemplateDetail = result.data.item;
    assert.equal(item.familyId, locked.familyId);
    assert.equal(item.status, "NHAP");
    assert(!item.isDefault && !item.lockedAt);
    assert(allIds(item).every((id) => !originalIds.has(id)));
    assert.deepEqual(
      item.groups.map((group) => group.isAssessmentGroup),
      locked.groups.map((group) => group.isAssessmentGroup),
    );
  }
  assert.equal(content(await readTemplate(quality, locked.id)), lockedContent);
  pass(
    "BR-05/MySQL thật: hai phiên bản mới đồng thời nhận số 2/3 cùng họ, cây UUID mới và bản khóa cũ không đổi",
  );

  const cloneResult = await req(`/api/templates/${locked.id}/clone`, quality, {
    expectedRevision: locked.revision,
    name: `${prefix} Bản nhân độc lập`,
  });
  assert.equal(cloneResult.status, 201);
  const clone: TemplateDetail = cloneResult.data.item;
  templates.push(clone.id);
  assert.notEqual(clone.familyId, locked.familyId);
  assert.equal(clone.version, 1);
  assert.deepEqual(
    clone.groups.map((group) => group.isAssessmentGroup),
    locked.groups.map((group) => group.isAssessmentGroup),
  );
  assert(allIds(clone).every((id) => !originalIds.has(id)));
  assert.equal(
    (
      await req(`/api/templates/${clone.id}`, quality, {
        ...payload("Sửa riêng bản nhân"),
        expectedRevision: clone.revision,
      })
    ).status,
    200,
  );
  assert.equal(content(await readTemplate(quality, locked.id)), lockedContent);
  pass(
    "FR-34: nhân bản sang họ mới v1 với UUID mới; sửa bản nhân không thay đổi mẫu nguồn",
  );

  const protectedTemplate = await createTemplate(
    quality,
    "Mẫu thuộc đợt đã duyệt nhưng metadata nháp",
  );
  const semester = await db.semester.create({
    data: {
      code: `${prefix}-HK`,
      name: `${prefix} Học kỳ`,
      startsOn: new Date("2026-09-30"),
      endsOn: new Date("2027-01-15"),
    },
  });
  semesters.push(semester.id);
  const course = await db.course.create({
    data: {
      code: `${prefix}-MH`,
      name: `${prefix} Môn học`,
      credits: 3,
      departmentId: department.id,
    },
  });
  courses.push(course.id);
  const section = await db.courseSection.create({
    data: {
      code: `${prefix}-LHP`,
      courseId: course.id,
      semesterId: semester.id,
    },
  });
  sections.push(section.id);
  // Fixture dữ liệu được cho phép; không triển khai API/quy trình duyệt đợt của Tuần 7.
  const campaign = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt fixture`,
      semesterId: semester.id,
      templateId: protectedTemplate.id,
      scope: "GLOBAL",
      status: "NHAP",
      startsAt: new Date("2026-10-01"),
      endsAt: new Date("2026-11-01"),
      approvedAt: new Date("2026-10-01"),
      approvedById: quality.id,
      createdById: quality.id,
    },
  });
  campaigns.push(campaign.id);
  await db.campaignSection.create({
    data: { campaignId: campaign.id, sectionId: section.id },
  });
  const task = await db.surveyTask.create({
    data: {
      campaignId: campaign.id,
      sectionId: section.id,
      studentId: student.id,
    },
  });
  tasks.push(task.id);
  const response = await db.surveyResponse.create({
    data: {
      campaignId: campaign.id,
      sectionId: section.id,
      submittedDate: new Date("2026-10-22"),
      answers: {
        create: {
          questionId: protectedTemplate.groups[0].questions[0].id,
          valueNumber: 4,
          moderationStatus: "HIEN_THI",
        },
      },
    },
    include: { answers: true },
  });
  responses.push(response.id);
  const answerSnapshot = JSON.stringify(response),
    oldProtected = content(protectedTemplate);
  assert.equal(
    (
      await req(`/api/templates/${protectedTemplate.id}`, quality, {
        ...payload("Không sửa mẫu đã duyệt"),
        expectedRevision: 1,
      })
    ).status,
    409,
  );
  const protectedRead = await readTemplate(quality, protectedTemplate.id);
  assert(
    protectedRead.isLocked && protectedRead.lockReason?.includes("được duyệt"),
  );
  assert.equal(content(protectedRead), oldProtected);
  const protectedVersion = await req(
    `/api/templates/${protectedTemplate.id}/version`,
    quality,
    { expectedRevision: 1 },
  );
  assert.equal(protectedVersion.status, 201);
  templates.push(protectedVersion.data.item.id);
  assert.equal(
    JSON.stringify(
      await db.surveyResponse.findUnique({
        where: { id: response.id },
        include: { answers: true },
      }),
    ),
    answerSnapshot,
  );
  assert.equal(
    content(await readTemplate(quality, protectedTemplate.id)),
    oldProtected,
  );
  pass(
    "BR-05: đợt có approvedAt khóa cả mẫu metadata NHAP; tạo phiên bản giữ nguyên câu cũ và phiếu/đáp án ẩn danh cũ",
  );

  // Kiểm cả trường hợp trạng thái được duyệt nhưng timestamp lỗi/thiếu.
  await db.surveyCampaign.update({
    where: { id: campaign.id },
    data: { approvedAt: null, status: "DA_DUYET" },
  });
  assert.equal(
    (
      await req(`/api/templates/${protectedTemplate.id}`, quality, {
        ...payload(),
        expectedRevision: 1,
      })
    ).status,
    409,
  );
  pass(
    "BR-05: trạng thái DA_DUYET vẫn bảo vệ mẫu khi timestamp approvedAt thiếu",
  );

  const readOnlyBefore = await countWrites();
  for (let index = 0; index < 3; index++) {
    const preview = await req(
      `/mau-phieu/${protectedTemplate.id}/xem-truoc`,
      quality,
    );
    assert.equal(preview.status, 200);
    const html = await preview.response.text();
    assert(
      html.includes(`${prefix} Likert năm`) &&
        html.includes(`${prefix} Chọn một`) &&
        html.includes("Không áp dụng") &&
        html.includes("Nhóm tiêu chí kiểm tra, đánh giá"),
    );
  }
  assert.deepEqual(await countWrites(), readOnlyBefore);
  assert.equal(
    JSON.stringify(
      await db.surveyResponse.findUnique({
        where: { id: response.id },
        include: { answers: true },
      }),
    ),
    answerSnapshot,
  );
  pass(
    "FR-33: SSR xem trước đủ câu và Không áp dụng; ba lần mở không ghi task/response/answer/audit",
  );

  const candidates: TemplateDetail[] = [];
  for (const suffix of ["Mặc định A", "Mặc định B"]) {
    const item = await createTemplate(quality, suffix);
    const result = await req(`/api/templates/${item.id}/lock`, quality, {
      expectedRevision: item.revision,
    });
    assert.equal(result.status, 200);
    candidates.push(result.data.item);
  }
  const defaults = await Promise.all(
    candidates.map((item, index) =>
      req(`/api/templates/${item.id}/default`, index ? otherQuality : quality, {
        expectedRevision: item.revision,
      }),
    ),
  );
  assert.deepEqual(
    defaults.map((result) => result.status),
    [200, 200],
  );
  const currentDefaults = await db.surveyTemplate.findMany({
    where: { isDefault: true },
    select: { id: true },
  });
  assert.equal(currentDefaults.length, 1);
  assert(candidates.some((item) => item.id === currentDefaults[0].id));
  for (const item of candidates) {
    assert.equal(content(await readTemplate(quality, item.id)), content(item));
    assert.equal(
      (
        await req(`/api/templates/${item.id}/default`, quality, {
          expectedRevision: item.revision,
        })
      ).status,
      409,
    );
  }
  const defaultList = await req("/api/templates?isDefault=true", quality);
  assert.equal(defaultList.status, 200);
  assert.equal(defaultList.data.total, 1);
  const fromDefault = await req(
    `/api/templates/${currentDefaults[0].id}/clone`,
    quality,
    {
      expectedRevision: (await readTemplate(quality, currentDefaults[0].id))
        .revision,
    },
  );
  assert.equal(fromDefault.status, 201);
  templates.push(fromDefault.data.item.id);
  assert.equal(fromDefault.data.item.isDefault, false);
  pass(
    "FR-35/MySQL thật: hai chọn mặc định đồng thời còn đúng một; revision cũ bị chặn, nội dung khóa bất biến, dùng mẫu qua nhân bản",
  );

  await db.roleAssignment.deleteMany({
    where: { userId: otherQuality.id, role: "CAN_BO_DBCL" },
  });
  assert.equal((await req("/api/templates", otherQuality)).status, 403);
  assert.equal(
    (await req(`/api/templates/${saved.id}`, otherQuality)).status,
    403,
  );
  assert.equal(
    (
      await req(`/api/templates/${saved.id}/clone`, otherQuality, {
        expectedRevision: locked.revision,
      })
    ).status,
    403,
  );
  pass(
    "BR-34: thu hồi quyền ĐBCL có hiệu lực ngay với phiên cũ ở list/detail/mutation",
  );

  const auditText = JSON.stringify(
      await db.auditLog.findMany({ where: { actorId: { in: users } } }),
    ),
    serverLog = readFileSync(".local/week6-http.log", "utf8");
  for (const secret of secrets) {
    assert(!auditText.includes(secret));
    assert(!serverLog.includes(secret));
  }
  for (const text of [
    payload().name,
    `${prefix} Nhóm một`,
    `${prefix} Likert năm`,
    `${prefix} Một A`,
    `${prefix} Đã lưu`,
  ])
    assert(!auditText.includes(text));
  assert(
    auditText.includes("TEMPLATE_CREATED") &&
      auditText.includes("TEMPLATE_UPDATED") &&
      auditText.includes("TEMPLATE_LOCKED") &&
      auditText.includes("TEMPLATE_VERSION_CREATED") &&
      auditText.includes("TEMPLATE_CLONED") &&
      auditText.includes("TEMPLATE_DEFAULT_SET"),
  );
  pass(
    "BR-30: đủ audit cho sáu loại thay đổi, không có tên/nội dung phiếu/câu/lựa chọn/mật khẩu/JWT/CSRF trong audit và log máy chủ",
  );
  outcome = "passed";
  console.log(`HTTP/MySQL Tuần 6: ${cases.length}/${cases.length} nhóm qua.`);
  save();
} catch (error) {
  outcome = "failed";
  const message = error instanceof Error ? error.message : "Lỗi chưa xác định";
  console.error(
    `KHÔNG QUA sau ${cases.length} nhóm (${current}): ${[...secrets].some((secret) => message.includes(secret)) ? "Chi tiết được ẩn" : message.slice(0, 350)}`,
  );
  process.exitCode = 1;
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
      const fixtureUsers = await db.user.findMany({
        where: { loginCode: { startsWith: prefix } },
        select: { id: true },
      });
      users.push(...fixtureUsers.map((item) => item.id));
      const fixtureTemplates = await db.surveyTemplate.findMany({
        where: { createdById: { in: users } },
        select: { id: true },
      });
      templates.push(...fixtureTemplates.map((item) => item.id));
      await db.$transaction(
        async (tx) => {
          await tx.auditLog.deleteMany({
            where: {
              OR: [{ actorId: { in: users } }, { objectId: { in: templates } }],
            },
          });
          await tx.surveyAnswer.deleteMany({
            where: { responseId: { in: responses } },
          });
          await tx.surveyResponse.deleteMany({
            where: { id: { in: responses } },
          });
          await tx.surveyTask.deleteMany({ where: { id: { in: tasks } } });
          await tx.campaignSection.deleteMany({
            where: { campaignId: { in: campaigns } },
          });
          await tx.campaignHistory.deleteMany({
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
          // Khôi phục metadata mặc định tồn tại trước phiên, không sửa cây hoặc dữ liệu người khác.
          for (const item of oldDefaults)
            await tx.surveyTemplate.update({
              where: { id: item.id },
              data: {
                isDefault: true,
                revision: item.revision,
                updatedAt: item.updatedAt,
              },
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
          await tx.authToken.deleteMany({ where: { userId: { in: users } } });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          await tx.department.deleteMany({
            where: { id: { in: departments } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: faculties } } });
        },
        { timeout: 30_000 },
      );
      cleaned = true;
      assert.equal(
        await db.user.count({ where: { loginCode: { startsWith: prefix } } }),
        0,
      );
      assert.equal(
        await db.surveyTemplate.count({
          where: { createdById: { in: users } },
        }),
        0,
      );
      const restored = await db.surveyTemplate.findMany({
        where: { isDefault: true },
        select: { id: true, revision: true, updatedAt: true },
        orderBy: { id: "asc" },
      });
      assert.deepEqual(
        restored,
        [...oldDefaults].sort((a, b) => a.id.localeCompare(b.id)),
      );
    } catch (error) {
      cleaned = false;
      outcome = "failed";
      process.exitCode = 1;
      console.error(
        `Không dọn xong fixture Tuần 6: ${error instanceof Error ? error.name : "lỗi DB"}`,
      );
    }
  if (verifiedDatabase) save();
  await db.$disconnect();
}
