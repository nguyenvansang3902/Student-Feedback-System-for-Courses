"use client";
import Link from "next/link";
import { useState } from "react";
import type { RecommendationList } from "@/server/services/improvement-types";
import { useFeedbackResource } from "../feedback/feedback-client";
import { useClientReady } from "../auth/use-client-ready";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { recommendationStatusLabels } from "./labels";
export function RecommendationListPanel({ canCreate }: { canCreate: boolean }) {
  const ready = useClientReady(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState("");
  const resource = useFeedbackResource<RecommendationList>(
    `/api/exam-recommendations?${new URLSearchParams({ page: String(page), pageSize: "20", ...(status ? { status } : {}) })}`,
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-950">Kiến nghị rà soát</h1>
        {canCreate && (
          <Link href="/kien-nghi/gui" className={buttonStyle}>
            Gửi kiến nghị
          </Link>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="min-w-0 flex-1 basis-64">
          <Field label="Trạng thái" id="recommendation-status">
            <select
              id="recommendation-status"
              value={status}
              disabled={!ready}
              className={inputStyle}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(recommendationStatusLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>
        <button
          className={secondaryStyle}
          disabled={!ready || resource.loading}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </div>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8">
          Đang tải kiến nghị…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 space-y-3">
            {resource.data.items.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <Link
                    href={`/kien-nghi/${row.id}`}
                    className="font-semibold text-teal-800 underline underline-offset-4"
                  >
                    {row.courseName}
                  </Link>
                  <span className="text-sm font-semibold text-slate-600">
                    {recommendationStatusLabels[row.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {row.campaignTitle} · {row.departmentName}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Người nhận: {row.recipientName}
                </p>
                <p
                  className={`mt-2 text-sm ${row.isOverdue ? "font-semibold text-red-700" : "text-slate-600"}`}
                >
                  {row.isOverdue ? "Đã quá hạn · " : ""}Hạn phản hồi:{" "}
                  {vietnamTime(row.dueAt)}
                </p>
              </article>
            ))}
            {!resource.data.items.length && (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                Không có kiến nghị trong phạm vi được phép.
              </p>
            )}
          </div>
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
