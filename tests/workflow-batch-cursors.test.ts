import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureDueImprovements,
  ensureWorkflowReminders,
} from "../src/server/services/improvements";

const { db, enqueue } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    surveyCampaign: { findMany: vi.fn(), findUnique: vi.fn() },
    aggregateResult: { findMany: vi.fn() },
    improvementPlan: { findMany: vi.fn() },
    examReviewRecommendation: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
  enqueue: vi.fn().mockResolvedValue({ queued: 1 }),
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/server/services/domain-notifications", () => ({
  enqueueDomainNotice: enqueue,
}));
const settings = new Map<string, string>();
const ids = Array.from(
  { length: 7 },
  (_, i) => `99000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const actor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Kiểm thử luân phiên các lô công việc đến hạn",
};
type Query = { where: { id?: { gt: string } }; take: number };
const page = (query: Query) =>
  ids
    .filter((id) => !query.where.id || id > query.where.id.gt)
    .slice(0, query.take);
beforeEach(() => {
  vi.clearAllMocks();
  settings.clear();
  db.$transaction.mockImplementation(
    async (operation: (tx: unknown) => Promise<unknown>) => operation(db),
  );
  db.systemSetting.findUnique.mockImplementation(
    async ({ where }: { where: { key: string } }) =>
      settings.has(where.key) ? { value: settings.get(where.key) } : null,
  );
  db.systemSetting.upsert.mockImplementation(
    async ({
      where,
      update,
    }: {
      where: { key: string };
      update: { value: string };
    }) => {
      settings.set(where.key, update.value);
      return { key: where.key, value: update.value };
    },
  );
  db.surveyCampaign.findMany.mockImplementation(async (query: Query) =>
    page(query).map((id) => ({ id })),
  );
  db.surveyCampaign.findUnique.mockResolvedValue({
    status: "DA_CONG_BO",
    semester: { lockedAt: null },
    history: [],
    warningScore: 3,
    explanationDays: 14,
  });
  db.aggregateResult.findMany.mockResolvedValue([]);
  const department = { id: "dept", facultyId: "faculty" };
  db.improvementPlan.findMany.mockImplementation(async (query: Query) =>
    page(query).map((id) => ({
      id,
      teacherId: "teacher",
      dueAt: new Date("2026-10-01Z"),
      cohort: { section: { course: { department } } },
    })),
  );
  db.examReviewRecommendation.findMany.mockImplementation(
    async (query: Query) =>
      page(query).map((id) => ({
        id,
        recipientId: "head",
        course: { department },
      })),
  );
  db.user.findMany.mockResolvedValue([]);
});

describe("BR-10/58 / FR-82 — lô nhỏ vẫn quét hết công việc", () => {
  it("bảy đợt với limit2 được đi hết rồi quay vòng, không chỉ kiểm hai đợt đầu", async () => {
    for (let i = 0; i < 4; i++)
      await ensureDueImprovements(actor, { limit: 2 });
    const visited = db.surveyCampaign.findUnique.mock.calls.map(
      ([query]) => (query as { where: { id: string } }).where.id,
    );
    expect(visited).toEqual(ids);
    expect(settings.get("IMPROVEMENT_BACKFILL_CURSOR")).toBe("");
    await ensureDueImprovements(actor, { limit: 2 });
    expect(
      db.surveyCampaign.findUnique.mock.calls
        .slice(-2)
        .map(([query]) => (query as { where: { id: string } }).where.id),
    ).toEqual(ids.slice(0, 2));
  });
  it("hai hàng đợi nhắc hạn có cursor riêng và không bỏ đói hồ sơ sau lô đầu", async () => {
    for (let i = 0; i < 4; i++)
      await ensureWorkflowReminders(db as never, {
        limit: 2,
        now: new Date("2026-11-03Z"),
      });
    const notices = enqueue.mock.calls.map(
      ([, data]) => data as { targetType: string; targetId: string },
    );
    expect(
      notices
        .filter((n) => n.targetType === "ImprovementPlan")
        .map((n) => n.targetId),
    ).toEqual(ids);
    expect(
      notices
        .filter((n) => n.targetType === "ExamReviewRecommendation")
        .map((n) => n.targetId),
    ).toEqual(ids);
    expect(settings.get("IMPROVEMENT_REMINDER_CURSOR")).toBe("");
    expect(settings.get("EXAM_RECOMMENDATION_REMINDER_CURSOR")).toBe("");
    expect(db.improvementPlan.findMany.mock.calls[1][0].where.id).toEqual({
      gt: ids[1],
    });
    expect(
      db.examReviewRecommendation.findMany.mock.calls[1][0].where.id,
    ).toEqual({ gt: ids[1] });
  });
  it("lô rỗng sau cursor cũ được xóa cursor để nhận ứng viên mới ở vòng kế", async () => {
    settings.set(
      "IMPROVEMENT_BACKFILL_CURSOR",
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
    );
    expect(await ensureDueImprovements(actor, { limit: 2 })).toEqual({
      created: 0,
      checked: 0,
    });
    expect(settings.get("IMPROVEMENT_BACKFILL_CURSOR")).toBe("");
    expect(await ensureDueImprovements(actor, { limit: 2 })).toEqual({
      created: 0,
      checked: 2,
    });
  });
});
