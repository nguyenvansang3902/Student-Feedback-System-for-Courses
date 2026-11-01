import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import { issueFeedbackCsrf } from "../src/server/auth/csrf";

// Chỉ dùng database có marker riêng đã đối chiếu trước khi getDb hoặc tạo fixture.
const marker = JSON.parse(
  readFileSync(".local/week10-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK10_TEST_DATABASE_URL ?? "");
assert(
  main.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(main.hostname),
);
assert(
  marker.purpose === "isolated-week10-tests" &&
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
  test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w10test_`) &&
    /_[a-f0-9]{8}$/.test(test.pathname),
);
for (const key of [
  "SHADOW_DATABASE_URL",
  "W4_TEST_DATABASE_URL",
  "TOTP60_TEST_DATABASE_URL",
])
  if (process.env[key])
    assert(test.pathname !== new URL(process.env[key]!).pathname);
process.env.DATABASE_URL = test.href;
const origin = "http://127.0.0.1:3010";
process.env.APP_URL = origin;
process.env.FEEDBACK_STORAGE_DIR = ".local/week10-test-attachments";
const db = getDb(),
  prefix = `W10${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const users: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  semesters: string[] = [],
  courses: string[] = [],
  sections: string[] = [],
  feedbackIds: string[] = [];
const cases: string[] = [];
type Client = {
  id: string;
  actor: AuthActor;
  access: string;
  csrf: string;
  login: string;
  email: string;
};
let child: ReturnType<typeof spawn> | undefined,
  fd: number | undefined,
  verified = false,
  cleaned = false,
  passed = false,
  finished = false;
let settingsBefore: Awaited<ReturnType<typeof db.systemSetting.findUnique>> =
  null;
let concurrent:
  { requests: number; succeeded: number; conflicts: number } | undefined;
const settingsKey = "FEEDBACK_SETTINGS";
function save() {
  writeFileSync(
    ".local/week10-http-result.json",
    JSON.stringify(
      {
        status: passed ? "passed" : finished ? "failed" : "running",
        cases,
        passed: cases.length,
        concurrent,
        cleaned,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
function pass(name: string) {
  cases.push(name);
  console.log(
    `QUA W10-HTTP-${cases.length.toString().padStart(2, "0")} ${name}`,
  );
  save();
}
async function request(
  path: string,
  client?: Client,
  body?: unknown,
  opts: { origin?: string | null; csrf?: boolean; form?: FormData } = {},
) {
  const post = body !== undefined || !!opts.form;
  const response = await fetch(origin + path, {
    method: post ? "POST" : "GET",
    headers: {
      ...(post
        ? {
            ...(opts.origin === null ? {} : { origin: opts.origin ?? origin }),
            ...(!opts.form ? { "content-type": "application/json" } : {}),
          }
        : {}),
      ...(client
        ? {
            cookie: `sfs_access=${client.access}`,
            ...(opts.csrf === false ? {} : { "x-csrf-token": client.csrf }),
          }
        : {}),
    },
    body: opts.form ?? (post ? JSON.stringify(body) : undefined),
    redirect: "manual",
    signal: AbortSignal.timeout(90_000),
  });
  const data: Record<string, unknown> = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : {};
  return { response, status: response.status, data };
}
function ok(result: Awaited<ReturnType<typeof request>>, status = 200) {
  assert.equal(
    result.status,
    status,
    `HTTP ${result.status} ${result.data.code ?? ""}`,
  );
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  return result.data;
}
type Item = {
  id: string;
  revision: number;
  status: string;
  inspectionCaseId?: string;
};
const item = (data: Record<string, unknown>) => data.item as Item;
async function client(
  role: Role,
  index: number,
  passwordHash: string,
  extra?: Role,
): Promise<Client> {
  const scope =
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
  const u = await db.user.create({
    data: {
      loginCode: `${prefix}-${users.length}`,
      email: `${prefix.toLowerCase()}-${users.length}@fixture.invalid`,
      displayName: `${prefix} ${role}`,
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
  users.push(u.id);
  const issued = await db.$transaction((tx) =>
    createAuthenticatedSession(
      tx,
      u,
      { ip: "week10-fixture" },
      "FULL",
      role === "ADMIN" || extra === "ADMIN",
    ),
  );
  const tokens = await tokensFor(
    issued.actor,
    issued.refreshToken,
    issued.refreshExpiresAt,
  );
  return {
    id: u.id,
    actor: issued.actor,
    access: tokens.accessToken,
    csrf: role === "ADMIN" ? "" : issueFeedbackCsrf(issued.actor),
    login: u.loginCode,
    email: u.email,
  };
}
async function create(
  c: Client,
  category = "GIANG_DAY",
  extra: Record<string, unknown> = {},
) {
  const data = ok(
    await request("/api/feedback", c, {
      sectionId: sections[0],
      category,
      severity: category === "KHIEU_NAI_NGHIEM_TRONG" ? "KHIEU_NAI" : "GOP_Y",
      title: `${prefix} Nội dung ${category}`,
      body: "Nội dung giả phục vụ kiểm thử phản hồi môn học.",
      isAnonymous: true,
      requestId: randomUUID(),
      ...extra,
    }),
    201,
  );
  const value = item(data);
  feedbackIds.push(value.id);
  return value;
}
async function current(id: string) {
  return item(ok(await request(`/api/feedback/${id}`, student)));
}
async function transition(
  c: Client,
  id: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const revision = (await current(id)).revision;
  return request(`/api/feedback/${id}/transition`, c, {
    action,
    revision,
    requestId: randomUUID(),
    ...extra,
  });
}
let student: Client;
try {
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  verified = true;
  settingsBefore = await db.systemSetting.findUnique({
    where: { key: settingsKey },
  });
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", () =>
      reject(
        new Error(
          "Cổng kiểm thử 3010 đang được sử dụng; dừng trước mọi yêu cầu HTTP.",
        ),
      ),
    );
    probe.listen(3010, "127.0.0.1", () =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
  });
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week10-http.log", "w");
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3010",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "development",
        SFS_TEST_DIST_DIR: ".next-week10",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  for (let i = 0; i < 90; i++) {
    assert.equal(child.exitCode, null);
    try {
      if (
        (
          await fetch(origin + "/api/health", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        break;
    } catch {}
    if (i === 89) throw new Error("Máy chủ chưa sẵn sàng");
    await delay(1000);
  }
  for (let i = 0; i < 2; i++) {
    const f = await db.faculty.create({
      data: { code: `${prefix}-F${i}`, name: `Khoa giả ${i}` },
    });
    faculties.push(f.id);
    const d = await db.department.create({
      data: {
        code: `${prefix}-D${i}`,
        name: `Bộ môn giả ${i}`,
        facultyId: f.id,
      },
    });
    departments.push(d.id);
    const c = await db.course.create({
      data: {
        code: `${prefix}-C${i}`,
        name: `Môn giả ${i}`,
        credits: 3,
        departmentId: d.id,
      },
    });
    courses.push(c.id);
  }
  const now = Date.now(),
    day = 86400000;
  for (let i = 0; i < 3; i++) {
    const s = await db.semester.create({
      data: {
        code: `${prefix}-S${i}`,
        name: `Học kỳ giả ${i}`,
        startsOn: new Date(now - (10 + 120 * i) * day),
        endsOn: new Date(now + (100 - 120 * i) * day),
      },
    });
    semesters.push(s.id);
    const sec = await db.courseSection.create({
      data: { code: `${prefix}-L${i}`, semesterId: s.id, courseId: courses[0] },
    });
    sections.push(sec.id);
  }
  const other = await db.courseSection.create({
    data: {
      code: `${prefix}-OTHER`,
      semesterId: semesters[0],
      courseId: courses[1],
    },
  });
  sections.push(other.id);
  const pw = await hash("KiemThu2026!TuanMuoi", 12);
  student = await client("SINH_VIEN", 0, pw);
  const stranger = await client("SINH_VIEN", 0, pw),
    seriousStudent = await client("SINH_VIEN", 0, pw),
    teacher = await client("GIANG_VIEN", 0, pw),
    teacherOther = await client("GIANG_VIEN", 1, pw),
    head = await client("TRUONG_BO_MON", 0, pw),
    facultyHead = await client("TRUONG_KHOA", 0, pw),
    quality = await client("CAN_BO_DBCL", 0, pw),
    training = await client("PHONG_DAO_TAO", 0, pw),
    exam = await client("PHONG_KHAO_THI", 0, pw),
    inspector = await client("THANH_TRA", 0, pw),
    leader = await client("LANH_DAO", 0, pw),
    admin = await client("ADMIN", 0, pw);
  const conflictedTeacher = await client("GIANG_VIEN", 0, pw, "THANH_TRA"),
    conflictedHead = await client("TRUONG_BO_MON", 0, pw, "THANH_TRA"),
    conflictedFaculty = await client("TRUONG_KHOA", 0, pw, "THANH_TRA");
  await db.teachingAssignment.createMany({
    data: [
      ...sections.slice(0, 3).flatMap((sectionId) => [
        { sectionId, teacherId: teacher.id, isLead: true },
        { sectionId, teacherId: conflictedTeacher.id },
      ]),
      { sectionId: other.id, teacherId: teacherOther.id, isLead: true },
    ],
  });
  await db.enrollment.createMany({
    data: sections
      .slice(0, 3)
      .map((sectionId) => ({ sectionId, studentId: student.id })),
  });
  await db.enrollment.create({
    data: { sectionId: sections[0], studentId: seriousStudent.id },
  });
  assert.equal((await request("/api/feedback")).status, 401);
  assert.equal(
    (
      await request(
        "/api/feedback",
        student,
        {},
        { origin: "https://wrong.invalid" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/feedback", student, {}, { csrf: false })).status,
    403,
  );
  assert.equal(
    (await request("/api/feedback?view=mine&view=queue", student)).status,
    400,
  );
  assert.equal(
    (await request("/api/feedback?authorId=" + student.id, teacher)).status,
    400,
  );
  assert.equal((await request("/api/feedback", admin)).status, 403);
  pass("BR-18/30/34: phiên, Origin, CSRF, tham số và ADMIN bị chặn");
  const options = ok(await request("/api/feedback/options", student));
  assert(!JSON.stringify(options).includes(stranger.email));
  const feedback = await create(student);
  const retried = await request("/api/feedback", student, {
    sectionId: other.id,
    category: "GIANG_DAY",
    severity: "GOP_Y",
    title: "Không thuộc lớp",
    body: "Nội dung kiểm thử ngoài phạm vi.",
    isAnonymous: true,
    requestId: randomUUID(),
  });
  assert.equal(retried.status, 403);
  assert.equal(
    (await request(`/api/feedback/${feedback.id}`, stranger)).status,
    404,
  );
  assert.equal(
    (await request(`/api/feedback/${feedback.id}`, teacherOther)).status,
    404,
  );
  assert.equal(
    (await request(`/api/feedback/${feedback.id}`, facultyHead)).status,
    404,
  );
  const teacherDetail = ok(
    await request(`/api/feedback/${feedback.id}`, teacher),
  );
  for (const value of [
    student.id,
    student.login,
    student.email,
    student.actor.displayName,
  ])
    assert(!JSON.stringify(teacherDetail).includes(value));
  pass(
    "BR-20/24/34: đúng đăng ký, IDOR404 và DTO ẩn danh không chứa danh tính",
  );
  const createRequest = {
    sectionId: sections[0],
    category: "GIANG_DAY",
    severity: "GOP_Y",
    title: `${prefix} Gửi lại cùng yêu cầu`,
    body: "Nội dung giả để kiểm tra gửi lại không tạo bản trùng.",
    isAnonymous: true,
    requestId: randomUUID(),
  };
  const createdOnce = item(
    ok(await request("/api/feedback", student, createRequest), 201),
  );
  feedbackIds.push(createdOnce.id);
  const sameCreate = item(
    ok(await request("/api/feedback", student, createRequest), 201),
  );
  assert.equal(sameCreate.id, createdOnce.id);
  assert.equal(
    await db.feedback.count({
      where: { authorId: student.id, requestId: createRequest.requestId },
    }),
    1,
  );
  assert.equal(
    (
      await request("/api/feedback", student, {
        ...createRequest,
        title: `${prefix} Nội dung đã đổi`,
      })
    ).status,
    409,
  );
  pass(
    "BR-22/30: retry tạo phản hồi trả cùng ID, đổi nội dung cùng requestId bị chặn",
  );
  const longBody = "ệ".repeat(10000);
  const longFeedback = await create(student, "KHAC", {
    title: `${prefix} Nội dung tiếng Việt dài`,
    body: longBody,
  });
  assert.equal(
    (
      await db.feedback.findUniqueOrThrow({
        where: { id: longFeedback.id },
        select: { body: true },
      })
    ).body,
    longBody,
  );
  assert.equal(
    (
      await request("/api/feedback", student, {
        ...createRequest,
        body: longBody + "ệ",
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/feedback", student, {
        ...createRequest,
        authorId: stranger.id,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/feedback?extra=1", student, {
        ...createRequest,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  pass(
    "FR-70/BR-34: nội dung 10.000 ký tự tiếng Việt đi qua HTTP; từ chối quá dài và khóa lạ",
  );
  const routing: [string, Client[]][] = [
    ["NOI_DUNG_DE_CUONG", [head]],
    ["TAI_LIEU", [teacher]],
    ["KIEM_TRA_DANH_GIA", [teacher, head]],
    ["THI_KET_THUC_HOC_PHAN", [exam]],
    ["TO_CHUC_LOP_HOC", [training]],
    ["KHAC", [quality]],
  ];
  for (const [category, receivers] of routing) {
    const f = await create(student, category);
    for (const receiver of receivers)
      ok(await request(`/api/feedback/${f.id}`, receiver));
    if (category === "KIEM_TRA_DANH_GIA")
      assert.equal((await request(`/api/feedback/${f.id}`, exam)).status, 404);
  }
  const complaint = await create(student, "GIANG_DAY", {
    severity: "KHIEU_NAI",
  });
  ok(await request(`/api/feedback/${complaint.id}`, head));
  pass("BR-21/55/56: đủ bảy tuyến thường và khiếu nại đồng gửi trưởng bộ môn");
  for (const receiver of [teacher, head, training, exam, quality]) {
    const queue = ok(
      await request("/api/feedback?view=queue&page=1&pageSize=20", receiver),
    );
    const serialized = JSON.stringify(queue);
    for (const value of [
      student.id,
      student.login,
      student.email,
      student.actor.displayName,
    ])
      assert(!serialized.includes(value));
  }
  assert.equal(
    (await request("/api/feedback?view=queue", student)).status,
    403,
  );
  assert.equal((await request("/api/feedback?view=mine", teacher)).status, 403);
  pass(
    "BR-24/34: hàng đợi năm vai trò không chứa định danh; không đổi view để vượt quyền",
  );
  const action = {
    action: "accept",
    revision: feedback.revision,
    requestId: randomUUID(),
  };
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      request(`/api/feedback/${feedback.id}/transition`, teacher, {
        ...action,
        requestId: randomUUID(),
      }),
    ),
  );
  concurrent = {
    requests: results.length,
    succeeded: results.filter((r) => r.status === 200).length,
    conflicts: results.filter((r) => r.status === 409).length,
  };
  assert.equal(concurrent.succeeded, 1);
  assert.equal(concurrent.conflicts, 7);
  assert.equal(
    await db.feedbackHistory.count({
      where: { feedbackId: feedback.id, event: "TIEP_NHAN" },
    }),
    1,
  );
  ok(await transition(teacher, feedback.id, "start"));
  assert.equal(
    (
      await transition(student, feedback.id, "answer", {
        body: "Không đủ quyền",
      })
    ).status,
    403,
  );
  const messageId = randomUUID(),
    revision = (await current(feedback.id)).revision;
  const message = {
    body: "Sinh viên bổ sung nội dung giả.",
    revision,
    requestId: messageId,
  };
  ok(await request(`/api/feedback/${feedback.id}/messages`, student, message));
  ok(await request(`/api/feedback/${feedback.id}/messages`, student, message));
  assert.equal(
    await db.feedbackMessage.count({
      where: { feedbackId: feedback.id, requestId: messageId },
    }),
    1,
  );
  ok(
    await transition(teacher, feedback.id, "answer", {
      body: "Giảng viên đã kiểm tra và trả lời nội dung giả.",
    }),
  );
  const studentView = ok(
    await request(`/api/feedback/${feedback.id}`, student),
  );
  assert(JSON.stringify(studentView).includes("Giảng viên đã kiểm tra"));
  ok(await transition(student, feedback.id, "close"));
  assert.equal((await transition(teacher, feedback.id, "start")).status, 409);
  pass(
    "BR-22: tám lệnh đồng thời một chuyển; trao đổi retry, trả lời, đóng và chặn sai trạng thái",
  );
  const forward = await create(student);
  assert.equal(
    (
      await transition(teacher, forward.id, "forward", {
        targetUserId: quality.id,
      })
    ).status,
    400,
  );
  const forwardInput = {
    action: "forward",
    revision: forward.revision,
    requestId: randomUUID(),
    targetUserId: quality.id,
    reason: "Nội dung cần đơn vị Đảm bảo chất lượng xử lý.",
  };
  const receipt = ok(
    await request(
      `/api/feedback/${forward.id}/transition`,
      teacher,
      forwardInput,
    ),
  );
  assert.equal((receipt.item as { forwarded: boolean }).forwarded, true);
  const receiptAgain = ok(
    await request(
      `/api/feedback/${forward.id}/transition`,
      teacher,
      forwardInput,
    ),
  );
  assert.deepEqual(receiptAgain.item, receipt.item);
  assert.equal(
    await db.feedbackHistory.count({
      where: { feedbackId: forward.id, event: "CHUYEN_TIEP" },
    }),
    1,
  );
  assert.equal(
    (
      await request(`/api/feedback/${forward.id}/transition`, teacher, {
        ...forwardInput,
        reason: "Cùng requestId nhưng thay đổi lý do chuyển tiếp.",
      })
    ).status,
    409,
  );
  assert.equal((await current(forward.id)).status, "MOI");
  ok(await request(`/api/feedback/${forward.id}`, quality));
  assert.equal(
    (await request(`/api/feedback/${forward.id}`, teacher)).status,
    404,
  );
  assert.equal((await transition(teacher, forward.id, "accept")).status, 404);
  assert.equal(
    (
      await request(`/api/feedback/${forward.id}/messages`, teacher, {
        body: "Người cũ không được gửi trao đổi nữa.",
        revision: (await current(forward.id)).revision,
        requestId: randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal((await transition(quality, forward.id, "reject")).status, 400);
  ok(
    await transition(quality, forward.id, "reject", {
      reason: "Nội dung giả nằm ngoài phạm vi tiếp nhận.",
    }),
  );
  pass(
    "BR-21/22: chuyển tiếp về MỚI, thu hồi quyền người nhận cũ; chuyển và từ chối bắt buộc lý do",
  );
  const prior = await create(student, "KHAC", { sectionId: sections[1] });
  assert(prior.id);
  assert.equal(
    (
      await request("/api/feedback", student, {
        sectionId: sections[2],
        category: "KHAC",
        severity: "GOP_Y",
        title: "Kỳ quá cũ",
        body: "Nội dung kiểm thử kỳ cũ.",
        requestId: randomUUID(),
        isAnonymous: true,
      })
    ).status,
    403,
  );
  await db.semester.update({
    where: { id: semesters[0] },
    data: { lockedAt: new Date() },
  });
  assert.equal(
    (
      await request("/api/feedback", student, {
        sectionId: sections[0],
        category: "KHAC",
        severity: "GOP_Y",
        title: "Kỳ đã khóa",
        body: "Nội dung kiểm thử khóa kỳ.",
        requestId: randomUUID(),
        isAnonymous: true,
      })
    ).status,
    409,
  );
  const lockedRead = ok(
    await request(`/api/feedback/${createdOnce.id}`, student),
  );
  assert.deepEqual(
    (lockedRead.item as { allowedActions: string[] }).allowedActions,
    [],
  );
  assert.equal(
    (
      await request(`/api/feedback/${createdOnce.id}/messages`, student, {
        body: "Không được ghi vào kỳ đã khóa.",
        revision: createdOnce.revision,
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  await db.semester.update({
    where: { id: semesters[0] },
    data: { lockedAt: null },
  });
  pass("BR-17/20: học kỳ hiện hành/liền trước và khóa kỳ được kiểm ở máy chủ");
  const settings = item(
    ok(await request("/api/feedback/settings", quality)),
  ) as unknown as {
    examNotice: string;
    allowPreviousSemester: boolean;
    revision: number;
  };
  const customNotice =
    "Lời nhắc giả: phản hồi thi không thay thế thủ tục phúc khảo chính thức.";
  const settingsInput = {
    ...settings,
    examNotice: customNotice,
    allowPreviousSemester: false,
    requestId: randomUUID(),
  };
  const changedSettings = item(
    ok(await request("/api/feedback/settings", quality, settingsInput)),
  ) as unknown as { revision: number };
  ok(await request("/api/feedback/settings", quality, settingsInput));
  assert.equal(
    (
      ok(await request("/api/feedback/options", student)).item as {
        examNotice: string;
      }
    ).examNotice,
    customNotice,
  );
  assert.equal(
    (
      await request("/api/feedback", student, {
        sectionId: sections[1],
        category: "KHAC",
        severity: "GOP_Y",
        title: "Kỳ trước đang tắt",
        body: "Nội dung kiểm thử cấu hình học kỳ liền trước.",
        requestId: randomUUID(),
        isAnonymous: true,
      })
    ).status,
    403,
  );
  assert.equal((await request("/api/feedback/settings", teacher)).status, 403);
  ok(
    await request("/api/feedback/settings", quality, {
      examNotice: customNotice,
      allowPreviousSemester: true,
      revision: changedSettings.revision,
      requestId: randomUUID(),
    }),
  );
  pass(
    "BR-20/56: ĐBCL cấu hình lời nhắc phúc khảo và cửa sổ học kỳ; vai trò khác không sửa",
  );
  assert.equal(
    (
      await request("/api/feedback", seriousStudent, {
        sectionId: sections[0],
        category: "KHIEU_NAI_NGHIEM_TRONG",
        severity: "KHIEU_NAI",
        title: "Chưa xác nhận cảnh báo",
        body: "Nội dung giả khiếu nại chưa xác nhận.",
        isAnonymous: true,
        violation: "KHAC_NGHIEM_TRONG",
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  const serious = await create(seriousStudent, "KHIEU_NAI_NGHIEM_TRONG", {
    violation: "GAY_AP_LUC_KHI_KHAO_SAT",
    identityLevel: "AN_DANH_HOAN_TOAN",
    acknowledgedSerious: true,
  });
  const inspection = await db.inspectionCase.findUniqueOrThrow({
    where: { feedbackId: serious.id },
  });
  assert.equal(inspection.status, "TIEP_NHAN");
  for (const c of [
    conflictedTeacher,
    conflictedHead,
    conflictedFaculty,
    admin,
    quality,
  ])
    assert.equal(
      (await request(`/api/inspection-cases/${inspection.id}`, c)).status,
      c === admin || c === quality ? 403 : 404,
    );
  const inspectionView = ok(
    await request(`/api/inspection-cases/${inspection.id}`, inspector),
  );
  for (const value of [
    seriousStudent.id,
    seriousStudent.email,
    seriousStudent.login,
    seriousStudent.actor.displayName,
  ])
    assert(!JSON.stringify(inspectionView).includes(value));
  const summary = ok(
    await request(`/api/inspection-cases/${inspection.id}`, leader),
  );
  for (const value of [
    seriousStudent.id,
    "Nội dung giả phục vụ kiểm thử",
    seriousStudent.email,
    seriousStudent.login,
  ])
    assert(!JSON.stringify(summary).includes(value));
  assert(
    (await db.auditLog.count({
      where: { objectId: inspection.id, actorId: inspector.id },
    })) > 0,
  );
  pass(
    "TC-TT-01/02/03: hồ sơ tiếp nhận, ba xung đột đa vai trò, summary và audit, mặc định ẩn danh",
  );
  for (const c of [conflictedTeacher, conflictedHead, conflictedFaculty]) {
    const scoped = ok(
      await request("/api/inspection-cases?page=1&pageSize=20", c),
    );
    assert.equal((scoped.items as unknown[]).length, 0);
    assert.equal(scoped.total, 0);
  }
  const summaryQueue = JSON.stringify(
    ok(await request("/api/inspection-cases?page=1&pageSize=20", leader)),
  );
  for (const value of [
    seriousStudent.id,
    seriousStudent.login,
    seriousStudent.email,
    seriousStudent.actor.displayName,
    "Nội dung giả phục vụ kiểm thử",
  ])
    assert(!summaryQueue.includes(value));
  assert.equal(
    (
      await request(
        "/api/inspection-cases?assigneeId=" + inspector.id,
        inspector,
      )
    ).status,
    400,
  );
  pass(
    "BR-61/62/67: truy vấn danh sách và total lọc xung đột; lãnh đạo chỉ nhận tóm tắt",
  );
  const disclosed = await create(seriousStudent, "KHIEU_NAI_NGHIEM_TRONG", {
    violation: "KHAC_NGHIEM_TRONG",
    identityLevel: "CHO_THANH_TRA_BIET",
    acknowledgedSerious: true,
  });
  const known = await db.inspectionCase.findUniqueOrThrow({
    where: { feedbackId: disclosed.id },
  });
  assert(
    JSON.stringify(
      ok(await request(`/api/inspection-cases/${known.id}`, inspector)),
    ).includes(seriousStudent.actor.displayName),
  );
  assert(
    !JSON.stringify(
      ok(await request(`/api/inspection-cases/${known.id}`, leader)),
    ).includes(seriousStudent.actor.displayName),
  );
  const cas = await request(
    `/api/inspection-cases/${inspection.id}/assign`,
    inspector,
    {
      assigneeId: conflictedTeacher.id,
      revision: inspection.revision,
      requestId: randomUUID(),
      reason: "Kiểm tra xung đột",
    },
  );
  assert.equal(cas.status, 400);
  ok(
    await request(`/api/inspection-cases/${inspection.id}/assign`, inspector, {
      assigneeId: inspector.id,
      revision: inspection.revision,
      requestId: randomUUID(),
      reason: "Phân công tiếp nhận hồ sơ giả",
    }),
  );
  pass(
    "BR-61/63: chỉ Thanh tra không xung đột thấy danh tính khi được chọn; chặn giao người xung đột",
  );
  await db.teachingAssignment.create({
    data: { sectionId: sections[0], teacherId: inspector.id },
  });
  assert.equal(
    (await request(`/api/inspection-cases/${inspection.id}`, inspector)).status,
    404,
  );
  assert.equal(
    ok(await request("/api/inspection-cases?page=1&pageSize=20", inspector))
      .total,
    0,
  );
  await db.teachingAssignment.deleteMany({
    where: { sectionId: sections[0], teacherId: inspector.id },
  });
  ok(await request(`/api/inspection-cases/${inspection.id}`, inspector));
  pass(
    "BR-61: xung đột mới có hiệu lực ngay trên phiên cũ, bỏ xung đột đọc lại đúng quyền",
  );
  const fileFeedback = await create(student);
  const spoof = new FormData();
  spoof.append(
    "files",
    new Blob(["<?php echo 1; ?>"], { type: "image/png" }),
    "anh.png",
  );
  assert.equal(
    (
      await request(
        `/api/feedback/${fileFeedback.id}/attachments`,
        student,
        undefined,
        { form: spoof },
      )
    ).status,
    400,
  );
  const pdf = Buffer.from(
    "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  );
  const valid = new FormData();
  valid.append(
    "files",
    new Blob([pdf], { type: "application/pdf" }),
    "ten-sinh-vien.pdf",
  );
  ok(
    await request(
      `/api/feedback/${fileFeedback.id}/attachments`,
      student,
      undefined,
      { form: valid },
    ),
    201,
  );
  const attachment = await db.attachment.findFirstOrThrow({
    where: { feedbackId: fileFeedback.id },
  });
  const downloaded = await request(
    `/api/feedback/${fileFeedback.id}/attachments/${attachment.id}`,
    teacher,
  );
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.response.arrayBuffer()), pdf);
  assert.equal(
    downloaded.response.headers.get("x-content-type-options"),
    "nosniff",
  );
  assert(
    !downloaded.response.headers
      .get("content-disposition")
      ?.includes("ten-sinh-vien"),
  );
  assert.equal(
    (
      await request(
        `/api/feedback/${fileFeedback.id}/attachments/${attachment.id}`,
        stranger,
      )
    ).status,
    404,
  );
  const tooMany = new FormData();
  for (let i = 0; i < 3; i++)
    tooMany.append("files", new Blob([pdf]), `tep${i}.pdf`);
  assert.equal(
    (
      await request(
        `/api/feedback/${fileFeedback.id}/attachments`,
        student,
        undefined,
        { form: tooMany },
      )
    ).status,
    400,
  );
  const huge = new FormData();
  huge.append(
    "files",
    new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)]),
    "large.pdf",
  );
  assert.equal(
    (
      await request(
        `/api/feedback/${fileFeedback.id}/attachments`,
        student,
        undefined,
        { form: huge },
      )
    ).status,
    413,
  );
  pass(
    "BR-28: đuôi giả, tổng số tệp, quá dung lượng, tải đúng byte, tên trung tính và IDOR",
  );
  const seriousFile = new FormData();
  seriousFile.append("files", new Blob([pdf]), "chung-cu.pdf");
  ok(
    await request(
      `/api/feedback/${serious.id}/attachments`,
      seriousStudent,
      undefined,
      { form: seriousFile },
    ),
    201,
  );
  const evidence = await db.attachment.findFirstOrThrow({
    where: { feedbackId: serious.id },
  });
  assert.equal(
    (
      await request(
        `/api/feedback/${serious.id}/attachments/${evidence.id}`,
        conflictedTeacher,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        `/api/feedback/${serious.id}/attachments/${evidence.id}`,
        leader,
      )
    ).status,
    403,
  );
  const beforeAudit = await db.auditLog.count({
    where: { actorId: inspector.id },
  });
  assert.equal(
    (
      await request(
        `/api/feedback/${serious.id}/attachments/${evidence.id}`,
        inspector,
      )
    ).status,
    200,
  );
  assert(
    (await db.auditLog.count({ where: { actorId: inspector.id } })) >
      beforeAudit,
  );
  pass(
    "BR-61/62: chứng cứ Thanh tra chỉ người không xung đột tải, mỗi lần tải có audit",
  );
  const trainingFeedback = await db.feedback.findFirstOrThrow({
    where: { authorId: student.id, category: "TO_CHUC_LOP_HOC" },
    select: { id: true },
  });
  await db.roleAssignment.deleteMany({
    where: { userId: training.id, role: "PHONG_DAO_TAO" },
  });
  assert.equal(
    (await request(`/api/feedback/${trainingFeedback.id}`, training)).status,
    403,
  );
  pass("BR-34: thu hồi vai trò có hiệu lực ngay trên access token cũ");
  const quotaResults = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      request("/api/feedback", seriousStudent, {
        sectionId: sections[0],
        category: "KHIEU_NAI_NGHIEM_TRONG",
        severity: "KHIEU_NAI",
        title: `${prefix} Kiểm tra giới hạn ${index}`,
        body: `Nội dung khiếu nại giả số ${index} dùng riêng kiểm tra cuộc đua giới hạn.`,
        isAnonymous: true,
        identityLevel: "AN_DANH_HOAN_TOAN",
        violation: "KHAC_NGHIEM_TRONG",
        acknowledgedSerious: true,
        requestId: randomUUID(),
      }),
    ),
  );
  assert.equal(
    quotaResults.filter((result) => result.status === 201).length,
    3,
  );
  assert.equal(
    quotaResults.filter((result) => result.status === 429).length,
    3,
  );
  assert.equal(
    await db.feedback.count({ where: { authorId: seriousStudent.id } }),
    5,
  );
  assert.equal(
    await db.inspectionCase.count({
      where: { feedback: { authorId: seriousStudent.id } },
    }),
    5,
  );
  pass(
    "FR-153/BR-26: sáu yêu cầu nghiêm trọng đồng thời không vượt tổng năm phản hồi/ngày",
  );
  await db.userSession.update({
    where: { id: teacher.actor.sessionId },
    data: { revokedAt: new Date() },
  });
  assert.equal(
    (await request(`/api/feedback/${fileFeedback.id}`, teacher)).status,
    401,
  );
  pass("BR-30/34: phiên bị thu hồi mất quyền ngay");
  passed = true;
} catch (error) {
  process.exitCode = 1;
  console.error(
    `Tuần10 chưa qua: ${error instanceof Error ? error.message : "Lỗi chưa xác định"}`,
  );
} finally {
  if (child?.pid && child.exitCode === null) {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {}
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  }
  if (fd !== undefined) closeSync(fd);
  if (verified)
    try {
      // Chỉ fixture ngẫu nhiên của phiên này, trong database thử được xác minh từ đầu.
      const owned = await db.feedback.findMany({
          where: { authorId: { in: users } },
          select: { id: true },
        }),
        ids = owned.map((x) => x.id);
      const attached = await db.attachment.findMany({
        where: { feedbackId: { in: ids } },
        select: { storageKey: true },
      });
      await db.$transaction(
        async (tx) => {
          await tx.attachment.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.inspectionCaseEvent.deleteMany({
            where: { inspectionCase: { feedbackId: { in: ids } } },
          });
          await tx.inspectionCase.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.feedbackHistory.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.feedbackMessage.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.feedbackRecipient.deleteMany({
            where: { feedbackId: { in: ids } },
          });
          await tx.feedback.deleteMany({ where: { id: { in: ids } } });
          await tx.auditLog.deleteMany({ where: { actorId: { in: users } } });
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
          // Gỡ FK updatedById của cấu hình thử trước khi dọn tài khoản ĐBCL.
          if (settingsBefore) {
            const restored = {
              ...settingsBefore,
              value:
                settingsBefore.value === null
                  ? Prisma.JsonNull
                  : (settingsBefore.value as Prisma.InputJsonValue),
            };
            await tx.systemSetting.upsert({
              where: { key: settingsKey },
              create: restored,
              update: restored,
            });
          } else
            await tx.systemSetting.deleteMany({ where: { key: settingsKey } });
          await tx.roleAssignment.deleteMany({
            where: { userId: { in: users } },
          });
          await tx.userSession.deleteMany({ where: { userId: { in: users } } });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          await tx.department.deleteMany({
            where: { id: { in: departments } },
          });
          await tx.faculty.deleteMany({ where: { id: { in: faculties } } });
        },
        { timeout: 30_000 },
      );
      // Các file fixture được dọn bằng helper riêng sau khi kiểm storageKey hợp lệ.
      const { removePrivateAttachment } =
        await import("../src/server/feedback/attachment-storage");
      for (const a of attached) await removePrivateAttachment(a.storageKey);
      assert.equal(await db.user.count({ where: { id: { in: users } } }), 0);
      cleaned = true;
    } catch (error) {
      passed = false;
      process.exitCode = 1;
      console.error(
        `Fixture Tuần10 chưa dọn xong: ${error instanceof Error ? error.name : "Lỗi DB"}`,
      );
    }
  finished = true;
  save();
  await db.$disconnect();
}
