import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { cpus, totalmem, platform, release, arch } from "node:os";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../src/server/services/auth";
import { issueStudentSurveysCsrf } from "../src/server/auth/csrf";
import {
  assertLoadDatabase,
  summarizeLoad,
  type LoadMarker,
  type LoadSample,
} from "./lib/week13-load-safety.mjs";

const args = process.argv.slice(2);
assert(
  args.every((value) => value === "--production"),
  "Chỉ nhận tùy chọn --production.",
);
const production = args.includes("--production");
const marker = JSON.parse(
  readFileSync(".local/week13-load-database.json", "utf8"),
) as LoadMarker;
const main = new URL(process.env.DATABASE_URL ?? ""),
  target = new URL(main);
target.pathname = `/${marker.database}`;
assertLoadDatabase(
  main.href,
  target.href,
  marker,
  Object.entries(process.env)
    .filter(([key]) => /(?:SHADOW|TEST).*DATABASE_URL/.test(key))
    .map(([, value]) => value)
    .filter((value): value is string => !!value),
);

// No external URL or caller-controlled port; stop only this runner's child process.
const port = 3013,
  transportOrigin = `http://127.0.0.1:${port}`;
const appOrigin = `${production ? "https" : "http"}://127.0.0.1:${port}`;
await new Promise<void>((resolve, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(new Error("Cổng3013 đang dùng; không nối vào máy chủ khác.")),
  );
  probe.listen(port, "127.0.0.1", () => probe.close(() => resolve()));
});
const buildId = production
  ? readFileSync(".next-week13-load/BUILD_ID", "utf8").trim()
  : null;
process.env.DATABASE_URL = target.href;
process.env.APP_URL = appOrigin;
const db = getDb(),
  prefix = `L13${randomUUID().replaceAll("-", "").slice(0, 10)}`;
const userIds: string[] = [];
let server: ReturnType<typeof spawn> | undefined, logFd: number | undefined;
let databaseVerified = false,
  revoked = false;
