export type {
  TemplateDetail,
  TemplateInput,
  TemplateSummary,
} from "@/server/services/templates";
export type QuestionKind =
  "LIKERT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "BOOLEAN";
export const questionLabels: Record<QuestionKind, string> = {
  LIKERT: "Thang điểm Likert",
  SINGLE_CHOICE: "Chọn một",
  MULTIPLE_CHOICE: "Chọn nhiều",
  TEXT: "Tự luận",
  BOOLEAN: "Có / Không",
};
export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Chưa xử lý được mẫu phiếu. Vui lòng thử lại.";
