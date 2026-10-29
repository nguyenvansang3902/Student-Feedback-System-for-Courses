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
import { generate } from "otplib";
import type { Prisma } from "../src/generated/prisma/client";
import type { Role, UserStatus } from "../src/generated/prisma/enums";
import { getDb } from "../src/lib/db";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import type { AuthActor } from "../src/server/auth/types";
import {
  encryptMfaSecret,
  getMfaKeyVersion,
  newMfaSecret,
} from "../src/server/auth/mfa-crypto";
import { mfaRateKeys } from "../src/server/auth/mfa-rate";
import {
  createCampaign,
  getCampaignReadiness,
} from "../src/server/services/campaigns";
import { lockAdminMutations } from "../src/server/services/access";
import {
  DEFAULT_SURVEY_SETTINGS,
  getSurveySettings,
  setSurveySettings,
  SURVEY_SETTINGS_KEY,
  type SurveySettings,
  type SurveySettingsDTO,
} from "../src/server/services/survey-settings";
import {
  enqueueCampaignNotice,
  processCampaignMailOutbox,
} from "../src/server/services/campaign-notifications";

// URL + UUID máy chủ + marker phải khớp trước bất kỳ ghi/cleanup nào.
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
assert(
  ["localhost", "127.0.0.1"].includes(process.env.SMTP_HOST ?? "127.0.0.1") &&
    Number(process.env.SMTP_PORT ?? 1025) === 1025,
  "Chỉ gửi thư giả tới Mailpit cục bộ1025",
);
process.env.DATABASE_URL = test.href;
const port = 3007,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
process.env.AUTH_TRUST_PROXY = "true";
const db = getDb(),
  prefix = `W7S${randomUUID().slice(0, 8)}`,
  ip = `198.19.${Number.parseInt(prefix.slice(-4, -2), 16)}.${Number.parseInt(prefix.slice(-2), 16)}`;
const password = "KiemThu2026!TuanBayCauHinh",
  startedAt = new Date();
const userIds: string[] = [],
  facultyIds: string[] = [],
  departmentIds: string[] = [],
  semesterIds: string[] = [],
  courseIds: string[] = [],
  sectionIds: string[] = [],
  templateIds: string[] = [],
  campaignIds: string[] = [],
  dispatchAuditIds = new Set<string>(),
  rateKeys = new Set<string>();