const result: Record<string, unknown> = {
  run: prefix,
  startedAt: new Date().toISOString(),
  status: "running",
  mode: production ? "next-start-production" : "next-dev-webpack-warmed",
  buildId,
  transport:
    "HTTP loopback; production canonical HTTPS origin simulates internal proxy hop; no TLS timing",
  authentication:
    "Real fixture sessions/access JWT and CSRF pre-issued by services; login and fixture setup excluded",
  requestShape:
    "5 required Likert1–5 answers per response; distinct student/task for unique burst",
  target:
    "guarded isolated local MySQL database; no main/shadow reset or copying",
  fixtureRetention:
    "Fake fixture retained for evidence; sessions revoked and users disabled in finally",
  environment: {
    node: process.version,
    os: `${platform()} ${release()} ${arch()}`,
    logicalCpus: cpus().length,
    cpuModel: cpus()[0]?.model ?? "unknown",
    hostMemoryGiB: Math.round((totalmem() / 1024 ** 3) * 100) / 100,
    serverAndClientSameHost: true,
    prismaPoolConnections: 5,
  },
};
mkdirSync(".local", { recursive: true });
function save() {
  const text =
    JSON.stringify(
      {
        ...result,
        updatedAt: new Date().toISOString(),
        sessionsRevokedAndUsersDisabled: revoked,
      },
      null,
      2,
    ) + "\n";
  writeFileSync(".local/week13-load-result.json", text);
  writeFileSync(`.local/week13-load-${prefix}.json`, text);
}
function stop() {
  if (server?.pid && server.exitCode === null) {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {}
    } else server.kill("SIGTERM");
  }
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
type Client = { id: string; cookie: string; csrf: string; taskId: string };
try {
  result.stage = "verify-database-identity";
  const [identity] = await db.$queryRaw<
    { uuid: string; database: string; version: string }[]
  >`
    SELECT @@server_uuid AS uuid,DATABASE() AS \`database\`,VERSION() AS version`;
  assert.equal(
    identity.uuid,
    marker.serverUuid,
    "Máy chủ MySQL không khớp marker.",
  );
  assert.equal(
    identity.database,
    marker.database,
    "Database MySQL không khớp marker.",
  );
  databaseVerified = true;
  (result.environment as Record<string, unknown>).mysql = identity.version;
  try {
    const dockerResources = execFileSync(
      "docker",
      ["info", "--format", "{{json .NCPU}} {{json .MemTotal}}"],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 15000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .trim()
      .split(/\s+/)
      .map(Number);
    if (
      dockerResources.length === 2 &&
      dockerResources.every((value) => Number.isFinite(value) && value > 0)
    )
      (result.environment as Record<string, unknown>).dockerEngineResources = {
        logicalCpus: dockerResources[0],
        memoryGiB: Math.round((dockerResources[1] / 1024 ** 3) * 100) / 100,
      };
  } catch {
    (result.environment as Record<string, unknown>).dockerEngineResources =
      "unavailable";
  }
  try {
    result.sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    result.workingTreeDirty = !!execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    result.sourceHead = "unavailable";
  }
  result.harnessSha256 = createHash("sha256")
    .update(readFileSync("scripts/verify-week13-load.ts"))
    .digest("hex");
  result.stage = "create-fake-fixture-and-sessions";
  save();
  const passwordHash = await hash(`FixtureOnly!${randomUUID()}`, 12);
  const creator = await db.user.create({
    data: {
      loginCode: `${prefix}Q`,
      email: `${prefix.toLowerCase()}-quality@load.invalid`,
      displayName: `${prefix} ĐBCL giả`,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: {
        create: {
          role: "CAN_BO_DBCL",
          scopeType: "GLOBAL",
          scopeKey: "GLOBAL",
        },
      },
    },
  });
  userIds.push(creator.id);
  const faculty = await db.faculty.create({
    data: { code: `${prefix}F`, name: `${prefix} Khoa tải giả` },
  });
  const department = await db.department.create({
    data: {
      code: `${prefix}D`,
      name: `${prefix} Bộ môn tải giả`,
      facultyId: faculty.id,
    },
  });
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: `${prefix} Học kỳ tải giả`,
      startsOn: new Date(Date.now() - 86400000),
      endsOn: new Date(Date.now() + 7 * 86400000),
    },
  });
  const course = await db.course.create({
    data: {
      code: `${prefix}C`,
      name: `${prefix} Môn tải giả`,
      departmentId: department.id,
      credits: 3,
    },
  });
  const section = await db.courseSection.create({
    data: { code: `${prefix}L`, courseId: course.id, semesterId: semester.id },
  });
  const template = await db.surveyTemplate.create({
    data: {
      familyId: randomUUID(),
      version: 1,
      name: `${prefix} Phiếu tải giả`,
      status: "DA_KHOA",
      lockedAt: new Date(),
      createdById: creator.id,
      groups: {
        create: {
          title: "Đánh giá học phần",
          position: 1,
          questions: {
            create: Array.from({ length: 5 }, (_, index) => ({
              label: `Tiêu chí ${index + 1}`,
              position: index + 1,
              type: "LIKERT" as const,
              required: true,
              allowNA: false,
              scaleMin: 1,
              scaleMax: 5,
            })),
          },
        },
      },
    },
    include: { groups: { include: { questions: true } } },
  });
  const campaign = await db.surveyCampaign.create({
    data: {
      title: `${prefix} Đợt tải giả`,
      templateId: template.id,
      semesterId: semester.id,
      scope: "SECTIONS",
      status: "DANG_MO",
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 3600000),
      openedAt: new Date(),
      createdById: creator.id,
      sections: { create: { sectionId: section.id } },
    },
  });
  const body = JSON.stringify({
    answers: template.groups.flatMap((group) =>
      group.questions.map((question, index) => ({
        questionId: question.id,
        valueNumber: (index % 5) + 1,
      })),
    ),
  });
  const clients: Client[] = [];
  for (let i = 0; i < 202; i++) {
    const user = await db.user.create({
      data: {
        loginCode: `${prefix}U${i}`,
        email: `${prefix.toLowerCase()}-${i}@load.invalid`,
        displayName: `${prefix} Sinh viên giả ${i}`,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        roles: {
          create: {
            role: "SINH_VIEN",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
          },
        },
      },
      include: { roles: true },
    });
    userIds.push(user.id);
    const issued = await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        user,
        { ip: "week13-load-fixture" },
        "FULL",
        false,
      ),
    );
    const tokens = await tokensFor(
      issued.actor,
      issued.refreshToken,
      issued.refreshExpiresAt,
    );
    const task = await db.surveyTask.create({
      data: {
        campaignId: campaign.id,
        sectionId: section.id,
        studentId: user.id,
      },
    });
    clients.push({
      id: user.id,
      cookie: `sfs_access=${tokens.accessToken}`,
      csrf: issueStudentSurveysCsrf(issued.actor),
      taskId: task.id,
    });
  }
  assert.equal(new Set(clients.map((client) => client.taskId)).size, 202);
  result.stage = "start-private-server";
  save();
  logFd = openSync(".local/week13-load-server.log", "w");
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      production ? "start" : "dev",
      ...(!production ? ["--webpack"] : []),
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: production ? "production" : "development",
        APP_URL: appOrigin,
        DATABASE_URL: target.href,
        SFS_TEST_DIST_DIR: ".next-week13-load",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
    },
  );
  let ready = false;
  for (let i = 0; i < 120; i++) {
    assert(
      server.exitCode === null,
      "Máy chủ tải dừng trước khi sẵn sàng; xem log riêng.",
    );
    try {
      if (
        (
          await fetch(transportOrigin + "/api/health", {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  assert(ready, "Máy chủ tải chưa sẵn sàng.");
  async function submit(client: Client): Promise<LoadSample> {
    const started = performance.now();
    try {
      const response = await fetch(
        `${transportOrigin}/api/student-surveys/${client.taskId}/submit`,
        {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(120000),
          headers: {
            "content-type": "application/json",
            origin: appOrigin,
            cookie: client.cookie,
            "x-csrf-token": client.csrf,
          },
          body,
        },
      );
      await response.arrayBuffer(); // Include complete response body, not only first byte.
      return {
        status: response.status,
        durationMs: performance.now() - started,
      };
    } catch {
      return { status: 0, durationMs: performance.now() - started };
    }
  }
  result.stage = "warmup";
  save();
  const warmup = await submit(clients[0]);
  result.warmupStatus = warmup.status;
  assert.equal(
    warmup.status,
    200,
    "Nộp khởi động chưa thành công; không đo tiếp.",
  );
  result.stage = "unique-200-burst";
  save();
  const uniqueStart = performance.now();
  const uniqueSamples = await Promise.all(
    clients.slice(1, 201).map((client) => submit(client)),
  );
  const uniqueSummary = summarizeLoad(
    uniqueSamples,
    performance.now() - uniqueStart,
  );
  const afterUnique = {
    responses: await db.surveyResponse.count({
      where: { campaignId: campaign.id },
    }),
    answers: await db.surveyAnswer.count({
      where: { response: { campaignId: campaign.id } },
    }),
    tasksDone: await db.surveyTask.count({
      where: { campaignId: campaign.id, status: "DONE" },
    }),
  };
  const successfulUnique = uniqueSamples.filter(
    (sample) => sample.status === 200,
  ).length;
  const unexpectedUnique = uniqueSamples.filter(
    (sample) => sample.status !== 200,
  ).length;
  result.uniqueBurst = {
    ...uniqueSummary,
    configuredConcurrency: 200,
    successfulUnique,
    unexpectedUnique,
    unexpectedErrorRate: unexpectedUnique / 200,
    databaseCountsIncludingWarmup: afterUnique,
    p95TargetMs: 3000,
    errorRateTargetBelow: 0.01,
    timingTargetMet: uniqueSummary.latencyMs.p95 <= 3000,
    errorTargetMet: unexpectedUnique / 200 < 0.01,
  };
  result.rawSamples = { unique: uniqueSamples };
  save();
  assert.equal(
    afterUnique.responses,
    successfulUnique + 1,
    "Số phiếu khác số lần nộp thành công + khởi động.",
  );
  assert.equal(
    afterUnique.answers,
    afterUnique.responses * 5,
    "Số đáp án không nguyên tử.",
  );
  assert.equal(
    afterUnique.tasksDone,
    afterUnique.responses,
    "Nhiệm vụ và phiếu không khớp.",
  );
  result.stage = "same-task-20-race";
  save();
  const raceStart = performance.now();
  const raceSamples = await Promise.all(
    Array.from({ length: 20 }, () => submit(clients[201])),
  );
  const raceSummary = summarizeLoad(raceSamples, performance.now() - raceStart);
  const raceCounts = {
    responseIncrease:
      (await db.surveyResponse.count({ where: { campaignId: campaign.id } })) -
      afterUnique.responses,
    answerIncrease:
      (await db.surveyAnswer.count({
        where: { response: { campaignId: campaign.id } },
      })) - afterUnique.answers,
    taskStatus: (
      await db.surveyTask.findUnique({
        where: { id: clients[201].taskId },
        select: { status: true },
      })
    )?.status,
  };
  result.sameTaskRace = {
    ...raceSummary,
    configuredConcurrency: 20,
    databaseDelta: raceCounts,
  };
  (result.rawSamples as Record<string, unknown>).sameTask = raceSamples;
  save();
  assert.equal(
    raceSummary.statuses["200"],
    1,
    "BR-02: phải chỉ một nộp thành công.",
  );
  assert.equal(
    raceSummary.statuses["409"],
    19,
    "BR-02:19 yêu cầu nộp lại phải bị từ chối409.",
  );
  assert.deepEqual(raceCounts, {
    responseIncrease: 1,
    answerIncrease: 5,
    taskStatus: "DONE",
  });
  result.correctnessPassed = true;
  result.stage = "completed";
  result.performanceTargetsMet =
    uniqueSummary.latencyMs.p95 <= 3000 && unexpectedUnique / 200 < 0.01;
  result.status = result.performanceTargetsMet
    ? "passed"
    : "measured-target-not-met";
  console.log(
    `TẢI W13:200request riêng;200=${successfulUnique}, lỗi=${unexpectedUnique}, p95=${uniqueSummary.latencyMs.p95}ms; race20chỉ1phiếu. Kết quả=${result.status}.`,
  );
  if (!result.performanceTargetsMet) process.exitCode = 2;
} catch (error) {
  result.status = "failed";
  result.failureKind =
    error instanceof assert.AssertionError ? "assertion" : "runtime";
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z_0-9]{1,50}$/.test(error.code)
  )
    result.failureCode = error.code;
  // Avoid logging SQL, connection URLs, JWT/CSRF or survey content from ORM errors.
  console.error(
    "Bộ đo tải chưa hoàn tất; xem kết quả riêng và log đã kiểm, không xuất dữ liệu cấu hình.",
  );
  process.exitCode = 1;
} finally {
  stop();
  if (logFd !== undefined) closeSync(logFd);
  if (databaseVerified && userIds.length) {
    try {
      await db.userSession.updateMany({
        where: { userId: { in: userIds } },
        data: { revokedAt: new Date() },
      });
      await db.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: "DISABLED" },
      });
      revoked = true;
    } catch {
      result.fixtureRevocationFailed = true;
      process.exitCode = 1;
    }
  }
  result.finishedAt = new Date().toISOString();
  save();
  await db.$disconnect();
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
