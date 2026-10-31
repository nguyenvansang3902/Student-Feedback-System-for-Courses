import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { generate } from "otplib";
import { getDb } from "../src/lib/db";
import {
  encryptMfaSecret,
  hashRecoveryCode,
  newMfaSecret,
  newRecoveryCodes,
} from "../src/server/auth/mfa-crypto";
import { rateKey } from "../src/server/auth/rate-limit";

class VerificationError extends Error {}
function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new VerificationError(message);
}
const marker = JSON.parse(
  readFileSync(".local/totp60-test-database.json", "utf8"),
) as {
  database: string;
  mainDatabase: string;
  serverUuid: string;
  purpose: string;
};
const testUrl = process.env.TOTP60_TEST_DATABASE_URL;
ensure(
  testUrl && marker.purpose === "isolated-totp60-tests",
  "Thiếu database kiểm thử riêng đã xác nhận.",
);
const mainConnection = new URL(process.env.DATABASE_URL ?? "");
const testConnection = new URL(testUrl);
const mainDatabase = decodeURIComponent(mainConnection.pathname.slice(1));
const testDatabase = decodeURIComponent(testConnection.pathname.slice(1));
const shadowDatabase = decodeURIComponent(
  new URL(process.env.SHADOW_DATABASE_URL ?? "").pathname.slice(1),
);
const week4Database = process.env.W4_TEST_DATABASE_URL
  ? decodeURIComponent(
      new URL(process.env.W4_TEST_DATABASE_URL).pathname.slice(1),
    )
  : null;
const week4MarkerDatabase = existsSync(".local/week4-test-database.json")
  ? (
      JSON.parse(readFileSync(".local/week4-test-database.json", "utf8")) as {
        database?: string;
      }
    ).database
  : null;
