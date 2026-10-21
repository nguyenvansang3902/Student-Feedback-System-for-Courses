import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, openSync, closeSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import { rateKey } from "../src/server/auth/rate-limit";

// Chỉ tạo/xóa fixture UUID của lần chạy này; không dùng tài khoản demo/người thật.
const port = Number(process.env.AUTH_TEST_PORT || 3002);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const origin = `http://127.0.0.1:${port}`;
process.env.APP_URL = origin;
const prefix = randomUUID().slice(0, 8);
const ipPrefix = `198.18.${parseInt(prefix.slice(0, 2), 16)}`;
const password = "KiemThu2026!BanDau";
const changedPassword = "KiemThu2026!DaThay";
const resetPassword = "KiemThu2026!KhoiPhuc";
const db = getDb();
const ids: string[] = [];
const rateKeys = new Set<string>();
let passed = 0;
let child: ReturnType<typeof spawn> | undefined;
let fd: number | undefined;
const jar = () => new Map<string, string>();
function contextIp(index: number) {
  const ip = `${ipPrefix}.${index}`;
  for (const scope of [
    "login-ip",
    "ACTIVATION:request:ip",
    "PASSWORD_RESET:request:ip",
    "ACTIVATION:complete:ip",
    "PASSWORD_RESET:complete:ip",
  ])
    rateKeys.add(rateKey(scope, ip));
  return ip;
}
async function request(
  action: string,
  body?: unknown,
  cookies = jar(),
  ip = contextIp(1),
  sentOrigin = origin,
) {
  const response = await fetch(`${origin}/api/auth/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : { "content-type": "application/json", origin: sentOrigin }),
      cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      "x-forwarded-for": ip,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const headers = response.headers.getSetCookie();
  for (const cookie of headers) {
    const match = cookie.match(/^([^=]+)=([^;]*)/)!;
    if (match[2]) cookies.set(match[1], match[2]);
    else cookies.delete(match[1]);
  }
  const data = await response.json();
  return { status: response.status, data, headers };
}
function pass(name: string) {
  passed++;
  console.log(`QUA W3-HTTP-${String(passed).padStart(2, "0")} ${name}`);
}
async function signIn(
  user: { loginCode: string },
  ip = contextIp(1),
  value = password,
) {
  const cookies = jar();
  assert.equal(
    (
      await request(
        "login",
        { identifier: user.loginCode, password: value },
        cookies,
        ip,
      )
    ).status,
    200,
  );
  return cookies;
}
async function mailToken(to: string) {
  const messages = await (
    await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100")
  ).json();
  const message = messages.messages.find(
    (item: { To: { Address: string }[] }) =>
      item.To.some((entry) => entry.Address === to),
  );
  assert(message, "Mailpit chưa có thư cho fixture");
  const detail = await (
    await fetch(`http://127.0.0.1:8025/api/v1/message/${message.ID}`)
  ).json();
  const token = String(detail.Text).match(/#token=([A-Za-z0-9_-]{43})/)?.[1];
  assert(token, "Thư không có token fragment hợp lệ");
  for (const kind of ["ACTIVATION", "PASSWORD_RESET"])
    rateKeys.add(rateKey(`${kind}:complete:token`, token));
  return token;
}
try {
  // Không chiếm cổng của một server đang có.
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new Error("Cổng test đang được dùng; chọn AUTH_TEST_PORT khác.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cổng test"))
      throw error;
  }
  const passwordHash = await hash(password, 12);
  const users = [];
  for (const kind of ["normal", "temporary", "pending", "disabled", "locked"]) {
    const user = await db.user.create({
      data: {
        loginCode: `T3-${prefix}-${kind}`,
        email: `${prefix}-${kind}@example.invalid`,
        displayName: "Tài khoản giả kiểm thử",
        passwordHash: kind === "pending" ? null : passwordHash,
        status:
          kind === "pending"
            ? "PENDING_ACTIVATION"
            : kind === "disabled"
              ? "DISABLED"
              : "ACTIVE",
        mustChangePassword: kind === "temporary",
        roles: {
          create: {
            role: "SINH_VIEN",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
          },
        },
      },
    });
    ids.push(user.id);
    users.push(user);
    rateKeys.add(rateKey("login-account", user.id));
    for (const scope of [
      "ACTIVATION:request:account",
      "PASSWORD_RESET:request:account",
    ])
      rateKeys.add(rateKey(scope, user.email));
  }
  const [normal, temporary, pending, disabled, locked] = users;
  mkdirSync(".local", { recursive: true });
  fd = openSync(".local/auth-http.log", "w");
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
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null)
      throw new Error("Máy chủ test dừng; kiểm .local/auth-http.log cục bộ.");
    try {
      const res = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  assert(ready, "Máy chủ test chưa sẵn sàng");
  assert.equal(
    (
      await request(
        "login",
        { identifier: normal.loginCode, password },
        jar(),
        contextIp(1),
        "https://example.invalid",
      )
    ).status,
    403,
  );
  pass("BR-31 chặn Origin khác");
  const cookies = jar();
  const signed = await request(
    "login",
    { identifier: normal.loginCode, password },
    cookies,
  );
  assert.equal(signed.status, 200);
  assert(!("accessToken" in signed.data));
  assert(
    signed.headers.every(
      (value) => /httponly/i.test(value) && /samesite=lax/i.test(value),
    ),
  );
  assert(
    signed.headers.some(
      (value) =>
        value.startsWith("sfs_refresh=") && /path=\/api\/auth/i.test(value),
    ),
  );
  pass("FR-01 mã SV đăng nhập, cookie đúng cờ, không token trong JSON");
  assert.equal(
    (await request("me", undefined, cookies)).data.user.id,
    normal.id,
  );
  pass("FR-02 access đọc đúng tài khoản");
  const byEmail = jar();
  assert.equal(
    (await request("login", { identifier: normal.email, password }, byEmail))
      .status,
    200,
  );
  pass("FR-01 đăng nhập bằng email");
  const csrfLogout = await request(
    "logout",
    {},
    new Map(byEmail),
    contextIp(1),
    "https://example.invalid",
  );
  assert.equal(csrfLogout.status, 403);
  assert.equal(csrfLogout.headers.length, 0);
  assert.equal((await request("me", undefined, byEmail)).status, 200);
  pass("BR-31 Origin sai không đăng xuất hay xóa cookie hiện tại");
  const oldAccess = jar();
  oldAccess.set("sfs_access", cookies.get("sfs_access")!);
  const oldRefresh = jar();
  oldRefresh.set("sfs_refresh", cookies.get("sfs_refresh")!);
  assert.equal((await request("refresh", {}, cookies)).status, 200);
  assert.equal((await request("me", undefined, oldAccess)).status, 401);
  assert.equal((await request("me", undefined, cookies)).status, 200);
  pass("BR-31 refresh xoay vòng, access cũ mất hiệu lực");
  assert.equal((await request("refresh", {}, oldRefresh)).status, 401);
  assert.equal((await request("me", undefined, cookies)).status, 401);
  pass("BR-31 refresh reuse thu hồi cả chuỗi");
  const logoutCookies = await signIn(normal);
  const beforeLogout = new Map(logoutCookies);
  assert.equal((await request("logout", {}, logoutCookies)).status, 200);
  assert.equal((await request("me", undefined, beforeLogout)).status, 401);
  pass("FR-02 đăng xuất vô hiệu access cũ");
  const refreshOnly = await signIn(normal);
  refreshOnly.delete("sfs_access");
  assert.equal((await request("logout", {}, refreshOnly)).status, 200);
  pass("FR-02 đăng xuất khi không còn access");
  const limited = await signIn(temporary);
  assert.equal(
    (await request("me", undefined, limited)).data.user.mustChangePassword,
    true,
  );
  const page = await fetch(`${origin}/tai-khoan`, {
    headers: { cookie: [...limited].map(([k, v]) => `${k}=${v}`).join("; ") },
    redirect: "manual",
  });
  assert([307, 308].includes(page.status));
  assert(page.headers.get("location")?.includes("doi-mat-khau"));
  pass("FR-05 mật khẩu tạm bị buộc đổi trước khu vực tài khoản");
  const sessionA = await signIn(normal);
  const sessionB = await signIn(normal);
  assert.equal(
    (
      await request(
        "change-password",
        { currentPassword: password, newPassword: "ệ".repeat(25) },
        sessionA,
      )
    ).status,
    400,
  );
  pass("BR-31 từ chối mật khẩu vượt 72 byte UTF-8");
  assert.equal(
    (
      await request(
        "change-password",
        { currentPassword: password, newPassword: changedPassword },
        sessionA,
      )
    ).status,
    200,
  );
  assert.equal((await request("me", undefined, sessionB)).status, 401);
  pass("FR-03 đổi mật khẩu thu hồi mọi phiên");
  const oldPassword = await request(
    "login",
    { identifier: normal.loginCode, password },
    jar(),
    contextIp(2),
  );
  assert.equal(oldPassword.status, 401);
  const current = await signIn(normal, contextIp(3), changedPassword);
  pass("FR-03 mật khẩu cũ bị chặn, mật khẩu mới dùng được");
  const resetRequest = await request(
    "forgot-password",
    { email: normal.email },
    jar(),
    contextIp(4),
  );
  assert.equal(resetRequest.status, 200);
  const resetToken = await mailToken(normal.email);
  const tokenRow = await db.authToken.findUniqueOrThrow({
    where: { tokenHash: createHash("sha256").update(resetToken).digest("hex") },
  });
  assert(
    tokenRow.expiresAt.getTime() - Date.now() > 28 * 60000 &&
      tokenRow.expiresAt.getTime() - Date.now() <= 30 * 60000,
  );
  pass("FR-04 Mailpit nhận liên kết, DB chỉ lưu hash và hạn 30 phút");
  const expiredToken = randomBytes(32).toString("base64url");
  rateKeys.add(rateKey("PASSWORD_RESET:complete:token", expiredToken));
  await db.authToken.create({
    data: {
      userId: normal.id,
      kind: "PASSWORD_RESET",
      tokenHash: createHash("sha256").update(expiredToken).digest("hex"),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.equal(
    (
      await request(
        "reset-password",
        { token: expiredToken, newPassword: resetPassword },
        jar(),
        contextIp(14),
      )
    ).status,
    400,
  );
  assert.equal((await request("me", undefined, current)).status, 200);
  pass(
    "FR-04 token hết hạn bị chặn, không đổi mật khẩu hay thu hồi phiên hợp lệ",
  );
  const outcomes = await Promise.all([
    request(
      "reset-password",
      { token: resetToken, newPassword: resetPassword },
      jar(),
      contextIp(5),
    ),
    request(
      "reset-password",
      { token: resetToken, newPassword: resetPassword },
      jar(),
      contextIp(6),
    ),
  ]);
  assert.equal(outcomes.filter((item) => item.status === 200).length, 1);
  assert.equal((await request("me", undefined, current)).status, 401);
  pass("FR-04 hai POST reset đồng thời chỉ một thành công và thu hồi phiên");
  assert.equal(
    (
      await request(
        "reset-password",
        { token: resetToken, newPassword: resetPassword },
        jar(),
        contextIp(7),
      )
    ).status,
    400,
  );
  pass("FR-04 token dùng lại bị chặn");
  assert.equal(
    (
      await request(
        "login",
        { identifier: pending.loginCode, password },
        jar(),
        contextIp(8),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await request(
        "request-activation",
        { email: pending.email },
        jar(),
        contextIp(9),
      )
    ).status,
    200,
  );
  const activationToken = await mailToken(pending.email);
  pass("FR-05 tài khoản chờ không đăng nhập, nhận email kích hoạt");
  assert.equal(
    (
      await request(
        "reset-password",
        { token: activationToken, newPassword: resetPassword },
        jar(),
        contextIp(10),
      )
    ).status,
    400,
  );
  pass("BR-31 token khác mục đích bị chặn");
  assert.equal(
    (
      await request(
        "activate",
        { token: activationToken, newPassword: resetPassword },
        jar(),
        contextIp(11),
      )
    ).status,
    200,
  );
  await signIn(pending, contextIp(12), resetPassword);
  pass("FR-05 kích hoạt đặt mật khẩu và đăng nhập thành công");
  const beforeDisable = await signIn(normal, contextIp(15), resetPassword);
  await db.user.update({
    where: { id: normal.id },
    data: { status: "DISABLED" },
  });
  assert.equal((await request("me", undefined, beforeDisable)).status, 401);
  assert.equal((await request("refresh", {}, beforeDisable)).status, 401);
  pass("FR-02 khóa tài khoản vô hiệu access và refresh đang tồn tại");
  assert.equal(
    (
      await request(
        "login",
        { identifier: disabled.loginCode, password },
        jar(),
        contextIp(13),
      )
    ).status,
    401,
  );
  pass("BR-31 tài khoản đã khóa không đăng nhập");
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await request(
          "login",
          {
            identifier: i % 2 ? locked.email : locked.loginCode,
            password: "MatKhauSai",
          },
          jar(),
          contextIp(20 + i),
        )
      ).status,
      401,
    );
  assert.equal(
    (
      await request(
        "login",
        { identifier: locked.loginCode, password },
        jar(),
        contextIp(25),
      )
    ).status,
    429,
  );
  pass("FR-06 sai 5 lần bằng mã/email, IP khác vẫn khóa tài khoản");
  const audits = await db.auditLog.findMany({
    where: { OR: [{ actorId: { in: ids } }, { objectId: { in: ids } }] },
  });
  const serialized = JSON.stringify(audits);
  for (const secret of [
    password,
    changedPassword,
    resetPassword,
    resetToken,
    activationToken,
  ])
    assert(!serialized.includes(secret));
  pass("BR-30 audit không chứa mật khẩu/token");
  console.log(`HTTP + MySQL + Mailpit: ${passed}/${passed} tình huống qua.`);
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
    await db.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: ids } }, { objectId: { in: ids } }] },
      });
      await tx.authToken.deleteMany({ where: { userId: { in: ids } } });
      await tx.userSession.updateMany({
        where: { userId: { in: ids } },
        data: { rotatedFromId: null },
      });
      await tx.userSession.deleteMany({ where: { userId: { in: ids } } });
      await tx.roleAssignment.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
      await tx.rateLimitBucket.deleteMany({
        where: { keyHash: { in: [...rateKeys] } },
      });
    });
    assert.equal(await db.user.count({ where: { id: { in: ids } } }), 0);
    console.log(
      "Đã dọn đúng fixture UUID; giữ tài khoản demo/dữ liệu hiện có. Thư giả giữ trong Mailpit để đối chiếu.",
    );
  }
  await db.$disconnect();
}
