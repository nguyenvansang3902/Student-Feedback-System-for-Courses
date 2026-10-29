"use client";
import { useState } from "react";
import { Notice, Pager, secondaryStyle } from "../admin/ui";
import { useCampaignResource } from "./campaign-client";
import type { CampaignProgress as Progress } from "./types";

export function CampaignProgress({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const resource = useCampaignResource<Progress>(
    `/api/campaigns/${id}/progress?page=${page}&pageSize=20`,
  );
  const item = resource.data;
  const percentage = (rate: number) =>
    `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(rate * 100)}%`;
  return (
    <section
      aria-labelledby="campaign-progress-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="campaign-progress-title"
          className="text-lg font-bold text-slate-900"
        >
          Tiến độ hoàn thành
        </h2>
        <button
          className={secondaryStyle}
          type="button"
          disabled={resource.loading}
          onClick={resource.reload}
        >
          Cập nhật tiến độ
        </button>
      </div>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        Số liệu lấy từ trạng thái nhiệm vụ đã chốt. Màn hình này không hiển thị
        danh tính hoặc câu trả lời của sinh viên.
      </p>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p className="mt-5 text-sm text-slate-500" role="status">
          Đang tải tiến độ…
        </p>
      )}
      {item && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Tổng nhiệm vụ", item.total],
              ["Đã hoàn thành", item.done],
              ["Chưa hoàn thành", item.pending],
              ["Tỷ lệ tham gia", percentage(item.participationRate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 break-words text-2xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <progress
            aria-label="Tiến độ hoàn thành khảo sát"
            className="mt-5 h-3 w-full accent-teal-800"
            value={item.done}
            max={Math.max(1, item.total)}
          />
          <div className="mt-5 space-y-3">
            {item.items.map((section) => (
              <div
                key={section.sectionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-slate-900">
                    {section.sectionCode}
                  </h3>
                  <p className="mt-1 break-words text-xs leading-6 text-slate-500">
                    {section.courseName}
                  </p>
                </div>
                <p className="text-sm text-slate-700">
                  <strong>
                    {section.done}/{section.total}
                  </strong>{" "}
                  hoàn thành · {percentage(section.participationRate)}
                </p>
              </div>
            ))}
          </div>
          {!item.items.length && (
            <p className="mt-4 text-sm text-slate-500">
              Chưa có danh sách nhiệm vụ đã chốt.
            </p>
          )}
          <Pager page={page} total={item.totalSections} change={setPage} />
        </>
      )}
    </section>
  );
}
