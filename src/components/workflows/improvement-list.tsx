"use client";
import Link from "next/link";
import { useState } from "react";
import type { ImprovementList } from "@/server/services/improvement-types";
import { useFeedbackResource } from "../feedback/feedback-client";
import { useClientReady } from "../auth/use-client-ready";
import {
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { improvementStatusLabels } from "./labels";
export function ImprovementListPanel() {
  const ready = useClientReady(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState("");
  const resource = useFeedbackResource<ImprovementList>(
    `/api/improvements?${new URLSearchParams({ page: String(page), pageSize: "20", ...(status ? { status } : {}) })}`,
  );
  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">Giải trình cải tiến</h1>
      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="min-w-0 flex-1 basis-64">
          <Field label="Trạng thái" id="improvement-status">
            <select
              id="improvement-status"
              value={status}
              disabled={!ready}
              className={inputStyle}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(improvementStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="button"
          className={secondaryStyle}
          disabled={!ready || resource.loading}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </div>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-slate-500">
          Đang tải giải trình…
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
                    href={`/giai-trinh/${row.id}`}
                    className="font-semibold text-teal-800 underline underline-offset-4"
                  >
                    {row.sectionCode} · {row.courseName}
                  </Link>
                  <span className="text-sm font-semibold text-slate-600">
                    {improvementStatusLabels[row.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {row.campaignTitle} · {row.teacherName}
                </p>
                <p
                  className={`mt-2 text-sm ${row.isOverdue ? "font-semibold text-red-700" : "text-slate-600"}`}
                >
                  {row.isOverdue ? "Đã quá hạn · " : ""}Hạn gửi:{" "}
                  {vietnamTime(row.dueAt)}
                </p>
              </article>
            ))}
            {!resource.data.items.length && (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                Không có yêu cầu giải trình trong phạm vi được phép.
              </p>
            )}
          </div>
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
