"use client";
import Link from "next/link";
import { useState } from "react";
import type { InspectionWorkflowList } from "@/server/services/inspection-workflow-types";
import { inspectionStatuses } from "@/server/inspection-contract";
import { Notice, Pager, secondaryStyle, vietnamTime } from "../admin/ui";
import { useFeedbackResource } from "./feedback-client";
import { FeedbackStatus, statusLabels, violationLabels } from "./labels";

export function InspectionListPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const resource = useFeedbackResource<InspectionWorkflowList>(
    `/api/inspection-cases?page=${page}&pageSize=20${status ? `&status=${status}` : ""}`,
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-950">Hồ sơ Thanh tra</h1>
        <button
          className={secondaryStyle}
          disabled={resource.loading}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Hồ sơ tiếp nhận khiếu nại nghiêm trọng về môn học.
      </p>
      <label
        className="mt-4 block text-sm font-semibold"
        htmlFor="inspection-status-filter"
      >
        Lọc trạng thái
      </label>
      <select
        id="inspection-status-filter"
        value={status}
        className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
      >
        <option value="">Tất cả trạng thái</option>
        {inspectionStatuses.map((value) => (
          <option key={value} value={value}>
            {statusLabels[value] ?? value}
          </option>
        ))}
      </select>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải hồ sơ…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 space-y-4">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">
                      {item.level === "summary"
                        ? "Thông tin tóm tắt"
                        : "Hồ sơ Thanh tra"}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-bold text-slate-950">
                      <Link
                        className="rounded hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                        href={`/thanh-tra/${item.id}`}
                      >
                        {item.level === "full" && item.title
                          ? item.title
                          : item.violation
                            ? violationLabels[item.violation]
                            : "Khiếu nại nghiêm trọng"}
                      </Link>
                    </h2>
                  </div>
                  <FeedbackStatus status={item.status} />
                  {item.isOverdue && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                      Quá hạn
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {vietnamTime(item.createdAt)}
                  {item.level === "full"
                    ? ` · Người xử lý: ${item.assignee?.displayName ?? "Chưa được giao"}`
                    : ""}
                </p>
                <Link
                  href={`/thanh-tra/${item.id}`}
                  className={`${secondaryStyle} mt-4 inline-flex`}
                >
                  {item.level === "summary" ? "Xem tóm tắt" : "Mở hồ sơ"}
                </Link>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-slate-600">
              Chưa có hồ sơ trong phạm vi được truy cập.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
