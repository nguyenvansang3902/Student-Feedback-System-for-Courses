import { z } from "zod";
import { AuthError } from "../auth/types";
import type { StudentSurveyQuestion, StudentSurveyTemplate } from "./student-survey-types";
import { templateInputSchema, TEMPLATE_LIMITS } from "./template-input";

export const STUDENT_SURVEY_LIMITS = { answers: 100, text: 4000 } as const;

const answerInput = z.object({
  questionId: z.uuid(),
  isNotApplicable: z.boolean().optional(),
  valueNumber: z.number().finite().nullable().optional(),
  valueText: z.string().max(STUDENT_SURVEY_LIMITS.text)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value))
    .nullable().optional(),
  valueOptionIds: z.array(z.uuid()).max(TEMPLATE_LIMITS.options).nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
}).strict();
export const studentSurveyInputSchema = z.object({
  answers: z.array(answerInput).max(STUDENT_SURVEY_LIMITS.answers),
}).strict();

/** Chỉ các trường giá trị của vùng phiếu; không có task, người dùng hay giờ nộp. */
export interface ValidatedStudentSurveyAnswer {
  questionId: string;
  isNotApplicable: boolean;
  valueNumber?: number;
  valueText?: string;
  valueOptionIds?: string[];
  valueBoolean?: boolean;
}

function invalidAnswers(): never {
  throw new AuthError("Câu trả lời chưa hợp lệ. Vui lòng kiểm tra các câu bắt buộc và loại giá trị.", 400, "INVALID_SURVEY_ANSWERS");
}
function unavailableTemplate(): never {
  throw new AuthError("Mẫu khảo sát chưa sẵn sàng. Vui lòng tải lại hoặc liên hệ Đảm bảo chất lượng.", 409, "SURVEY_TEMPLATE_UNAVAILABLE");
}

/** Kiểm tra lại cấu trúc đã khóa; dữ liệu mẫu sai phải chặn nộp thay vì bỏ câu. */
export function assertStudentSurveyTemplate(template: StudentSurveyTemplate): void {
  const content = templateInputSchema.safeParse({
    name: template.name,
    groups: template.groups.map((group) => ({
      title: group.title, position: group.position,
      questions: group.questions.map((question) => ({
        label: question.label, type: question.type, position: question.position,
        required: question.required, allowNA: question.allowNA,
        ...(question.type === "LIKERT"
          ? { scaleMin: question.scaleMin, scaleMax: question.scaleMax }
          : question.scaleMin !== null || question.scaleMax !== null
            ? { scaleMin: question.scaleMin, scaleMax: question.scaleMax }
            : {}),
        options: question.options.map((option) => ({ label: option.label, position: option.position })),
      })),
    })),
  });
  const ids = [template.id, template.familyId, ...template.groups.map((group) => group.id),
    ...template.groups.flatMap((group) => group.questions.flatMap((question) => [question.id, ...question.options.map((option) => option.id)]))];
  const questionIds = template.groups.flatMap((group) => group.questions.map((question) => question.id));
  const optionIds = template.groups.flatMap((group) => group.questions.flatMap((question) => question.options.map((option) => option.id)));
  if (!content.success || ids.some((id) => !z.uuid().safeParse(id).success) ||
    !Number.isInteger(template.version) || template.version < 1 ||
    new Set(questionIds).size !== questionIds.length ||
    new Set(optionIds).size !== optionIds.length ||
    new Set(template.groups.map((group) => group.id)).size !== template.groups.length) unavailableTemplate();
}

function valueKey(question: StudentSurveyQuestion) {
  switch (question.type) {
    case "LIKERT": return "valueNumber";
    case "TEXT": return "valueText";
    case "BOOLEAN": return "valueBoolean";
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": return "valueOptionIds";
  }
}

export function parseStudentSurveyAnswers(
  input: unknown,
  template: StudentSurveyTemplate,
): ValidatedStudentSurveyAnswer[] {
  assertStudentSurveyTemplate(template);
  const parsed = studentSurveyInputSchema.safeParse(input);
  if (!parsed.success) invalidAnswers();
  const questions = new Map(template.groups.flatMap((group) => group.questions.map((question) => [question.id, question] as const)));
  const seen = new Set<string>();
  const values: ValidatedStudentSurveyAnswer[] = [];
  const keys = ["valueNumber", "valueText", "valueOptionIds", "valueBoolean"] as const;
  for (const answer of parsed.data.answers) {
    const question = questions.get(answer.questionId);
    if (!question || seen.has(answer.questionId)) invalidAnswers();
    seen.add(answer.questionId);
    const filled = keys.filter((key) => answer[key] !== undefined && answer[key] !== null);
    if (answer.isNotApplicable) {
      if (!question.allowNA || filled.length) invalidAnswers();
      values.push({ questionId: question.id, isNotApplicable: true });
      continue;
    }
    const key = valueKey(question);
    if (filled.some((field) => field !== key)) invalidAnswers();
    let normalized: ValidatedStudentSurveyAnswer | null = null;
    switch (question.type) {
      case "LIKERT": {
        const value = answer.valueNumber;
        if (value !== undefined && value !== null) {
          if (!Number.isInteger(value) || value < question.scaleMin! || value > question.scaleMax!) invalidAnswers();
          normalized = { questionId: question.id, isNotApplicable: false, valueNumber: value };
        }
        break;
      }
      case "TEXT": {
        const value = answer.valueText?.trim();
        if (value) normalized = { questionId: question.id, isNotApplicable: false, valueText: value };
        break;
      }
      case "BOOLEAN": {
        const value = answer.valueBoolean;
        if (value !== undefined && value !== null) normalized = { questionId: question.id, isNotApplicable: false, valueBoolean: value };
        break;
      }
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE": {
        const options = answer.valueOptionIds ?? [];
        const allowed = new Set(question.options.map((option) => option.id));
        if (new Set(options).size !== options.length || options.some((id) => !allowed.has(id)) ||
          (question.type === "SINGLE_CHOICE" && options.length > 1)) invalidAnswers();
        if (options.length) normalized = { questionId: question.id, isNotApplicable: false, valueOptionIds: options };
        break;
      }
    }
    if (!normalized && question.required) invalidAnswers();
    if (normalized) values.push(normalized);
  }
  if ([...questions.values()].some((question) => question.required && !seen.has(question.id))) invalidAnswers();
  return values;
}
