import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { getStudentSurvey, listStudentSurveys, submitStudentSurvey } from "../src/server/services/student-surveys";
import type { StudentSurveySubmitInput, StudentSurveyTemplate } from "../src/server/services/student-survey-types";

const mocks = vi.hoisted(() => {
  const delegate = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() });
  return {
    advance: vi.fn(), advanceDue: vi.fn(),
    db: { surveyTask: delegate(), surveyTemplate: delegate(), surveyResponse: delegate(), surveyAnswer: delegate(),
      userSession: delegate(), systemSetting: delegate(), auditLog: delegate(),
      $transaction: vi.fn(), $executeRaw: vi.fn(), $queryRaw: vi.fn() },
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/campaign-lifecycle", () => ({ advanceCampaignState: mocks.advance, advanceDueCampaignsInTransaction: mocks.advanceDue }));
const { db } = mocks;
const ids = Array.from({ length: 8 }, () => randomUUID());
function actor(role: Role = "SINH_VIEN"): AuthActor {
  const scopeType = role === "TRUONG_KHOA" ? "FACULTY" : role === "TRUONG_BO_MON" ? "DEPARTMENT" : "GLOBAL";
  return { userId: ids[0], sessionId: ids[1], familyId: ids[2], loginCode: "SV_GIA", email: "sv@fixture.invalid", displayName: "Sinh viên giả",
    roles: [role], assignments: [{ role, scopeType, facultyId: scopeType === "FACULTY" ? ids[6] : null, departmentId: scopeType === "DEPARTMENT" ? ids[7] : null }],
    purpose: "FULL", mfa: role === "ADMIN", mfaRequired: role === "ADMIN", mustChangePassword: false };
}
function session(value: AuthActor) {
  return { id: value.sessionId, userId: value.userId, familyId: value.familyId, purpose: "FULL", revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 60_000), mfaVerifiedAt: value.mfa ? new Date() : null,
    user: { status: "ACTIVE", mustChangePassword: false, loginCode: value.loginCode, email: value.email, displayName: value.displayName, roles: value.assignments } };
}
function fixture() {
  const template: StudentSurveyTemplate & { status: "NHAP" | "DA_KHOA"; lockedAt: Date | null } = {
    id: ids[5], familyId: randomUUID(), version: 1, name: "Mẫu giả", status: "DA_KHOA", lockedAt: new Date("2026-10-01T00:00:00Z"),
    groups: [{ id: randomUUID(), title: "Nhóm giả", position: 1, questions: [
      { id: randomUUID(), label: "Điểm giả", position: 1, type: "LIKERT", required: true, allowNA: false, scaleMin: 1, scaleMax: 5, options: [] },
      { id: randomUUID(), label: "Tự luận giả", position: 2, type: "TEXT", required: false, allowNA: true, scaleMin: null, scaleMax: null, options: [] },
    ] }],
  };
  const task = { id: ids[3], campaignId: ids[4], sectionId: ids[6], status: "PENDING" as "PENDING" | "DONE", doneDate: null as Date | null,
    cohort: { section: { code: "LHP_GIA", course: { name: "Môn giả" } }, campaign: {
      title: "Khảo sát giả", templateId: template.id, status: "DANG_MO", startsAt: new Date("2026-10-28T00:00:00Z"), endsAt: new Date("2026-11-01T00:00:00Z"),
      semester: { name: "Học kỳ giả", lockedAt: null as Date | null },
    } } };
  const input: StudentSurveySubmitInput = { answers: [{ questionId: template.groups[0].questions[0].id, valueNumber: 4 },
    { questionId: template.groups[0].questions[1].id, valueText: "Góp ý giả" }] };
  return { template, task, input };
}
let current: AuthActor;
let stored: ReturnType<typeof session>;
let template: ReturnType<typeof fixture>["template"];
let task: ReturnType<typeof fixture>["task"];
let input: StudentSurveySubmitInput;
let responses: Record<string, unknown>[];
let answers: Record<string, unknown>[];
let commits: number;
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-29T18:05:00Z"));
  current = actor(); stored = session(current);
  ({ template, task, input } = fixture());
  responses = []; answers = []; commits = 0;
  let queue = Promise.resolve();
  db.$transaction.mockImplementation((operation: (tx: typeof db) => Promise<unknown>) => {
    const result = queue.then(async () => {
      const snapshot = { status: task.status, doneDate: task.doneDate, responses: responses.length, answers: answers.length };
      try { const value = await operation(db); commits++; return value; }
      catch (error) {
        task.status = snapshot.status; task.doneDate = snapshot.doneDate;
        responses.length = snapshot.responses; answers.length = snapshot.answers;
        throw error;
      }
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  });
  db.$executeRaw.mockResolvedValue(1); db.$queryRaw.mockResolvedValue([]);
  db.userSession.findUnique.mockImplementation(async () => stored);
  db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN"] });
  db.surveyTask.findFirst.mockImplementation(async ({ where }: { where: { id: string; studentId: string } }) =>
    where.id === task.id && where.studentId === ids[0] ? structuredClone(task) : null);
  db.surveyTask.findMany.mockImplementation(async () => [structuredClone(task)]);
  db.surveyTask.count.mockResolvedValue(1);
  db.surveyTask.updateMany.mockImplementation(async ({ where, data }: { where: { status: string }; data: { status: "DONE"; doneDate: Date } }) => {
    if (task.status !== where.status) return { count: 0 };
    task.status = data.status; task.doneDate = data.doneDate;
    return { count: 1 };
  });
  db.surveyTemplate.findUnique.mockImplementation(async () => structuredClone(template));
  db.surveyResponse.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { responses.push(data); return { id: data.id }; });
  db.surveyAnswer.createMany.mockImplementation(async ({ data }: { data: Record<string, unknown>[] }) => { answers.push(...data); return { count: data.length }; });
  mocks.advance.mockImplementation(async () => {
    if (task.cohort.campaign.status === "DANG_MO" && task.cohort.campaign.endsAt.getTime() < Date.now()) task.cohort.campaign.status = "DA_DONG";
  });
  mocks.advanceDue.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("BR-01/34 — chính sách và quyền trên task đã chốt", () => {
  it.each<Role>(["GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL", "LANH_DAO", "ADMIN", "PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"])("từ chối %s trước khi truy cập DB", async (role) => {
    const denied = actor(role);
    for (const attempt of [() => listStudentSurveys(denied), () => getStudentSurvey(denied, task.id), () => submitStudentSurvey(denied, task.id, input)])
      await expect(attempt()).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.advance).not.toHaveBeenCalled();
  });
  it("phiên hạn chế/quyền sai phạm vi/đổi mật khẩu bắt buộc bị chặn trước DB", async () => {
    const denied = [
      { ...current, purpose: "MFA_VERIFY" as const }, { ...current, mustChangePassword: true },
      { ...current, assignments: [{ role: "SINH_VIEN" as const, scopeType: "FACULTY" as const, facultyId: ids[7], departmentId: null }] },
    ];
    for (const value of denied) await expect(listStudentSurveys(value)).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("lấy mutex trước phiên/SELECT thường, kiểm lại thu hồi phiên/quyền và chính sách MFA", async () => {
    stored.revokedAt = new Date();
    await expect(listStudentSurveys(current)).rejects.toMatchObject({ status: 401 });
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(db.$queryRaw.mock.invocationCallOrder[0]);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.userSession.findUnique.mock.invocationCallOrder[0]);
    expect(db.surveyTask.findMany).not.toHaveBeenCalled();
    stored = session(actor("GIANG_VIEN"));
    await expect(listStudentSurveys(current)).rejects.toMatchObject({ status: 403 });
    stored = session(current); db.systemSetting.findUnique.mockResolvedValue({ value: ["ADMIN", "SINH_VIEN"] });
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 403, code: "MFA_REQUIRED" });
    expect(mocks.advance).not.toHaveBeenCalled();
  });
  it("danh sách/count chỉ theo owner và task snapshot, đảm bảo đến hạn trước đọc phân trang", async () => {
    const result = await listStudentSurveys(current, { page: 2, pageSize: 7, status: "PENDING" });
    expect(db.surveyTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: current.userId, status: "PENDING" }, skip: 7, take: 7 }));
    expect(db.surveyTask.count).toHaveBeenCalledWith({ where: { studentId: current.userId, status: "PENDING" } });
    expect(mocks.advanceDue.mock.invocationCallOrder[0]).toBeLessThan(db.surveyTask.findMany.mock.invocationCallOrder[0]);
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 7, items: [{ id: task.id, availability: "AVAILABLE", canSubmit: true }] });
    expect(JSON.stringify(db.surveyTask.findMany.mock.calls)).not.toContain("enrollments");
  });
  it("GET/POST task người khác và UUID không tồn tại có cùng404, không chạy lifecycle", async () => {
    const other = { ...current, userId: randomUUID() }; stored = session(other);
    for (const attempt of [() => getStudentSurvey(other, task.id), () => submitStudentSurvey(other, task.id, input),
      () => getStudentSurvey(other, randomUUID()), () => submitStudentSurvey(other, randomUUID(), input)])
      await expect(attempt()).rejects.toMatchObject({ status: 404, code: "STUDENT_SURVEY_NOT_FOUND", message: "Không tìm thấy nhiệm vụ khảo sát." });
    expect(mocks.advance).not.toHaveBeenCalled();
    expect(db.surveyResponse.create).not.toHaveBeenCalled();
  });
  it("GET/POST kiểm lại quyền sau transaction lifecycle riêng", async () => {
    db.userSession.findUnique.mockResolvedValueOnce(stored).mockResolvedValueOnce(session(actor("GIANG_VIEN")));
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 403 });
    expect(mocks.advance).toHaveBeenCalledOnce();
    expect(db.surveyResponse.create).not.toHaveBeenCalled();
    expect(commits).toBe(1);
  });
});

