import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertStudentSurveyTemplate, parseStudentSurveyAnswers } from "../src/server/services/student-survey-input";
import type { StudentSurveySubmitInput, StudentSurveyTemplate } from "../src/server/services/student-survey-types";

function fixture() {
  const template: StudentSurveyTemplate = {
    id: randomUUID(), familyId: randomUUID(), version: 1, name: "Mẫu giả",
    groups: [{ id: randomUUID(), title: "Nhóm giả", position: 1, questions: [
      { id: randomUUID(), label: "Likert", type: "LIKERT", position: 1, required: true, allowNA: true, scaleMin: 1, scaleMax: 5, options: [] },
      { id: randomUUID(), label: "Chọn một", type: "SINGLE_CHOICE", position: 2, required: true, allowNA: false, scaleMin: null, scaleMax: null,
        options: [{ id: randomUUID(), label: "A", position: 1 }, { id: randomUUID(), label: "B", position: 2 }] },
      { id: randomUUID(), label: "Chọn nhiều", type: "MULTIPLE_CHOICE", position: 3, required: false, allowNA: true, scaleMin: null, scaleMax: null,
        options: [{ id: randomUUID(), label: "C", position: 1 }, { id: randomUUID(), label: "D", position: 2 }] },
      { id: randomUUID(), label: "Tự luận", type: "TEXT", position: 4, required: false, allowNA: true, scaleMin: null, scaleMax: null, options: [] },
      { id: randomUUID(), label: "Có/không", type: "BOOLEAN", position: 5, required: true, allowNA: false, scaleMin: null, scaleMax: null, options: [] },
    ] }],
  };
  const questions = template.groups[0].questions;
  const input: StudentSurveySubmitInput = { answers: [
    { questionId: questions[0].id, valueNumber: 4 },
    { questionId: questions[1].id, valueOptionIds: [questions[1].options[0].id] },
    { questionId: questions[4].id, valueBoolean: false },
  ] };
  return { template, questions, input };
}

