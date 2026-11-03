import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "dotenv";
import { hash } from "bcryptjs";
import type { APIRequestContext, APIResponse, Page } from "@playwright/test";
import type { Role } from "../../src/generated/prisma/enums";
import type { AuthActor } from "../../src/server/auth/types";
import { getDb } from "../../src/lib/db";
import {
  createAuthenticatedSession,
  tokensFor,
} from "../../src/server/services/auth";

export interface GoldClient {
  id: string;
  role: Role;
  actor: AuthActor;
  refreshToken: string;
  refreshExpiresAt: Date;
  canaries: string[];
  csrf: Map<string, string>;
}
export interface GoldFixture {
  origin: string;
  prefix: string;
  db: ReturnType<typeof getDb>;
  request: APIRequestContext;
  facultyId: string;
  departmentId: string;
  otherDepartmentId: string;
  semesterId: string;
  courseId: string;
  smallCourseId: string;
  sectionIds: string[];
  userIds: string[];
  students: GoldClient[];
  teacher: GoldClient;
  teacher2: GoldClient;
  head: GoldClient;
  otherHead: GoldClient;
  dean: GoldClient;
  quality: GoldClient;
  leader: GoldClient;
  training: GoldClient;
  exam: GoldClient;
  inspector: GoldClient;
  admin: GoldClient;
  canaries: string[];
}