describe("BR-02/03/04/17 — một lần trong cùng giao dịch và ngày Việt Nam", () => {
  it("nộp thành công: update PENDING có điều kiện trước response/answer và cùng ngày DATE", async () => {
    const result = await submitStudentSurvey(current, task.id, input);
    expect(result).toEqual({ status: "DONE", doneDate: "2026-10-30" });
    expect(task.status).toBe("DONE");
    expect(task.doneDate).toEqual(new Date("2026-10-30T00:00:00Z"));
    expect(responses).toHaveLength(1); expect(answers).toHaveLength(2);
    expect(responses[0]).toMatchObject({ campaignId: task.campaignId, sectionId: task.sectionId, submittedDate: task.doneDate });
    expect(db.surveyTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: task.id, studentId: current.userId, status: "PENDING",
      cohort: { campaign: expect.objectContaining({ status: "DANG_MO", startsAt: { lte: new Date() }, endsAt: { gte: new Date() }, semester: { lockedAt: null } }) } }) }));
    expect(db.surveyTask.updateMany.mock.invocationCallOrder[0]).toBeLessThan(db.surveyResponse.create.mock.invocationCallOrder[0]);
    expect(db.surveyResponse.create.mock.invocationCallOrder[0]).toBeLessThan(db.surveyAnswer.createMany.mock.invocationCallOrder[0]);
    for (const row of [responses[0], ...answers]) expect(row.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(answers[1]).toMatchObject({ valueText: "Góp ý giả", moderationStatus: "CHO_KIEM_DUYET" });
  });
  it("5.6(b), BR-02 nộp lần hai409 và số phiếu không tăng", async () => {
    await submitStudentSurvey(current, task.id, input);
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 409, code: "STUDENT_SURVEY_COMPLETED" });
    expect(responses).toHaveLength(1); expect(answers).toHaveLength(2);
    expect(db.surveyTask.updateMany).toHaveBeenCalledOnce();
  });
  it("BR-02 mô phỏng mutex20 lần đồng thời: một thành công,19 bị chặn", async () => {
    const result = await Promise.allSettled(Array.from({ length: 20 }, () => submitStudentSurvey(current, task.id, input)));
    expect(result.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    expect(result.filter((value) => value.status === "rejected")).toHaveLength(19);
    expect(responses).toHaveLength(1); expect(answers).toHaveLength(2); expect(task.status).toBe("DONE");
  });
  it("BR-02 CAS phải đổi đúng một hàng; count0 không chèn phiếu", async () => {
    db.surveyTask.updateMany.mockResolvedValue({ count: 0 });
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 409 });
    expect(task.status).toBe("PENDING"); expect(responses).toHaveLength(0); expect(answers).toHaveLength(0);
  });
  it.each(["response", "answers"])("BR-02 lỗi chèn %s rollback task, response và answers", async (position) => {
    if (position === "response") db.surveyResponse.create.mockRejectedValue(new Error("Lỗi giả"));
    else db.surveyAnswer.createMany.mockRejectedValue(new Error("Lỗi giả"));
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 500, code: "STUDENT_SURVEY_FAILED" });
    expect(task.status).toBe("PENDING"); expect(task.doneDate).toBeNull();
    expect(responses).toHaveLength(0); expect(answers).toHaveLength(0);
  });
  it.each(["start", "end"])("BR-04 nhận thời điểm đúng biên %s (khoảng đóng)", async (boundary) => {
    if (boundary === "start") task.cohort.campaign.startsAt = new Date();
    else task.cohort.campaign.endsAt = new Date();
    await expect(submitStudentSurvey(current, task.id, input)).resolves.toMatchObject({ status: "DONE" });
    expect(responses).toHaveLength(1);
  });
  it.each(["before", "after", "closed", "locked"])("BR-04/17 không nhận phiếu khi %s", async (state) => {
    if (state === "before") task.cohort.campaign.startsAt = new Date(Date.now() + 1);
    if (state === "after") task.cohort.campaign.endsAt = new Date(Date.now() - 1);
    if (state === "closed") task.cohort.campaign.status = "DA_DONG";
    if (state === "locked") task.cohort.campaign.semester.lockedAt = new Date();
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 409, code: "STUDENT_SURVEY_UNAVAILABLE" });
    expect(db.surveyTask.updateMany).not.toHaveBeenCalled(); expect(responses).toHaveLength(0);
    if (state === "after") {
      expect(task.cohort.campaign.status).toBe("DA_DONG");
      expect(commits).toBe(1); // Chuyển trạng thái đã commit; TX nộp bị từ chối.
    }
  });
  it("BR-04 payload lỗi không rollback chuyển trạng thái đã commit và không đổi task", async () => {
    await expect(submitStudentSurvey(current, task.id, { answers: [] })).rejects.toMatchObject({ status: 400 });
    expect(mocks.advance).toHaveBeenCalledOnce(); expect(commits).toBe(1);
    expect(task.status).toBe("PENDING"); expect(responses).toHaveLength(0);
  });
  it.each(["draft", "no-lock", "invalid"])("BR-04 mẫu %s chặn GET/POST trước CAS", async (state) => {
    if (state === "draft") template.status = "NHAP";
    if (state === "no-lock") template.lockedAt = null;
    if (state === "invalid") template.groups[0].questions[0].scaleMax = 6;
    await expect(getStudentSurvey(current, task.id)).rejects.toMatchObject({ status: 409, code: "SURVEY_TEMPLATE_UNAVAILABLE" });
    await expect(submitStudentSurvey(current, task.id, input)).rejects.toMatchObject({ status: 409, code: "SURVEY_TEMPLATE_UNAVAILABLE" });
    expect(db.surveyTask.updateMany).not.toHaveBeenCalled();
  });
  it("BR-03 GET trả mẫu khi đang làm, DONE chỉ xác nhận không đọc mẫu/đáp án", async () => {
    const detail = await getStudentSurvey(current, task.id);
    expect(detail).toMatchObject({ id: task.id, canSubmit: true, template: { id: template.id, version: 1 } });
    await submitStudentSurvey(current, task.id, input);
    db.surveyTemplate.findUnique.mockClear();
    const done = await getStudentSurvey(current, task.id);
    expect(done).toMatchObject({ status: "DONE", doneDate: "2026-10-30", availability: "COMPLETED", template: null, canSubmit: false });
    expect(db.surveyTemplate.findUnique).not.toHaveBeenCalled();
  });
  it("BR-04/17 detail ngoài hạn/khóa chỉ metadata, không đưa mẫu xuống trình duyệt", async () => {
    task.cohort.campaign.semester.lockedAt = new Date();
    expect(await getStudentSurvey(current, task.id)).toMatchObject({ availability: "SEMESTER_LOCKED", canSubmit: false, template: null });
    task.cohort.campaign.semester.lockedAt = null; task.cohort.campaign.startsAt = new Date(Date.now() + 1);
    expect(await getStudentSurvey(current, task.id)).toMatchObject({ availability: "NOT_OPEN", canSubmit: false, template: null });
    expect(db.surveyTemplate.findUnique).not.toHaveBeenCalled();
  });
});