const secrets = new Set(
  [
    password,
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
  current = "Khởi tạo";
let originalSettings: Awaited<ReturnType<typeof db.systemSetting.findUnique>> =
  null;
let settingsSnapshotTaken = false;
const consoleActor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử queue đợt bằng dữ liệu giả trong DB riêng Tuần7",
};
type Client = {
  id: string;
  role: Role;
  actor: AuthActor;
  access: string;
  csrf: string;
};
type Reply = {
  status: number;
  data: {
    ok?: boolean;
    code?: string;
    csrfToken?: string;
    item?: SurveySettingsDTO;
    items?: unknown[];
  };
  response: Response;
};
function save() {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/week7-settings-http-result.json",
    JSON.stringify(
      {
        status: outcome,
        passed: cases.length,
        cases,
        cleaned,
        startedAt: startedAt.toISOString(),
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
  console.log(
    `QUA W7-SETTINGS-${String(cases.length).padStart(2, "0")} ${name}`,
  );
  save();
}
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  options: {
    csrf?: string | false;
    origin?: string | null;
    raw?: string;
    contentType?: string;
  } = {},
): Promise<Reply> {
  const post = body !== undefined || options.raw !== undefined;
  const response = await fetch(origin + path, {
    method: post ? "POST" : "GET",
    headers: {
      ...(client ? { cookie: `sfs_access=${client.access}` } : {}),
      "x-forwarded-for": ip,
      ...(post
        ? {
            "content-type": options.contentType ?? "application/json",
            ...(options.origin === null
              ? {}
              : { origin: options.origin ?? origin }),
          }
        : {}),
      ...(client && options.csrf !== false
        ? { "x-csrf-token": options.csrf ?? client.csrf }
        : {}),
    },
    body: post ? (options.raw ?? JSON.stringify(body)) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  const data = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : {};
  return { status: response.status, data, response };
}
async function createClient(
  role: Role,
  ordinal: number,
  passwordHash: string,
): Promise<Client> {
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
    include: { roles: true },
  });
  userIds.push(user.id);
  // Phiên FULL/MFA là fixture của ma trận; bước lưu HTTP bên dưới vẫn xác minh TOTP thật.
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(tx, user, { ip }, "FULL", true),
  );
  const tokens = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  secrets.add(tokens.accessToken);
  secrets.add(tokens.refreshToken);
  return {
    id: user.id,
    role,
    actor: issued.actor,
    access: tokens.accessToken,
    csrf: "",
  };
}
const values = (dto: SurveySettingsDTO): SurveySettings => ({
  minResponses: dto.minResponses,
  minRate: dto.minRate,
  warningScore: dto.warningScore,
  explanationDays: dto.explanationDays,
  multiTeacherWarningThreshold: dto.multiTeacherWarningThreshold,
});
async function countOwnSettingsAudit() {
  return db.auditLog.count({
    where: { actorId: { in: userIds }, action: "SURVEY_SETTINGS_CHANGED" },
  });
}
async function fixtureNotice(
  campaignId: string,
  event: string,
  recipients: string[],
) {
  return db.$transaction(async (tx) => {
    await lockAdminMutations(tx);
    return enqueueCampaignNotice(tx, {
      key: `${prefix}:${event}`,
      campaignId,
      title: `${prefix} ${event}`,
      body: `${prefix} Nội dung thông báo giả`,
      userIds: recipients,
    });
  });
}
async function dispatch(limit = 50) {
  const before = new Set(
    (
      await db.auditLog.findMany({
        where: {
          action: "CAMPAIGN_EMAIL_DISPATCH",
          occurredAt: { gte: startedAt },
        },
        select: { id: true },
      })
    ).map((row) => row.id),
  );
  const result = await processCampaignMailOutbox(consoleActor, { limit });
  for (const row of await db.auditLog.findMany({
    where: {
      action: "CAMPAIGN_EMAIL_DISPATCH",
      occurredAt: { gte: startedAt },
    },
    select: { id: true },
  }))
    if (!before.has(row.id)) dispatchAuditIds.add(row.id);
  return result;
}
try {
  const [identity] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity.uuid, marker.serverUuid);
  assert.equal(identity.database, marker.database);
  verified = true;
  originalSettings = await db.systemSetting.findUnique({
    where: { key: SURVEY_SETTINGS_KEY },
  });
  settingsSnapshotTaken = true;
  // Không để worker test chạm queue của phiên khác trong cùng DB kiểm thử.
  assert.equal(
    await db.emailOutbox.count({
      where: {
        notification: { targetType: "SurveyCampaign" },
        status: { not: "SENT" },
      },
    }),
    0,
    "Cần chạy tuần tự và dọn queue fixture phiên trước",
  );
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new Error("Cổng3007 đang được dùng.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cổng3007"))
      throw error;
  }
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week7-settings-http.log", "w");
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
        SFS_TEST_DIST_DIR: ".next-week7-settings",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let i = 0; i < 90; i++) {
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
  assert(ready, "Máy chủ settings kiểm thử sẵn sàng");
  facultyIds.push(
    (
      await db.faculty.create({
        data: { code: `${prefix}-K`, name: "Khoa giả kiểm cấu hình" },
      })
    ).id,
  );
  departmentIds.push(
    (
      await db.department.create({
        data: {
          code: `${prefix}-BM`,
          name: "Bộ môn giả kiểm cấu hình",
          facultyId: facultyIds[0],
        },
      })
    ).id,
  );
  const passwordHash = await hash(password, 12),
    clients: Client[] = [];
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
  for (const [i, role] of roles.entries())
    clients.push(await createClient(role, i, passwordHash));
  const admin = clients[6],
    quality = clients[4],
    student = clients[0];
  const readRoles: Role[] = [
    "ADMIN",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "PHONG_DAO_TAO",
  ];
  assert.equal((await req("/api/survey-settings")).status, 401);
  for (const client of clients) {
    assert.equal(
      (await req("/api/survey-settings", client)).status,
      readRoles.includes(client.role) ? 200 : 403,
      `GET ${client.role}`,
    );
    if (client.role !== "ADMIN")
      assert.equal(
        (
          await req("/api/survey-settings", client, {
            ...DEFAULT_SURVEY_SETTINGS,
            expectedUpdatedAt: null,
            stepUpCode: "123456",
          })
        ).status,
        403,
        `POST ${client.role}`,
      );
  }
  const csrf = await req("/api/admin/csrf", admin);
  assert.equal(csrf.status, 200);
  assert(csrf.data.csrfToken);
  admin.csrf = csrf.data.csrfToken;
  secrets.add(admin.csrf);
  const initialReply = await req("/api/survey-settings", admin);
  assert.equal(initialReply.status, 200);
  assert.equal(initialReply.response.headers.get("cache-control"), "no-store");
  const initial = initialReply.data.item!;
  assert.deepEqual(
    Object.keys(initial).sort(),
    [...Object.keys(DEFAULT_SURVEY_SETTINGS), "updatedAt"].sort(),
  );
  pass(
    "TC-ALL-01/FR-100: mười vai trò, chỉ ADMIN/ĐBCL/PĐT/lãnh đạo đọc; chỉ ADMIN đã MFA có quyền ghi, DTO ngưỡng không cache",
  );

  const adminUser = await db.user.findUniqueOrThrow({
    where: { id: admin.id },
    include: { roles: true },
  });
  const limited = await db.$transaction((tx) =>
    createAuthenticatedSession(tx, adminUser, { ip }, "MFA_VERIFY", false),
  );
  const limitedToken = await tokensFor(
    limited.actor,
    limited.refreshToken,
    limited.refreshExpiresAt,
  );
  secrets.add(limitedToken.accessToken);
  const limitedClient = {
    ...admin,
    actor: limited.actor,
    access: limitedToken.accessToken,
  };
  assert.equal((await req("/api/survey-settings", limitedClient)).status, 401);
  assert.equal(
    (
      await req("/api/survey-settings", limitedClient, {
        ...DEFAULT_SURVEY_SETTINGS,
        expectedUpdatedAt: initial.updatedAt,
        stepUpCode: "123456",
      })
    ).status,
    401,
  );
  assert.equal(
    (await req("/api/survey-settings?minResponses=1", admin)).status,
    400,
  );
  pass(
    "BR-32: phiên ADMIN còn MFA_VERIFY không đọc/ghi cấu hình; query lạ bị từ chối",
  );

  const secret = newMfaSecret();
  secrets.add(secret);
  await db.totpCredential.create({
    data: {
      userId: admin.id,
      encryptedSecret: encryptMfaSecret(secret, admin.id),
      keyVersion: getMfaKeyVersion(),
      enabledAt: new Date(),
      lastUsedStep: null,
    },
  });
  for (const key of mfaRateKeys(admin.id, ip)) {
    assert.equal(
      await db.rateLimitBucket.count({ where: { keyHash: key } }),
      0,
    );
    rateKeys.add(key);
  }
  const baselineWrites = await countOwnSettingsAudit(),
    normal = {
      ...values(initial),
      expectedUpdatedAt: initial.updatedAt,
      stepUpCode: "123456",
    };
  for (const opts of [
    { csrf: false as const },
    { csrf: "invalid" },
    { origin: null },
    { origin: "https://outside.invalid" },
  ])
    assert.equal(
      (await req("/api/survey-settings", admin, normal, opts)).status,
      403,
    );
  const qualityCsrf = await req("/api/campaigns/csrf", quality);
  assert.equal(qualityCsrf.status, 200);
  assert(qualityCsrf.data.csrfToken);
  secrets.add(qualityCsrf.data.csrfToken);
  assert.equal(
    (
      await req("/api/survey-settings", admin, normal, {
        csrf: qualityCsrf.data.csrfToken,
      })
    ).status,
    403,
  );
  assert.equal(await countOwnSettingsAudit(), baselineWrites);
  assert.equal(
    (await db.totpCredential.findUniqueOrThrow({ where: { userId: admin.id } }))
      .lastUsedStep,
    null,
  );
  pass(
    "BR-34: Origin thiếu/sai và CSRF thiếu/sai/khác miền bị chặn trước tiêu thụ OTP hoặc ghi DB",
  );

  const invalid: Record<string, unknown>[] = [
    { minResponses: 0 },
    { minResponses: 1001 },
    { minResponses: 1.5 },
    { minRate: -0.1 },
    { minRate: 1.1 },
    { warningScore: 0.9 },
    { warningScore: 5.1 },
    { explanationDays: 0 },
    { explanationDays: 366 },
    { multiTeacherWarningThreshold: 1 },
    { multiTeacherWarningThreshold: 21 },
    { multiTeacherWarningThreshold: 2.5 },
    { expectedUpdatedAt: "not-a-date" },
    { minRate: "0.3" },
    { disableBlockers: true },
    { stepUpCode: "12345" },
  ];
  for (const extra of invalid)
    assert.equal(
      (await req("/api/survey-settings", admin, { ...normal, ...extra }))
        .status,
      400,
    );
  assert.equal(
    (await req("/api/survey-settings", admin, undefined, { raw: "{bad-json" }))
      .status,
    400,
  );
  assert.equal(
    (
      await req("/api/survey-settings", admin, normal, {
        contentType: "text/plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await req("/api/survey-settings", admin, undefined, {
        raw: JSON.stringify({ ...normal, text: "x".repeat(9000) }),
      })
    ).status,
    413,
  );
  assert.equal(await countOwnSettingsAudit(), baselineWrites);
  assert.equal(
    (await db.totpCredential.findUniqueOrThrow({ where: { userId: admin.id } }))
      .lastUsedStep,
    null,
  );
  pass(
    "FR-100/BR-52: biên ngưỡng, số nguyên, field thừa, JSON/Content-Type/8KiB; không cho tắt lỗi chặn, không ghi khi sai",
  );

  const epoch = Math.floor(Date.now() / 1000),
    stepUpCode = await generate({ secret, digits: 6, period: 30, epoch });
  secrets.add(stepUpCode);
  const newValues: SurveySettings = {
    minResponses: 7,
    minRate: 0.4567,
    warningScore: 2.75,
    explanationDays: 21,
    multiTeacherWarningThreshold: 3,
  };
  const saved = await req("/api/survey-settings", admin, {
    ...newValues,
    expectedUpdatedAt: initial.updatedAt,
    stepUpCode,
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(values(saved.data.item!), newValues);
  assert(saved.data.item!.updatedAt);
  assert.equal(
    (await db.totpCredential.findUniqueOrThrow({ where: { userId: admin.id } }))
      .lastUsedStep,
    BigInt(Math.floor(epoch / 30)),
  );
  assert.equal(await countOwnSettingsAudit(), baselineWrites + 1);
  const replay = await req("/api/survey-settings", admin, {
    ...newValues,
    minResponses: 8,
    expectedUpdatedAt: saved.data.item!.updatedAt,
    stepUpCode,
  });
  assert.equal(replay.status, 400);
  assert.equal(replay.data.code, "INVALID_MFA_CODE");
  assert.equal(await countOwnSettingsAudit(), baselineWrites + 1);
  assert.deepEqual(
    values((await req("/api/survey-settings", quality)).data.item!),
    newValues,
  );
  pass(
    "BR-32/FR-100: HTTP lưu bằng TOTP thật từ secret mã hóa, lastUsedStep đã tiêu thụ; replay cùng mã không ghi cấu hình",
  );

  const version = saved.data.item!.updatedAt;
  const contenders = await Promise.allSettled([
    setSurveySettings(admin.actor, {
      ...newValues,
      minRate: 0.41,
      expectedUpdatedAt: version,
    }),
    setSurveySettings(admin.actor, {
      ...newValues,
      minRate: 0.42,
      expectedUpdatedAt: version,
    }),
  ]);
  assert.equal(
    contenders.filter((item) => item.status === "fulfilled").length,
    1,
  );
  const rejected = contenders.find(
    (item) => item.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(rejected.reason.code, "SURVEY_SETTINGS_CONFLICT");
  assert.equal(rejected.reason.status, 409);
  const winning = await getSurveySettings(admin.actor);
  assert(winning.updatedAt && new Date(winning.updatedAt) > new Date(version!));
  assert.equal(await countOwnSettingsAudit(), baselineWrites + 2);
  await assert.rejects(
    setSurveySettings(admin.actor, {
      ...newValues,
      expectedUpdatedAt: version,
    }),
    { code: "SURVEY_SETTINGS_CONFLICT", status: 409 },
  );
  pass(
    "FR-100: hai phiên service cùng version chỉ một thắng CAS, timestamp tăng, lượt thua/stale không thêm audit",
  );

  const semester = await db.semester.create({
    data: {
      code: `${prefix}-HK`,
      name: "Học kỳ giả kiểm mặc định",
      startsOn: new Date("2026-09-30T00:00:00Z"),
      endsOn: new Date("2035-01-01T00:00:00Z"),
    },
  });
  semesterIds.push(semester.id);
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} mẫu giả`,
      createdById: quality.id,
      groups: {
        create: {
          title: "Nhóm giả",
          position: 1,
          weight: 1,
          questions: {
            create: {
              label: "Câu giả",
              type: "LIKERT",
              position: 1,
              required: true,
              allowNA: true,
              weight: 1,
              scaleMin: 1,
              scaleMax: 5,
            },
          },
        },
      },
    },
  });
  templateIds.push(template.id);
  const input = {
    title: `${prefix} Kiểm mặc định cấu hình`,
    semesterId: semester.id,
    templateId: template.id,
    scope: "GLOBAL",
    startsAt: new Date(Date.now() + 3600000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const campaign = await createCampaign(quality.actor, input);
  campaignIds.push(campaign.id);
  for (const key of [
    "minResponses",
    "minRate",
    "warningScore",
    "explanationDays",
  ] as const)
    assert.equal(campaign[key], winning[key]);
  const finalSettings = await setSurveySettings(admin.actor, {
    ...values(winning),
    minResponses: 9,
    expectedUpdatedAt: winning.updatedAt,
  });
  assert.equal(
    (await db.surveyCampaign.findUniqueOrThrow({ where: { id: campaign.id } }))
      .minResponses,
    winning.minResponses,
  );
  const second = await createCampaign(quality.actor, {
    ...input,
    title: `${prefix} Đợt tạo sau cấu hình mới`,
  });
  campaignIds.push(second.id);
  assert.equal(second.minResponses, 9);
  const course = await db.course.create({
    data: {
      code: `${prefix}-MH`,
      name: "Môn giả",
      credits: 3,
      departmentId: departmentIds[0],
    },
  });
  courseIds.push(course.id);
  const section = await db.courseSection.create({
    data: {
      code: `${prefix}-LHP`,
      semesterId: semester.id,
      courseId: course.id,
    },
  });
  sectionIds.push(section.id);
  const teacher2 = await createClient("GIANG_VIEN", 11, passwordHash),
    teacher3 = await createClient("GIANG_VIEN", 12, passwordHash);
  await db.teachingAssignment.createMany({
    data: [clients[1].id, teacher2.id, teacher3.id].map((teacherId, i) => ({
      teacherId,
      sectionId: section.id,
      isLead: i === 0,
    })),
  });
  await db.enrollment.create({
    data: { studentId: student.id, sectionId: section.id },
  });
  assert(
    (await getCampaignReadiness(quality.actor, campaign.id)).warnings.some(
      (warning) => warning.code === "RS-04",
    ),
  );
  await db.teachingAssignment.delete({
    where: {
      sectionId_teacherId: { sectionId: section.id, teacherId: teacher3.id },
    },
  });
  assert(
    !(await getCampaignReadiness(quality.actor, campaign.id)).warnings.some(
      (warning) => warning.code === "RS-04",
    ),
  );
  pass(
    "FR-100/142: đợt mới dùng ngưỡng đã lưu, đổi mặc định không sửa đợt cũ; RS-04 dùng ngưỡng3 với DB thật",
  );

  const audits = await db.auditLog.findMany({
    where: { actorId: admin.id, action: "SURVEY_SETTINGS_CHANGED" },
    orderBy: { occurredAt: "asc" },
  });
  assert.equal(audits.length, baselineWrites + 3);
  for (const audit of audits) {
    assert.equal(audit.objectType, "SystemSetting");
    assert.equal(audit.objectId, SURVEY_SETTINGS_KEY);
    const summary = audit.redactedSummary as Prisma.JsonObject;
    assert.deepEqual(Object.keys(summary).sort(), [
      "after",
      "before",
      "success",
    ]);
    assert.equal(summary.success, true);
    assert.deepEqual(
      Object.keys(summary.after as object).sort(),
      Object.keys(DEFAULT_SURVEY_SETTINGS).sort(),
    );
  }
  const auditReply = await req(
    `/api/admin/audit?action=SURVEY_SETTINGS_CHANGED&actorId=${admin.id}`,
    admin,
  );
  assert.equal(auditReply.status, 200);
  assert.equal(auditReply.data.items!.length, 3);
  for (const secretValue of secrets)
    assert(!JSON.stringify(auditReply.data).includes(secretValue));
  pass(
    "BR-30: audit DB và API chỉ có trước/sau năm ngưỡng, không secret/TOTP/JWT/CSRF hoặc nội dung khảo sát",
  );

  const originalAdminGrant = await db.roleAssignment.findFirstOrThrow({
    where: { userId: admin.id, role: "ADMIN" },
  });
  await db.roleAssignment.delete({ where: { id: originalAdminGrant.id } });
  assert.equal((await req("/api/survey-settings", admin)).status, 403);
  assert.equal(
    (
      await req("/api/survey-settings", admin, {
        ...values(finalSettings),
        expectedUpdatedAt: finalSettings.updatedAt,
        stepUpCode: "123456",
      })
    ).status,
    403,
  );
  await assert.rejects(
    setSurveySettings(admin.actor, {
      ...values(finalSettings),
      expectedUpdatedAt: finalSettings.updatedAt,
    }),
    { status: 403 },
  );
  await db.roleAssignment.create({ data: originalAdminGrant });
  await db.userSession.update({
    where: { id: admin.actor.sessionId },
    data: { revokedAt: new Date() },
  });
  assert.equal((await req("/api/survey-settings", admin)).status, 401);
  await assert.rejects(
    setSurveySettings(admin.actor, {
      ...values(finalSettings),
      expectedUpdatedAt: finalSettings.updatedAt,
    }),
    { status: 401 },
  );
  pass(
    "BR-34: actor/JWT cũ mất quyền ngay khi role ADMIN hoặc phiên bị thu hồi; service không tin mfa/roles đối số",
  );

  const noticeUsers = [];
  for (const [kind, status] of [
    ["pending", "PENDING_ACTIVATION"],
    ["disabled", "DISABLED"],
    ["bademail", "ACTIVE"],
  ] as const) {
    const user = await db.user.create({
      data: {
        loginCode: `${prefix}-${kind}`,
        email:
          kind === "bademail"
            ? `${prefix}-invalid`
            : `${prefix.toLowerCase()}-${kind}@fixture.invalid`,
        displayName: "SV giả kiểm hàng đợi",
        passwordHash: null,
        status: status as UserStatus,
        mustChangePassword: true,
        roles: {
          create: {
            role: "SINH_VIEN",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
          },
        },
      },
    });
    userIds.push(user.id);
    noticeUsers.push(user);
  }
  const [pending, disabled, bademail] = noticeUsers;
  const noticeCount = await fixtureNotice(campaign.id, "delivery", [
    student.id,
    pending.id,
    student.id,
  ]);
  assert.equal(noticeCount.queued, 2);
  assert.equal(
    (await fixtureNotice(campaign.id, "delivery", [pending.id, student.id]))
      .queued,
    0,
  );
  const otherNotice = await db.notification.create({
    data: {
      userId: student.id,
      title: `${prefix} loại khác`,
      body: "Chỉ fixture kiểm giới hạn worker",
      targetType: "FixtureOther",
      targetId: campaign.id,
      email: {
        create: {
          idempotencyKey: `${prefix}:other`,
          nextAttemptAt: new Date(),
        },
      },
    },
    include: { email: true },
  });
  const firstDispatch = await dispatch();
  assert.equal(firstDispatch.claimed, 2);
  assert.equal(firstDispatch.sent, 2);
  assert.equal(firstDispatch.failed, 0);
  assert.equal(
    (
      await db.emailOutbox.findUniqueOrThrow({
        where: { notificationId: otherNotice.id },
      })
    ).status,
    "PENDING",
  );
  assert.equal((await dispatch()).claimed, 0);
  const mailbox = await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100", {
      signal: AbortSignal.timeout(5000),
    })
  ).json();
  const deliveryMails = mailbox.messages.filter(
    (mail: { Subject: string; To: { Address: string }[] }) =>
      mail.Subject === `${prefix} delivery`,
  );
  assert.equal(deliveryMails.length, 2);
  assert(
    deliveryMails.some((mail: { To: { Address: string }[] }) =>
      mail.To.some((entry) => entry.Address === pending.email),
    ),
  );
  pass(
    "FR-45/144: queue DB thật dedupe hai người/sự kiện, worker gửi Mailpit gồm pending và bỏ qua loại khác; chạy lại không gửi thêm",
  );

  await fixtureNotice(campaign.id, "retry", [student.id]);
  const smtpPort = process.env.SMTP_PORT;
  process.env.SMTP_PORT = "1";
  try {
    const failed = await dispatch();
    assert.equal(failed.claimed, 1);
    assert.equal(failed.failed, 1);
    assert.equal(failed.sent, 0);
  } finally {
    if (smtpPort === undefined) delete process.env.SMTP_PORT;
    else process.env.SMTP_PORT = smtpPort;
  }
  const retryRow = await db.emailOutbox.findUniqueOrThrow({
    where: { idempotencyKey: `${prefix}:retry:${student.id}` },
  });
  assert.equal(retryRow.status, "FAILED");
  assert.equal(retryRow.attempts, 1);
  assert(retryRow.nextAttemptAt > new Date());
  assert.equal(retryRow.sentAt, null);
  assert.equal(retryRow.leaseToken, null);
  assert.equal((await dispatch()).claimed, 0);
  await db.emailOutbox.update({
    where: { id: retryRow.id },
    data: { nextAttemptAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await dispatch()).sent, 1);
  assert.equal(
    (await db.emailOutbox.findUniqueOrThrow({ where: { id: retryRow.id } }))
      .attempts,
    2,
  );
  pass(
    "Queue thật: SMTP hỏng ghi FAILED và backoff, chưa đến hạn không thử; đến hạn gửi lại thành công, không báo SENT giả",
  );

  await fixtureNotice(campaign.id, "lease", [student.id]);
  const leaseRow = await db.emailOutbox.findUniqueOrThrow({
    where: { idempotencyKey: `${prefix}:lease:${student.id}` },
  });
  await db.emailOutbox.update({
    where: { id: leaseRow.id },
    data: {
      status: "PROCESSING",
      attempts: 4,
      leaseToken: randomUUID(),
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  const workers = await Promise.all([dispatch(), dispatch()]);
  assert.equal(
    workers.reduce((sum, item) => sum + item.claimed, 0),
    1,
  );
  assert.equal(
    workers.reduce((sum, item) => sum + item.sent, 0),
    1,
  );
  const deliveredLease = await db.emailOutbox.findUniqueOrThrow({
    where: { id: leaseRow.id },
  });
  assert.equal(deliveredLease.status, "SENT");
  assert.equal(deliveredLease.attempts, 5);
  await fixtureNotice(campaign.id, "exhausted", [student.id]);
  const exhausted = await db.emailOutbox.findUniqueOrThrow({
    where: { idempotencyKey: `${prefix}:exhausted:${student.id}` },
  });
  await db.emailOutbox.update({
    where: { id: exhausted.id },
    data: {
      status: "PROCESSING",
      attempts: 5,
      leaseToken: randomUUID(),
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  assert.equal((await dispatch()).claimed, 0);
  assert.deepEqual(
    await db.emailOutbox.findUniqueOrThrow({
      where: { id: exhausted.id },
      select: {
        status: true,
        attempts: true,
        leaseToken: true,
        leaseUntil: true,
        sentAt: true,
      },
    }),
    {
      status: "FAILED",
      attempts: 5,
      leaseToken: null,
      leaseUntil: null,
      sentAt: null,
    },
  );
  await fixtureNotice(campaign.id, "permanent", [disabled.id, bademail.id]);
  const permanent = await dispatch();
  assert.equal(permanent.claimed, 2);
  assert.equal(permanent.failed, 2);
  assert.equal(permanent.sent, 0);
  const permanentRows = await db.emailOutbox.findMany({
    where: { idempotencyKey: { startsWith: `${prefix}:permanent:` } },
  });
  assert(
    permanentRows.every(
      (row) =>
        row.status === "FAILED" && row.attempts === 5 && row.sentAt === null,
    ),
  );
  pass(
    "Queue thật: hai worker chỉ một claim lease hết hạn, hết5lần không kẹt PROCESSING, disabled/email sai kết thúc FAILED",
  );

  const log = readFileSync(".local/week7-settings-http.log", "utf8"),
    auditsText = JSON.stringify(
      await db.auditLog.findMany({
        where: {
          OR: [
            { actorId: { in: userIds } },
            { id: { in: [...dispatchAuditIds] } },
          ],
        },
      }),
    );
  for (const secretValue of secrets) {
    assert(!log.includes(secretValue), "Log HTTP không chứa secret fixture");
    assert(
      !auditsText.includes(secretValue),
      "Audit không chứa secret fixture",
    );
  }
  assert(!auditsText.includes(`${prefix} Nội dung thông báo giả`));
  outcome = "passed";
  pass(
    "BR-30: log HTTP/audit không có mật khẩu, secret, OTP, token hoặc nội dung thông báo",
  );
  console.log(
    `HTTP/MySQL/Mailpit Tuần7 cấu hình/queue: ${cases.length}/${cases.length} nhóm qua.`,
  );
} catch (error) {
  outcome = "failed";
  process.exitCode = 1;
  const message = error instanceof Error ? error.message : "Lỗi chưa xác định";
  console.error(
    `KHÔNG QUA W7-settings sau ${cases.length} nhóm (${current}): ${[...secrets].some((value) => message.includes(value)) ? "Chi tiết có bí mật được ẩn" : message.slice(0, 350)}`,
  );
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
      const createdUsers = await db.user.findMany({
        where: { loginCode: { startsWith: prefix } },
        select: { id: true },
      });
      userIds.push(...createdUsers.map((row) => row.id));
      const createdCampaigns = await db.surveyCampaign.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      campaignIds.push(...createdCampaigns.map((row) => row.id));
      const createdTemplates = await db.surveyTemplate.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      templateIds.push(...createdTemplates.map((row) => row.id));
      await db.$transaction(
        async (tx) => {
          await lockAdminMutations(tx);
          if (settingsSnapshotTaken) {
            const stored = await tx.systemSetting.findUnique({
              where: { key: SURVEY_SETTINGS_KEY },
            });
            assert(
              !stored ||
                userIds.includes(stored.updatedById ?? "") ||
                JSON.stringify(stored) === JSON.stringify(originalSettings),
              "Không ghi đè cấu hình do phiên khác vừa đổi",
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
            } else if (stored)
              await tx.systemSetting.delete({
                where: { key: SURVEY_SETTINGS_KEY },
              });
          }
          await tx.auditLog.deleteMany({
            where: {
              OR: [
                { actorId: { in: userIds } },
                { objectId: { in: campaignIds } },
                { id: { in: [...dispatchAuditIds] } },
              ],
            },
          });
          await tx.emailOutbox.deleteMany({
            where: { notification: { userId: { in: userIds } } },
          });
          await tx.notification.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.campaignDataConfirmation.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.campaignHistory.deleteMany({
            where: { campaignId: { in: campaignIds } },
          });
          await tx.surveyTask.deleteMany({
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
          await tx.enrollment.deleteMany({
            where: { sectionId: { in: sectionIds } },
          });
          await tx.teachingAssignment.deleteMany({
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
          await tx.authToken.deleteMany({ where: { userId: { in: userIds } } });
          await tx.userSession.updateMany({
            where: { userId: { in: userIds } },
            data: { rotatedFromId: null },
          });
          await tx.userSession.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: userIds } },
          });
          await tx.user.deleteMany({ where: { id: { in: userIds } } });
          await tx.department.deleteMany({
            where: { id: { in: departmentIds } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: facultyIds } } });
          await tx.rateLimitBucket.deleteMany({
            where: { keyHash: { in: [...rateKeys] } },
          });
        },
        { timeout: 30000 },
      );
      assert.equal(await db.user.count({ where: { id: { in: userIds } } }), 0);
      assert.equal(
        await db.surveyCampaign.count({ where: { id: { in: campaignIds } } }),
        0,
      );
      assert.deepEqual(
        await db.systemSetting.findUnique({
          where: { key: SURVEY_SETTINGS_KEY },
        }),
        originalSettings,
      );
      cleaned = true;
    } catch (error) {
      outcome = "failed";
      process.exitCode = 1;
      console.error(
        `Không dọn xong fixture settings Tuần7: ${error instanceof Error ? error.name : "DB"}`,
      );
    }
  if (verified) save();
  await db.$disconnect();
}
