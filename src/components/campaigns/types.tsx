import type { CampaignSummary } from "@/server/services/campaign-types";
export type {
  CampaignAction,
  CampaignDetail,
  CampaignInput,
  CampaignOption,
  CampaignProgress,
  CampaignReadiness,
  CampaignSummary,
} from "@/server/services/campaign-types";
export interface CampaignCapabilities {
  write: boolean;
  submit: boolean;
  confirm: boolean;
  approve: boolean;
  operate: boolean;
  progress: boolean;
}
export interface SurveyDefaults {
  minResponses: number;
  minRate: number;
  warningScore: number;
  explanationDays: number;
  multiTeacherWarningThreshold: number;
}
export const statusLabels: Record<CampaignSummary["status"], string> = {
  NHAP: "Bản nháp",
  CHO_XAC_NHAN_DL: "Chờ xác nhận dữ liệu",
  CHO_DUYET: "Chờ lãnh đạo duyệt",
  DA_DUYET: "Đã duyệt · Chờ mở",
  DANG_MO: "Đang mở",
  DA_DONG: "Đã đóng",
  DA_TONG_HOP: "Đã tổng hợp",
  DA_CONG_BO: "Đã công bố",
  LUU_TRU: "Lưu trữ",
  HUY: "Đã hủy",
};
export const scopeLabels = {
  GLOBAL: "Toàn trường",
  FACULTY: "Theo khoa",
  DEPARTMENT: "Theo bộ môn",
  SECTIONS: "Danh sách lớp học phần",
};
export function vietnamInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 16);
}
export function vietnamIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Vui lòng chọn ngày và giờ hợp lệ.");
  const date = new Date(`${value}:00+07:00`);
  if (
    Number.isNaN(date.getTime()) ||
    vietnamInput(date.toISOString()) !== value
  )
    throw new Error("Ngày và giờ đã chọn không hợp lệ.");
  return date.toISOString();
}
export function CampaignStatus({
  status,
}: {
  status: CampaignSummary["status"];
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status === "DANG_MO" ? "bg-teal-100 text-teal-900" : status === "HUY" ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}`}
    >
      {statusLabels[status]}
    </span>
  );
}
