import type { StudentSurveyAvailability } from "@/server/services/student-survey-types";
export const availabilityLabels: Record<StudentSurveyAvailability, string> = {
  AVAILABLE: "Đang nhận phiếu",
  COMPLETED: "Đã nộp",
  NOT_OPEN: "Chưa đến thời gian làm",
  CLOSED: "Đã kết thúc",
  SEMESTER_LOCKED: "Học kỳ đã khóa sổ",
};
export function SurveyStatus({
  availability,
}: {
  availability: StudentSurveyAvailability;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${availability === "AVAILABLE" ? "bg-teal-50 text-teal-900" : availability === "COMPLETED" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600"}`}
    >
      {availabilityLabels[availability]}
    </span>
  );
}
export function surveyDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  return value.split("-").reverse().join("/");
}
