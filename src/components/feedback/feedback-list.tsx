"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { FeedbackList } from "@/server/services/feedback-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import { useFeedbackResource } from "./feedback-client";
import {
  categoryLabels,
  FeedbackStatus,
  severityLabels,
  statusLabels,
} from "./labels";

export function FeedbackListPanel({
  canCreate,
  canProcess,
}: {
  canCreate: boolean;
  canProcess: boolean;
}) {
  const ready = useClientReady();
  const [view, setView] = useState(canCreate ? "mine" : "queue");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", category: "" });
  const query = new URLSearchParams({
    view,
    page: String(page),
    pageSize: "20",
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  });
  const resource = useFeedbackResource<FeedbackList>(`/api/feedback?${query}`);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const data = new FormData(event.currentTarget);
    setFilters({
      status: String(data.get("status") ?? ""),
      category: String(data.get("category") ?? ""),
    });
    setPage(1);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-950">
          {view === "mine" ? "Phản hồi của tôi" : "Hàng đợi phản hồi"}
        </h1>
        {canCreate && (
          <Link href="/phan-hoi/gui" className={buttonStyle}>
            Gửi phản hồi
          </Link>
        )}
      </div>
      {canCreate && canProcess && (
        <div
          className="mt-5 flex gap-3"
          role="group"
          aria-label="Phạm vi phản hồi"
        >
          {[
            { value: "mine", label: "Phản hồi của tôi" },
            { value: "queue", label: "Hàng đợi xử lý" },
          ].map((item) => (
            <button
              key={item.value}
              disabled={!ready}
              aria-pressed={view === item.value}
              className={view === item.value ? buttonStyle : secondaryStyle}
              onClick={() => {
                setView(item.value);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <form
        method="post"
        onSubmit={filter}
        className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-56">
          <Field label="Loại phản hồi" id="list-feedback-category">
            <select
              id="list-feedback-category"
              name="category"
              className={inputStyle}
              disabled={!ready}
            >
              <option value="">Tất cả loại phản hồi</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <Field label="Trạng thái" id="list-feedback-status">
            <select
              id="list-feedback-status"
              name="status"
              className={inputStyle}
              disabled={!ready}
            >
              <option value="">Tất cả trạng thái</option>
              {[
                "MOI",
                "DA_TIEP_NHAN",
                "DANG_XU_LY",
                "DA_TRA_LOI",
                "DA_DONG",
                "TU_CHOI",
              ].map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" className={secondaryStyle} disabled={!ready}>
          Lọc danh sách
        </button>
        <button
          type="button"
          className={secondaryStyle}
          onClick={resource.reload}
          disabled={!ready || resource.loading}
        >
          Tải lại
        </button>
      </form>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải phản hồi…
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
                    <p className="text-xs leading-6 text-slate-500">
                      {categoryLabels[item.category]} ·{" "}
                      {severityLabels[item.severity]}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-bold text-slate-950">
                      <Link
                        href={`/phan-hoi/${item.id}`}
                        className="rounded hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                      >
                        {item.title}
                      </Link>
                    </h2>
                  </div>
                  <FeedbackStatus status={item.status} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.section.code} · {item.section.courseName}
                  <br />
                  {item.section.semesterName}
                </p>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {item.authorLabel} · {vietnamTime(item.createdAt)}
                  <br />
                  Người xử lý: {item.assignee?.displayName ?? "Chờ tiếp nhận"}
                </p>
                <Link
                  href={`/phan-hoi/${item.id}`}
                  className={`${secondaryStyle} mt-4 inline-flex`}
                >
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Chưa có phản hồi phù hợp trong danh sách này.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
