"use client";
import { useState } from "react";
import { Notice, Pager, secondaryStyle, vietnamTime } from "../admin/ui";
import type { CampaignReadiness } from "./types";

const rules = {
  "RS-01": "Giảng viên phụ trách",
  "RS-02": "Sinh viên đăng ký",
  "RS-03": "Trạng thái khóa học kỳ",
  "RS-04": "Lớp có nhiều giảng viên",
  "RS-05": "Số sinh viên và ngưỡng mẫu",
  "RS-06": "Tài khoản hoạt động và email",
};
export function CampaignReadinessPanel({
  item,
  loading,
  error,
  reload,
}: {
  item?: CampaignReadiness;
  loading: boolean;
  error?: string;
  reload: () => void;
}) {
  const [page, setPage] = useState(1);
  const issues = item ? [...item.blockers, ...item.warnings] : [];
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(issues.length / 20)),
  );
  return (
    <section
      aria-labelledby="campaign-readiness-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="campaign-readiness-title"
            className="text-lg font-bold text-slate-900"
          >
            Kiểm tra dữ liệu sẵn sàng
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Kiểm tra dữ liệu đào tạo hiện tại. PĐT xác nhận khi không còn lỗi
            chặn; các cảnh báo cần có ghi chú.
          </p>
        </div>
        <button
          type="button"
          className={secondaryStyle}
          onClick={() => {
            setPage(1);
            reload();
          }}
          disabled={loading}
        >
          Kiểm tra lại
        </button>
      </div>
      <Notice message={error} error />
      {loading && (
        <p role="status" className="mt-5 text-sm text-slate-500">
          Đang đối chiếu phạm vi, giảng viên và đăng ký…
        </p>
      )}
      {item && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Lớp trong phạm vi</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {item.sectionCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Cặp sinh viên – lớp</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {item.pairCount}
              </p>
            </div>
            <div
              className={`rounded-xl p-4 ${item.canConfirm ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-900"}`}
            >
              <p className="text-xs">Kết quả kiểm tra</p>
              <p className="mt-1 font-bold">
                {item.canConfirm ? "Không có lỗi chặn" : "Còn lỗi chặn"}
              </p>
              <p className="mt-1 text-xs">
                {item.blockers.length} lỗi · {item.warnings.length} cảnh báo
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-2 sm:grid-cols-2">
            {Object.entries(rules).map(([code, label]) => {
              const found = issues.filter((issue) => issue.code === code),
                blocked = found.some((issue) => issue.severity === "BLOCKING");
              return (
                <div
                  key={code}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <dt className="min-w-0 text-slate-700">
                    <strong className="mr-1 text-slate-900">{code}</strong>{" "}
                    {label}
                  </dt>
                  <dd
                    className={`shrink-0 text-xs font-semibold ${blocked ? "text-red-700" : found.length ? "text-amber-800" : "text-teal-800"}`}
                  >
                    {blocked ? "Cần sửa" : found.length ? "Cảnh báo" : "Đạt"}
                  </dd>
                </div>
              );
            })}
          </dl>
          {issues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Nội dung cần kiểm tra
              </h3>
              <ul className="mt-3 space-y-2">
                {issues
                  .slice((currentPage - 1) * 20, currentPage * 20)
                  .map((issue, index) => (
                    <li
                      key={`${issue.code}:${issue.sectionId}:${index}`}
                      className={`rounded-xl border p-4 text-sm leading-7 ${issue.severity === "BLOCKING" ? "border-red-100 bg-red-50 text-red-900" : "border-amber-100 bg-amber-50 text-amber-950"}`}
                    >
                      <p className="font-semibold">
                        {issue.code} · {issue.sectionCode ?? "Toàn đợt"} ·{" "}
                        {issue.severity === "BLOCKING"
                          ? "Lỗi chặn"
                          : "Cảnh báo"}
                      </p>
                      <p>{issue.message}</p>
                    </li>
                  ))}
              </ul>
              <Pager
                page={currentPage}
                total={issues.length}
                change={setPage}
              />
            </div>
          )}
          <p className="mt-4 text-xs leading-6 text-slate-500">
            Kiểm tra lúc {vietnamTime(item.checkedAt)}. Dữ liệu được kiểm tra
            lại trong giao dịch xác nhận; nội dung trên không thay cho bước xác
            nhận của PĐT.
          </p>
        </>
      )}
    </section>
  );
}
