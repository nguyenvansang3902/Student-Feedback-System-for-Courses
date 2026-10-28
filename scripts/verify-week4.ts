import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { generate } from "otplib";
import { getDb } from "../src/lib/db";
import type { Role, ScopeType } from "../src/generated/prisma/enums";
import {
  encryptMfaSecret,
  hashRecoveryCode,
  newMfaSecret,
} from "../src/server/auth/mfa-crypto";
import { rateKey } from "../src/server/auth/rate-limit";

// Chỉ chạy trên DB test có marker do prepare-week4-test tạo; không dùng DB chính.
class VerificationError extends Error {}
function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new VerificationError(message);
}
const marker = JSON.parse(
  readFileSync(".local/week4-test-database.json", "utf8"),
) as {
  database: string;
  mainDatabase: string;
  serverUuid: string;
  purpose: string;
};
const testUrl = process.env.W4_TEST_DATABASE_URL;
ensure(
  testUrl && marker.purpose === "isolated-week4-tests",
  "Thiếu môi trường test riêng đã được xác nhận.",
);
const mainConnection = new URL(process.env.DATABASE_URL ?? "");
const testConnection = new URL(testUrl);
const mainDatabase = decodeURIComponent(mainConnection.pathname.slice(1));
const testDatabase = decodeURIComponent(testConnection.pathname.slice(1));
const expectedPrefix = `${mainDatabase.slice(0, 34)}_w4test_`;
const shadowDatabase = decodeURIComponent(
  new URL(process.env.SHADOW_DATABASE_URL ?? "").pathname.slice(1),
);
ensure(
  mainConnection.protocol === "mysql:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(mainConnection.hostname) &&
    testConnection.protocol === mainConnection.protocol &&
    testConnection.hostname === mainConnection.hostname &&
    testConnection.port === mainConnection.port &&
    testConnection.username === mainConnection.username &&
    testConnection.password === mainConnection.password &&
    mainDatabase === marker.mainDatabase &&
    testDatabase === marker.database &&
    testDatabase !== marker.mainDatabase &&
    testDatabase !== shadowDatabase &&
    testDatabase.startsWith(expectedPrefix) &&
    /^[a-f0-9]{8}$/.test(testDatabase.slice(expectedPrefix.length)),
  "DB test không khớp marker, endpoint Compose hoặc trùng DB chính/shadow.",
);
process.env.DATABASE_URL = testUrl;
const port = Number(process.env.W4_TEST_PORT ?? 3003);
ensure(
  Number.isInteger(port) && port > 1024 && port < 65536,
  "Cổng test không hợp lệ.",
);
const origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb();
const prefix = randomUUID().slice(0, 8);
const password = "Tuan4!KiemThu2026";
const sensitive = new Set<string>(
  [
    password,
    process.env.JWT_SECRET ?? "",
    process.env.MFA_ENCRYPTION_KEY ?? "",
    decodeURIComponent(testConnection.password),
  ].filter(Boolean),
);
const rateKeys = new Set<string>();
const ids: string[] = [];
const facultyIds: string[] = [];
const departmentIds: string[] = [];
const courseIds: string[] = [];
const sectionIds: string[] = [];
let semesterId: string | undefined;
let passed = 0;
let currentCase = "Khởi tạo";
let child: ReturnType<typeof spawn> | undefined;
let fd: number | undefined;
const startedAt = new Date().toISOString();
const completedCases: string[] = [];
function saveResult(status: "running" | "passed" | "failed", cleaned = false) {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/week4-http-result.json",
    JSON.stringify(
      {
        status,
        passed,
        completedCases,
        startedAt,
        updatedAt: new Date().toISOString(),
        cleaned,
      },
      null,
      2,
    ),
  );
}
type Session = { cookies: Map<string, string>; ip: string; csrf?: string };
type Payload = {
  ok?: boolean;
  code?: string;
  purpose?: string;
  csrfToken?: string;
  secret?: string;
  qrDataUrl?: string;
  recoveryCodes?: string[];
  requiredRoles?: string[];
  total?: number;
  items?: Record<string, unknown>[];
  user?: {
    id: string;
    status?: string;
    purpose?: string;
    mfa?: boolean;
    roles?: string[];
  };
  section?: { id: string };
};
type Result = { status: number; data: Payload; cookies: string[] };
type Fixture = {
  id: string;
  loginCode: string;
  email: string;
  role: Role;
  ip: string;
};
const session = (ip = "198.19.0.1"): Session => ({ cookies: new Map(), ip });
const clone = (value: Session): Session => ({
  cookies: new Map(value.cookies),
  ip: value.ip,
  csrf: value.csrf,
});
function pass(name: string) {
  passed++;
  currentCase = name;
  console.log(`QUA W4-HTTP-${String(passed).padStart(2, "0")} ${name}`);
  completedCases.push(name);
  saveResult("running");
}
function begin(name: string) {
  currentCase = name;
  console.log(`ĐANG KIỂM ${name}`);
}
function expectStatus(value: Result, expected: number, message: string) {
  ensure(
    value.status === expected,
    `${message}: HTTP ${value.status}, cần ${expected}.`,
  );
}
async function request(
  path: string,
  identity: Session,
  body?: unknown,
  options: { csrf?: string | false; origin?: string } = {},
): Promise<Result> {
  for (const scope of ["login-ip", "mfa-ip"])
    rateKeys.add(rateKey(scope, identity.ip));
  const csrf =
    options.csrf === false ? undefined : (options.csrf ?? identity.csrf);
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : {
            "content-type": "application/json",
            origin: options.origin ?? origin,
          }),
      cookie: [...identity.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; "),
      "x-forwarded-for": identity.ip,
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  const cookies = response.headers.getSetCookie();
  for (const raw of cookies) {
    const match = raw.match(/^([^=]+)=([^;]*)/);
    if (!match) continue;
    if (match[2]) {
      identity.cookies.set(match[1], match[2]);
      sensitive.add(match[2]);
    } else identity.cookies.delete(match[1]);
  }
  const data = (await response.json()) as Payload;
  return { status: response.status, data, cookies };
}
function sid(identity: Session): string {
  const token = identity.cookies.get("sfs_access");
  ensure(token, "Thiếu access cookie.");
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
  ) as { sid?: string };
  ensure(
    payload.sid && /^[a-f0-9-]{36}$/i.test(payload.sid),
    "Access không có session ID hợp lệ.",
  );
  return payload.sid;
}
async function signIn(
  user: Fixture,
): Promise<{ jar: Session; result: Result }> {
  const jar = session(user.ip);
  const result = await request("/api/auth/login", jar, {
    identifier: user.loginCode,
    password,
  });
  expectStatus(result, 200, "Đăng nhập fixture");
  return { jar, result };
}
async function csrf(identity: Session): Promise<string> {
  const response = await request("/api/admin/csrf", identity);
  expectStatus(response, 200, "Cấp CSRF");
  ensure(response.data.csrfToken, "Không có CSRF trong DTO.");
  identity.csrf = response.data.csrfToken;
  sensitive.add(identity.csrf);
  return identity.csrf;
}
const lastStep = new Map<string, number>();
async function freshCode(secret: string, userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const current = Math.floor(now / 30);
  const previous = lastStep.get(userId);
  if (previous !== undefined && current <= previous) {
    console.log("Đang chờ chu kỳ TOTP tiếp theo để kiểm step-up thật.");
    await delay((previous + 1) * 30000 - Date.now() + 150);
  }
  const epoch = Math.floor(Date.now() / 1000);
  lastStep.set(userId, Math.floor(epoch / 30));
  const code = await generate({ secret, digits: 6, period: 30, epoch });
  sensitive.add(code);
  return code;
}
async function enroll(user: Fixture, identity: Session) {
  const setup = await request("/api/auth/mfa-setup", identity, {});
  expectStatus(setup, 200, "Bắt đầu MFA");
  ensure(
    setup.data.secret &&
      setup.data.qrDataUrl?.startsWith("data:image/png;base64,"),
    "Setup không trả secret/QR hợp lệ.",
  );
  const secret = setup.data.secret;
  sensitive.add(secret);
  sensitive.add(setup.data.qrDataUrl!);
  const stored = await db.totpCredential.findUnique({
    where: { userId: user.id },
  });
  ensure(
    stored &&
      stored.encryptedSecret !== secret &&
      !stored.encryptedSecret.includes(secret) &&
      !stored.enabledAt &&
      stored.pendingExpiresAt &&
      stored.pendingExpiresAt.getTime() - Date.now() <= 300000,
    "Secret chưa được mã hóa hoặc setup bật trước xác nhận.",
  );
  const code = await freshCode(secret, user.id);
  const completed = await request("/api/auth/mfa-confirm", identity, { code });
  expectStatus(completed, 200, "Xác nhận MFA");
  const recoveryCodes = completed.data.recoveryCodes;
  ensure(
    recoveryCodes?.length === 10 && new Set(recoveryCodes).size === 10,
    "Cần đúng10mã khôi phục riêng.",
  );
  recoveryCodes.forEach((value) => sensitive.add(value));
  const hashes = await db.totpRecoveryCode.findMany({
    where: { userId: user.id, usedAt: null },
  });
  ensure(
    hashes.length === 10 &&
      recoveryCodes.every((value) =>
        hashes.some((row) => row.codeHash === hashRecoveryCode(user.id, value)),
      ),
    "Mã khôi phục không được lưu hash đúng.",
  );
  const me = await request("/api/auth/me", identity);
  ensure(
    me.status === 200 &&
      me.data.user?.mfa &&
      me.data.user.purpose === "FULL" &&
      identity.cookies.has("sfs_refresh"),
    "Xác nhận chưa cấp FULL MFA/refresh.",
  );
  return { secret, recoveryCodes, confirmCode: code };
}

