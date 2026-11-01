import { type ReactNode } from "react";

export const categoryLabels: Record<string, string> = {
  GIANG_DAY: "Giảng dạy",
  NOI_DUNG_DE_CUONG: "Nội dung đề cương",
  TAI_LIEU: "Tài liệu học tập",
  KIEM_TRA_DANH_GIA: "Kiểm tra, đánh giá trong học phần",
  THI_KET_THUC_HOC_PHAN: "Thi kết thúc học phần",
  TO_CHUC_LOP_HOC: "Tổ chức lớp học",
  KHIEU_NAI_NGHIEM_TRONG: "Khiếu nại nghiêm trọng",
  KHAC: "Khác",
};
export const severityLabels: Record<string, string> = {
  GOP_Y: "Góp ý",
  DE_XUAT: "Đề xuất",
  KHIEU_NAI: "Khiếu nại",
};
export const statusLabels: Record<string, string> = {
  MOI: "Mới gửi",
  DA_TIEP_NHAN: "Đã tiếp nhận",
  DANG_XU_LY: "Đang xử lý",
  DA_TRA_LOI: "Đã trả lời",
  DA_DONG: "Đã đóng",
  TU_CHOI: "Từ chối",
  TIEP_NHAN: "Tiếp nhận",
  XAC_MINH: "Xác minh",
  KET_LUAN: "Kết luận",
  THONG_BAO: "Thông báo",
  DONG: "Đóng",
  CHUYEN_LAI: "Chuyển lại",
};
export const violationLabels: Record<string, string> = {
  VI_PHAM_QUY_CHE_GIANG_DAY: "Vi phạm quy chế giảng dạy",
  GAY_AP_LUC_KHI_KHAO_SAT: "Gây áp lực khi khảo sát",
  HANH_VI_KHONG_PHU_HOP: "Hành vi không phù hợp",
  VI_PHAM_QUY_CHE_THI_KIEM_TRA: "Vi phạm quy chế thi, kiểm tra",
  KHAC_NGHIEM_TRONG: "Vi phạm nghiêm trọng khác",
};
export const eventLabels: Record<string, string> = {
  GUI: "Gửi phản hồi",
  TRAO_DOI: "Trao đổi",
  TIEP_NHAN: "Tiếp nhận",
  BAT_DAU_XU_LY: "Bắt đầu xử lý",
  TRA_LOI: "Trả lời",
  DONG: "Đóng phản hồi",
  CHUYEN_TIEP: "Chuyển tiếp",
  TU_CHOI: "Từ chối",
  ASSIGN: "Giao xử lý",
  TAO_HO_SO: "Tạo hồ sơ",
};
export const actionLabels: Record<string, string> = {
  accept: "Tiếp nhận",
  start: "Bắt đầu xử lý",
  answer: "Trả lời",
  close: "Đóng phản hồi",
  reject: "Từ chối",
  forward: "Chuyển tiếp",
};

export function FeedbackStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status === "TU_CHOI" ? "bg-red-50 text-red-800" : ["DA_DONG", "DONG"].includes(status) ? "bg-slate-100 text-slate-700" : "bg-teal-50 text-teal-900"}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function validateFeedbackFiles(
  files: readonly Pick<File, "name" | "size">[],
  existingCount = 0,
): string | undefined {
  if (files.length + existingCount > 3)
    return "Mỗi phản hồi chỉ được đính kèm tối đa 3 tệp.";
  for (const file of files) {
    if (!/\.(png|jpe?g|pdf)$/i.test(file.name))
      return "Chỉ chấp nhận tệp PNG, JPG hoặc PDF.";
    if (file.size <= 0 || file.size > 5 * 1024 * 1024)
      return "Mỗi tệp phải có nội dung và không vượt quá 5 MB.";
  }
}
