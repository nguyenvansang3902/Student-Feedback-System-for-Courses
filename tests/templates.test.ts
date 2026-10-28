import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { can } from "../src/server/policies/can";
import { parseTemplateInput, templateInputSchema } from "../src/server/services/template-input";
import {
  cloneTemplate, createTemplate, createTemplateVersion, getDefaultTemplate, getTemplate, listTemplates,
  lockTemplate, setDefaultTemplate, updateTemplate,
} from "../src/server/services/templates";

const { db } = vi.hoisted(() => {
  const delegate = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), aggregate: vi.fn() });
  return { db: { surveyTemplate: delegate(), criterionGroup: delegate(), question: delegate(), questionOption: delegate(), surveyAnswer: delegate(),
    userSession: delegate(), systemSetting: delegate(), auditLog: delegate(), $transaction: vi.fn(), $executeRaw: vi.fn(), $queryRaw: vi.fn() } };
});
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
function actor(role: Role = "CAN_BO_DBCL"): AuthActor {
  const scopeType = role === "TRUONG_BO_MON" ? "DEPARTMENT" : role === "TRUONG_KHOA" ? "FACULTY" : "GLOBAL";
  return { userId: randomUUID(), sessionId: randomUUID(), familyId: randomUUID(), loginCode: "FAKE", email: "fake@example.invalid", displayName: "Giả",
    roles: [role], assignments: [{ role, scopeType, facultyId: scopeType === "FACULTY" ? randomUUID() : null, departmentId: scopeType === "DEPARTMENT" ? randomUUID() : null }],
    purpose: "FULL", mustChangePassword: false, mfa: role === "ADMIN", mfaRequired: role === "ADMIN" };
}
function session(current: AuthActor) {
  return { id: current.sessionId, userId: current.userId, familyId: current.familyId, purpose: "FULL", revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
    mfaVerifiedAt: current.mfa ? new Date() : null, user: { id: current.userId, loginCode: current.loginCode, email: current.email, displayName: current.displayName,
      status: "ACTIVE", mustChangePassword: false, roles: current.assignments } };
}
function input() {
  return { name: "Mẫu kiểm thử giả", groups: [{ title: "Nhóm giả", position: 1, weight: 1.2345, isAssessmentGroup: true, questions: [
    { label: "Likert giả", type: "LIKERT" as const, position: 1, required: true, allowNA: true, weight: 1, options: [] },
    { label: "Chọn một giả", type: "SINGLE_CHOICE" as const, position: 2, required: true, allowNA: false, weight: 2, options: [{ label: "Một", position: 1 }, { label: "Hai", position: 2 }] },
    { label: "Chọn nhiều giả", type: "MULTIPLE_CHOICE" as const, position: 3, required: false, allowNA: true, weight: 0.1, options: [{ label: "Ba", position: 1 }, { label: "Bốn", position: 2 }] },
    { label: "Tự luận giả", type: "TEXT" as const, position: 4, required: false, allowNA: true, weight: 1, options: [] },
    { label: "Có không giả", type: "BOOLEAN" as const, position: 5, required: true, allowNA: false, weight: 1, options: [] },
  ] }] };
}
function row() {
  const data = input();
  return { id: randomUUID(), familyId: randomUUID(), version: 1, revision: 1, name: data.name, status: "NHAP" as "NHAP" | "DA_KHOA", isDefault: false,
    createdAt: new Date("2026-10-22T01:00:00Z"), updatedAt: new Date("2026-10-22T02:00:00Z"), lockedAt: null as Date | null, campaigns: [] as { id: string }[],
    groups: data.groups.map((group) => ({ ...group, id: randomUUID(), questions: group.questions.map((question) => ({ ...question, id: randomUUID(),
      scaleMin: question.type === "LIKERT" ? 1 : null, scaleMax: question.type === "LIKERT" ? 5 : null, options: question.options.map((option) => ({ ...option, id: randomUUID() })) })) })) };
}
let current: AuthActor, template: ReturnType<typeof row>;
beforeEach(() => {
  vi.resetAllMocks(); current = actor(); template = row();
  db.$transaction.mockImplementation(async (operation) => operation(db)); db.$executeRaw.mockResolvedValue(1); db.$queryRaw.mockResolvedValue([]);
  db.userSession.findUnique.mockImplementation(async () => session(current)); db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN"] });
  db.surveyTemplate.findUnique.mockImplementation(async () => template); db.surveyTemplate.findFirst.mockImplementation(async () => template);
  db.surveyTemplate.findMany.mockResolvedValue([]); db.surveyTemplate.count.mockResolvedValue(0); db.surveyTemplate.aggregate.mockResolvedValue({ _max: { version: 4 } });
  db.surveyTemplate.create.mockImplementation(async () => template); db.surveyTemplate.update.mockImplementation(async () => template);
  db.surveyTemplate.updateMany.mockResolvedValue({ count: 1 }); db.surveyAnswer.count.mockResolvedValue(0); db.auditLog.create.mockResolvedValue({});
});

