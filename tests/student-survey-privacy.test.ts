import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";

const mocks = vi.hoisted(() => {
  const delegate = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  });
  return {
    db: {
      userSession: delegate(),
      systemSetting: delegate(),
      surveyTask: delegate(),
      surveyTemplate: delegate(),
      surveyResponse: delegate(),
      surveyAnswer: delegate(),
      auditLog: delegate(),
      emailOutbox: delegate(),
      notification: delegate(),
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    },
    actor: vi.fn(),
    prisma: vi.fn(),
    adapter: vi.fn(),
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    databaseUrl: "mysql://fixture:fixture@127.0.0.1:3306/privacy_fixture",
  }),
}));
vi.mock("../src/generated/prisma/client", () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      mocks.prisma(options);
    }
  },
}));
vi.mock("@prisma/adapter-mariadb", () => ({
  PrismaMariaDb: class {
    constructor(options: unknown) {
      mocks.adapter(options);
    }
  },
}));
vi.mock("../src/server/services/auth", () => ({ getActor: mocks.actor }));
vi.mock("../src/server/services/campaign-lifecycle", () => ({
  advanceCampaignState: vi.fn(),
  advanceDueCampaignsInTransaction: vi.fn(),
}));
vi.mock("../src/server/auth/http", async (original) => ({
  ...(await original<typeof import("../src/server/auth/http")>()),
  assertSameOrigin: vi.fn(),
}));
vi.mock("../src/server/auth/csrf", () => ({
  assertStudentSurveysCsrf: vi.fn(),
  issueStudentSurveysCsrf: vi.fn(),
}));

import { GET, POST } from "../src/app/api/student-surveys/[[...path]]/route";
import { submitStudentSurvey } from "../src/server/services/student-surveys";