export async function createGoldFixture(
  request: APIRequestContext,
): Promise<GoldFixture> {
  const environment = parse(readFileSync(".env", "utf8"));
  const marker = JSON.parse(
    readFileSync(".local/week12-test-database.json", "utf8"),
  );
  const main = new URL(
      process.env.SFS_E2E_MAIN_DATABASE_URL ?? environment.DATABASE_URL ?? "",
    ),
    test = new URL(
      process.env.WEEK12_TEST_DATABASE_URL ??
        environment.WEEK12_TEST_DATABASE_URL ??
        "",
    );
  assert(
    main.protocol === "mysql:" &&
      ["127.0.0.1", "localhost"].includes(main.hostname),
  );
  assert(
    marker.purpose === "isolated-week12-tests" &&
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
    test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w12test_`) &&
      /_[a-f0-9]{8}$/.test(test.pathname),
  );
  for (const key of [
    "SHADOW_DATABASE_URL",
    "W4_TEST_DATABASE_URL",
    "WEEK10_TEST_DATABASE_URL",
    "WEEK11_TEST_DATABASE_URL",
    "TOTP60_TEST_DATABASE_URL",
  ])
    if (environment[key])
      assert(test.pathname !== new URL(environment[key]).pathname);
  const origin = process.env.SFS_E2E_BASE_URL ?? "http://127.0.0.1:3007";
  assert(
    new URL(origin).hostname === "127.0.0.1" && new URL(origin).port === "3007",
  );
  process.env.DATABASE_URL = test.href;
  process.env.APP_URL = origin;
  const db = getDb();
  const [server] = await db.$queryRaw<
    { uuid: string; database: string }[]
  >`SELECT @@server_uuid AS uuid,DATABASE() AS \`database\``;
  assert.equal(server.uuid, marker.serverUuid);
  assert.equal(server.database, marker.database);
  assert.equal((await request.get(`${origin}/api/health`)).status(), 200);
  const prefix = `G12${randomUUID().replaceAll("-", "").slice(0, 8)}`,
    userIds: string[] = [],
    canaries: string[] = [];
  const faculty = await db.faculty.create({
      data: { code: `${prefix}F`, name: `${prefix} Khoa kiểm thử` },
    }),
    otherFaculty = await db.faculty.create({
      data: { code: `${prefix}X`, name: `${prefix} Khoa ngoài phạm vi` },
    });
  const department = await db.department.create({
      data: {
        code: `${prefix}D`,
        name: `${prefix} Bộ môn kiểm thử`,
        facultyId: faculty.id,
      },
    }),
    otherDepartment = await db.department.create({
      data: {
        code: `${prefix}Y`,
        name: `${prefix} Bộ môn ngoài phạm vi`,
        facultyId: otherFaculty.id,
      },
    });
  const now = Date.now();
  const semester = await db.semester.create({
    data: {
      code: `${prefix}S`,
      name: `${prefix} Học kỳ kiểm thử`,
      startsOn: new Date(now - 30 * 86400000),
      endsOn: new Date(now + 60 * 86400000),
    },
  });
  const course = await db.course.create({
      data: {
        code: `${prefix}C`,
        name: `${prefix} Phương pháp học tập`,
        credits: 3,
        departmentId: department.id,
      },
    }),
    smallCourse = await db.course.create({
      data: {
        code: `${prefix}N`,
        name: `${prefix} Môn chưa đủ mẫu`,
        credits: 2,
        departmentId: department.id,
      },
    });
  const passwordHash = await hash(`KiemThuGia!${randomUUID()}`, 12);
  async function client(
    role: Role,
    index = 0,
    extra?: Role,
  ): Promise<GoldClient> {
    const idRoleScope =
      role === "TRUONG_BO_MON"
        ? {
            scopeType: "DEPARTMENT" as const,
            scopeKey: `DEPARTMENT:${index ? otherDepartment.id : department.id}`,
            departmentId: index ? otherDepartment.id : department.id,
          }
        : role === "TRUONG_KHOA"
          ? {
              scopeType: "FACULTY" as const,
              scopeKey: `FACULTY:${faculty.id}`,
              facultyId: faculty.id,
            }
          : { scopeType: "GLOBAL" as const, scopeKey: "GLOBAL" };
    const user = await db.user.create({
      data: {
        loginCode: `${prefix}U${userIds.length}`,
        email: `${prefix.toLowerCase()}-${userIds.length}@e2e.invalid`,
        displayName:
          role === "SINH_VIEN"
            ? `SINH_VIEN_CANARY_${prefix}_${userIds.length}`
            : `${prefix} ${role}`,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        roles: {
          create: [
            { role, ...idRoleScope },
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
    userIds.push(user.id);
    const issued = await db.$transaction((tx) =>
      createAuthenticatedSession(
        tx,
        user,
        { ip: "week12-e2e-fixture" },
        "FULL",
        true,
      ),
    );
    const values = [user.id, user.loginCode, user.email!, user.displayName];
    if (role === "SINH_VIEN") canaries.push(...values);
    return {
      id: user.id,
      role,
      actor: issued.actor,
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
      canaries: values,
      csrf: new Map(),
    };
  }
  const teacher = await client("GIANG_VIEN", 0, "THANH_TRA"),
    teacher2 = await client("GIANG_VIEN"),
    head = await client("TRUONG_BO_MON"),
    otherHead = await client("TRUONG_BO_MON", 1),
    dean = await client("TRUONG_KHOA"),
    quality = await client("CAN_BO_DBCL"),
    leader = await client("LANH_DAO"),
    training = await client("PHONG_DAO_TAO"),
    exam = await client("PHONG_KHAO_THI"),
    inspector = await client("THANH_TRA"),
    admin = await client("ADMIN");
  const students: GoldClient[] = [];
  for (let i = 0; i < 10; i++) students.push(await client("SINH_VIEN"));
  const sectionIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const section = await db.courseSection.create({
      data: {
        code: `${prefix}L${i + 1}`,
        semesterId: semester.id,
        courseId: i === 2 ? smallCourse.id : course.id,
        teaching: {
          create: {
            teacherId: i === 1 ? teacher2.id : teacher.id,
            isLead: true,
          },
        },
        enrollments: {
          create: (i === 2 ? students.slice(0, 1) : students).map(
            (student) => ({
              studentId: student.id,
              registeredAt: new Date(now - 86400000),
            }),
          ),
        },
      },
    });
    sectionIds.push(section.id);
  }
  const fixture = {
    origin,
    prefix,
    db,
    request,
    facultyId: faculty.id,
    departmentId: department.id,
    otherDepartmentId: otherDepartment.id,
    semesterId: semester.id,
    courseId: course.id,
    smallCourseId: smallCourse.id,
    sectionIds,
    userIds,
    students,
    teacher,
    teacher2,
    head,
    otherHead,
    dean,
    quality,
    leader,
    training,
    exam,
    inspector,
    admin,
    canaries,
  };
  writeFileSync(
    ".local/week12-e2e-fixture.json",
    JSON.stringify(
      {
        purpose: "week12-uc-gold-e2e",
        prefix,
        database: marker.database,
        users: userIds.length,
        status: "running",
        dataRetained: true,
      },
      null,
      2,
    ),
  );
  return fixture;
}

export async function rawGoldRequest(
  fixture: GoldFixture,
  client: GoldClient,
  path: string,
  body?: unknown,
): Promise<APIResponse> {
  const issued = await tokensFor(
    client.actor,
    client.refreshToken,
    client.refreshExpiresAt,
  );
  const headers: Record<string, string> = {
    cookie: `sfs_access=${issued.accessToken}`,
    host: new URL(fixture.origin).host,
  };
  if (body !== undefined) {
    headers.origin = fixture.origin;
    headers["content-type"] = "application/json";
    const domain = path.startsWith("/api/templates")
      ? "templates"
      : path.startsWith("/api/campaigns")
        ? "campaigns"
        : path.startsWith("/api/student-surveys")
          ? "student-surveys"
          : path.startsWith("/api/survey-results")
            ? "survey-results"
            : path.startsWith("/api/reports")
              ? "reports"
              : "feedback";
    let token = client.csrf.get(domain);
    if (!token) {
      const response = await rawGoldRequest(
        fixture,
        client,
        `/api/${domain}/csrf`,
      );
      assert.equal(response.status(), 200, `CSRF ${domain} chưa được cấp`);
      const result = (await response.json()) as { csrfToken: string };
      token = result.csrfToken;
      client.csrf.set(domain, token);
    }
    headers["x-csrf-token"] = token;
  }
  return fixture.request.fetch(fixture.origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers,
    ...(body === undefined ? {} : { data: body }),
    timeout: 60000,
  });
}
export async function goldJson<T>(
  fixture: GoldFixture,
  client: GoldClient,
  path: string,
  body?: unknown,
  expected = 200,
): Promise<T> {
  const response = await rawGoldRequest(fixture, client, path, body);
  if (response.status() !== expected) {
    const result = (await response
      .json()
      .catch(() => ({ code: "NON_JSON" }))) as { code?: string };
    throw new Error(
      `HTTP ${response.status()} thay vì ${expected} tại ${path.split("?")[0]}, code=${result.code ?? "UNKNOWN"}`,
    );
  }
  return response.json() as Promise<T>;
}
export async function goldItem<T>(
  fixture: GoldFixture,
  client: GoldClient,
  path: string,
  body?: unknown,
  expected = 200,
): Promise<T> {
  return (await goldJson<{ item: T }>(fixture, client, path, body, expected))
    .item;
}
export async function openGoldPage(
  page: Page,
  fixture: GoldFixture,
  client: GoldClient,
  path: string,
) {
  const issued = await tokensFor(
    client.actor,
    client.refreshToken,
    client.refreshExpiresAt,
  );
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "sfs_access",
      value: issued.accessToken,
      domain: new URL(fixture.origin).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "sfs_refresh",
      value: issued.refreshToken,
      domain: new URL(fixture.origin).hostname,
      path: "/api/auth",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(fixture.origin + path);
}
export function assertNoGoldIdentity(fixture: GoldFixture, value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert(
    fixture.canaries.every((secret) => !text.includes(secret)),
    "Kết quả chứa định danh sinh viên giả dùng làm đối chứng",
  );
}
/** Giữ fixture và lịch sử trong DB riêng; thu hồi mọi phiên và vô hiệu hóa đúng tài khoản lượt chạy. */
export async function finishGoldFixture(fixture: GoldFixture, passed: boolean) {
  await fixture.db.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: { userId: { in: fixture.userIds } },
      data: { revokedAt: new Date() },
    });
    await tx.user.updateMany({
      where: { id: { in: fixture.userIds } },
      data: { status: "DISABLED" },
    });
  });
  writeFileSync(
    ".local/week12-e2e-fixture.json",
    JSON.stringify(
      {
        purpose: "week12-uc-gold-e2e",
        prefix: fixture.prefix,
        status: passed ? "passed" : "failed",
        users: fixture.userIds.length,
        fixtureSessionsRevoked: true,
        dataRetained: true,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await fixture.db.$disconnect();
}