describe("BR-03/04 — kiểm tra phiếu động và không phản chiếu dữ liệu", () => {
  it("nhận đủ năm loại, boolean false bắt buộc và chỉ giữ trường giá trị đúng loại", () => {
    const { template, questions, input } = fixture();
    input.answers.push({ questionId: questions[2].id, valueOptionIds: questions[2].options.map((option) => option.id) },
      { questionId: questions[3].id, valueText: "  Góp ý giả\nDòng hai  ", valueNumber: null });
    const result = parseStudentSurveyAnswers(input, template);
    expect(result).toHaveLength(5);
    expect(result[2]).toEqual({ questionId: questions[4].id, isNotApplicable: false, valueBoolean: false });
    expect(result[4]).toEqual({ questionId: questions[3].id, isNotApplicable: false, valueText: "Góp ý giả\nDòng hai" });
  });
  it.each([4, 5])("Likert chỉ nhận nguyên 1..%s và nhận hai biên", (max) => {
    const { template, questions, input } = fixture();
    questions[0].scaleMax = max;
    for (const value of [1, max]) {
      input.answers[0].valueNumber = value;
      expect(parseStudentSurveyAnswers(input, template)[0].valueNumber).toBe(value);
    }
    for (const value of [0, max + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      input.answers[0].valueNumber = value;
      expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
    }
  });
  it("không áp dụng cần cờ cho phép và không trộn bất kỳ giá trị không null", () => {
    const { template, questions, input } = fixture();
    input.answers[0] = { questionId: questions[0].id, isNotApplicable: true };
    expect(parseStudentSurveyAnswers(input, template)[0]).toEqual({ questionId: questions[0].id, isNotApplicable: true });
    for (const value of [{ valueNumber: 3 }, { valueText: "" }, { valueBoolean: false }, { valueOptionIds: [] }]) {
      input.answers[0] = { questionId: questions[0].id, isNotApplicable: true, ...value };
      expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
    }
    input.answers[0] = { questionId: questions[0].id, isNotApplicable: true };
    questions[0].allowNA = false;
    expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
  });
  it("câu bắt buộc không được thiếu/null/rỗng kể cả boolean; câu tùy chọn trống không tạo hàng", () => {
    const { template, questions, input } = fixture();
    for (const index of [0, 1, 2]) {
      const missing = input.answers.filter((_, position) => position !== index);
      expect(() => parseStudentSurveyAnswers({ answers: missing }, template)).toThrow();
    }
    for (const answer of [
      { questionId: questions[0].id, valueNumber: null },
      { questionId: questions[1].id, valueOptionIds: [] },
      { questionId: questions[4].id, valueBoolean: null },
    ]) {
      const answers = input.answers.map((value) => value.questionId === answer.questionId ? answer : value);
      expect(() => parseStudentSurveyAnswers({ answers }, template)).toThrow();
    }
    input.answers.push({ questionId: questions[2].id, valueOptionIds: [] }, { questionId: questions[3].id, valueText: " \n " });
    expect(parseStudentSurveyAnswers(input, template)).toHaveLength(3);
    questions[3].required = true;
    expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
  });
  it("không nhận option khác câu, option trùng, nhiều option cho câu chọn một", () => {
    const { template, questions, input } = fixture();
    for (const options of [
      [randomUUID()], [questions[2].options[0].id],
      [questions[1].options[0].id, questions[1].options[0].id], questions[1].options.map((option) => option.id),
    ]) {
      input.answers[1].valueOptionIds = options;
      expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
    }
  });
  it("không nhận câu lạ, câu lặp, kiểu thừa hay kiểu dữ liệu bị ép", () => {
    const { template, questions, input } = fixture();
    const invalid = [
      { ...input, campaignId: randomUUID() }, { ...input, answers: [...input.answers, input.answers[0]] },
      { answers: [...input.answers, { questionId: randomUUID(), valueText: "Giả" }] },
      { answers: input.answers.map((answer, index) => index === 0 ? { ...answer, valueText: "Sai loại" } : answer) },
      { answers: input.answers.map((answer, index) => index === 0 ? { ...answer, valueNumber: "4" } : answer) },
      { answers: input.answers.map((answer, index) => index === 2 ? { ...answer, valueBoolean: "false" } : answer) },
      { answers: [...input.answers, { questionId: questions[3].id, taskId: randomUUID(), valueText: "Giả" }] },
    ];
    for (const value of invalid) expect(() => parseStudentSurveyAnswers(value, template)).toThrow();
  });
  it("giới hạn 100 câu/4000 ký tự và không nhận ký tự điều khiển", () => {
    const { template, questions, input } = fixture();
    input.answers.push({ questionId: questions[3].id, valueText: "g".repeat(4000) });
    expect(parseStudentSurveyAnswers(input, template).at(-1)?.valueText).toHaveLength(4000);
    for (const text of ["g".repeat(4001), "a\u0000b"]) {
      input.answers[3].valueText = text;
      expect(() => parseStudentSurveyAnswers(input, template)).toThrow();
    }
    expect(() => parseStudentSurveyAnswers({ answers: Array.from({ length: 101 }, () => input.answers[0]) }, template)).toThrow();
  });
  it("BR-03/30 lỗi chỉ nêu hướng dẫn chung, không chứa payload/UUID/nguyên văn lỗi Zod", () => {
    const { template, questions, input } = fixture();
    const marker = "NHAN_DIEN_GIA_NHAY_CAM";
    let failure: unknown;
    try { parseStudentSurveyAnswers({ ...input, answers: [...input.answers, { questionId: questions[3].id, valueNumber: 5, valueText: marker }] }, template); }
    catch (error) { failure = error; }
    expect(failure).toMatchObject({ status: 400, code: "INVALID_SURVEY_ANSWERS" });
    expect(String(failure)).not.toContain(marker);
    expect(String(failure)).not.toContain(questions[3].id);
    expect(String(failure)).not.toContain("Zod");
  });
  it("BR-04 mẫu sai khóa nộp: thang sai/null, câu trùng, câu chọn thiếu option, mẫu trống", () => {
    const { template, questions } = fixture();
    const invalid = [
      { ...template, groups: [] },
      { ...template, groups: [{ ...template.groups[0], questions: [questions[0], questions[0]] }] },
      { ...template, groups: [{ ...template.groups[0], questions: [{ ...questions[0], scaleMax: 6 }] }] },
      { ...template, groups: [{ ...template.groups[0], questions: [{ ...questions[0], scaleMin: null }] }] },
      { ...template, groups: [{ ...template.groups[0], questions: [{ ...questions[1], options: [] }] }] },
    ];
    for (const value of invalid) expect(() => assertStudentSurveyTemplate(value)).toThrow("Mẫu khảo sát chưa sẵn sàng");
  });
});