const ids = Array.from({ length: 10 }, () => randomUUID());
const student: AuthActor = {
  userId: ids[0],
  sessionId: ids[1],
  familyId: ids[2],
  loginCode: "PRIVATE_STUDENT_008",
  email: "private-student-008@fixture.invalid",
  displayName: "Sinh viên giả riêng tư",
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
  mustChangePassword: false,
  mfa: false,
};
const text = "PRIVATE_ANSWER_008 không được đi vào log hoặc xác nhận";
const input = () => ({ answers: [{ questionId: ids[6], valueText: text }] });
const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
const request = (path: string[], body?: unknown) =>
  new NextRequest(`http://localhost/api/student-surveys/${path.join("/")}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: "sfs_access=private-fixture-token",
      "Content-Type": "application/json",
      "User-Agent": "PRIVATE_AGENT_008",
      "X-Forwarded-For": "192.0.2.88",
      "X-Request-Id": "PRIVATE_CORRELATION_008",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
function task(status = "PENDING") {
  return {
    id: ids[3],
    campaignId: ids[4],
    sectionId: ids[5],
    status,
    doneDate: status === "DONE" ? new Date("2035-01-01T00:00:00Z") : null,
    // Cố ý đưa thêm dữ liệu DB để bắt hồi quy trả toàn bộ hàng thay vì projection.
    studentId: student.userId,
    responseId: "PRIVATE_DB_RESPONSE_008",
    answers: [{ valueText: text }],
    cohort: {
      section: { code: "PRIVACY008", course: { name: "Môn giả" } },
      campaign: {
        title: "Khảo sát giả",
        templateId: ids[7],
        status: "DANG_MO",
        startsAt: new Date("2034-01-01T00:00:00Z"),
        endsAt: new Date("2036-01-01T00:00:00Z"),
        semester: { name: "Kỳ giả", lockedAt: null },
      },
    },
  };
}
function assertNoPrivateValues(value: unknown, includeTask = true) {
  const serialized = JSON.stringify(value);
  for (const secret of [
    student.userId,
    student.sessionId,
    student.familyId,
    student.loginCode,
    student.email,
    student.displayName,
    "PRIVATE_CORRELATION_008",
    "PRIVATE_AGENT_008",
    "192.0.2.88",
    ...(includeTask ? [ids[3]] : []),
  ])
    expect(serialized).not.toContain(secret);
}
function assertNoSideChannel() {
  for (const sink of [
    mocks.db.auditLog,
    mocks.db.emailOutbox,
    mocks.db.notification,
  ]) {
    expect(sink.create).not.toHaveBeenCalled();
    expect(sink.createMany).not.toHaveBeenCalled();
    expect(sink.updateMany).not.toHaveBeenCalled();
  }
  for (const method of [
    "log",
    "info",
    "warn",
    "error",
    "debug",
    "trace",
  ] as const)
    expect(console[method]).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2034-12-31T18:20:00.000Z"));
  for (const method of [
    "log",
    "info",
    "warn",
    "error",
    "debug",
    "trace",
  ] as const)
    vi.spyOn(console, method).mockImplementation(() => {});
  mocks.actor.mockResolvedValue(student);
  mocks.db.$transaction.mockImplementation(
    async (operation: (tx: typeof mocks.db) => Promise<unknown>) =>
      operation(mocks.db),
  );
  mocks.db.userSession.findUnique.mockResolvedValue({
    id: student.sessionId,
    userId: student.userId,
    familyId: student.familyId,
    purpose: "FULL",
    revokedAt: null,
    expiresAt: new Date("2036-01-01"),
    mfaVerifiedAt: null,
    user: {
      id: student.userId,
      loginCode: student.loginCode,
      email: student.email,
      displayName: student.displayName,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: student.assignments,
    },
  });
  mocks.db.systemSetting.findUnique.mockResolvedValue(null);
  mocks.db.surveyTask.findFirst.mockResolvedValue(task());
  mocks.db.surveyTask.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.surveyTemplate.findUnique.mockResolvedValue({
    id: ids[7],
    familyId: ids[8],
    version: 1,
    name: "Mẫu giả",
    status: "DA_KHOA",
    lockedAt: new Date("2034-01-01"),
    groups: [
      {
        id: ids[9],
        title: "Nhóm giả",
        position: 1,
        questions: [
          {
            id: ids[6],
            label: "Góp ý",
            type: "TEXT",
            position: 1,
            required: true,
            allowNA: false,
            scaleMin: null,
            scaleMax: null,
            options: [],
          },
        ],
      },
    ],
  });
  mocks.db.surveyResponse.create.mockImplementation(
    async ({ data }: { data: { id: string } }) => ({ id: data.id }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("BR-03/30 — Mục 5.6(d), các kênh DTO và ghi dữ liệu của Tuần 8", () => {
  it("nộp qua route chỉ trả DONE/ngày, không cache hay lộ ID phiếu, nội dung và metadata request", async () => {
    const path = [ids[3], "submit"];
    const response = await POST(request(path, input()), context(path));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      item: { status: "DONE", doneDate: "2035-01-01" },
    });
    const writtenResponse =
      mocks.db.surveyResponse.create.mock.calls[0][0].data;
    const writtenAnswers =
      mocks.db.surveyAnswer.createMany.mock.calls[0][0].data;
    expect(Object.keys(writtenResponse).sort()).toEqual([
      "campaignId",
      "id",
      "sectionId",
      "submittedDate",
    ]);
    expect(Object.keys(writtenAnswers[0]).sort()).toEqual([
      "id",
      "isNotApplicable",
      "moderationStatus",
      "questionId",
      "responseId",
      "valueText",
    ]);
    assertNoPrivateValues([writtenResponse, writtenAnswers, body]);
    expect(JSON.stringify(body)).not.toContain(writtenResponse.id);
    expect(JSON.stringify(body)).not.toContain(writtenAnswers[0].id);
    expect(JSON.stringify(body)).not.toContain(text);
    expect(writtenAnswers[0].valueText).toBe(text);
    expect(writtenAnswers[0].moderationStatus).toBe("CHO_KIEM_DUYET");
    assertNoSideChannel();
  });

  it("đọc xác nhận DONE bỏ nội dung/ID phiếu dù DB trả hàng có thêm trường nhạy cảm", async () => {
    mocks.db.surveyTask.findFirst.mockResolvedValue(task("DONE"));
    const response = await GET(request([ids[3]]), context([ids[3]]));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.item).toMatchObject({
      id: ids[3],
      status: "DONE",
      doneDate: "2035-01-01",
      template: null,
    });
    assertNoPrivateValues(body, false);
    expect(JSON.stringify(body)).not.toContain("PRIVATE_DB_RESPONSE_008");
    expect(JSON.stringify(body)).not.toContain(text);
    expect(mocks.db.surveyResponse.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.surveyAnswer.findMany).not.toHaveBeenCalled();
    assertNoSideChannel();
  });

  it("lỗi ORM chứa SQL/định danh/nội dung được che trước khi ra HTTP và không ghi log", async () => {
    mocks.db.surveyAnswer.createMany.mockRejectedValueOnce(
      new Error(`INSERT SurveyAnswer ${student.userId} ${ids[3]} ${text}`),
    );
    const path = [ids[3], "submit"];
    const response = await POST(request(path, input()), context(path));
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("STUDENT_SURVEY_FAILED");
    assertNoPrivateValues(body);
    expect(JSON.stringify(body)).not.toContain(text);
    expect(JSON.stringify(body)).not.toContain("INSERT");
    assertNoSideChannel();
  });

  it.each([
    "studentId",
    "taskId",
    "sessionId",
    "responseId",
    "requestId",
    "ipAddress",
  ])(
    "từ chối trường cầu nối %s do client chèn vào mà không ghi phiếu/log",
    async (field) => {
      await expect(
        submitStudentSurvey(student, ids[3], {
          ...input(),
          [field]: student.userId,
        }),
      ).rejects.toMatchObject({ code: "INVALID_SURVEY_ANSWERS" });
      expect(mocks.db.surveyTask.updateMany).not.toHaveBeenCalled();
      expect(mocks.db.surveyResponse.create).not.toHaveBeenCalled();
      expect(mocks.db.surveyAnswer.createMany).not.toHaveBeenCalled();
      assertNoSideChannel();
    },
  );

  it("Prisma runtime tắt query/error logging, không tạo kênh SQL params chứa phiếu", async () => {
    const globals = globalThis as unknown as { studentFeedbackDb?: unknown };
    const previous = globals.studentFeedbackDb;
    try {
      delete globals.studentFeedbackDb;
      const actual =
        await vi.importActual<typeof import("../src/lib/db")>("../src/lib/db");
      actual.getDb();
      expect(mocks.prisma).toHaveBeenCalledOnce();
      expect(mocks.prisma.mock.calls[0][0]).toMatchObject({ log: [] });
    } finally {
      if (previous === undefined) delete globals.studentFeedbackDb;
      else globals.studentFeedbackDb = previous;
    }
  });
});
