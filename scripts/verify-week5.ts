import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import ExcelJS from "exceljs";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import type { Role } from "../src/generated/prisma/enums";

// Tái dùng DB thử đã xác minh của Tuần 4; các suite chạy tuần tự, không chạm main.
const marker = JSON.parse(
  readFileSync(".local/week4-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.W4_TEST_DATABASE_URL ?? "");
const shadow = new URL(process.env.SHADOW_DATABASE_URL ?? "");
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
const port = 3004,
  origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb(),
  prefix = `W5${randomUUID().slice(0, 8)}`,
  password = "KiemThu2026!TuanNam";
const ids: string[] = [],
  faculties: string[] = [],
  departments: string[] = [],
  courses: string[] = [],
  semesters: string[] = [],
  sections: string[] = [];
const batchIds: string[] = [],
  cases: string[] = [],
  secrets = new Set<string>(
    [password, process.env.JWT_SECRET!, process.env.MFA_ENCRYPTION_KEY!].filter(
      Boolean,
    ),
  );
let child: ReturnType<typeof spawn> | undefined,
  fd: number | undefined,
  cleaned = false;
let current = "Khởi tạo";
type Jar = Map<string, string>;
type Client = { jar: Jar; csrf: string };
const save = (status: string) =>
  writeFileSync(
    ".local/week5-http-result.json",
    JSON.stringify(
      {
        status,
        passed: cases.length,
        cases,
        cleaned,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
function pass(name: string) {
  cases.push(name);
  current = name;
  console.log(`QUA W5-HTTP-${String(cases.length).padStart(2, "0")} ${name}`);
  save("running");
}
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  options: { csrf?: boolean; origin?: string } = {},
) {
  const form = body instanceof FormData;
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : {
            origin: options.origin ?? origin,
            ...(form ? {} : { "content-type": "application/json" }),
          }),
      ...(client
        ? {
            cookie: [...client.jar].map(([k, v]) => `${k}=${v}`).join("; "),
            ...(client.csrf && options.csrf !== false
              ? { "x-csrf-token": client.csrf }
              : {}),
          }
        : {}),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    redirect: "manual",
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
async function actor(
  role: Role,
  ordinal: number,
  mfa = false,
  scope: { facultyId?: string; departmentId?: string } = {},
): Promise<Client & { id: string }> {
  const user = await db.user.create({
    data: {
      loginCode: `${prefix}-U${ordinal}`,
      email: `${prefix.toLowerCase()}-${ordinal}@fixture.invalid`,
      displayName: `Kiểm thử ${role}`,
      passwordHash: await hash(password, 12),
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: {
          role,
          ...scope,
          scopeType: scope.facultyId
            ? "FACULTY"
            : scope.departmentId
              ? "DEPARTMENT"
              : "GLOBAL",
          scopeKey: scope.facultyId
            ? `FACULTY:${scope.facultyId}`
            : scope.departmentId
              ? `DEPARTMENT:${scope.departmentId}`
              : "GLOBAL",
        },
      },
    },
    include: { roles: true },
  });
  ids.push(user.id);
  const client = { jar: new Map<string, string>(), csrf: "", id: user.id };
  if (mfa) {
    // Fixture có phiên đã MFA, để kiểm quyền nghiệp vụ ADMIN độc lập với TOTP Week4.
    const issued = await db.$transaction((tx) =>
      createAuthenticatedSession(tx, user, { ip: "fixture" }, "FULL", true),
    );
    const tokens = await tokensFor(
      issued.actor,
      issued.refreshToken,
      issued.refreshExpiresAt,
    );
    client.jar.set("sfs_access", tokens.accessToken);
    secrets.add(tokens.accessToken);
  } else {
    const login = await req("/api/auth/login", client, {
      identifier: user.loginCode,
      password,
    });
    assert.equal(login.status, 200);
  }
  for (const value of client.jar.values()) secrets.add(value);
  const csrf = await req("/api/catalog/csrf", client);
  if (["PHONG_DAO_TAO", "CAN_BO_DBCL", "ADMIN"].includes(role)) {
    assert.equal(csrf.status, 200);
    client.csrf = csrf.data.csrfToken;
    secrets.add(client.csrf);
  }
  return client;
}
async function create(kind: string, data: unknown, client: Client) {
  const result = await req(`/api/catalog/${kind}`, client, data);
  assert.equal(result.status, 201, `Tạo ${kind}`);
  const map: Record<string, string[]> = {
    faculties,
    departments,
    courses,
    semesters,
    sections,
  };
  map[kind]?.push(result.data.item.id);
  return result.data.item;
}
function upload(content: Buffer | string, fileName: string, token?: string) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([typeof content === "string" ? content : new Uint8Array(content)]),
    fileName,
  );
  if (token) {
    form.append("previewToken", token);
    secrets.add(token);
  }
  return form;
}
async function preview(
  kind: string,
  content: Buffer | string,
  client: Client,
  name = "data.csv",
) {
  const result = await req(
    `/api/catalog/import/${kind}/preview`,
    client,
    upload(content, name),
  );
  assert.equal(result.status, 200, `Preview ${kind}`);
  if (result.data.previewToken) {
    secrets.add(result.data.previewToken);
    const claim = JSON.parse(
      Buffer.from(
        result.data.previewToken.split(".")[0],
        "base64url",
      ).toString(),
    );
    batchIds.push(claim.nonce);
  }
  return result.data;
}
async function commit(
  kind: string,
  content: Buffer | string,
  token: string,
  client: Client,
  name = "data.csv",
) {
  return req(
    `/api/catalog/import/${kind}/commit`,
    client,
    upload(content, name, token),
  );
}
try {
  const identity = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid, DATABASE() AS \`database\``;
  assert.equal(identity[0].uuid, marker.serverUuid);
  assert.equal(identity[0].database, marker.database);
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week5-http.log", "w");
  save("running");
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
        SFS_TEST_DIST_DIR: ".next-week5",
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
  assert(ready);
  const quality = await actor("PHONG_DAO_TAO", 1),
    otherQuality = await actor("PHONG_DAO_TAO", 2),
    student = await actor("SINH_VIEN", 3),
    teacher = await actor("GIANG_VIEN", 4),
    admin = await actor("ADMIN", 5, true),
    qualityReader = await actor("CAN_BO_DBCL", 6),
    exams = await actor("PHONG_KHAO_THI", 7),
    inspection = await actor("THANH_TRA", 8),
    leader = await actor("LANH_DAO", 9);
  assert.equal((await req("/api/catalog/faculties")).status, 401);
  for (const denied of [student, teacher, exams, inspection, leader])
    assert.equal((await req("/api/catalog/faculties", denied)).status, 403);
  pass(
    "TC-PDT-01: khách và vai trò không quản lý danh mục bị chặn; ADMIN chỉ quản lý tổ chức",
  );
  assert.equal(
    (
      await req(
        "/api/catalog/semesters",
        quality,
        { code: "BAD", name: "Sai" },
        { csrf: false },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await req(
        "/api/catalog/semesters",
        quality,
        { code: "BAD", name: "Sai" },
        { origin: "https://evil.invalid" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await req(
        "/api/catalog/semesters",
        { ...quality, csrf: otherQuality.csrf },
        { code: "BAD", name: "Sai" },
      )
    ).status,
    403,
  );
  pass("CSRF thiếu/sai phiên và Origin khác bị chặn trước khi ghi");
  const faculty = await create(
    "faculties",
    { code: `${prefix}-K`, name: "Khoa kiểm thử" },
    admin,
  );
  const department = await create(
    "departments",
    { code: `${prefix}-BM`, name: "Bộ môn kiểm thử", facultyId: faculty.id },
    admin,
  );
  const course = await create(
    "courses",
    {
      code: `${prefix}-MH`,
      name: "Môn học kiểm thử",
      credits: 3,
      departmentId: department.id,
    },
    quality,
  );
  const semester = await create(
    "semesters",
    {
      code: `${prefix}-HK`,
      name: "Học kỳ kiểm thử",
      startsOn: "2026-09-30",
      endsOn: "2027-01-15",
    },
    quality,
  );
  const section = await create(
    "sections",
    { code: `${prefix}-LHP`, courseId: course.id, semesterId: semester.id },
    quality,
  );
  const assigned = await create(
    "teaching",
    { sectionId: section.id, teacherId: teacher.id, isLead: true },
    quality,
  );
  pass("FR-20: tạo đủ sáu danh mục theo quan hệ, gồm phân công giảng viên");
  const departmentHead = await actor("TRUONG_BO_MON", 10, false, {
    departmentId: department.id,
  });
  const facultyHead = await actor("TRUONG_KHOA", 11, false, {
    facultyId: faculty.id,
  });
  const scopedDenied = [
    student,
    teacher,
    departmentHead,
    facultyHead,
    exams,
    inspection,
    leader,
  ];
  for (const [kind, item] of [
    ["faculties", faculty],
    ["departments", department],
    ["courses", course],
    ["semesters", semester],
    ["sections", section],
    ["teaching", assigned],
  ] as const) {
    const path = `/api/catalog/${kind}/${encodeURIComponent(item.id)}`;
    assert.equal((await req(path, quality)).status, 200);
    const organization = kind === "faculties" || kind === "departments";
    assert.equal((await req(path, qualityReader)).status, 200);
    assert.equal((await req(path, admin)).status, organization ? 200 : 403);
    for (const denied of scopedDenied) {
      assert.equal((await req(path, denied)).status, 403);
      assert.equal((await req(path, denied, {})).status, 403);
      assert.equal((await req(`${path}/delete`, denied, {})).status, 403);
    }
    for (const denied of [
      qualityReader,
      ...(organization ? [quality] : [admin]),
    ]) {
      assert.equal((await req(path, denied, {})).status, 403);
      assert.equal((await req(`${path}/delete`, denied, {})).status, 403);
    }
  }
  assert.equal(
    (
      await req(`/api/catalog/semesters/${semester.id}/lock`, student, {
        reason: "Không có quyền khóa",
      })
    ).status,
    403,
  );
  assert.equal(
    (await req(`/api/catalog/courses/${randomUUID()}`, quality)).status,
    404,
  );
  pass(
    "TC-ALL-01 một phần: ma trận 10 vai trò trên route ID đọc/sửa/xóa; ĐBCL chỉ đọc, ADMIN chỉ tổ chức, PĐT chỉ dữ liệu đào tạo",
  );
  assert.equal(
    (
      await req(`/api/catalog/faculties/${faculty.id}`, admin, {
        code: faculty.code,
        name: "Khoa đã cập nhật",
        isActive: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await req(
        `/api/catalog/teaching/${encodeURIComponent(assigned.id)}`,
        quality,
        { sectionId: section.id, teacherId: teacher.id, isLead: false },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await req(`/api/catalog/courses/${course.id}`, quality, {
        code: course.code,
        name: "Sai tín chỉ",
        credits: 0,
        departmentId: department.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req("/api/catalog/semesters", quality, {
        code: `${prefix}-BAD`,
        name: "Ngày sai",
        startsOn: "2026-02-30",
        endsOn: "2026-03-01",
      })
    ).status,
    400,
  );
  assert.equal(
    (await req(`/api/catalog/faculties/${faculty.id}/delete`, admin, {}))
      .status,
    409,
  );
  pass(
    "FR-20: cập nhật thật, từ chối ngày/tín chỉ sai và xóa bản ghi đang được tham chiếu",
  );
  const page = await req(
    `/api/catalog/courses?search=${prefix}&page=1&pageSize=1`,
    quality,
  );
  assert.equal(page.data.total, 1);
  assert.equal(page.data.items.length, 1);
  assert.equal(
    (
      await req(
        `/api/catalog/courses?search=${prefix}&page=2&pageSize=1`,
        quality,
      )
    ).data.items.length,
    0,
  );
  assert.equal(
    (await req("/api/catalog/courses?pageSize=100", quality)).status,
    400,
  );
  pass(
    "BR-34: tìm kiếm/list/count dùng cùng điều kiện và phân trang có giới hạn",
  );
  for (const kind of ["students", "teachers", "sections", "enrollments"])
    for (const format of ["csv", "xlsx"]) {
      const response = await req(
        `/api/catalog/import/${kind}/template?format=${format}`,
        quality,
      );
      assert.equal(response.status, 200);
      const data = Buffer.from(await response.response.arrayBuffer());
      assert(data.length > 20);
      assert(
        response.response.headers.get("content-disposition")?.includes(format),
      );
      const p = await preview(kind, data, quality, `template.${format}`);
      assert(p.rowCount > 0);
    }
  pass(
    "FR-22: tải và đọc lại đủ 8 mẫu CSV/XLSX; mẫu lớp/đăng ký chỉ rõ mã tham chiếu cần thay",
  );
  const importedCodes = [`${prefix}-SV1`, `${prefix}-SV2`],
    importedEmails = importedCodes.map(
      (code) => `${code.toLowerCase()}@fixture.invalid`,
    );
  const studentCsv = `loginCode,email,displayName\r\n${importedCodes[0]},${importedEmails[0]},\"Nguyễn Văn A, kiểm thử\"\r\n${importedCodes[1]},${importedEmails[1]},Trần Thị B\r\n`;
  const before = {
    users: await db.user.count(),
    audit: await db.auditLog.count(),
    tokens: await db.authToken.count(),
    sessions: await db.userSession.count(),
    settings: await db.systemSetting.count(),
  };
  const studentPreview = await preview("students", studentCsv, quality);
  assert.deepEqual(studentPreview.errors, []);
  assert.equal(studentPreview.validRows, 2);
  const after = {
    users: await db.user.count(),
    audit: await db.auditLog.count(),
    tokens: await db.authToken.count(),
    sessions: await db.userSession.count(),
    settings: await db.systemSetting.count(),
  };
  assert.deepEqual(before, after);
  pass(
    "FR-21: CSV tiếng Việt/dấu phẩy trong ngoặc kép chạy thử thành công và không ghi bất kỳ bảng nào",
  );
  assert.equal(
    (
      await commit(
        "students",
        studentCsv + "\n",
        studentPreview.previewToken,
        quality,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await commit(
        "students",
        studentCsv,
        studentPreview.previewToken,
        otherQuality,
      )
    ).status,
    409,
  );
  const expiredClaim = JSON.parse(
    Buffer.from(
      studentPreview.previewToken.split(".")[0],
      "base64url",
    ).toString(),
  );
  expiredClaim.exp = Math.floor(Date.now() / 1000) - 1;
  const payload = Buffer.from(JSON.stringify(expiredClaim)).toString(
      "base64url",
    ),
    signature = createHmac("sha256", process.env.JWT_SECRET!)
      .update(`sfs-import-preview-v1:${payload}`)
      .digest("base64url");
  assert.equal(
    (await commit("students", studentCsv, `${payload}.${signature}`, quality))
      .status,
    409,
  );
  pass(
    "BR-34: xác nhận chạy thử ràng buộc tệp, người/phiên và hạn dùng; sửa nội dung hoặc token hết hạn bị chặn",
  );
  const duplicate = await Promise.all([
    commit("students", studentCsv, studentPreview.previewToken, quality),
    commit("students", studentCsv, studentPreview.previewToken, quality),
  ]);
  assert.deepEqual(duplicate.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    duplicate.find((r) => r.status === 200)!.data.activation.sent,
    2,
  );
  const imported = await db.user.findMany({
    where: { loginCode: { in: importedCodes } },
    include: { roles: true, authTokens: true },
  });
  ids.push(...imported.map((u) => u.id));
  assert.equal(imported.length, 2);
  assert(
    imported.every(
      (u) =>
        u.status === "PENDING_ACTIVATION" &&
        u.passwordHash === null &&
        u.mustChangePassword &&
        u.roles.length === 1 &&
        u.roles[0].role === "SINH_VIEN" &&
        u.authTokens.length === 1,
    ),
  );
  pass(
    "FR-21/8.3: hai commit đồng thời đúng một thắng, tài khoản chờ kích hoạt/mật khẩu null/quyền SV cố định và gửi 2 thư",
  );
  const messages = await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100")
  ).json();
  assert(
    importedEmails.every((email) =>
      messages.messages.some((m: { To: { Address: string }[] }) =>
        m.To.some((to) => to.Address.toLowerCase() === email),
      ),
    ),
  );
  pass(
    "Mailpit thật nhận thư kích hoạt của tài khoản nhập, token không xuất trong DTO/log",
  );
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet("GiangVien");
  sheet.addRow(["loginCode", "email", "displayName"]);
  const teacherCode = `${prefix}-GV1`;
  sheet.addRow([
    teacherCode,
    `${teacherCode.toLowerCase()}@fixture.invalid`,
    "Giảng viên nhập Excel",
  ]);
  const xlsx = Buffer.from(await workbook.xlsx.writeBuffer()),
    teacherPreview = await preview(
      "teachers",
      xlsx,
      quality,
      "giang-vien.xlsx",
    );
  assert.deepEqual(teacherPreview.errors, []);
  assert.equal(
    (
      await commit(
        "teachers",
        xlsx,
        teacherPreview.previewToken,
        quality,
        "giang-vien.xlsx",
      )
    ).status,
    200,
  );
  const importedTeacher = await db.user.findUniqueOrThrow({
    where: { loginCode: teacherCode },
    include: { roles: true },
  });
  ids.push(importedTeacher.id);
  assert.equal(importedTeacher.roles[0].role, "GIANG_VIEN");
  pass(
    "FR-21: nhập XLSX giảng viên thật, cấp đúng quyền giảng viên chờ kích hoạt",
  );
  const bad = `loginCode,email,displayName\n${prefix}-X,sai-email,Tên hợp lệ\n${prefix}-X,valid@fixture.invalid,=1+1\n`;
  const badPreview = await preview("students", bad, quality);
  assert(badPreview.errors.some((e: { row: number }) => e.row === 2));
  assert(badPreview.errors.some((e: { row: number }) => e.row === 3));
  assert.equal(badPreview.previewToken, null);
  assert.equal(await db.user.count({ where: { loginCode: `${prefix}-X` } }), 0);
  pass(
    "FR-21: tệp cố tình sai báo lỗi đúng dòng 2/3, không cấp xác nhận và không ghi dòng hợp lệ riêng lẻ",
  );
  sheet.getCell("C2").value = { formula: "1+1", result: 2 };
  const formula = await preview(
    "teachers",
    Buffer.from(await workbook.xlsx.writeBuffer()),
    quality,
    "cong-thuc.xlsx",
  );
  assert(formula.errors.length > 0 && formula.previewToken === null);
  assert.equal(
    (
      await req(
        "/api/catalog/import/students/preview",
        quality,
        upload("không phải ZIP", "sai.xlsx"),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await req(
        "/api/catalog/import/students/preview",
        quality,
        upload(Buffer.alloc(2 * 1024 * 1024 + 1), "qua-lon.csv"),
      )
    ).status,
    413,
  );
  pass("Nhập file: từ chối công thức Excel, XLSX giả và tệp vượt 2 MiB");
  const sectionCsv = `code,courseCode,semesterCode\n${prefix}-IMP,${course.code},${semester.code}\n`;
  const sp = await preview("sections", sectionCsv, quality);
  assert.deepEqual(sp.errors, []);
  assert.equal(
    (await commit("sections", sectionCsv, sp.previewToken, quality)).status,
    200,
  );
  const importedSection = await db.courseSection.findUniqueOrThrow({
    where: {
      semesterId_code: { semesterId: semester.id, code: `${prefix}-IMP` },
    },
  });
  sections.push(importedSection.id);
  const enrollCsv = `semesterCode,sectionCode,studentCode\n${semester.code},${importedSection.code},${importedCodes[0]}\n`;
  const ep = await preview("enrollments", enrollCsv, quality);
  assert.deepEqual(ep.errors, []);
  assert.equal(
    (await commit("enrollments", enrollCsv, ep.previewToken, quality)).status,
    200,
  );
  assert.equal(
    await db.enrollment.count({
      where: {
        sectionId: importedSection.id,
        studentId: imported.find((u) => u.loginCode === importedCodes[0])!.id,
      },
    }),
    1,
  );
  pass("FR-21: nhập lớp học phần và đăng ký học phần qua mã tham chiếu thật");
  const duplicateEnrollment = await preview("enrollments", enrollCsv, quality);
  assert(
    duplicateEnrollment.errors.length > 0 &&
      duplicateEnrollment.previewToken === null,
  );
  const unknown = await preview(
    "sections",
    `code,courseCode,semesterCode\n${prefix}-NO,KHONG_TON_TAI,${semester.code}\n`,
    quality,
  );
  assert(
    unknown.errors.some(
      (e: { row: number; column: string }) =>
        e.row === 2 && e.column === "courseCode",
    ),
  );
  pass(
    "FR-21: báo lỗi từng dòng khi trùng đăng ký hoặc mã môn tham chiếu không tồn tại",
  );
  const staleCsv = `code,courseCode,semesterCode\n${prefix}-STALE,${course.code},${semester.code}\n`,
    stale = await preview("sections", staleCsv, quality);
  assert.equal(
    (
      await req(`/api/catalog/semesters/${semester.id}/lock`, quality, {
        reason: "Khóa học kỳ sau khi đã chạy thử",
      })
    ).status,
    200,
  );
  const staleCommit = await commit(
    "sections",
    staleCsv,
    stale.previewToken,
    quality,
  );
  assert.equal(staleCommit.status, 409);
  assert.equal(staleCommit.data.code, "IMPORT_VALIDATION_FAILED");
  assert(
    staleCommit.data.errors?.some(
      (e: { code: string }) => e.code === "SEMESTER_LOCKED",
    ),
  );
  assert.equal(
    await db.courseSection.count({
      where: { code: `${prefix}-STALE`, semesterId: semester.id },
    }),
    0,
  );
  pass(
    "BR-17: học kỳ khóa sau preview khiến commit từ chối toàn bộ và trả lỗi dòng có cấu trúc",
  );
  for (const [kind, item, input] of [
    [
      "faculties",
      faculty,
      { code: faculty.code, name: "Sửa khoa", isActive: true },
    ],
    [
      "departments",
      department,
      {
        code: department.code,
        name: "Sửa bộ môn",
        facultyId: faculty.id,
        isActive: true,
      },
    ],
    [
      "courses",
      course,
      {
        code: course.code,
        name: "Sửa môn",
        credits: 3,
        departmentId: department.id,
        isActive: true,
      },
    ],
    [
      "semesters",
      semester,
      {
        code: semester.code,
        name: "Sửa học kỳ",
        startsOn: "2026-09-30",
        endsOn: "2027-01-15",
      },
    ],
    [
      "sections",
      section,
      { code: section.code, semesterId: semester.id, courseId: course.id },
    ],
    [
      "teaching",
      assigned,
      { sectionId: section.id, teacherId: teacher.id, isLead: false },
    ],
  ] as const) {
    assert.equal(
      (
        await req(
          `/api/catalog/${kind}/${encodeURIComponent(item.id)}`,
          kind === "faculties" || kind === "departments" ? admin : quality,
          input,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await req(
          `/api/catalog/${kind}/${encodeURIComponent(item.id)}/delete`,
          kind === "faculties" || kind === "departments" ? admin : quality,
          {},
        )
      ).status,
      409,
    );
  }
  assert.equal(
    (
      await req(`/api/catalog/semesters/${semester.id}/lock`, quality, {
        reason: "Khóa lặp lại không được phép",
      })
    ).status,
    409,
  );
  pass(
    "BR-17: sáu loại danh mục liên quan học kỳ khóa chỉ đọc, kể cả đổi khoa/bộ môn/môn gián tiếp",
  );
  for (const denied of [admin, qualityReader, ...scopedDenied]) {
    assert.equal(
      (
        await req(`/api/catalog/semesters/${semester.id}/unlock`, denied, {
          reason: "Không có quyền mở khóa",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await req(
          "/api/catalog/import/students/preview",
          denied,
          upload(
            "loginCode,email,displayName\nFAKE,fake@fixture.invalid,Giả",
            "fixture.csv",
          ),
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await req(`/api/catalog/semesters/${semester.id}/unlock`, quality, {
        reason: "ngắn",
      })
    ).status,
    400,
  );
  const unlocked = await req(
    `/api/catalog/semesters/${semester.id}/unlock`,
    quality,
    { reason: "Đối soát và điều chỉnh dữ liệu kiểm thử" },
  );
  assert.equal(unlocked.status, 200);
  assert.equal(unlocked.data.item.lockedAt, null);
  assert.equal(unlocked.data.notification.status, "SENT");
  assert.equal(unlocked.data.notification.auditRecorded, true);
  assert.equal(
    (
      await req(`/api/catalog/semesters/${semester.id}/unlock`, quality, {
        reason: "Mở khóa lặp lại không được phép",
      })
    ).status,
    409,
  );
  const unlockEvents = await db.auditLog.findMany({
    where: {
      actorId: quality.id,
      objectId: semester.id,
      action: { in: ["SEMESTER_UNLOCKED", "SEMESTER_UNLOCK_NOTIFICATION"] },
    },
  });
  assert.equal(unlockEvents.length, 2);
  const unlockMessages = await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100")
  ).json();
  assert(
    unlockMessages.messages.some(
      (message: { Subject: string; To: { Address: string }[] }) =>
        message.Subject.includes("mở khóa học kỳ") &&
        message.To.some(
          (to) => to.Address === `${prefix.toLowerCase()}-6@fixture.invalid`,
        ),
    ),
  );
  pass(
    "TC-PDT-01/FR-141: chỉ PĐT mở khóa với lý do, CAS chống lặp; audit thật và Mailpit nhận thông báo ĐBCL",
  );
  const raceSemester = await create(
    "semesters",
    {
      code: `${prefix}-RACE`,
      name: "Học kỳ đồng thời",
      startsOn: "2026-09-30",
      endsOn: "2027-01-15",
    },
    quality,
  );
  const raceCsv = `code,courseCode,semesterCode\n${prefix}-RACE1,${course.code},${raceSemester.code}\n`,
    racePreview = await preview("sections", raceCsv, quality);
  const [lockRace, commitRace] = await Promise.all([
    req(`/api/catalog/semesters/${raceSemester.id}/lock`, quality, {
      reason: "Khóa đồng thời với lần nhập",
    }),
    commit("sections", raceCsv, racePreview.previewToken, quality),
  ]);
  assert.equal(lockRace.status, 200);
  assert([200, 409].includes(commitRace.status));
  const raceSections = await db.courseSection.findMany({
    where: { semesterId: raceSemester.id },
  });
  sections.push(...raceSections.map((s) => s.id));
  assert.equal(raceSections.length, commitRace.status === 200 ? 1 : 0);
  assert.equal(
    (await commit("sections", raceCsv, racePreview.previewToken, quality))
      .status,
    409,
  );
  pass(
    "BR-17/8.7: khóa học kỳ và commit đồng thời tuần tự hóa trên MySQL thật, không ghi sau khóa",
  );
  const disposable = await create(
    "faculties",
    { code: `${prefix}-DEL`, name: "Khoa chưa dùng" },
    admin,
  );
  assert.equal(
    (await req(`/api/catalog/faculties/${disposable.id}/delete`, admin, {}))
      .status,
    200,
  );
  assert.equal(
    (await req(`/api/catalog/faculties/${disposable.id}`, quality)).status,
    404,
  );
  pass("FR-20: xóa thật bản ghi chưa dùng, truy vấn lại trả 404");
  await db.roleAssignment.deleteMany({
    where: { userId: otherQuality.id, role: "PHONG_DAO_TAO" },
  });
  assert.equal((await req("/api/catalog/faculties", otherQuality)).status, 403);
  assert.equal(
    (
      await req(
        `/api/catalog/import/students/template?format=csv`,
        otherQuality,
      )
    ).status,
    403,
  );
  pass(
    "BR-34: quyền PĐT bị thu hồi có hiệu lực với phiên đang mở và đường tải mẫu",
  );
  const logs = await db.auditLog.findMany({
      where: { OR: [{ actorId: { in: ids } }, { objectId: { in: batchIds } }] },
    }),
    auditText = JSON.stringify(logs);
  const serverLog = readFileSync(".local/week5-http.log", "utf8");
  for (const secret of secrets) {
    assert(!auditText.includes(secret));
    assert(!serverLog.includes(secret));
  }
  assert(
    !auditText.includes(importedEmails[0]) &&
      !auditText.includes("Nguyễn Văn A"),
  );
  pass(
    "BR-30: audit và log không chứa nội dung file, email nhập, mật khẩu, token hoặc CSRF",
  );
  console.log(
    `HTTP/MySQL/Mailpit Tuần 5: ${cases.length}/${cases.length} nhóm qua.`,
  );
  save("passed");
} catch (error) {
  const message = error instanceof Error ? error.message : "Lỗi chưa xác định";
  console.error(
    `KHÔNG QUA sau ${cases.length} nhóm (${current}): ${[...secrets].some((s) => message.includes(s)) ? "Chi tiết được ẩn" : message.slice(0, 350)}`,
  );
  process.exitCode = 1;
  save("failed");
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
  // Chỉ xóa UUID/codes giả của lần kiểm thử trong database có marker.
  const missingUsers = await db.user.findMany({
    where: { loginCode: { startsWith: prefix } },
    select: { id: true },
  });
  ids.push(...missingUsers.map((u) => u.id));
  const missingSections = await db.courseSection.findMany({
    where: { code: { startsWith: prefix } },
    select: { id: true },
  });
  sections.push(...missingSections.map((s) => s.id));
  await db.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: ids } },
          {
            objectId: {
              in: [
                ...ids,
                ...faculties,
                ...departments,
                ...courses,
                ...semesters,
                ...sections,
                ...batchIds,
              ],
            },
          },
        ],
      },
    });
    await tx.systemSetting.updateMany({
      where: { updatedById: { in: ids } },
      data: { updatedById: null },
    });
    await tx.authToken.deleteMany({ where: { userId: { in: ids } } });
    await tx.userSession.updateMany({
      where: { userId: { in: ids } },
      data: { rotatedFromId: null },
    });
    await tx.userSession.deleteMany({ where: { userId: { in: ids } } });
    await tx.enrollment.deleteMany({
      where: {
        OR: [{ studentId: { in: ids } }, { sectionId: { in: sections } }],
      },
    });
    await tx.teachingAssignment.deleteMany({
      where: {
        OR: [{ teacherId: { in: ids } }, { sectionId: { in: sections } }],
      },
    });
    await tx.roleAssignment.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
    await tx.courseSection.deleteMany({ where: { id: { in: sections } } });
    await tx.course.deleteMany({ where: { id: { in: courses } } });
    await tx.department.deleteMany({ where: { id: { in: departments } } });
    await tx.faculty.deleteMany({ where: { id: { in: faculties } } });
    await tx.semester.deleteMany({ where: { id: { in: semesters } } });
  });
  assert.equal(await db.user.count({ where: { id: { in: ids } } }), 0);
  cleaned = true;
  save(process.exitCode ? "failed" : "passed");
  await db.$disconnect();
}
