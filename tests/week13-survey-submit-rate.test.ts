import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import { AuthError } from "../src/server/auth/types";
import { issueStudentSurveysCsrf } from "../src/server/auth/csrf";
import { getAuthLimits } from "../src/server/auth/limits";
import { rateKey } from "../src/server/auth/rate-limit";
import { POST } from "../src/app/api/student-surveys/[[...path]]/route";

type Bucket = { attempts: number; windowStart: Date; lockedUntil: Date | null };
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  submit: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    rateLimitBucket: { update: vi.fn() },
  },
}));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    appUrl: "http://localhost:3000",
    jwtSecret: "q".repeat(64),
    trustProxy: false,
  }),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/auth", () => ({ getActor: mocks.actor }));
vi.mock("../src/server/services/student-surveys", () => ({
  submitStudentSurvey: mocks.submit,
  listStudentSurveys: mocks.list,
  getStudentSurvey: mocks.read,
}));

function actor(): AuthActor {
  return {
    userId: randomUUID(),
    loginCode: "RATE_FAKE",
    email: "rate@example.invalid",
    displayName: "Dữ liệu giả",
    sessionId: randomUUID(),
    familyId: randomUUID(),
    roles: ["SINH_VIEN"],
    assignments: [
      {
        role: "SINH_VIEN",
        scopeType: "GLOBAL",
        departmentId: null,
        facultyId: null,
      },
    ],
    purpose: "FULL",
    mfa: false,
    mustChangePassword: false,
  };
}
let current: AuthActor;
let buckets: Map<string, Bucket>;
let now: Date;
const taskId = "44000000-0000-4000-8000-000000000001";
function request(
  options: {
    csrf?: string;
    origin?: string;
    cookie?: boolean;
    raw?: string;
    query?: string;
  } = {},
) {
  return new NextRequest(
    `http://localhost:3000/api/student-surveys/${taskId}/submit${options.query ?? ""}`,
    {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: options.origin ?? "http://localhost:3000",
        "content-type": "application/json",
        ...(options.cookie === false
          ? {}
          : { cookie: "sfs_access=rate-fixture" }),
        "x-csrf-token": options.csrf ?? issueStudentSurveysCsrf(current),
        "x-forwarded-for": "192.0.2.88",
      },
      body:
        options.raw ??
        JSON.stringify({
          answers: [{ questionId: randomUUID(), valueNumber: 4 }],
        }),
    },
  );
}
function post(value = request(), id = taskId, suffix = "submit") {
  return POST(value, { params: Promise.resolve({ path: [id, suffix] }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  now = new Date("2035-01-01T00:00:00.000Z");
  vi.setSystemTime(now);
  for (const [key, value] of Object.entries({
    SURVEY_SUBMIT_REQUEST_LIMIT: "30",
    SURVEY_SUBMIT_WINDOW_SECONDS: "60",
    SURVEY_SUBMIT_LOCK_SECONDS: "60",
  }))
    vi.stubEnv(key, value);
  current = actor();
  buckets = new Map();
  mocks.actor.mockImplementation(async () => current);
  mocks.submit.mockResolvedValue({ status: "DONE", doneDate: "2035-01-01" });
  let queue = Promise.resolve();
  mocks.db.$transaction.mockImplementation(
    (operation: (tx: typeof mocks.db) => Promise<unknown>) => {
      const result = queue.then(() => operation(mocks.db));
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  );
  mocks.db.$executeRaw.mockImplementation(
    async (_sql: TemplateStringsArray, key: string) => {
      if (!buckets.has(key))
        buckets.set(key, {
          attempts: 0,
          windowStart: new Date(),
          lockedUntil: null,
        });
      return 1;
    },
  );
  mocks.db.$queryRaw.mockImplementation(
    async (_sql: TemplateStringsArray, key: string) => [buckets.get(key)],
  );
  mocks.db.rateLimitBucket.update.mockImplementation(
    async ({ where, data }: { where: { keyHash: string }; data: Bucket }) => {
      buckets.set(where.keyHash, data);
      return data;
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("W13 NFR-08 BR-33 — budget nộp phiếu được xác thực trước khi đọc body", () => {
  it("cho đủ30yêu cầu của một sinh viên, từ31trả429 trướcbody/service", async () => {
    for (let index = 0; index < 30; index++)
      expect((await post()).status).toBe(200);
    const blocked = request({ raw: "PRIVATE_ANSWER_NOT_JSON" });
    const reader = vi.spyOn(blocked.body!, "getReader");
    const result = await post(blocked);
    expect(result.status).toBe(429);
    expect(await result.json()).toEqual({
      ok: false,
      message:
        "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau thời gian tạm khóa.",
      code: "RATE_LIMITED",
    });
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(reader).not.toHaveBeenCalled();
    expect(mocks.submit).toHaveBeenCalledTimes(30);
    expect(buckets.size).toBe(1);
    expect([...buckets.keys()][0]).toBe(
      rateKey("survey-submit-user", current.userId),
    );
    expect([...buckets.keys()][0]).toMatch(/^[a-f0-9]{64}$/);
  });
  it("thay task, phiên, IP giả hoặc kiểu body không tạo budget mới cho cùng user", async () => {
    for (let index = 0; index < 30; index++)
      expect((await post()).status).toBe(200);
    current = { ...current, sessionId: randomUUID(), familyId: randomUUID() };
    for (const id of [randomUUID(), "not-a-task-id", taskId]) {
      const attempt = request({ raw: "{}" });
      attempt.headers.set("x-forwarded-for", "192.0.2.99");
      expect((await post(attempt, id)).status).toBe(429);
    }
    expect(buckets.size).toBe(1);
    expect(mocks.submit).toHaveBeenCalledTimes(30);
  });
  it("không phân biệt task có thật/không có thật khi đã vượt budget", async () => {
    for (let index = 0; index < 30; index++) await post();
    const known = await post();
    const unknown = await post(request(), randomUUID());
    expect(known.status).toBe(429);
    expect(unknown.status).toBe(429);
    expect(await known.json()).toEqual(await unknown.json());
  });
  it("khách, phiên bị thu hồi, sai role/MFA/Origin/CSRF và route/query sai không tiêu budget", async () => {
    expect((await post(request({ cookie: false }))).status).toBe(401);
    mocks.actor.mockResolvedValueOnce(null);
    expect((await post()).status).toBe(401);
    expect(
      (await post(request({ origin: "https://untrusted.invalid" }))).status,
    ).toBe(403);
    expect((await post(request({ csrf: "invalid" }))).status).toBe(403);
    const csrf = issueStudentSurveysCsrf(current);
    const valid = current;
    for (const invalid of [
      { ...valid, roles: ["GIANG_VIEN"] as const, assignments: [] },
      { ...valid, purpose: "MFA_SETUP" as const },
      { ...valid, mfaRequired: true },
    ]) {
      mocks.actor.mockResolvedValueOnce(invalid);
      expect((await post(request({ csrf }))).status).toBe(403);
    }
    expect((await post(request(), taskId, "not-submit")).status).toBe(404);
    expect((await post(request({ query: "?studentId=foreign" }))).status).toBe(
      400,
    );
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("JSONhỏng hoặc lỗi nghiệp vụ vẫn tiêu budget; lỗi không đọc được body không lặp vô hạn", async () => {
    for (let index = 0; index < 30; index++)
      expect((await post(request({ raw: "{" }))).status).toBe(400);
    expect((await post()).status).toBe(429);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("20lần đồng thời cùngtask còn giữ1thành công+19x409 từ service", async () => {
    let submissions = 0;
    mocks.submit.mockImplementation(async () => {
      if (submissions++ === 0)
        return { status: "DONE", doneDate: "2035-01-01" };
      throw new AuthError(
        "Nhiệm vụ đã hoàn thành.",
        409,
        "STUDENT_SURVEY_COMPLETED",
      );
    });
    const results = await Promise.all(Array.from({ length: 20 }, () => post()));
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(19);
    expect(results.some((result) => result.status === 429)).toBe(false);
    expect(mocks.submit).toHaveBeenCalledTimes(20);
  });
  it("200sinh viên cùngIP được budget riêng, không có khóaIPtoàncục", async () => {
    const requests = Array.from({ length: 200 }, () => {
      const student = actor();
      current = student;
      return { student, value: request() };
    });
    mocks.actor.mockImplementation(
      async (token: string) =>
        requests.find((entry) => entry.student.sessionId === token)?.student ??
        null,
    );
    const results = await Promise.all(
      requests.map(({ student, value }) => {
        value.cookies.set("sfs_access", student.sessionId);
        return post(value);
      }),
    );
    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(buckets.size).toBe(200);
    expect(mocks.submit).toHaveBeenCalledTimes(200);
  });
  it("hết60giây cửa sổ cho phép tiếp; hết60giây khóa cũng cấp lại budget", async () => {
    for (let index = 0; index < 30; index++) await post();
    vi.setSystemTime(new Date(now.getTime() + 60_000));
    expect((await post()).status).toBe(200);
    for (let index = 0; index < 29; index++) await post();
    expect((await post()).status).toBe(429);
    vi.setSystemTime(new Date(now.getTime() + 120_000));
    expect((await post()).status).toBe(200);
  });
  it("config được validate, không cho tắt bằng0/âm/NaN hoặc vượt miền", () => {
    expect(getAuthLimits()).toMatchObject({
      SURVEY_SUBMIT_REQUEST_LIMIT: 30,
      SURVEY_SUBMIT_WINDOW_SECONDS: 60,
      SURVEY_SUBMIT_LOCK_SECONDS: 60,
    });
    for (const [key, invalid] of [
      ["SURVEY_SUBMIT_REQUEST_LIMIT", "0"],
      ["SURVEY_SUBMIT_REQUEST_LIMIT", "1001"],
      ["SURVEY_SUBMIT_WINDOW_SECONDS", "0"],
      ["SURVEY_SUBMIT_LOCK_SECONDS", "-1"],
      ["SURVEY_SUBMIT_REQUEST_LIMIT", "NaN"],
    ]) {
      const original = process.env[key];
      vi.stubEnv(key, invalid);
      expect(() => getAuthLimits()).toThrow("không hợp lệ");
      vi.stubEnv(key, original);
    }
  });
});
