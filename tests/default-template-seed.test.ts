import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "../src/generated/prisma/client";
import type { ServerConsoleActor } from "../src/server/policies/console";
import { defaultTemplateInput, seedDefaultTemplate } from "../src/server/services/seed-template-default";
import { parseTemplateInput, templateInputSchema } from "../src/server/services/template-input";

const actor: ServerConsoleActor = { kind: "SERVER_CONSOLE", reason: "Tạo dữ liệu giả để nghiệm thu Tuần 6" };
const id = (key: string) => {
  const hex = createHash("sha256").update(`fake-week6-test:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const context = { id, createdById: id("operator"), legacyDefaultId: id("legacy-template") };

function fixture() {
  const delegate = () => ({ findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() });
  const db = { surveyTemplate: delegate(), criterionGroup: delegate(), question: delegate(), questionOption: delegate(),
    surveyAnswer: delegate(), surveyResponse: delegate(), aggregateResult: delegate(), auditLog: delegate() };
  db.surveyTemplate.findUnique.mockResolvedValue(null);
  db.surveyTemplate.findMany.mockResolvedValue([]);
  db.surveyTemplate.updateMany.mockResolvedValue({ count: 0 });
  db.surveyTemplate.create.mockResolvedValue({ id: id("week6-default-template") });
  db.auditLog.create.mockResolvedValue({});
  return db;
}
type Fixture = ReturnType<typeof fixture>;
function transaction(db: Fixture) { return db as unknown as Prisma.TransactionClient; }
function idsIn(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => key === "id" && typeof child === "string" ? [child] : idsIn(child));
}
function expectNoChildWrites(db: Fixture) {
  for (const table of [db.criterionGroup, db.question, db.questionOption, db.surveyAnswer, db.surveyResponse, db.aggregateResult])
    for (const action of [table.create, table.update, table.updateMany, table.deleteMany]) expect(action).not.toHaveBeenCalled();
}
function expectNoAccess(db: Fixture) {
  for (const table of Object.values(db)) for (const action of Object.values(table)) expect(action).not.toHaveBeenCalled();
}
let db: Fixture;
beforeEach(() => { vi.stubEnv("NODE_ENV", "test"); db = fixture(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("FR-35 / BR-05 — seed mặc định đủ loại, bảo toàn nội dung đã khóa", () => {
  it("định nghĩa tiếng Việt hợp lệ qua schema server, đủ năm loại và cả hai thang Likert", () => {
    const input = parseTemplateInput(templateInputSchema, defaultTemplateInput);
    const questions = input.groups.flatMap((group) => group.questions);
    expect(new Set(questions.map((question) => question.type))).toEqual(new Set(["LIKERT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "BOOLEAN"]));
    expect(questions.filter((question) => question.type === "LIKERT").map((question) => [question.scaleMin, question.scaleMax])).toEqual([[1, 5], [1, 4]]);
    expect(input.groups).toHaveLength(2);
    expect(questions).toHaveLength(6);
    expect(questions.some((question) => question.required)).toBe(true);
    expect(questions.some((question) => !question.required)).toBe(true);
    expect(questions.some((question) => question.allowNA)).toBe(true);
    expect(questions.some((question) => !question.allowNA)).toBe(true);
    expect(input.groups.map((group) => group.weight)).toEqual([2, 1]);
  });

  it.each<ServerConsoleActor | null>([null, { kind: "SERVER_CONSOLE", reason: "ngắn" },
    { kind: "HTTP" as ServerConsoleActor["kind"], reason: "Không phải người vận hành máy chủ" }])("không có danh tính console hợp lệ bị chặn trước mọi truy cập DB: %j", async (invalid) => {
    await expect(seedDefaultTemplate(invalid, transaction(db), context)).rejects.toMatchObject({ status: 403 });
    expectNoAccess(db);
  });

  it("production bị chặn trước mọi truy cập DB ngay cả với danh tính console hợp lệ", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(seedDefaultTemplate(actor, transaction(db), context)).rejects.toThrow("chỉ được seed trong môi trường phát triển");
    expectNoAccess(db);
  });

  it("cài mới tạo họ riêng v1 đã khóa và ID mới cho toàn bộ cây, không sửa câu/phiếu/kết quả cũ", async () => {
    const old = { id: context.legacyDefaultId, familyId: id("legacy-family"), name: "Mẫu cũ đã có kết quả", revision: 7, lockedAt: new Date("2026-10-01"),
      groups: [{ id: id("legacy-group"), questions: [{ id: id("legacy-question"), label: "Câu cũ", answers: [{ id: id("legacy-answer"), valueNumber: 4 }] }] }],
      result: { id: id("legacy-result"), overallScore: 4 } };
    const snapshot = structuredClone(old);
    await seedDefaultTemplate(actor, transaction(db), context);
    const created = db.surveyTemplate.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ id: id("week6-default-template"), familyId: id("week6-default-family"), version: 1,
      status: "DA_KHOA", lockedAt: expect.any(Date), isDefault: true, createdById: context.createdById });
    const newIds = idsIn(created);
    expect(newIds).toHaveLength(15); // template + 2 nhóm + 6 câu + 6 lựa chọn
    expect(new Set(newIds).size).toBe(newIds.length);
    for (const createdId of newIds) expect(idsIn(old)).not.toContain(createdId);
    expect(created.familyId).not.toBe(old.familyId);
    expect(created.groups.create.flatMap((group: { questions: { create: unknown[] } }) => group.questions.create)).toHaveLength(6);
    expectNoChildWrites(db);
    expect(db.surveyTemplate.update).not.toHaveBeenCalled();
    expect(db.surveyTemplate.deleteMany).not.toHaveBeenCalled();
    expect(old).toEqual(snapshot);
  });

  it("không có mặc định thì chọn mẫu mới, chỉ thử bỏ cờ đúng ID legacy và không cập nhật toàn bảng", async () => {
    await seedDefaultTemplate(actor, transaction(db), context);
    expect(db.surveyTemplate.create.mock.calls[0][0].data.isDefault).toBe(true);
    expect(db.surveyTemplate.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id: context.legacyDefaultId, isDefault: true },
      data: { isDefault: false, revision: { increment: 1 } } });
    expectNoChildWrites(db);
  });

  it("chỉ mẫu legacy đang mặc định thì chuyển cờ và tăng revision metadata, giữ nguyên nội dung khóa", async () => {
    const legacy = { id: context.legacyDefaultId, isDefault: true, revision: 9,
      name: "Tên cũ", status: "DA_KHOA", lockedAt: new Date("2026-10-01"), groups: [{ title: "Nhóm cũ", label: "Câu cũ" }] };
    const frozenContent = structuredClone({ name: legacy.name, status: legacy.status, lockedAt: legacy.lockedAt, groups: legacy.groups });
    db.surveyTemplate.findMany.mockResolvedValue([{ id: legacy.id }]);
    db.surveyTemplate.updateMany.mockImplementation(async () => { legacy.isDefault = false; legacy.revision += 1; return { count: 1 }; });
    await seedDefaultTemplate(actor, transaction(db), context);
    expect(legacy).toMatchObject({ isDefault: false, revision: 10 });
    expect({ name: legacy.name, status: legacy.status, lockedAt: legacy.lockedAt, groups: legacy.groups }).toEqual(frozenContent);
    expect(db.surveyTemplate.updateMany.mock.calls[0][0].data).toEqual({ isDefault: false, revision: { increment: 1 } });
    expect(db.surveyTemplate.create.mock.calls[0][0].data.isDefault).toBe(true);
    expectNoChildWrites(db);
  });

  it.each(["custom-only", "legacy-and-custom"])("giữ lựa chọn tùy chỉnh khi đã có %s; mẫu tích hợp mới không tự trở thành mặc định", async (selected) => {
    const custom = { id: id("custom-default") };
    db.surveyTemplate.findMany.mockResolvedValue(selected === "custom-only" ? [custom] : [{ id: context.legacyDefaultId }, custom]);
    await seedDefaultTemplate(actor, transaction(db), context);
    expect(db.surveyTemplate.create.mock.calls[0][0].data.isDefault).toBe(false);
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
    expect(db.surveyTemplate.update).not.toHaveBeenCalled();
    expectNoChildWrites(db);
  });

  it("chạy lại khi họ tích hợp đã tồn tại không đọc/chọn lại mặc định, sửa hoặc reset cây", async () => {
    db.surveyTemplate.findUnique.mockResolvedValue({ id: id("week6-default-template") });
    await seedDefaultTemplate(actor, transaction(db), context);
    expect(db.surveyTemplate.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { id: id("week6-default-template") }, select: { id: true } });
    expect(db.surveyTemplate.findMany).not.toHaveBeenCalled();
    for (const table of Object.values(db)) for (const action of [table.create, table.update, table.updateMany, table.deleteMany]) expect(action).not.toHaveBeenCalled();
  });

  it("audit chỉ metadata console/số lượng, không chứa nội dung cấu trúc hoặc lý do người vận hành", async () => {
    await seedDefaultTemplate(actor, transaction(db), context);
    expect(db.auditLog.create).toHaveBeenCalledExactlyOnceWith({ data: { actorId: null, action: "DEFAULT_TEMPLATE_SEEDED", objectType: "SurveyTemplate",
      objectId: id("week6-default-template"), redactedSummary: { console: true, isDefault: true, groupCount: 2, questionCount: 6 } } });
    const log = JSON.stringify(db.auditLog.create.mock.calls);
    for (const content of [actor.reason, defaultTemplateInput.name, ...defaultTemplateInput.groups.map((group) => group.title),
      ...defaultTemplateInput.groups.flatMap((group) => group.questions.map((question) => question.label))]) expect(log).not.toContain(content);
  });
});
