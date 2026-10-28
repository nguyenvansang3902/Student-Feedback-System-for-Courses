import { z } from "zod";
import { AuthError } from "../auth/types";

export const TEMPLATE_LIMITS = { groups: 20, questions: 100, options: 20, weight: 1000 } as const;
export const questionTypes = ["LIKERT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "BOOLEAN"] as const;
const text = (max: number) => z.string().trim().min(1).max(max)
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value), "Không dùng ký tự điều khiển.");
const position = z.number().int().min(1).max(10_000);
const weight = z.number().finite().min(0.0001).max(TEMPLATE_LIMITS.weight).refine(
  (value) => Math.abs(value * 10_000 - Math.round(value * 10_000)) < 0.0000001,
  "Trọng số có tối đa bốn chữ số thập phân.",
).default(1);
const optionSchema = z.object({ label: text(500), position }).strict();
const questionSchema = z.object({
  label: text(1000), type: z.enum(questionTypes), position,
  required: z.boolean().default(true), allowNA: z.boolean().default(false), weight,
  scaleMin: z.number().int().optional(), scaleMax: z.number().int().optional(),
  options: z.array(optionSchema).max(TEMPLATE_LIMITS.options).default([]),
}).strict().superRefine((question, context) => {
  if (question.type === "LIKERT") {
    if ((question.scaleMin ?? 1) !== 1 || ![4, 5].includes(question.scaleMax ?? 5))
      context.addIssue({ code: "custom", message: "Thang Likert chỉ nhận 1–4 hoặc 1–5.", path: ["scaleMax"] });
  } else if (question.scaleMin !== undefined || question.scaleMax !== undefined) {
    context.addIssue({ code: "custom", message: "Chỉ câu Likert được cấu hình thang điểm.", path: ["scaleMax"] });
  }
  const choice = question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE";
  if ((choice && question.options.length < 2) || (!choice && question.options.length))
    context.addIssue({ code: "custom", message: choice ? "Câu chọn cần ít nhất hai lựa chọn." : "Loại câu này không có danh sách lựa chọn.", path: ["options"] });
  if (new Set(question.options.map((option) => option.position)).size !== question.options.length)
    context.addIssue({ code: "custom", message: "Thứ tự lựa chọn không được trùng.", path: ["options"] });
  if (new Set(question.options.map((option) => option.label.toLocaleLowerCase("vi"))).size !== question.options.length)
    context.addIssue({ code: "custom", message: "Nội dung lựa chọn không được trùng.", path: ["options"] });
});
const groupSchema = z.object({
  title: text(200), position, weight,
  questions: z.array(questionSchema).min(1).max(TEMPLATE_LIMITS.questions),
}).strict().superRefine((group, context) => {
  if (new Set(group.questions.map((question) => question.position)).size !== group.questions.length)
    context.addIssue({ code: "custom", message: "Thứ tự câu hỏi trong nhóm không được trùng.", path: ["questions"] });
});
export const templateInputSchema = z.object({
  name: text(200), groups: z.array(groupSchema).min(1).max(TEMPLATE_LIMITS.groups),
}).strict().superRefine((template, context) => {
  if (new Set(template.groups.map((group) => group.position)).size !== template.groups.length)
    context.addIssue({ code: "custom", message: "Thứ tự nhóm tiêu chí không được trùng.", path: ["groups"] });
  if (template.groups.reduce((count, group) => count + group.questions.length, 0) > TEMPLATE_LIMITS.questions)
    context.addIssue({ code: "custom", message: "Mỗi mẫu có tối đa 100 câu hỏi.", path: ["groups"] });
});
export type TemplateInput = z.input<typeof templateInputSchema>;
export type ValidatedTemplateInput = z.output<typeof templateInputSchema>;
export const expectedRevisionSchema = z.number().int().min(1).max(2_147_483_646);
export const revisionInputSchema = z.object({ expectedRevision: expectedRevisionSchema }).strict();
export const copyInputSchema = revisionInputSchema.extend({ name: text(200).optional() }).strict();
export const updateTemplateInputSchema = z.object({
  expectedRevision: expectedRevisionSchema, name: text(200), groups: z.array(groupSchema).min(1).max(TEMPLATE_LIMITS.groups),
}).strict().superRefine((input, context) => {
  if (new Set(input.groups.map((group) => group.position)).size !== input.groups.length)
    context.addIssue({ code: "custom", message: "Thứ tự nhóm tiêu chí không được trùng.", path: ["groups"] });
  if (input.groups.reduce((count, group) => count + group.questions.length, 0) > TEMPLATE_LIMITS.questions)
    context.addIssue({ code: "custom", message: "Mỗi mẫu có tối đa 100 câu hỏi.", path: ["groups"] });
});

/** Trả lỗi tiếng Việt theo vị trí, không lặp lại nội dung phiếu trong thông báo/log. */
export function parseTemplateInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const labels: Record<string, string> = { name: "Tên mẫu", groups: "Nhóm", title: "Tiêu đề", questions: "Câu hỏi", label: "Nội dung", options: "Lựa chọn", weight: "Trọng số", position: "Thứ tự", scaleMin: "Điểm thấp nhất", scaleMax: "Điểm cao nhất", expectedRevision: "Phiên bản đang sửa" };
    const location = issue.path.map((part) => typeof part === "number" ? String(part + 1) : labels[String(part)] ?? "Trường dữ liệu").join(" → ");
    const detail = issue.code === "custom" ? issue.message : "giá trị thiếu hoặc không đúng định dạng/giới hạn.";
    throw new AuthError(`${location || "Mẫu phiếu"}: ${detail}`, 400, "INVALID_TEMPLATE");
  }
  return parsed.data;
}
