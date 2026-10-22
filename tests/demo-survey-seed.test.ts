import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "../src/generated/prisma/client";
import {
  seedDemoSurveyData,
  type DemoSurveyContext,
} from "../src/server/services/demo-survey-seed";

const actor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Tạo dữ liệu giả minh họa được ủy quyền",
};
const id = (key: string) => {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const context: DemoSurveyContext = {
  id,
  teacherId: id("teacher"),
  studentIds: Array.from({ length: 12 }, (_, index) => id(`student:${index}`)),
  sectionIds: [id("section:1"), id("section:2"), id("section:3")],
  semesterId: id("semester"),
  createdById: id("dbcl"),
  approvedById: id("leader"),
};
const names = [
  "surveyTemplate",
  "criterionGroup",
  "question",
  "surveyCampaign",
  "campaignSection",
  "campaignHistory",
  "surveyTask",
  "surveyResponse",
  "surveyAnswer",
  "aggregateResult",
  "feedback",
  "feedbackRecipient",
  "feedbackMessage",
  "feedbackHistory",
] as const;
function database() {
  const db = Object.fromEntries(
    names.map((name) => [
      name,
      {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(1),
      },
    ]),
  ) as Record<
    (typeof names)[number],
    {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    }
  >;
  const enrollment = {
    findMany: vi
      .fn()
      .mockResolvedValue(
        context.sectionIds.flatMap((sectionId) =>
          context.studentIds.map((studentId) => ({ sectionId, studentId })),
        ),
      ),
  };
  return { ...db, enrollment };
}
type FakeDatabase = ReturnType<typeof database>;
let db: FakeDatabase;
const client = () => db as unknown as Prisma.TransactionClient;
const manyRows = <T>(model: (typeof names)[number]): T[] =>
  db[model].createMany.mock.calls.flatMap((call) => call[0].data);
beforeEach(() => {
  db = database();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("FR-101 BR-01/07/11/12/22/30 — fixture khảo sát/phản hồi giả được ủy quyền", () => {
  it("từ chối thiếu quyềnconsole/size sai trước khi đọc hoặc ghi dữ liệu", async () => {
    await expect(
      seedDemoSurveyData(null, client(), context, "small"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      seedDemoSurveyData(actor, client(), context, "invalid" as "small"),
    ).rejects.toThrow("demo cục bộ");
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
    for (const name of names) expect(db[name].create).not.toHaveBeenCalled();
  });
  it("không tạo fixture production hoặc tự duyệt đợt bằng cùng người tạo", async () => {
    await expect(
      seedDemoSurveyData(
        actor,
        client(),
        { ...context, approvedById: context.createdById },
        "small",
      ),
    ).rejects.toThrow("hai người tạo/duyệt khác nhau");
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      seedDemoSurveyData(actor, client(), context, "small"),
    ).rejects.toThrow("demo cục bộ");
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
    for (const name of names) {
      expect(db[name].findUnique).not.toHaveBeenCalled();
      expect(db[name].create).not.toHaveBeenCalled();
      expect(db[name].createMany).not.toHaveBeenCalled();
    }
  });
  it("mỗi cohortchỉ lấy sinh viên thật sự có Enrollment trongcontext và cần≥5mẫu", async () => {
    db.enrollment.findMany.mockResolvedValue([
      { sectionId: context.sectionIds[0], studentId: context.studentIds[0] },
    ]);
    await expect(
      seedDemoSurveyData(actor, client(), context, "small"),
    ).rejects.toThrow("ít nhất năm sinh viên");
    expect(db.surveyCampaign.create).not.toHaveBeenCalled();
    expect(db.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          withdrawnAt: null,
          studentId: { in: context.studentIds },
        }),
      }),
    );
  });
  it("chỉ có hai đợt mở/đãcôngbố với người tạo và người duyệt khác nhau", async () => {
    await seedDemoSurveyData(actor, client(), context, "small");
    const campaigns = db.surveyCampaign.create.mock.calls.map(
      (call) => call[0].data,
    );
    expect(campaigns).toHaveLength(2);
    expect(campaigns.map((campaign) => campaign.status).sort()).toEqual([
      "DANG_MO",
      "DA_CONG_BO",
    ]);
    for (const campaign of campaigns) {
      expect(campaign.createdById).toBe(context.createdById);
      expect(campaign.approvedById).toBe(context.approvedById);
      expect(campaign.approvedAt.getTime()).toBeLessThan(
        campaign.startsAt.getTime(),
      );
    }
    const history = manyRows<{
      campaignId: string;
      fromStatus: string;
      toStatus: string;
    }>("campaignHistory");
    for (const campaign of campaigns) {
      const transitions = history.filter(
        (row) => row.campaignId === campaign.id,
      );
      expect(transitions[0].fromStatus).toBe("NHAP");
      for (let index = 1; index < transitions.length; index++)
        expect(transitions[index].fromStatus).toBe(
          transitions[index - 1].toStatus,
        );
      expect(transitions.at(-1)?.toStatus).toBe(campaign.status);
    }
  });
  it("response/answer UUIDngẫu nhiên, không địnhdanh hoặc quan hệngược với sinhviên/task", async () => {
    await seedDemoSurveyData(actor, client(), context, "small");
    const responses = manyRows<Record<string, unknown>>("surveyResponse"),
      answers = manyRows<Record<string, unknown>>("surveyAnswer");
    const tasks = manyRows<{
      id: string;
      studentId: string;
      doneDate: Date | null;
      status: string;
    }>("surveyTask");
    const identityIds = new Set([
      ...context.studentIds,
      ...tasks.map((task) => task.id),
    ]);
    expect(responses.length).toBeGreaterThan(0);
    for (const response of responses) {
      expect(Object.keys(response).sort()).toEqual([
        "campaignId",
        "id",
        "sectionId",
        "submittedDate",
      ]);
      expect(response.id).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      );
      expect(identityIds.has(String(response.id))).toBe(false);
      expect(
        (response.submittedDate as Date)
          .toISOString()
          .endsWith("T00:00:00.000Z"),
      ).toBe(true);
    }
    for (const answer of answers) {
      expect(Object.keys(answer)).not.toEqual(
        expect.arrayContaining(["studentId", "taskId", "userId"]),
      );
      expect(identityIds.has(String(answer.id))).toBe(false);
      expect(
        context.studentIds.some((studentId) =>
          JSON.stringify(answer).includes(studentId),
        ),
      ).toBe(false);
    }
    const done = tasks.filter((task) => task.status === "DONE");
    expect(done).toHaveLength(responses.length);
    expect(new Set(done.map((task) => task.doneDate!.toISOString())).size).toBe(
      1,
    );
  });
  it("aggregateđúng sốphiếu/task/rate và điểm trungbình trọngsố1:2 từ giátrị answerthật", async () => {
    await seedDemoSurveyData(actor, client(), context, "medium");
    const responses = manyRows<{
        id: string;
        sectionId: string;
        campaignId: string;
      }>("surveyResponse"),
      answers = manyRows<{
        responseId: string;
        questionId: string;
        valueNumber?: number;
      }>("surveyAnswer"),
      tasks = manyRows<{
        campaignId: string;
        sectionId: string;
        status: string;
      }>("surveyTask");
    const questions = manyRows<{ id: string; weight: number; type: string }>(
      "question",
    ).filter((question) => question.type === "LIKERT");
    for (const call of db.aggregateResult.create.mock.calls) {
      const aggregate = call[0].data,
        cohort = responses.filter(
          (response) =>
            response.sectionId === aggregate.sectionId &&
            response.campaignId === aggregate.campaignId,
        ),
        responseIds = new Set(cohort.map((response) => response.id));
      const cohortTasks = tasks.filter(
        (task) =>
          task.campaignId === aggregate.campaignId &&
          task.sectionId === aggregate.sectionId,
      );
      expect(aggregate.responseCount).toBe(cohort.length);
      expect(aggregate.taskCount).toBe(cohortTasks.length);
      expect(aggregate.responseCount).toBe(
        cohortTasks.filter((task) => task.status === "DONE").length,
      );
      expect(aggregate.participationRate).toBe(
        Number((cohort.length / cohortTasks.length).toFixed(4)),
      );
      let weighted = 0,
        weights = 0;
      for (const question of questions) {
        const values = answers
          .filter(
            (answer) =>
              responseIds.has(answer.responseId) &&
              answer.questionId === question.id,
          )
          .map((answer) => answer.valueNumber!);
        weighted +=
          (values.reduce((sum, value) => sum + value, 0) / values.length) *
          question.weight;
        weights += question.weight;
      }
      expect(aggregate.overallScore).toBe(
        Number((weighted / weights).toFixed(2)),
      );
      expect(aggregate.eligibleToPublish).toBe(
        cohort.length >= 5 && cohort.length / cohortTasks.length >= 0.3,
      );
    }
    expect(db.aggregateResult.create).toHaveBeenCalledTimes(3);
  });
  it("đợt mở chỉcó PENDING; seedlại không thêmphiếu hoặc đổi frozenlist/kếtquả/trạngthái", async () => {
    await seedDemoSurveyData(actor, client(), context, "small");
    const openId = context.id("survey-data:campaign:open");
    const tasks = manyRows<{
      campaignId: string;
      status: string;
      doneDate: unknown;
    }>("surveyTask").filter((task) => task.campaignId === openId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(
      tasks.every(
        (task) => task.status === "PENDING" && task.doneDate === null,
      ),
    ).toBe(true);
    db = database();
    for (const name of [
      "surveyTemplate",
      "surveyCampaign",
      "feedback",
    ] as const)
      db[name].findUnique.mockResolvedValue({ id: "đãcó" });
    db.enrollment.findMany.mockResolvedValue([]);
    await seedDemoSurveyData(actor, client(), context, "large");
    for (const name of names) {
      expect(db[name].create).not.toHaveBeenCalled();
      expect(db[name].createMany).not.toHaveBeenCalled();
    }
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
  });
  it("BR-01 danh sách đã chốt không được sửa khi chỉ thiếu phản hồi minh họa", async () => {
    for (const name of ["surveyTemplate", "surveyCampaign"] as const)
      db[name].findUnique.mockResolvedValue({ id: "đãcó" });
    db.enrollment.findMany.mockResolvedValue([
      { sectionId: context.sectionIds[0], studentId: context.studentIds[0] },
    ]);
    await seedDemoSurveyData(actor, client(), context, "large");
    expect(db.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sectionId: { in: [context.sectionIds[0]] },
        }),
      }),
    );
    for (const name of [
      "surveyCampaign",
      "campaignSection",
      "campaignHistory",
      "surveyTask",
      "surveyResponse",
      "surveyAnswer",
      "aggregateResult",
    ] as const) {
      expect(db[name].create).not.toHaveBeenCalled();
      expect(db[name].createMany).not.toHaveBeenCalled();
    }
    expect(db.feedback.create).toHaveBeenCalledTimes(6);
  });
  it("BR-20 không tạo phản hồi mới khi không còn tác giả đăng ký lớp", async () => {
    for (const name of ["surveyTemplate", "surveyCampaign"] as const)
      db[name].findUnique.mockResolvedValue({ id: "đãcó" });
    db.enrollment.findMany.mockResolvedValue([]);
    await expect(
      seedDemoSurveyData(actor, client(), context, "small"),
    ).rejects.toThrow("sinh viên đã đăng ký lớp");
    for (const name of names) {
      expect(db[name].create).not.toHaveBeenCalled();
      expect(db[name].createMany).not.toHaveBeenCalled();
    }
  });
  it.each([19, 20, 21, 22, 23, 24, 25])(
    "lịch sử giả không ghi sự kiện tương lai khi chạy ngày %i/10, kể cả cuối tuần",
    async (date) => {
      const now = new Date(`2026-10-${date}T00:00:00Z`);
      vi.setSystemTime(now);
      await seedDemoSurveyData(actor, client(), context, "small");
      const events = [
        ...manyRows<{ occurredAt: Date }>("campaignHistory"),
        ...manyRows<{ occurredAt: Date }>("feedbackHistory"),
      ];
      expect(events.length).toBeGreaterThan(0);
      for (const event of events)
        expect(event.occurredAt.getTime()).toBeLessThanOrEqual(now.getTime());
      for (const call of db.feedback.create.mock.calls) {
        const feedback = call[0].data;
        expect(feedback.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        if (feedback.answeredAt)
          expect(feedback.answeredAt.getTime()).toBeLessThanOrEqual(
            now.getTime(),
          );
        if (feedback.closedAt)
          expect(feedback.closedAt.getTime()).toBeLessThanOrEqual(
            now.getTime(),
          );
      }
    },
  );
  it("sáu trạngthái phản hồi có tácgiảđãđăngký, đúngrecipient, chuỗilịchsửliềnmạch và lýdotừchối", async () => {
    await seedDemoSurveyData(actor, client(), context, "small");
    const feedbacks = db.feedback.create.mock.calls.map((call) => call[0].data),
      history = manyRows<{
        feedbackId: string;
        event: string;
        fromStatus: string;
        toStatus: string;
        reason: string | null;
        occurredAt: Date;
      }>("feedbackHistory");
    expect(new Set(feedbacks.map((feedback) => feedback.status))).toEqual(
      new Set([
        "MOI",
        "DA_TIEP_NHAN",
        "DANG_XU_LY",
        "DA_TRA_LOI",
        "DA_DONG",
        "TU_CHOI",
      ]),
    );
    for (const feedback of feedbacks) {
      expect(context.studentIds).toContain(feedback.authorId);
      expect(feedback.sectionId).toBe(context.sectionIds[0]);
      const events = history.filter((row) => row.feedbackId === feedback.id);
      expect(events[0].event).toBe("GUI");
      for (let index = 1; index < events.length; index++) {
        expect(events[index].fromStatus).toBe(events[index - 1].toStatus);
        expect(events[index].occurredAt.getTime()).toBeGreaterThanOrEqual(
          events[index - 1].occurredAt.getTime(),
        );
      }
      expect(events.at(-1)?.toStatus).toBe(feedback.status);
      if (feedback.status === "TU_CHOI")
        expect(events.at(-1)?.reason).toBeTruthy();
      if (feedback.status === "DA_TRA_LOI" || feedback.status === "DA_DONG")
        expect(feedback.answeredAt).toBeInstanceOf(Date);
      if (feedback.status === "DA_DONG")
        expect(feedback.closedAt.getTime()).toBeGreaterThan(
          feedback.answeredAt.getTime(),
        );
    }
    expect(db.feedbackRecipient.create).toHaveBeenCalledTimes(6);
    for (const call of db.feedbackRecipient.create.mock.calls)
      expect(call[0].data.userId).toBe(context.teacherId);
    expect(db.feedbackMessage.create).toHaveBeenCalledTimes(2);
  });
});