describe("FR-30/31 — cấu trúc và giới hạn trình soạn", () => {
  it("nhận đủ năm loại; mặc định Likert 1–5, cờ và trọng số có giá trị mặc định", async () => {
    const data = parseTemplateInput(templateInputSchema, { name: " Mẫu ", groups: [{ title: " Nhóm ", position: 1, questions: [{ label: " Câu ", type: "LIKERT", position: 1 }] }] });
    expect(data).toMatchObject({ name: "Mẫu", groups: [{ title: "Nhóm", weight: 1, isAssessmentGroup: false, questions: [{ label: "Câu", required: true, allowNA: false, weight: 1, options: [] }] }] });
    await createTemplate(current, data);
    expect(db.surveyTemplate.create.mock.calls[0][0].data.groups.create[0].questions.create[0]).toMatchObject({ scaleMin: 1, scaleMax: 5 });
    expect(templateInputSchema.safeParse(input()).success).toBe(true);
  });
  it("TC-FR148-01: chỉ nhận cờ boolean thật, thiếu cờ mặc định false và lưu/đọc cờ true", async () => {
    const data = input(), group = data.groups[0];
    for (const invalid of ["true", "false", 0, 1, null, []]) {
      const body = { ...data, groups: [{ ...group, isAssessmentGroup: invalid }] };
      expect(() => parseTemplateInput(templateInputSchema, body)).toThrow("Nhóm kiểm tra, đánh giá");
    }
    expect(parseTemplateInput(templateInputSchema, { ...data, groups: [{ ...group, isAssessmentGroup: false }] }).groups[0].isAssessmentGroup).toBe(false);
    const created = await createTemplate(current, data);
    expect(db.surveyTemplate.create.mock.calls[0][0].data.groups.create[0]).toMatchObject({ isAssessmentGroup: true });
    expect(created.groups[0].isAssessmentGroup).toBe(true);
    expect((await getTemplate(current, template.id)).groups[0].isAssessmentGroup).toBe(true);
    expect(db.surveyTemplate.findUnique.mock.calls[0][0].select.groups.select.isAssessmentGroup).toBe(true);
  });
  it("TC-FR148-02: đổi cờ cùng nhóm khi sắp thứ tự, không gán cờ theo vị trí mảng", async () => {
    const data = input(), group = data.groups[0];
    await createTemplate(current, { ...data, groups: [
      { ...group, title: "Nhóm đánh giá", position: 9, isAssessmentGroup: true },
      { ...group, title: "Nhóm khác", position: 2, isAssessmentGroup: false },
    ] });
    expect(db.surveyTemplate.create.mock.calls[0][0].data.groups.create.map((item: { title: string; isAssessmentGroup: boolean }) => [item.title, item.isAssessmentGroup])).toEqual([
      ["Nhóm khác", false], ["Nhóm đánh giá", true],
    ]);
    await updateTemplate(current, template.id, { ...data, groups: [{ ...group, isAssessmentGroup: false }], expectedRevision: 1 });
    expect(db.surveyTemplate.update.mock.calls[0][0].data.groups.create[0].isAssessmentGroup).toBe(false);
  });
  it("nhận Likert 1–4 và trọng số bốn số lẻ, không nhận thang khác/điểm của câu không phải Likert", () => {
    const data = input(); const question = data.groups[0].questions[0];
    expect(templateInputSchema.safeParse({ ...data, groups: [{ ...data.groups[0], questions: [{ ...question, scaleMin: 1, scaleMax: 4, weight: 0.0001 }] }] }).success).toBe(true);
    for (const change of [{ scaleMin: 0, scaleMax: 5 }, { scaleMin: 1, scaleMax: 6 }, { type: "TEXT", scaleMin: 1, scaleMax: 5 }])
      expect(templateInputSchema.safeParse({ ...data, groups: [{ ...data.groups[0], questions: [{ ...question, ...change }] }] }).success).toBe(false);
  });
  it.each([0, -1, 1000.0001, 0.00001, Number.NaN, Number.POSITIVE_INFINITY])("không nhận trọng số sai %s", (weight) => {
    const data = input(); data.groups[0].weight = weight; expect(templateInputSchema.safeParse(data).success).toBe(false);
  });
  it("từ chối thứ tự trùng ở cả ba cấp; cho phép đổi thứ tự có khoảng trống", () => {
    const data = input(), group = data.groups[0], question = group.questions[1];
    for (const invalid of [ { ...data, groups: [group, group] }, { ...data, groups: [{ ...group, questions: [question, question] }] },
      { ...data, groups: [{ ...group, questions: [{ ...question, options: [{ label: "A", position: 1 }, { label: "B", position: 1 }] }] }] } ])
      expect(templateInputSchema.safeParse(invalid).success).toBe(false);
    expect(templateInputSchema.safeParse({ ...data, groups: [{ ...group, position: 9, questions: [{ ...question, position: 15 }] }] }).success).toBe(true);
  });
  it("giới hạn 20 nhóm/100 câu/20 lựa chọn; lựa chọn ít nhất hai và không trùng nhãn", () => {
    const data = input(), group = data.groups[0], question = group.questions[1];
    for (const invalid of [ { ...data, groups: Array.from({ length: 21 }, (_, index) => ({ ...group, position: index + 1 })) },
      { ...data, groups: Array.from({ length: 2 }, (_, index) => ({ ...group, position: index + 1, questions: Array.from({ length: 51 }, (_, n) => ({ ...group.questions[0], position: n + 1 })) })) },
      { ...data, groups: [{ ...group, questions: [{ ...question, options: [{ label: "A", position: 1 }] }] }] },
      { ...data, groups: [{ ...group, questions: [{ ...question, options: [{ label: " A ", position: 1 }, { label: "a", position: 2 }] }] }] },
      { ...data, groups: [{ ...group, questions: [{ ...question, options: Array.from({ length: 21 }, (_, index) => ({ label: `A${index}`, position: index + 1 })) }] }] } ])
      expect(templateInputSchema.safeParse(invalid).success).toBe(false);
  });
  it("không có nhóm/câu rỗng, kiểu lạ, nội dung vượt giới hạn, ID do client hoặc trường quyền", () => {
    const data = input(), group = data.groups[0], question = group.questions[0];
    for (const invalid of [ { ...data, groups: [] }, { ...data, groups: [{ ...group, questions: [] }] }, { ...data, groups: [{ ...group, questions: [{ ...question, type: "ADMIN" }] }] },
      { ...data, name: "x".repeat(201) }, { ...data, groups: [{ ...group, questions: [{ ...question, label: "x".repeat(1001) }] }] },
      { ...data, isDefault: true }, { ...data, groups: [{ ...group, id: randomUUID() }] }, { ...data, name: "a\u0000b" } ])
      expect(templateInputSchema.safeParse(invalid).success).toBe(false);
  });
  it("lỗi tiếng Việt nêu vị trí, không chèn nội dung câu hỏi/nguyên văn lỗi Zod vào log", () => {
    const data = input(); data.groups[0].questions[1].options = [];
    expect(() => parseTemplateInput(templateInputSchema, data)).toThrow("Nhóm → 1 → Câu hỏi → 2 → Lựa chọn");
    expect(() => parseTemplateInput(templateInputSchema, { ...data, name: "" })).toThrow("Tên mẫu");
  });
});

