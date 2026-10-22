import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { getDb } from "../src/lib/db";
import {
  encryptMfaSecret,
  getMfaKeyVersion,
  hashRecoveryCode,
  newMfaSecret,
} from "../src/server/auth/mfa-crypto";
import { hashRefreshToken, newRefreshToken } from "../src/server/auth/session";

const marker = JSON.parse(
  readFileSync(".local/week4-test-database.json", "utf8"),
);
const target = new URL(process.env.W4_TEST_DATABASE_URL ?? "");
const main = new URL(process.env.DATABASE_URL!);
assert(
  target.protocol === "mysql:" &&
    target.host === main.host &&
    target.username === main.username &&
    target.password === main.password &&
    ["localhost", "127.0.0.1"].includes(target.hostname),
);
assert(
  target.pathname.slice(1) === marker.database &&
    marker.purpose === "isolated-week4-tests",
);
assert(target.pathname !== new URL(process.env.DATABASE_URL!).pathname);
process.env.DATABASE_URL = target.href;
const db = getDb();
const loginCode = `CLI_${randomUUID().slice(0, 8)}`;
const password = `GiaLap2026!${randomUUID().slice(0, 8)}`;
const reason = "Kiểm tra script máy chủ bằng fixture riêng";
let fixtureId: string | undefined;
let passed = 0;
function run(mode: string, input: unknown, extra: string[] = []) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/admin-console.ts", mode, ...extra],
    {
      input: JSON.stringify(input),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      env: process.env,
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert(!output.includes(password), "CLI phải giữ bí mật mật khẩu");
  assert(!result.error, "CLI không khởi chạy được");
  return result.status;
}
function pass(label: string) {
  passed++;
  console.log(`QUA W4-CLI-${passed} ${label}`);
}
try {
  const [server] = await db.$queryRaw<
    { serverUuid: string; databaseName: string }[]
  >`SELECT @@server_uuid AS serverUuid, DATABASE() AS databaseName`;
  assert(
    server?.serverUuid === marker.serverUuid &&
      server.databaseName === marker.database,
  );
  assert.equal(
    run("create", {
      loginCode,
      email: `${loginCode}@example.invalid`,
      displayName: "ADMIN thử CLI",
      password,
      reason,
    }),
    0,
  );
  const user = await db.user.findUnique({
    where: { loginCode },
    include: { roles: true },
  });
  assert(
    user?.roles.some(
      (grant) => grant.role === "ADMIN" && grant.scopeKey === "GLOBAL",
    ),
  );
  fixtureId = user!.id;
  pass("admin:create tạo ADMIN thật qua stdin và không in mật khẩu");
  assert.equal(
    run("create", {
      loginCode,
      email: `${loginCode}@example.invalid`,
      displayName: "Trùng",
      password,
      reason,
    }),
    1,
  );
  assert.equal(await db.user.count({ where: { loginCode } }), 1);
  pass("từ chối trùng mã/email, giữ tài khoản cũ");
  await db.totpCredential.create({
    data: {
      userId: fixtureId,
      encryptedSecret: encryptMfaSecret(newMfaSecret(), fixtureId),
      keyVersion: getMfaKeyVersion(),
      enabledAt: new Date(),
    },
  });
  await db.totpRecoveryCode.create({
    data: {
      userId: fixtureId,
      codeHash: hashRecoveryCode(fixtureId, "FAKE-CODE-FOR-CONSOLE-TEST"),
    },
  });
  await db.userSession.create({
    data: {
      userId: fixtureId,
      familyId: randomUUID(),
      purpose: "FULL",
      mfaVerifiedAt: new Date(),
      refreshTokenHash: hashRefreshToken(newRefreshToken()),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  assert.equal(
    run("reset-mfa", { loginCode, confirmation: "SAI_MA", reason }),
    1,
  );
  assert(
    (await db.totpCredential.findUnique({ where: { userId: fixtureId } }))
      ?.enabledAt,
  );
  assert.equal(
    await db.userSession.count({
      where: { userId: fixtureId, revokedAt: null },
    }),
    1,
  );
  pass("xác nhận sai không đặt lại 2FA hoặc thu hồi phiên");
  assert.equal(
    run("reset-mfa", { loginCode, confirmation: loginCode, reason }),
    0,
  );
  assert.equal(
    (await db.totpCredential.findUnique({ where: { userId: fixtureId } }))
      ?.enabledAt,
    null,
  );
  assert.equal(
    await db.userSession.count({
      where: { userId: fixtureId, revokedAt: null },
    }),
    0,
  );
  assert.equal(
    await db.totpRecoveryCode.count({
      where: { userId: fixtureId, usedAt: null },
    }),
    0,
  );
  const audit = await db.auditLog.findMany({ where: { objectId: fixtureId } });
  assert(audit.some((entry) => entry.action === "MFA_RESET_BY_CONSOLE"));
  assert(
    !JSON.stringify(audit).includes(password) &&
      !JSON.stringify(audit).includes(reason),
  );
  pass(
    "admin:reset-2fa thu hồi phiên/mã khôi phục và ghi audit đã lược bí mật",
  );
  assert.equal(run("create", {}, [password]), 1);
  pass("không nhận mật khẩu qua argv");
  console.log(`CLI máy chủ: ${passed}/5 tình huống qua.`);
} catch {
  console.error(
    `Kiểm tra CLI dừng sau ${passed}/5 tình huống; không xuất dữ liệu bí mật.`,
  );
  process.exitCode = 1;
} finally {
  fixtureId ??= (
    await db.user.findUnique({ where: { loginCode }, select: { id: true } })
  )?.id;
  if (fixtureId) {
    await db.auditLog.deleteMany({
      where: { OR: [{ actorId: fixtureId }, { objectId: fixtureId }] },
    });
    await db.totpRecoveryCode.deleteMany({ where: { userId: fixtureId } });
    await db.totpCredential.deleteMany({ where: { userId: fixtureId } });
    await db.userSession.deleteMany({ where: { userId: fixtureId } });
    await db.authToken.deleteMany({ where: { userId: fixtureId } });
    await db.roleAssignment.deleteMany({ where: { userId: fixtureId } });
    await db.user.delete({ where: { id: fixtureId } });
  }
  await db.$disconnect();
}