const expectedPrefix = `${mainDatabase.slice(0, 34)}_t60test_`;
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
    testDatabase !== mainDatabase &&
    testDatabase !== shadowDatabase &&
    testDatabase !== week4Database &&
    testDatabase !== week4MarkerDatabase &&
    testDatabase.startsWith(expectedPrefix) &&
    /^[a-f0-9]{8}$/.test(testDatabase.slice(expectedPrefix.length)),
  "Database kiểm thử không khớp marker hoặc trùng database chính/shadow/Tuần4.",
);
process.env.DATABASE_URL = testUrl;
const port = Number(process.env.TOTP60_TEST_PORT ?? 3003);
ensure(
  Number.isInteger(port) && port > 1024 && port < 65536,
  "Cổng kiểm thử không hợp lệ.",
);
const origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const db = getDb();
const prefix = randomUUID().slice(0, 8);
const password = "Totp60!KiemThu2026";
const sensitive = new Set<string>(
  [
    password,
    process.env.JWT_SECRET ?? "",
    process.env.MFA_ENCRYPTION_KEY ?? "",
    decodeURIComponent(testConnection.password),
  ].filter(Boolean),
);
const ids: string[] = [];
const rateKeys = new Set<string>();
const completedCases: string[] = [];
const startedAt = new Date().toISOString();
let currentCase = "Khởi tạo";
let child: ReturnType<typeof spawn> | undefined;
let fd: number | undefined;
type Jar = { cookies: Map<string, string>; ip: string; csrf?: string };
type Payload = {
  ok?: boolean;
  code?: string;
  purpose?: string;
  csrfToken?: string;
  secret?: string;
  qrDataUrl?: string;
  expiresAt?: string;
  serverNow?: string;
  sessionExpiresAt?: string;
  periodSeconds?: number | null;
  defaultPeriodSeconds?: number;
  recoveryCodes?: string[];
  enabled?: boolean;
  user?: { id: string; mfa?: boolean; purpose?: string };
};
type Result = { status: number; data: Payload };
type Fixture = {
  id: string;
  loginCode: string;
  ip: string;
  secret?: string;
  recoveryCodes: string[];
};
const jar = (ip: string): Jar => ({ cookies: new Map(), ip });
const clone = (identity: Jar): Jar => ({
  ...identity,
  cookies: new Map(identity.cookies),
});
function saveResult(status: "running" | "passed" | "failed", cleaned = false) {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/totp60-http-result.json",
    JSON.stringify(
      {
        status,
        passed: completedCases.length,
        completedCases,
        startedAt,
        updatedAt: new Date().toISOString(),
        cleaned,
        isolatedDatabase: true,
      },
      null,
      2,
    ),
  );
}
function pass(name: string) {
  completedCases.push(name);
  currentCase = name;
  console.log(
    `QUA TOTP60-HTTP-${String(completedCases.length).padStart(2, "0")} ${name}`,
  );
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
function expectRejected(value: Result, message: string) {
  ensure(
    [400, 401, 403, 409].includes(value.status),
    `${message}: HTTP ${value.status} phải bị từ chối.`,
  );
}
async function request(
  path: string,
  identity: Jar,
  body?: unknown,
  requestOrigin = origin,
): Promise<Result> {
  for (const scope of ["login-ip", "mfa-ip"])
    rateKeys.add(rateKey(scope, identity.ip));
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : { "content-type": "application/json", origin: requestOrigin }),
      cookie: [...identity.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; "),
      "x-forwarded-for": identity.ip,
      ...(identity.csrf ? { "x-csrf-token": identity.csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  for (const raw of response.headers.getSetCookie()) {
    const match = raw.match(/^([^=]+)=([^;]*)/);
    if (!match) continue;
    if (match[2]) {
      identity.cookies.set(match[1], match[2]);
      sensitive.add(match[2]);
    } else identity.cookies.delete(match[1]);
  }
  const data = (await response.json()) as Payload;
  for (const value of [
    data.secret,
    data.qrDataUrl,
    ...(data.recoveryCodes ?? []),
  ])
    if (value) sensitive.add(value);
  return { status: response.status, data };
}
function sid(identity: Jar) {
  const token = identity.cookies.get("sfs_access");
  ensure(token, "Thiếu cookie của fixture.");
  const value = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
  ) as { sid?: string };
  ensure(
    value.sid && /^[a-f0-9-]{36}$/i.test(value.sid),
    "ID phiên fixture không hợp lệ.",
  );
  return value.sid;
}
async function signIn(user: Fixture) {
  const identity = jar(user.ip);
  const result = await request("/api/auth/login", identity, {
    identifier: user.loginCode,
    password,
  });
  expectStatus(result, 200, "Đăng nhập fixture");
  return { identity, result };
}
async function codeAt(secret: string, period: number, step: number) {
  const code = await generate({
    secret,
    period,
    digits: 6,
    epoch: step * period,
  });
  sensitive.add(code);
  return code;
}
async function freshCode(
  user: Fixture,
  secret: string,
  period: number,
  preferPrevious = false,
) {
  const row = await db.totpCredential.findUniqueOrThrow({
    where: { userId: user.id },
    select: { lastUsedStep: true },
  });
  let current = Math.floor(Date.now() / 1000 / period);
  if (
    preferPrevious &&
    Date.now() % (period * 1000) < period * 1000 - 5000 &&
    (row.lastUsedStep === null || BigInt(current - 1) > row.lastUsedStep)
  )
    return codeAt(secret, period, current - 1);
  if (row.lastUsedStep !== null && BigInt(current) <= row.lastUsedStep) {
    const waitMs =
      (Number(row.lastUsedStep) + 1) * period * 1000 - Date.now() + 150;
    console.log("Đang chờ mã mới của fixture để kiểm chặn dùng lại.");
    await delay(waitMs);
    current = Math.floor(Date.now() / 1000 / period);
  }
  return codeAt(secret, period, current);
}
function ticket(result: Result) {
  expectStatus(result, 200, "Cấp QR60giây");
  const {
    secret,
    qrDataUrl,
    expiresAt,
    serverNow,
    sessionExpiresAt,
    periodSeconds,
  } = result.data;
  ensure(
    secret &&
      qrDataUrl?.startsWith("data:image/png;base64,") &&
      expiresAt &&
      serverNow &&
      sessionExpiresAt &&
      periodSeconds === 60,
    "Thiếu QR/chu kỳ60 hoặc thời hạn thiết lập.",
  );
  const now = Date.parse(serverNow),
    end = Date.parse(expiresAt),
    flowEnd = Date.parse(sessionExpiresAt);
  ensure(
    Number.isFinite(now) &&
      end > now &&
      end - now <= 60000 &&
      end <= flowEnd &&
      flowEnd - now <= 300000,
    "Thời hạn QR/phiên chuyển đổi không đúng.",
  );
  return {
    secret,
    qrDataUrl,
    expiresAt,
    serverNow,
    sessionExpiresAt,
    periodSeconds,
  };
}
async function activeState(userId: string) {
  const row = await db.totpCredential.findUniqueOrThrow({ where: { userId } });
  return {
    encryptedSecret: row.encryptedSecret,
    keyVersion: row.keyVersion,
    periodSeconds: row.periodSeconds,
    enabledAt: row.enabledAt?.toISOString(),
    lastUsedStep: row.lastUsedStep?.toString(),
  };
}
async function counters(user: Fixture) {
  return JSON.stringify(
    await db.rateLimitBucket.findMany({
      where: {
        keyHash: {
          in: [rateKey("mfa-account", user.id), rateKey("mfa-ip", user.ip)],
        },
      },
      orderBy: { keyHash: "asc" },
    }),
  );
}
async function invalidCode(secret: string, period: number) {
  const step = Math.floor(Date.now() / 1000 / period);
  const valid = new Set(
    await Promise.all(
      [-1, 0, 1].map((offset) => codeAt(secret, period, step + offset)),
    ),
  );
  const code = ["000000", "111111", "222222", "333333"].find(
    (value) => !valid.has(value),
  )!;
  sensitive.add(code);
  return code;
}
async function recoveryLogin(user: Fixture, recoveryIndex: number) {
  const { identity, result } = await signIn(user);
  ensure(
    result.data.purpose === "MFA_VERIFY",
    "Credential cũ phải yêu cầu MFA_VERIFY.",
  );
  expectStatus(
    await request("/api/auth/mfa-verify", identity, {
      code: user.recoveryCodes[recoveryIndex],
    }),
    200,
    "Đăng nhập bằng mã khôi phục fixture",
  );
  return identity;
}

try {
  const [actual] = await db.$queryRaw<
    { name: string; serverUuid: string }[]
  >`SELECT DATABASE() AS name, @@server_uuid AS serverUuid`;
  ensure(
    actual?.name === marker.database && actual.serverUuid === marker.serverUuid,
    "Kết nối thật không khớp database kiểm thử có marker.",
  );
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new VerificationError("Cổng kiểm thử đang được dùng.");
  } catch (error) {
    if (error instanceof VerificationError) throw error;
  }
  const passwordHash = await hash(password, 12);
  const fixtures: Fixture[] = [];
  for (let index = 0; index < 4; index++) {
    const role = index === 3 ? "SINH_VIEN" : "ADMIN";
    const user = await db.user.create({
      data: {
        loginCode: `T60-${prefix}-${index}`,
        email: `${prefix}-${index}@example.invalid`,
        displayName: "Tài khoản giả kiểm thử TOTP60",
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        roles: { create: { role, scopeType: "GLOBAL", scopeKey: "GLOBAL" } },
      },
    });
    ids.push(user.id);
    for (const scope of ["login-account", "mfa-account"])
      rateKeys.add(rateKey(scope, user.id));
    const fixture: Fixture = {
      id: user.id,
      loginCode: user.loginCode,
      ip: `198.18.${parseInt(prefix.slice(0, 2), 16)}.${index + 11}`,
      recoveryCodes: [],
    };
    if (index < 2) {
      fixture.secret = newMfaSecret();
      sensitive.add(fixture.secret);
      fixture.recoveryCodes = newRecoveryCodes();
      fixture.recoveryCodes.forEach((value) => sensitive.add(value));
      await db.totpCredential.create({
        data: {
          userId: user.id,
          encryptedSecret: encryptMfaSecret(fixture.secret, user.id),
          keyVersion: process.env.MFA_KEY_VERSION ?? "v1",
          enabledAt: new Date(),
          lastUsedStep: BigInt(Math.floor(Date.now() / 30000) - 2),
        },
      });
      await db.totpRecoveryCode.createMany({
        data: fixture.recoveryCodes.map((code) => ({
          userId: user.id,
          codeHash: hashRecoveryCode(user.id, code),
        })),
      });
    }
    fixtures.push(fixture);
  }
  const [legacy, cancelled, newAdmin, student] = fixtures;
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/totp60-http.log", "w");
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
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
    ensure(
      child.exitCode === null,
      "Máy chủ kiểm thử kết thúc trước khi sẵn sàng.",
    );
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
  ensure(ready, "Máy chủ kiểm thử chưa sẵn sàng.");

  begin("Credential30 cũ còn đăng nhập và chống dùng lại sau migration");
  const initial = await db.totpCredential.findUniqueOrThrow({
    where: { userId: legacy.id },
  });
  ensure(
    initial.periodSeconds === 30,
    "Credential không ghi chu kỳ phải mặc định30 để tương thích dữ liệu cũ.",
  );
  const firstLogin = await signIn(legacy);
  ensure(
    firstLogin.result.data.purpose === "MFA_VERIFY",
    "Credential30 không đi qua MFA_VERIFY.",
  );
  const loginCode = await freshCode(legacy, legacy.secret!, 30, true);
  expectStatus(
    await request("/api/auth/mfa-verify", firstLogin.identity, {
      code: loginCode,
    }),
    200,
    "Xác minh TOTP30 cũ",
  );
  const identity = firstLogin.identity;
  const legacyStatus = await request("/api/auth/mfa-status", identity);
  ensure(
    legacyStatus.status === 200 &&
      legacyStatus.data.periodSeconds === 30 &&
      legacyStatus.data.defaultPeriodSeconds === 60 &&
      legacyStatus.data.enabled,
    "Status phải phân biệt credential30 hiện tại với mặc định60.",
  );
  pass(
    "Credential cũ mặc định30 vẫn đăng nhập; status trả chu kỳ riêng và mặc định60",
  );
  const otherFull = await recoveryLogin(legacy, 0);
  const partial = (await signIn(legacy)).identity;
  const studentJar = (await signIn(student)).identity;
  expectStatus(
    await request("/api/auth/mfa-period-setup", jar("198.18.0.99"), {}),
    401,
    "Khách bắt đầu đổi chu kỳ",
  );
  expectRejected(
    await request("/api/auth/mfa-period-setup", partial, {}),
    "Phiên MFA_VERIFY bắt đầu đổi",
  );
  expectRejected(
    await request("/api/auth/mfa-period-setup", studentJar, {}),
    "Phiên chưa xác minh MFA bắt đầu đổi",
  );
  expectStatus(
    await request(
      "/api/auth/mfa-period-setup",
      identity,
      {},
      "https://example.invalid",
    ),
    403,
    "Origin lạ",
  );
  expectStatus(
    await request("/api/auth/mfa-period-setup", identity, {
      code: "123456",
      userId: cancelled.id,
    }),
    400,
    "Chèn ID tài khoản khác",
  );
  pass(
    "Khách, phiên tạm, phiên chưa MFA, Origin lạ và chèn userId đều bị chặn",
  );
  expectRejected(
    await request("/api/auth/mfa-period-setup", identity, {}),
    "Thiếu mã xác minh cũ mới",
  );
  expectStatus(
    await request("/api/auth/mfa-period-setup", identity, { code: loginCode }),
    400,
    "Dùng lại mã đăng nhập để đổi",
  );
  expectStatus(
    await request("/api/auth/mfa-period-setup", identity, {
      code: await invalidCode(legacy.secret!, 30),
    }),
    400,
    "Sai mã cũ khi bắt đầu đổi",
  );
  const oldBefore = await activeState(legacy.id);
  const started = ticket(
    await request("/api/auth/mfa-period-setup", identity, {
      code: await freshCode(legacy, legacy.secret!, 30),
    }),
  );
  const oldAfterStart = await activeState(legacy.id);
  ensure(
    oldAfterStart.encryptedSecret === oldBefore.encryptedSecret &&
      oldAfterStart.periodSeconds === 30 &&
      oldAfterStart.enabledAt === oldBefore.enabledAt &&
      Number(oldAfterStart.lastUsedStep) >= Number(oldBefore.lastUsedStep),
    "Cấp QR đổi chu kỳ đã thay activecredential trước xác nhận.",
  );
  const recoveryBefore = await db.totpRecoveryCode.findMany({
    where: { userId: legacy.id },
    orderBy: { id: "asc" },
  });
  pass(
    "Bắt đầu cần mã cũ mới; sai/replay bị từ chối; active30 và recovery giữ nguyên",
  );
  const repeated = ticket(
    await request("/api/auth/mfa-period-setup", identity, {}),
  );
  ensure(
    repeated.secret === started.secret &&
      repeated.expiresAt === started.expiresAt &&
      repeated.sessionExpiresAt === started.sessionExpiresAt,
    "Gọi lại đã đổi khóa hoặc kéo dài thời hạn.",
  );
  const otherAttempt = await request(
    "/api/auth/mfa-period-setup",
    otherFull,
    {},
  );
  expectRejected(otherAttempt, "Phiên FULL khác lấy QR đang chờ");
  ensure(
    !otherAttempt.data.secret && !otherAttempt.data.qrDataUrl,
    "Phiên khác nhận được bí mật chờ đổi.",
  );
  expectRejected(
    await request("/api/auth/mfa-period-confirm", otherFull, {
      code: await codeAt(started.secret, 60, Math.floor(Date.now() / 60000)),
    }),
    "Phiên khác xác nhận QR",
  );
  pass(
    "QR/hạn gọi lại không đổi; QR chuyển đổi gắn đúng phiên, không lộ cho phiên khác",
  );
  const counterBeforeExpired = await counters(legacy);
  await db.totpCredential.update({
    where: { userId: legacy.id },
    data: { changeExpiresAt: new Date(Date.now() - 1) },
  });
  expectStatus(
    await request("/api/auth/mfa-period-confirm", identity, {
      code: await codeAt(started.secret, 60, Math.floor(Date.now() / 60000)),
    }),
    403,
    "QR chuyển đổi đã hết hạn",
  );
  ensure(
    (await counters(legacy)) === counterBeforeExpired &&
      JSON.stringify(await activeState(legacy.id)) ===
        JSON.stringify(oldAfterStart),
    "QR hết hạn đã tính saiOTP hoặc thay activecredential.",
  );
  const previousAuditCount = await db.auditLog.count({
    where: { actorId: legacy.id, action: "MFA_PERIOD_CHANGE_QR_RENEWED" },
  });
  const renewals = await Promise.all([
    request("/api/auth/mfa-period-setup", clone(identity), {}),
    request("/api/auth/mfa-period-setup", clone(identity), {}),
  ]);
  const [rotated, concurrent] = renewals.map(ticket);
  ensure(
    rotated.secret !== started.secret &&
      rotated.secret === concurrent.secret &&
      rotated.expiresAt === concurrent.expiresAt &&
      rotated.sessionExpiresAt === started.sessionExpiresAt &&
      (await db.auditLog.count({
        where: { actorId: legacy.id, action: "MFA_PERIOD_CHANGE_QR_RENEWED" },
      })) ===
        previousAuditCount + 1,
    "Cấp lại đồng thời không cùng khóa mới/hạn cố định/một audit.",
  );
  pass(
    "QR hết hạn403 không tính saiOTP; hai yêu cầu cấp lại tạo đúng một khóa và giữ hạn5phút",
  );
  expectStatus(
    await request("/api/auth/mfa-period-confirm", identity, {
      code: await invalidCode(rotated.secret, 60),
    }),
    400,
    "Sai mã mới60",
  );
  ensure(
    JSON.stringify(await activeState(legacy.id)) ===
      JSON.stringify(oldAfterStart),
    "Sai mã60 đã sửa cấu hình30 đang hoạt động.",
  );
  const newStep = Math.floor(Date.now() / 60000) - 1;
  const newCode = await codeAt(rotated.secret, 60, newStep);
  const confirmations = await Promise.all([
    request("/api/auth/mfa-period-confirm", clone(identity), { code: newCode }),
    request("/api/auth/mfa-period-confirm", clone(identity), { code: newCode }),
  ]);
  ensure(
    confirmations.filter((result) => result.status === 200).length === 1 &&
      confirmations.filter((result) => result.status !== 200).length === 1,
    "Hai xác nhận đồng thời phải đúng một thành công.",
  );
  const changed = await db.totpCredential.findUniqueOrThrow({
    where: { userId: legacy.id },
  });
  ensure(
    changed.periodSeconds === 60 &&
      changed.encryptedSecret !== oldBefore.encryptedSecret &&
      changed.lastUsedStep === BigInt(newStep) &&
      changed.changeEncryptedSecret === null &&
      changed.changeExpiresAt === null &&
      changed.changeSessionId === null &&
      changed.changeStartedAt === null,
    "Cấu hình60/counter mới hoặc xóa trạng thái chờ không đúng.",
  );
  ensure(
    JSON.stringify(
      await db.totpRecoveryCode.findMany({
        where: { userId: legacy.id },
        orderBy: { id: "asc" },
      }),
    ) === JSON.stringify(recoveryBefore),
    "Chuyển chu kỳ đã đổi hoặc làm mất mã khôi phục.",
  );
  expectStatus(
    await request("/api/auth/me", identity),
    200,
    "Phiên thực hiện sau chuyển đổi",
  );
  ensure(
    !(await db.userSession.findUniqueOrThrow({ where: { id: sid(identity) } }))
      .revokedAt,
    "Phiên thực hiện chuyển đổi bị thu hồi ngoài ý muốn.",
  );
  expectStatus(
    await request("/api/auth/me", otherFull),
    401,
    "Phiên FULL khác phải bị thu hồi",
  );
  expectStatus(
    await request("/api/auth/me", partial),
    401,
    "Phiên MFA_VERIFY cũ phải bị thu hồi",
  );
  pass(
    "Sai mã60 giữ nguyên30; xác nhận đồng thời chỉ một thắng, đặt counter60, giữ recovery và thu hồi phiên khác",
  );
  expectStatus(
    await request("/api/auth/mfa-period-setup", identity, {}),
    409,
    "Tài khoản đã60 không quay lại quy trình đổi",
  );
  const afterLogin = await signIn(legacy);
  expectStatus(
    await request("/api/auth/mfa-verify", afterLogin.identity, {
      code: await codeAt(legacy.secret!, 30, Math.floor(Date.now() / 30000)),
    }),
    400,
    "Mã khóa30 cũ sau chuyển đổi",
  );
  const login60 = await freshCode(legacy, rotated.secret, 60);
  expectStatus(
    await request("/api/auth/mfa-verify", afterLogin.identity, {
      code: login60,
    }),
    200,
    "Đăng nhập bằng60 sau chuyển đổi",
  );
  const afterStatus = await request(
    "/api/auth/mfa-status",
    afterLogin.identity,
  );
  ensure(
    afterStatus.status === 200 && afterStatus.data.periodSeconds === 60,
    "Status chưa phản ánh60.",
  );
  pass("Đăng nhập mới nhận60, từ chối khóa30 cũ; status cập nhật60");
  const csrfResult = await request("/api/admin/csrf", afterLogin.identity);
  expectStatus(csrfResult, 200, "CSRF trước step-up60");
  ensure(csrfResult.data.csrfToken, "Thiếu CSRF step-up60.");
  afterLogin.identity.csrf = csrfResult.data.csrfToken;
  sensitive.add(csrfResult.data.csrfToken);
  // Bước tiếp theo nằm trong cửa sổ +1 đã quy định; không chỉnh counter DB hoặc nới kiểm tra mã.
  const stepCode = await codeAt(
    rotated.secret,
    60,
    Math.floor(Date.now() / 60000) + 1,
  );
  const targetLogin = `T60-${prefix}-created`;
  const created = await request("/api/admin/users", afterLogin.identity, {
    loginCode: targetLogin,
    email: `${prefix}-created@example.invalid`,
    displayName: "Tài khoản giả được tạo bằng step-up60",
    roles: [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
    stepUpCode: stepCode,
  });
  expectStatus(created, 201, "Thao tác ADMIN nhạy cảm bằng step-up60");
  ensure(created.data.user?.id, "Không có ID fixture mới được tạo.");
  ids.push(created.data.user.id);
  const recoveryFull = await recoveryLogin(legacy, 1);
  expectStatus(
    await request("/api/auth/me", recoveryFull),
    200,
    "Recovery sau chuyển đổi60",
  );
  pass(
    "Step-up của thao tác ADMIN dùng chu kỳ60; mã khôi phục cũ vẫn đăng nhập được",
  );
  const replay60 = (await signIn(legacy)).identity;
  expectStatus(
    await request("/api/auth/mfa-verify", replay60, { code: login60 }),
    400,
    "Dùng lại mã60",
  );
  pass("Mã60 đã dùng bị từ chối sau đăng nhập và thao tác step-up");

  begin("Hủy chuyển đổi và hạn5phút không thay cấu hình30 cũ");
  const cancelJar = await recoveryLogin(cancelled, 0);
  const cancelTicket = ticket(
    await request("/api/auth/mfa-period-setup", cancelJar, {
      code: await freshCode(cancelled, cancelled.secret!, 30, true),
    }),
  );
  const cancelState = await activeState(cancelled.id);
  expectStatus(
    await request("/api/auth/mfa-period-cancel", cancelJar, {}),
    200,
    "Hủy chuyển đổi",
  );
  ensure(
    JSON.stringify(await activeState(cancelled.id)) ===
      JSON.stringify(cancelState),
    "Hủy chuyển đổi đã thay cấu hình30.",
  );
  const cancelledRow = await db.totpCredential.findUniqueOrThrow({
    where: { userId: cancelled.id },
  });
  ensure(
    cancelledRow.changeEncryptedSecret === null &&
      cancelledRow.changeSessionId === null,
    "Hủy chuyển đổi chưa xóa thiết lập chờ.",
  );
  expectRejected(
    await request("/api/auth/mfa-period-confirm", cancelJar, {
      code: await codeAt(
        cancelTicket.secret,
        60,
        Math.floor(Date.now() / 60000),
      ),
    }),
    "Xác nhận QR đã hủy",
  );
  const restarted = ticket(
    await request("/api/auth/mfa-period-setup", cancelJar, {
      code: await freshCode(cancelled, cancelled.secret!, 30),
    }),
  );
  ensure(
    restarted.secret !== cancelTicket.secret,
    "Bắt đầu lại dùng lại QR đã hủy.",
  );
  await db.totpCredential.update({
    where: { userId: cancelled.id },
    data: {
      changeStartedAt: new Date(Date.now() - 300001),
      changeExpiresAt: new Date(Date.now() - 1),
    },
  });
  const expiredFlowCounters = await counters(cancelled);
  expectStatus(
    await request("/api/auth/mfa-period-setup", cancelJar, {}),
    403,
    "Phiên chuyển đổi5phút đã hết hạn",
  );
  const expiredState = await activeState(cancelled.id);
  ensure(
    expiredState.periodSeconds === 30 &&
      expiredState.encryptedSecret === cancelState.encryptedSecret &&
      (await counters(cancelled)) === expiredFlowCounters,
    "Hết hạn luồng đổi đã sửa active30 hoặc tính saiOTP.",
  );
  pass(
    "Hủy xóa QR chờ, bắt đầu lại cần mã cũ mới; hết5phút không tự gia hạn hoặc đổi active30",
  );

  begin("Tài khoản chưa bật2FA được thiết lập mới60 ngay từ đầu");
  const newLogin = await signIn(newAdmin);
  ensure(
    newLogin.result.data.purpose === "MFA_SETUP",
    "ADMIN mới phải vào thiết lậpMFA.",
  );
  const setup = ticket(
    await request("/api/auth/mfa-setup", newLogin.identity, {}),
  );
  const newRow = await db.totpCredential.findUniqueOrThrow({
    where: { userId: newAdmin.id },
  });
  ensure(
    newRow.periodSeconds === 60 &&
      !newRow.enabledAt &&
      newRow.encryptedSecret !== setup.secret,
    "Setup mới chưa lưu60/mã hóa hoặc đã bật sớm.",
  );
  expectStatus(
    await request("/api/auth/mfa-confirm", newLogin.identity, {
      code: await codeAt(setup.secret, 60, Math.floor(Date.now() / 60000)),
    }),
    200,
    "Xác nhận setup mới60",
  );
  const statusNew = await request("/api/auth/mfa-status", newLogin.identity);
  ensure(
    statusNew.status === 200 &&
      statusNew.data.enabled &&
      statusNew.data.periodSeconds === 60,
    "Setup mới xác nhận chưa bật60.",
  );
  pass(
    "Đăng ký mới sinh QR period60, mã hóa khóa và chỉ bật sau khi xác nhận mã60",
  );

  const audits = await db.auditLog.findMany({
    where: { OR: [{ actorId: { in: ids } }, { objectId: { in: ids } }] },
  });
  const serializedAudits = JSON.stringify(audits);
  for (const value of sensitive)
    ensure(
      !serializedAudits.includes(value),
      "Audit chứa thông tin xác thực nhạy cảm.",
    );
  ensure(
    audits.filter(
      (row) => row.actorId === legacy.id && row.action === "MFA_PERIOD_CHANGED",
    ).length === 1,
    "Chuyển đổi thành công phải có đúng một audit.",
  );
  const log = readFileSync(".local/totp60-http.log", "utf8");
  for (const value of sensitive)
    ensure(
      !log.includes(value),
      "Log máy chủ chứa thông tin xác thực nhạy cảm.",
    );
  pass(
    "Audit ghi đúng một lần chuyển đổi; audit/log không có mật khẩu, khóa, QR, OTP hoặc cookie",
  );
  console.log(
    `HTTP + MySQL TOTP60: ${completedCases.length}/${completedCases.length} nhóm qua.`,
  );
  saveResult("passed");
} catch (error) {
  console.error(
    `KHÔNG QUA tại ${currentCase}: ${error instanceof VerificationError && ![...sensitive].some((value) => error.message.includes(value)) ? error.message : "Lỗi hạ tầng hoặc database; chi tiết xác thực được ẩn."}`,
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
  if (ids.length) {
    // Chỉ dọn các UUID được lần chạy này tạo trong DB riêng; giữ User/AuditLog làm lịch sử.
    await db.$transaction(async (tx) => {
      await tx.authToken.deleteMany({ where: { userId: { in: ids } } });
      await tx.totpRecoveryCode.deleteMany({ where: { userId: { in: ids } } });
      await tx.totpCredential.deleteMany({ where: { userId: { in: ids } } });
      await tx.userSession.updateMany({
        where: { userId: { in: ids } },
        data: { revokedAt: new Date(), rotatedFromId: null },
      });
      await tx.roleAssignment.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.updateMany({
        where: { id: { in: ids }, loginCode: { startsWith: `T60-${prefix}-` } },
        data: { status: "DISABLED", passwordHash: null },
      });
      await tx.rateLimitBucket.deleteMany({
        where: { keyHash: { in: [...rateKeys] } },
      });
    });
    ensure(
      (await db.user.count({
        where: {
          id: { in: ids },
          OR: [
            { status: { not: "DISABLED" } },
            { passwordHash: { not: null } },
          ],
        },
      })) === 0,
      "Fixture chưa được vô hiệu hóa đầy đủ.",
    );
    ensure(
      (await db.totpCredential.count({ where: { userId: { in: ids } } })) ===
        0 &&
        (await db.totpRecoveryCode.count({
          where: { userId: { in: ids } },
        })) === 0,
      "Bí mật MFA của fixture chưa được dọn.",
    );
    console.log(
      "Đã vô hiệu hóa fixture và dọn bí mật; giữ User/AuditLog, không đụng dữ liệu chính hoặc dữ liệu kiểm thử khác.",
    );
    saveResult(process.exitCode ? "failed" : "passed", true);
  }
  await db.$disconnect();
}