try {
  const [actual] = await db.$queryRaw<
    { name: string; serverUuid: string }[]
  >`SELECT DATABASE() AS name, @@server_uuid AS serverUuid`;
  ensure(
    actual?.name === marker.database && actual.serverUuid === marker.serverUuid,
    "Kết nối thực tế không khớp DB test đã xác nhận.",
  );
  ensure(
    (await db.user.count()) === 0,
    "DB test cần sạch fixture trước lần chạy; không tự xóa dữ liệu lạ.",
  );
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new VerificationError("Cổng test đang được dùng.");
  } catch (error) {
    if (error instanceof Error && error.message === "Cổng test đang được dùng.")
      throw error;
  }
  const passwordHash = await hash(password, 12);
  for (let index = 0; index < 2; index++) {
    const faculty = await db.faculty.create({
      data: { code: `W4-${prefix}-F${index}`, name: "Khoa giả kiểm thử" },
    });
    facultyIds.push(faculty.id);
    const department = await db.department.create({
      data: {
        code: `W4-${prefix}-D${index}`,
        name: "Bộ môn giả kiểm thử",
        facultyId: faculty.id,
      },
    });
    departmentIds.push(department.id);
    const course = await db.course.create({
      data: {
        code: `W4-${prefix}-C${index}`,
        name: "Môn học giả kiểm thử",
        credits: "3.0",
        departmentId: department.id,
      },
    });
    courseIds.push(course.id);
  }
  const semester = await db.semester.create({
    data: {
      code: `W4-${prefix}-S`,
      name: "Học kỳ giả",
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2026-12-31"),
    },
  });
  semesterId = semester.id;
  for (let index = 0; index < 2; index++) {
    const section = await db.courseSection.create({
      data: {
        code: `W4-${prefix}-L${index}`,
        courseId: courseIds[index],
        semesterId,
      },
    });
    sectionIds.push(section.id);
  }
  const fixtures: Fixture[] = [];
  const roles: Role[] = [
    "ADMIN",
    "ADMIN",
    "SINH_VIEN",
    "GIANG_VIEN",
    "TRUONG_BO_MON",
    "TRUONG_KHOA",
    "CAN_BO_DBCL",
    "LANH_DAO",
    "SINH_VIEN",
  ];
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index];
    const scopeType: ScopeType =
      role === "TRUONG_BO_MON"
        ? "DEPARTMENT"
        : role === "TRUONG_KHOA"
          ? "FACULTY"
          : "GLOBAL";
    const scopeId =
      scopeType === "FACULTY"
        ? facultyIds[0]
        : scopeType === "DEPARTMENT"
          ? departmentIds[0]
          : undefined;
    const user = await db.user.create({
      data: {
        loginCode: `W4-${prefix}-${index}`,
        email: `${prefix}-${index}@example.invalid`,
        displayName: "Tài khoản giả tuần4",
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        roles: {
          create: {
            role,
            scopeType,
            scopeKey:
              scopeType === "GLOBAL" ? "GLOBAL" : `${scopeType}:${scopeId}`,
            facultyId: scopeType === "FACULTY" ? scopeId : null,
            departmentId: scopeType === "DEPARTMENT" ? scopeId : null,
          },
        },
      },
    });
    ids.push(user.id);
    for (const scope of ["login-account", "mfa-account"])
      rateKeys.add(rateKey(scope, user.id));
    fixtures.push({
      ...user,
      role,
      ip: `198.19.${parseInt(prefix.slice(0, 2), 16)}.${index + 1}`,
    });
  }
  const [
    admin1,
    admin2,
    student,
    teacher,
    departmentHead,
    facultyHead,
    quality,
    leader,
    rateStudent,
  ] = fixtures;
  await db.enrollment.create({
    data: { studentId: student.id, sectionId: sectionIds[0] },
  });
  await db.teachingAssignment.create({
    data: { teacherId: teacher.id, sectionId: sectionIds[0] },
  });
  const rateSecret = newMfaSecret();
  sensitive.add(rateSecret);
  await db.totpCredential.create({
    data: {
      userId: rateStudent.id,
      encryptedSecret: encryptMfaSecret(rateSecret, rateStudent.id),
      keyVersion: process.env.MFA_KEY_VERSION ?? "v1",
      enabledAt: new Date(),
    },
  });
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/week4-http.log", "w");
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
        APP_URL: origin,
        AUTH_TRUST_PROXY: "true",
        SFS_TEST_DIST_DIR: ".next-auth",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", fd, fd],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let index = 0; index < 90; index++) {
    if (child.exitCode !== null)
      throw new VerificationError("Next test kết thúc trước khi sẵn sàng.");
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  ensure(ready, "Next test chưa sẵn sàng; xem log riêng trong.local.");

  begin("Phiên tạm và chống bỏ qua MFA");
  const a1 = await signIn(admin1);
  const a2 = await signIn(admin2);
  const adminJar1 = a1.jar;
  let adminJar2 = a2.jar;
  ensure(
    a1.result.data.purpose === "MFA_SETUP" &&
      a2.result.data.purpose === "MFA_SETUP" &&
      !adminJar1.cookies.has("sfs_refresh"),
    "ADMIN mới phải setup, không có refresh.",
  );
  const pendingRow = await db.userSession.findUnique({
    where: { id: sid(adminJar1) },
  });
  ensure(
    pendingRow &&
      pendingRow.purpose === "MFA_SETUP" &&
      pendingRow.expiresAt.getTime() - Date.now() <= 300000,
    "Phiên tạm không giới hạn5phút.",
  );
  pass("ADMIN mật khẩu đúng chỉ có phiên MFA_SETUP 5 phút, không refresh");
  for (const path of [
    "/api/admin/users",
    `/api/admin/users/${student.id}`,
    "/api/admin/audit",
    "/api/admin/mfa-policy",
    "/api/admin/scopes",
    "/api/admin/csrf",
  ])
    expectStatus(
      await request(path, clone(adminJar1)),
      401,
      "Pending truy cập quản trị",
    );
  for (const suffix of ["status", "roles", "reset-mfa"])
    expectStatus(
      await request(
        `/api/admin/users/${student.id}/${suffix}`,
        clone(adminJar1),
        {},
      ),
      401,
      "Pending gọi hành độngID",
    );
  expectStatus(
    await request("/api/auth/mfa-verify", clone(adminJar1), { code: "123456" }),
    403,
    "Tokensetup dùng sai bước",
  );
  const pendingRefresh = clone(adminJar1);
  expectStatus(
    await request("/api/auth/refresh", pendingRefresh, {}),
    401,
    "Pending refresh",
  );
  pass(
    "Token tạm bị chặn trên mọi route quản trị và không đổi mục đích bằng refresh",
  );
  const expired = await signIn(admin1);
  await db.userSession.update({
    where: { id: sid(expired.jar) },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  expectStatus(
    await request("/api/auth/mfa-setup", expired.jar, {}),
    401,
    "Phiên tạm hết hạn",
  );
  pass("Phiên MFA tạm hết hạn bị từ chối thật trong MySQL");
  const enrolled1 = await enroll(admin1, adminJar1);
  pass("QR/secret mã hóa; xác nhận mới bật MFA, 10 mã lưu hash và cấp FULL");
  const enrolled2 = await enroll(admin2, adminJar2);
  pass("Quản trị viên thứ hai đăng ký TOTP và mã khôi phục riêng");
  expectStatus(
    await request("/api/auth/mfa-confirm", adminJar1, {
      code: enrolled1.confirmCode,
    }),
    403,
    "FULL không xem lại recovery",
  );
  pass("Mã khôi phục không thể lấy lại bằng xác nhận ở phiên FULL");
  const replay = await signIn(admin1);
  expectStatus(
    await request("/api/auth/mfa-verify", replay.jar, {
      code: enrolled1.confirmCode,
    }),
    400,
    "Dùng lạiOTP đãconfirm",
  );
  expectStatus(
    await request("/api/auth/mfa-verify", replay.jar, { code: "invalid" }),
    400,
    "SaiOTP",
  );
  const staleCode = await generate({
    secret: enrolled1.secret,
    epoch: Math.floor(Date.now() / 1000) - 90,
    digits: 6,
    period: 30,
  });
  sensitive.add(staleCode);
  expectStatus(
    await request("/api/auth/mfa-verify", replay.jar, { code: staleCode }),
    400,
    "OTP hết hạn",
  );
  pass("OTP sai, quá cửa sổ và dùng lại đều bị từ chối");
  const recoveryA = await signIn(admin1);
  const recoveryB = await signIn(admin1);
  const race = await Promise.all([
    request("/api/auth/mfa-verify", recoveryA.jar, {
      code: enrolled1.recoveryCodes[0],
    }),
    request("/api/auth/mfa-verify", recoveryB.jar, {
      code: enrolled1.recoveryCodes[0],
    }),
  ]);
  ensure(
    race.filter((value) => value.status === 200).length === 1 &&
      race.filter((value) => value.status === 400).length === 1,
    "RecoveryCAS đồng thời phải đúng một thắng.",
  );
  pass("Hai phiên dùng cùng mã khôi phục đồng thời: đúng 1 thành công");
  const otpA = await signIn(admin2);
  const otpB = await signIn(admin2);
  const sharedOtp = await freshCode(enrolled2.secret, admin2.id);
  const otpRace = await Promise.all([
    request("/api/auth/mfa-verify", otpA.jar, { code: sharedOtp }),
    request("/api/auth/mfa-verify", otpB.jar, { code: sharedOtp }),
  ]);
  ensure(
    otpRace.filter((value) => value.status === 200).length === 1 &&
      otpRace.filter((value) => value.status === 400).length === 1,
    "TOTPđồngthời phảiđúngmộtthắng.",
  );
  pass(
    "Hai phiên nhập cùng TOTP đồng thời: khóa hàng và lastUsedStep chỉ cho 1 thành công",
  );

  begin("CSRF, phiên đầy đủ và phạm vi quyền");
  const studentLogin = await signIn(student);
  const studentJar = studentLogin.jar;
  for (const path of [
    "/api/admin/users",
    `/api/admin/users/${admin1.id}`,
    "/api/admin/audit",
    "/api/admin/mfa-policy",
    "/api/admin/scopes",
    "/api/admin/csrf",
  ])
    expectStatus(
      await request(path, studentJar),
      403,
      "Sinhviên truy cậpADMIN",
    );
  for (const suffix of ["status", "roles", "reset-mfa"])
    expectStatus(
      await request(`/api/admin/users/${admin1.id}/${suffix}`, studentJar, {}),
      403,
      "Sinhviên gọi hành độngID",
    );
  pass(
    "Sinh viên không vào được danh sách, chi tiết, nhật ký, cấu hình hoặc hành động ADMIN",
  );
  await csrf(adminJar1);
  await csrf(adminJar2);
  const statusPath = `/api/admin/users/${rateStudent.id}/status`;
  expectStatus(
    await request(statusPath, adminJar1, { status: "ACTIVE" }, { csrf: false }),
    403,
    "Thiếu CSRF",
  );
  expectStatus(
    await request(
      statusPath,
      adminJar1,
      { status: "ACTIVE" },
      { csrf: "invalid" },
    ),
    403,
    "CSRFhỏng",
  );
  expectStatus(
    await request(
      statusPath,
      adminJar1,
      { status: "ACTIVE" },
      { csrf: adminJar2.csrf },
    ),
    403,
    "CSRFphiênkhác",
  );
  expectStatus(
    await request(
      statusPath,
      adminJar1,
      { status: "ACTIVE" },
      { origin: "https://example.invalid" },
    ),
    403,
    "Originlạ",
  );
  pass("CSRF thiếu, sai, khác phiên và Origin lạ bị chặn trên POST quản trị");
  const oldAccess = clone(adminJar1);
  expectStatus(
    await request("/api/auth/refresh", adminJar1, {}),
    200,
    "Xoay refreshMFA",
  );
  expectStatus(
    await request("/api/auth/me", oldAccess),
    401,
    "Accesscha hết hiệu lực",
  );
  const fullMe = await request("/api/auth/me", adminJar1);
  ensure(
    fullMe.data.user?.mfa && fullMe.data.user.purpose === "FULL",
    "Refresh làm mấtMFA.",
  );
  await csrf(adminJar1);
  pass(
    "Refresh giữ MFA từ DB, access cha bị vô hiệu và CSRF mới gắn phiên mới",
  );
  const logoutJar = race[0].status === 200 ? recoveryA.jar : recoveryB.jar;
  const logoutAccess = clone(logoutJar);
  expectStatus(
    await request("/api/auth/logout", logoutJar, {}),
    200,
    "ĐăngxuấtMFA",
  );
  expectStatus(
    await request("/api/auth/me", logoutAccess),
    401,
    "PhiênMFA đãlogout",
  );
  pass("Đăng xuất thu hồi phiên MFA đầy đủ");
  for (const user of [
    student,
    teacher,
    departmentHead,
    facultyHead,
    quality,
    leader,
  ]) {
    const jar = user.id === student.id ? studentJar : (await signIn(user)).jar;
    const list = await request("/api/workspace/sections", jar);
    expectStatus(list, 200, "Danh sách theo vai trò");
    const expected =
      user.role === "CAN_BO_DBCL" || user.role === "LANH_DAO" ? 2 : 1;
    ensure(
      list.data.total === expected && list.data.items?.length === expected,
      "List/count không khớp phạmvi.",
    );
    expectStatus(
      await request(`/api/workspace/sections/${sectionIds[0]}`, jar),
      200,
      "Lớp trong phạmvi",
    );
    expectStatus(
      await request(`/api/workspace/sections/${sectionIds[1]}`, jar),
      expected === 2 ? 200 : 404,
      "Lớpngoài phạmvi",
    );
  }
  pass(
    "6 vai trò: list/count/detail lọc đúng lớp ghi danh, giảng dạy, khoa, bộ môn, toàn trường",
  );
  expectStatus(
    await request("/api/workspace/sections", adminJar1),
    403,
    "ADMINkhôngkếthừa nghiệpvụ",
  );
  pass("ADMIN không tự có quyền xem lớp nếu chưa được gán vai trò nghiệp vụ");
  const wrongRolePage = await fetch(`${origin}/khong-gian/GIANG_VIEN`, {
    headers: {
      cookie: [...studentJar.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; "),
    },
    redirect: "manual",
  });
  ensure(
    wrongRolePage.status === 404 ||
      wrongRolePage.status === 307 ||
      wrongRolePage.status === 303,
    "ĐổiURL sangvai tròkhác khôngbịchặn.",
  );
  pass("Server Component chặn URL không gian của vai trò khác");

  begin("Quản lý người dùng, step-up và cấu hình MFA");
  const createdBody = {
    loginCode: `W4-${prefix}-new`,
    email: `${prefix}-new@example.invalid`,
    displayName: "Tài khoản giả được tạo bằngHTTP",
    roles: [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
  };
  expectStatus(
    await request("/api/admin/users", adminJar1, {
      ...createdBody,
      stepUpCode: "000000".slice(1),
    }),
    400,
    "Stepupthiếumãhợplệ",
  );
  const created = await request("/api/admin/users", adminJar1, {
    ...createdBody,
    stepUpCode: await freshCode(enrolled1.secret, admin1.id),
  });
  expectStatus(created, 201, "Tạongườidùng");
  ensure(
    created.data.user?.id && created.data.user.status === "PENDING_ACTIVATION",
    "Tài khoản mới phảichờkíchhoạt.",
  );
  ids.push(created.data.user.id);
  const createdRow = await db.user.findUnique({
    where: { id: created.data.user.id },
  });
  ensure(
    createdRow && !createdRow.passwordHash && createdRow.mustChangePassword,
    "Tạongườidùng đãcấpmậtkhẩu khôngđượcphép.",
  );
  pass(
    "ADMIN tạo tài khoản chờ kích hoạt bằng step-up TOTP mới, không cấp mật khẩu",
  );
  expectStatus(
    await request(`/api/admin/users/${createdRow.id}/roles`, adminJar1, {
      roles: [
        { role: "TRUONG_KHOA", scopeType: "FACULTY", facultyId: randomUUID() },
      ],
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    }),
    400,
    "PhạmviFKkhôngtồntại",
  );
  pass("Gán phạm vi khoa không tồn tại bị từ chối, không ghi vai trò rác");
  const roleChange = await request(
    `/api/admin/users/${createdRow.id}/roles`,
    adminJar1,
    {
      roles: [
        {
          role: "TRUONG_BO_MON",
          scopeType: "DEPARTMENT",
          departmentId: departmentIds[0],
        },
      ],
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    },
  );
  expectStatus(roleChange, 200, "Gánvaitròphạmvi");
  pass("Gán vai trò và bộ môn hợp lệ thành công qua HTTP và step-up");
  expectStatus(
    await request("/api/admin/mfa-policy", adminJar1, {
      requiredRoles: ["SINH_VIEN"],
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    }),
    400,
    "Cấu hìnhloạiADMIN",
  );
  pass("Cấu hình không cho tắt MFA bắt buộc ADMIN");
  expectStatus(
    await request("/api/admin/mfa-policy", adminJar1, {
      requiredRoles: ["SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"],
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    }),
    200,
    "BậtMFAchoSinhviên",
  );
  expectStatus(
    await request("/api/auth/me", studentJar),
    401,
    "PhiêncũSinhviên chưaMFA",
  );
  const nextStudent = await signIn(student);
  ensure(
    nextStudent.result.data.purpose === "MFA_SETUP" &&
      !nextStudent.jar.cookies.has("sfs_refresh"),
    "Sinhviên mới bắtbuộcMFAkhôngđượcsetup.",
  );
  pass(
    "G1: cấu hình đủ 10 vai trò MFA; thu hồi phiên cũ và buộc setup khi đăng nhập mới",
  );
  const rateLogin = await signIn(rateStudent);
  ensure(
    rateLogin.result.data.purpose === "MFA_VERIFY",
    "FixtureOTP chưaởbướcverify.",
  );
  for (let index = 0; index < 5; index++)
    expectStatus(
      await request("/api/auth/mfa-verify", rateLogin.jar, { code: "invalid" }),
      400,
      "LầnsaiOTP",
    );
  expectStatus(
    await request("/api/auth/mfa-verify", rateLogin.jar, {
      code: await generate({ secret: rateSecret, digits: 6, period: 30 }),
    }),
    429,
    "OTPđúngsaulần5",
  );
  pass("Sai OTP 5 lần khóa 15 phút; mã đúng ở lần 6 vẫn bị chặn");

  begin("Đặt lại 2FA, nhật ký và bảo vệ ADMIN cuối cùng");
  expectStatus(
    await request(`/api/admin/users/${admin1.id}/reset-mfa`, adminJar1, {
      reason: "Kiểm thử yêu cầu tự đặt lại",
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    }),
    403,
    "KhôngtựresetMFA",
  );
  pass("ADMIN không tự đặt lại 2FA qua web");
  const oldAdmin2 = clone(adminJar2);
  const reason =
    "Lý do giả kiểm thử mất thiết bị; không lưu văn bản này vào audit";
  sensitive.add(reason);
  expectStatus(
    await request(`/api/admin/users/${admin2.id}/reset-mfa`, adminJar1, {
      reason,
      stepUpCode: await freshCode(enrolled1.secret, admin1.id),
    }),
    200,
    "ResetMFAadminkhác",
  );
  expectStatus(
    await request("/api/auth/me", oldAdmin2),
    401,
    "Phiênadmin2saureset",
  );
  const resetLogin = await signIn(admin2);
  ensure(
    resetLogin.result.data.purpose === "MFA_SETUP",
    "ResetMFAchưabuộcđăngkýlại.",
  );
  const activeRecovery = await db.totpRecoveryCode.count({
    where: { userId: admin2.id, usedAt: null },
  });
  ensure(activeRecovery === 0, "ResetMFAchưathu hồimãkhôi phục.");
  pass(
    "ADMIN khác reset 2FA bằng step-up: thu hồi tất cả phiên, mã khôi phục và buộc đăng ký lại",
  );
  const reenrolled = await enroll(admin2, resetLogin.jar);
  adminJar2 = resetLogin.jar;
  ensure(
    reenrolled.secret !== enrolled2.secret,
    "Đăngkýlại táisửdụngsecretcũ.",
  );
  await csrf(adminJar2);
  pass("Đăng ký lại 2FA tạo secret và mã khôi phục mới");
  const filteredAudit = await request(
    `/api/admin/audit?action=MFA_RESET_BY_ADMIN&actorId=${admin1.id}&objectType=User&page=1&pageSize=10`,
    adminJar1,
  );
  expectStatus(filteredAudit, 200, "LọcAudit");
  ensure(
    filteredAudit.data.total === 1 && filteredAudit.data.items?.length === 1,
    "Lọc/phântrangAudit khôngđúng.",
  );
  const auditRows = await db.auditLog.findMany({
    where: { OR: [{ actorId: { in: ids } }, { objectId: { in: ids } }] },
  });
  const auditSerialized = JSON.stringify(auditRows);
  for (const value of sensitive)
    ensure(!auditSerialized.includes(value), "Audit đã chứa dữliệu nhạycảm.");
  ensure(
    !JSON.stringify(filteredAudit.data).includes("encryptedSecret") &&
      !JSON.stringify(filteredAudit.data).includes("codeHash"),
    "DTOauditlộtrườngMFA.",
  );
  pass(
    "Audit lọc/phân trang đúng; DB và DTO không chứa secret, mật khẩu, token, recovery hoặc lý do thô",
  );
  const selfDisable = await request(
    `/api/admin/users/${admin1.id}/status`,
    adminJar1,
    { status: "DISABLED" },
  );
  expectStatus(selfDisable, 409, "Tựkhóatàikhoản");
  const crossDisable = await Promise.all([
    request(`/api/admin/users/${admin2.id}/status`, adminJar1, {
      status: "DISABLED",
    }),
    request(`/api/admin/users/${admin1.id}/status`, adminJar2, {
      status: "DISABLED",
    }),
  ]);
  ensure(
    crossDisable.filter((value) => value.status === 200).length === 1 &&
      crossDisable.every((value) =>
        [200, 401, 403, 409].includes(value.status),
      ),
    `Hai ADMIN khóa chéo phải đúng một thắng; nhận HTTP ${crossDisable.map((value) => value.status).join("/")}.`,
  );
  ensure(
    (await db.user.count({
      where: { id: { in: [admin1.id, admin2.id] }, status: "ACTIVE" },
    })) === 1,
    "Phảigiữlại1ADMINactive.",
  );
  pass(
    "Hai ADMIN khóa chéo đồng thời giữ đúng 1 ADMIN hoạt động; tự khóa bị chặn",
  );
  if (fd !== undefined) {
    const log = readFileSync(".local/week4-http.log", "utf8");
    for (const value of sensitive)
      ensure(!log.includes(value), "LogHTTPtestchứadữliệunhạycảm.");
  }
  pass(
    "Log server riêng không in mật khẩu, token, OTP, secret QR, recovery hoặc CSRF",
  );
  console.log(`HTTP + MySQL Tuần 4: ${passed}/${passed} tình huống qua.`);
  saveResult("passed");
} catch (error) {
  console.error(
    `KHÔNG QUA tại ${currentCase}: ${error instanceof VerificationError && ![...sensitive].some((value) => error.message.includes(value)) ? error.message : "Lỗi hạ tầng hoặc DB; chi tiết kỹ thuật được ẩn."}`,
  );
  process.exitCode = 1;
  saveResult("failed");
} finally {
  if (child?.pid) {
    try {
      if (process.platform === "win32")
        execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          stdio: "ignore",
          windowsHide: true,
        });
      else process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  if (fd !== undefined) closeSync(fd);
  if (ids.length || facultyIds.length) {
    await db.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: ids } }, { objectId: { in: ids } }] },
      });
      await tx.systemSetting.deleteMany({
        where: {
          OR: [
            { updatedById: { in: ids } },
            { key: { in: ["MFA_REQUIRED_ROLES", "ADMIN_MUTATION_LOCK"] } },
          ],
        },
      });
      await tx.authToken.deleteMany({ where: { userId: { in: ids } } });
      await tx.totpRecoveryCode.deleteMany({ where: { userId: { in: ids } } });
      await tx.totpCredential.deleteMany({ where: { userId: { in: ids } } });
      await tx.userSession.updateMany({
        where: { userId: { in: ids } },
        data: { rotatedFromId: null },
      });
      await tx.userSession.deleteMany({ where: { userId: { in: ids } } });
      await tx.enrollment.deleteMany({ where: { studentId: { in: ids } } });
      await tx.teachingAssignment.deleteMany({
        where: { teacherId: { in: ids } },
      });
      await tx.roleAssignment.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
      await tx.courseSection.deleteMany({ where: { id: { in: sectionIds } } });
      await tx.course.deleteMany({ where: { id: { in: courseIds } } });
      await tx.department.deleteMany({ where: { id: { in: departmentIds } } });
      await tx.faculty.deleteMany({ where: { id: { in: facultyIds } } });
      if (semesterId)
        await tx.semester.deleteMany({ where: { id: semesterId } });
      await tx.rateLimitBucket.deleteMany({
        where: { keyHash: { in: [...rateKeys] } },
      });
    });
    ensure(
      (await db.user.count({ where: { id: { in: ids } } })) === 0,
      "DọnfixtureUUIDchưaxong.",
    );
    console.log(
      "Đã dọn đúng fixture UUID trong DB test riêng; DB chính, tài khoản demo và volume được giữ.",
    );
    saveResult(process.exitCode ? "failed" : "passed", true);
  }
  await db.$disconnect();
}