describe("FR-30–35, BR-05/30/34 — quyền, bất biến phiên bản và khóa", () => {
  it.each<Role>(["SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"])("TC-ALL-01: ma trận mẫu phiếu mười tác nhân: %s", (role) => {
    for (const action of ["templates:list", "templates:read", "templates:write"]) expect(can(actor(role), action)).toBe(role === "CAN_BO_DBCL");
  });
  it("ĐBCL sai phạm vi, phiên hạn chế và ADMIN+ĐBCL thiếu MFA bị từ chối", () => {
    expect(can({ ...current, assignments: [{ ...current.assignments![0], scopeType: "FACULTY", facultyId: randomUUID() }] }, "templates:write")).toBe(false);
    expect(can({ ...current, purpose: "MFA_VERIFY" }, "templates:read")).toBe(false);
    const admin = actor("ADMIN"), combined = { ...admin, roles: [...admin.roles, ...current.roles], assignments: [...admin.assignments!, ...current.assignments!] };
    expect(can(combined, "templates:write")).toBe(true); expect(can({ ...combined, mfa: false }, "templates:write")).toBe(false);
    expect(can(current, "templates:delete")).toBe(false);
  });
  it.each<Role>(["SINH_VIEN", "GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"])("TC-ALL-01: từ chối mọi service/ID mẫu phiếu trước DB (IDOR): %s", async (role) => {
    const denied = actor(role), body = { expectedRevision: 1 };
    for (const attempt of [() => listTemplates(denied), () => getTemplate(denied, template.id), () => getDefaultTemplate(denied),
      () => createTemplate(denied, input()), () => updateTemplate(denied, template.id, { ...input(), ...body }), () => lockTemplate(denied, template.id, body),
      () => createTemplateVersion(denied, template.id, body), () => cloneTemplate(denied, template.id, body), () => setDefaultTemplate(denied, template.id, body)])
      await expect(attempt()).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("mỗi ID và phân trang/revision được validate trước truy cập DB", async () => {
    for (const attempt of [() => getTemplate(current, "bad"), () => listTemplates(current, { pageSize: 51 }),
      () => updateTemplate(current, template.id, { ...input(), expectedRevision: 0 }), () => lockTemplate(current, template.id, {}),
      () => cloneTemplate(current, template.id, { expectedRevision: 1, status: "NHAP" }), () => createTemplateVersion(current, "bad", { expectedRevision: 1 }),
      () => setDefaultTemplate(current, "bad", { expectedRevision: 1 })]) await expect(attempt()).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("mutex current-read chạy đầu trước freshactor, không đọc snapshot trước chờ khóa", async () => {
    await createTemplate(current, input());
    expect(db.$executeRaw.mock.calls[0][0].join("")).toContain("INSERT INTO SystemSetting");
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(db.$queryRaw.mock.invocationCallOrder[0]);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.userSession.findUnique.mock.invocationCallOrder[0]);
    expect(db.userSession.findUnique.mock.invocationCallOrder[0]).toBeLessThan(db.surveyTemplate.create.mock.invocationCallOrder[0]);
  });
  it("kiểm lại phiên/quyền trên từng ID dù actor đầu vào vẫn ĐBCL", async () => {
    const active = session(current); db.userSession.findUnique.mockResolvedValue({ ...active, user: { ...active.user, roles: [] } });
    const revision = { expectedRevision: 1 };
    for (const attempt of [() => getTemplate(current, template.id), () => updateTemplate(current, template.id, { ...input(), ...revision }),
      () => lockTemplate(current, template.id, revision), () => cloneTemplate(current, template.id, revision), () => createTemplateVersion(current, template.id, revision),
      () => setDefaultTemplate(current, template.id, revision)]) await expect(attempt()).rejects.toMatchObject({ status: 403 });
    expect(db.surveyTemplate.findUnique).not.toHaveBeenCalled(); expect(db.surveyTemplate.create).not.toHaveBeenCalled();
  });
  it("list/count cùng điều kiện; phân trang, chỉ metadata không rò nhóm/nội dung", async () => {
    db.surveyTemplate.findMany.mockResolvedValue([{ ...template, groups: [{ _count: { questions: 5 } }] }]); db.surveyTemplate.count.mockResolvedValue(11);
    const result = await listTemplates(current, { search: "giả", status: "NHAP", isDefault: false, page: 2, pageSize: 10 });
    const query = db.surveyTemplate.findMany.mock.calls[0][0]; expect(db.surveyTemplate.count).toHaveBeenCalledWith({ where: query.where });
    expect(query).toMatchObject({ skip: 10, take: 10, where: { name: { contains: "giả" }, status: "NHAP", isDefault: false } });
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 11, items: [{ groupCount: 1, questionCount: 5, isLocked: false }] });
    expect(result.items[0]).not.toHaveProperty("groups"); expect(result.items[0]).not.toHaveProperty("campaigns");
  });
  it("detail/xem trước trả đúng thứ tự query, số Decimal và cờ đủ năm loại, không lộ người tạo", async () => {
    const result = await getTemplate(current, template.id); expect(result.groups[0].questions.map((question) => question.type)).toEqual(["LIKERT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "BOOLEAN"]);
    expect(result.groups[0].weight).toBe(1.2345); expect(result.groups[0].questions[0]).toMatchObject({ scaleMin: 1, scaleMax: 5, required: true, allowNA: true });
    expect(result).toMatchObject({ revision: 1, createdAt: "2026-10-22T01:00:00.000Z", updatedAt: "2026-10-22T02:00:00.000Z" });
    expect(result).not.toHaveProperty("createdById"); expect(result).not.toHaveProperty("campaigns");
    expect(db.surveyTemplate.findUnique.mock.calls[0][0].select.groups.orderBy).toEqual([{ position: "asc" }, { id: "asc" }]);
    db.surveyTemplate.findUnique.mockResolvedValue(null); await expect(getTemplate(current, template.id)).rejects.toMatchObject({ status: 404 });
  });
  it.each(["status", "lockedAt", "campaign"])("BR-05: không sửa khi khóa theo %s; không có đường mở khóa", async (reason) => {
    if (reason === "status") template.status = "DA_KHOA";
    if (reason === "lockedAt") template.lockedAt = new Date();
    if (reason === "campaign") template.campaigns = [{ id: randomUUID() }];
    await expect(updateTemplate(current, template.id, { ...input(), expectedRevision: 1 })).rejects.toMatchObject({ code: "TEMPLATE_LOCKED" });
    await expect(lockTemplate(current, template.id, { expectedRevision: 1 })).rejects.toMatchObject({ code: "TEMPLATE_LOCKED" });
    expect((await getTemplate(current, template.id)).isLocked).toBe(true);
    expect(db.question.deleteMany).not.toHaveBeenCalled(); expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
    const guarded = db.surveyTemplate.findUnique.mock.calls[0][0].select.campaigns.where.OR;
    expect(guarded[0]).toEqual({ approvedAt: { not: null } }); expect(guarded[1].status.in).toContain("DA_DUYET"); expect(guarded[1].status.in).toContain("DA_CONG_BO");
  });
  it("mẫu có câu trả lời cũng không bị sửa nếu metadata khóa bị thiếu", async () => {
    db.surveyAnswer.count.mockResolvedValue(1);
    await expect(updateTemplate(current, template.id, { ...input(), expectedRevision: 1 })).rejects.toMatchObject({ code: "TEMPLATE_IN_USE" });
    expect(db.surveyAnswer.count).toHaveBeenCalledWith({ where: { questionId: { in: template.groups[0].questions.map((question) => question.id) } } });
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled(); expect(db.questionOption.deleteMany).not.toHaveBeenCalled();
  });
  it("CAS từ chối revision cũ cho mọi thao tác ID và không ghi/xóa dữ liệu", async () => {
    template.revision = 2; const revision = { expectedRevision: 1 };
    for (const attempt of [() => updateTemplate(current, template.id, { ...input(), ...revision }), () => lockTemplate(current, template.id, revision),
      () => cloneTemplate(current, template.id, revision), () => createTemplateVersion(current, template.id, revision), () => setDefaultTemplate(current, template.id, revision)])
      await expect(attempt()).rejects.toMatchObject({ code: "TEMPLATE_REVISION_CONFLICT" });
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled(); expect(db.surveyTemplate.create).not.toHaveBeenCalled();
  });
  it("CAS update bảo vệ revision/trạng thái, xóa cây theo FK thứ tự và chèn UUID mới", async () => {
    await updateTemplate(current, template.id, { ...input(), expectedRevision: 1 });
    expect(db.surveyTemplate.updateMany).toHaveBeenCalledWith({ where: { id: template.id, revision: 1, status: "NHAP", lockedAt: null, isDefault: false }, data: { name: input().name, revision: { increment: 1 } } });
    expect(db.surveyTemplate.updateMany.mock.invocationCallOrder[0]).toBeLessThan(db.questionOption.deleteMany.mock.invocationCallOrder[0]);
    expect(db.questionOption.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(db.question.deleteMany.mock.invocationCallOrder[0]);
    expect(db.question.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(db.criterionGroup.deleteMany.mock.invocationCallOrder[0]);
    expect(db.criterionGroup.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(db.surveyTemplate.update.mock.invocationCallOrder[0]);
    const group = db.surveyTemplate.update.mock.calls[0][0].data.groups.create[0]; expect(group.id).not.toBe(template.groups[0].id);
    expect(group.questions.create[0].id).not.toBe(template.groups[0].questions[0].id);
    db.surveyTemplate.updateMany.mockResolvedValue({ count: 0 }); db.questionOption.deleteMany.mockClear();
    await expect(updateTemplate(current, template.id, { ...input(), expectedRevision: 1 })).rejects.toMatchObject({ code: "TEMPLATE_REVISION_CONFLICT" });
    expect(db.questionOption.deleteMany).not.toHaveBeenCalled();
  });
  it("khóa mẫu hợp lệ bằng CAS và không thay cây câu hỏi", async () => {
    await lockTemplate(current, template.id, { expectedRevision: 1 });
    expect(db.surveyTemplate.updateMany).toHaveBeenCalledWith({ where: { id: template.id, revision: 1, status: "NHAP", lockedAt: null }, data: { status: "DA_KHOA", lockedAt: expect.any(Date), revision: { increment: 1 } } });
    expect(db.question.deleteMany).not.toHaveBeenCalled(); expect(db.auditLog.create.mock.calls[0][0].data.action).toBe("TEMPLATE_LOCKED");
    template.groups = []; db.surveyTemplate.updateMany.mockClear();
    await expect(lockTemplate(current, template.id, { expectedRevision: 1 })).rejects.toMatchObject({ code: "INVALID_TEMPLATE" }); expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it.each([false, true])("TC-FR148-03 / BR-05: phiên bản mới cùng họ max+1 giữ cờ %s, nguồn khóa không đổi; mọi ID con mới", async (isAssessmentGroup) => {
    template.groups[0].isAssessmentGroup = isAssessmentGroup;
    template.status = "DA_KHOA"; template.lockedAt = new Date(); template.isDefault = true; const original = JSON.stringify(template);
    await createTemplateVersion(current, template.id, { expectedRevision: 1, name: "Phiên bản mới" });
    expect(db.surveyTemplate.aggregate).toHaveBeenCalledWith({ where: { familyId: template.familyId }, _max: { version: true } });
    const created = db.surveyTemplate.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ familyId: template.familyId, version: 5, status: "NHAP", lockedAt: null, isDefault: false, name: "Phiên bản mới", createdById: current.userId });
    expect(created.id).not.toBe(template.id); expect(created.groups.create[0].id).not.toBe(template.groups[0].id);
    expect(created.groups.create[0].isAssessmentGroup).toBe(isAssessmentGroup);
    expect(created.groups.create[0].questions.create[1].options.create[0].id).not.toBe(template.groups[0].questions[1].options[0].id);
    expect(JSON.stringify(template)).toBe(original); expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it.each([false, true])("TC-FR148-04: nhân bản giữ cờ %s trong họ mới v1 nháp, không kế thừa mặc định/khóa", async (isAssessmentGroup) => {
    template.groups[0].isAssessmentGroup = isAssessmentGroup;
    template.status = "DA_KHOA"; template.lockedAt = new Date(); template.isDefault = true;
    await cloneTemplate(current, template.id, { expectedRevision: 1 });
    const created = db.surveyTemplate.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ version: 1, status: "NHAP", isDefault: false, lockedAt: null }); expect(created.familyId).not.toBe(template.familyId);
    expect(created.groups.create[0].isAssessmentGroup).toBe(isAssessmentGroup);
    expect(db.surveyTemplate.aggregate).not.toHaveBeenCalled(); expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it("TC-FR148-05 / BR-05: không thể thay cờ trên mẫu đã khóa, cây và UUID gốc nguyên vẹn", async () => {
    template.status = "DA_KHOA"; template.lockedAt = new Date();
    const frozen = structuredClone(template), data = input();
    await expect(updateTemplate(current, template.id, { ...data, expectedRevision: 1, groups: [{ ...data.groups[0], isAssessmentGroup: false }] })).rejects.toMatchObject({ code: "TEMPLATE_LOCKED" });
    expect(template).toEqual(frozen);
    expect(db.criterionGroup.deleteMany).not.toHaveBeenCalled();
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it("mặc định phải là mẫu khóa hợp lệ; giữ nguyên nội dung khóa, revision metadata tăng cả hai phía", async () => {
    await expect(setDefaultTemplate(current, template.id, { expectedRevision: 1 })).rejects.toMatchObject({ code: "TEMPLATE_NOT_LOCKED" });
    template.status = "DA_KHOA"; template.lockedAt = new Date(); const originalGroups = JSON.stringify(template.groups);
    await setDefaultTemplate(current, template.id, { expectedRevision: 1 });
    expect(db.surveyTemplate.updateMany.mock.calls[0][0]).toEqual({ where: { isDefault: true, id: { not: template.id } }, data: { isDefault: false, revision: { increment: 1 } } });
    expect(db.surveyTemplate.updateMany.mock.calls[1][0]).toEqual({ where: { id: template.id, revision: 1, status: "DA_KHOA", lockedAt: { not: null } }, data: { isDefault: true, revision: { increment: 1 } } });
    expect(JSON.stringify(template.groups)).toBe(originalGroups); expect(db.question.deleteMany).not.toHaveBeenCalled();
    template.isDefault = true; db.surveyTemplate.updateMany.mockClear(); await setDefaultTemplate(current, template.id, { expectedRevision: 1 }); expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
    db.surveyTemplate.findFirst.mockResolvedValue(null); expect(await getDefaultTemplate(current)).toBeNull();
  });
  it("audit chỉ ID/trạng thái/số lượng, không chứa tên/nội dung nhóm/câu/lựa chọn", async () => {
    await createTemplate(current, input()); await updateTemplate(current, template.id, { ...input(), expectedRevision: 1 }); await cloneTemplate(current, template.id, { expectedRevision: 1 });
    const logs = JSON.stringify(db.auditLog.create.mock.calls); for (const secret of [template.name, template.groups[0].title, template.groups[0].questions[0].label, "Chọn một giả"])
      expect(logs).not.toContain(secret);
    expect(db.auditLog.create.mock.calls.map((call) => call[0].data.action)).toEqual(["TEMPLATE_CREATED", "TEMPLATE_UPDATED", "TEMPLATE_CLONED"]);
    expect(db.auditLog.create.mock.calls[0][0].data.redactedSummary).toMatchObject({ groupCount: 1, questionCount: 5, familyId: template.familyId });
  });
  it("lỗi unique/FK có thông báo 409, không tiết lộ metadata driver", async () => {
    db.surveyTemplate.create.mockRejectedValue({ code: "P2002", meta: { sensitive: "nội dung không công khai" } });
    await expect(createTemplateVersion(current, template.id, { expectedRevision: 1 })).rejects.toMatchObject({ status: 409, code: "TEMPLATE_VERSION_CONFLICT" });
    db.surveyTemplate.update.mockRejectedValue({ code: "P2003" }); await expect(updateTemplate(current, template.id, { ...input(), expectedRevision: 1 })).rejects.toMatchObject({ status: 409, code: "TEMPLATE_IN_USE" });
  });
});
