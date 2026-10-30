"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  IncompleteItem,
  ReminderResult,
  ResultsDetail,
  ResultsPage,
} from "@/server/services/survey-results-types";
import { buttonStyle, Notice, Pager, secondaryStyle } from "../admin/ui";
import {
  resultsMessageOf,
  resultsRequest,
  useResultsResource,
} from "./results-client";
export function IncompletePanel({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const resource = useResultsResource<ResultsPage<IncompleteItem>>(
    `/api/survey-results/${campaignId}/incomplete?page=${page}&pageSize=20`,
  );
  const metadata = useResultsResource<{ item: ResultsDetail }>(
    `/api/survey-results/${campaignId}`,
  );
  const campaign = metadata.data?.item.campaign;
  async function remind() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await resultsRequest<{ item: ReminderResult }>(
        `/api/survey-results/${campaignId}/remind`,
        {},
      );
      setNotice(
        `Đã xếp ${response.item.queued} thông báo nhắc hoàn thành trong ngày ${response.item.day}. Mỗi sinh viên nhận tối đa một lần trong ngày cho đợt này.`,
      );
    } catch (problem) {
      setError(resultsMessageOf(problem));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href={`/ket-qua/${campaignId}`}
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        ← Đợt khảo sát
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">
        Sinh viên chưa hoàn thành
      </h1>
      {campaign && (
        <p className="mt-3 break-words text-sm leading-7 text-slate-600">
          {campaign.title}
        </p>
      )}
      <p className="mt-2 text-sm leading-7 text-slate-500">
        Danh sách chỉ thể hiện trạng thái hoàn thành. Mỗi lần xem được ghi nhật
        ký.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={secondaryStyle}
          onClick={resource.reload}
          disabled={busy}
        >
          Tải lại danh sách
        </button>
        {campaign?.capabilities.remind &&
          !campaign.semesterLocked &&
          campaign.status === "DANG_MO" && (
            <button
              type="button"
              className={buttonStyle}
              onClick={() => void remind()}
              disabled={busy || !resource.data?.total}
            >
              {busy ? "Đang tạo thông báo…" : "Nhắc sinh viên chưa hoàn thành"}
            </button>
          )}
      </div>
      <Notice message={resource.error || error} error />
      <Notice message={notice} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải danh sách…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 grid gap-3">
            {resource.data.items.map((item) => (
              <article
                key={`${item.studentId}:${item.sectionId}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[140px_minmax(0,1fr)_180px]"
              >
                <p className="break-words text-sm font-semibold text-slate-800">
                  {item.loginCode}
                </p>
                <p className="break-words text-sm text-slate-700">
                  {item.displayName}
                </p>
                <p className="break-words text-sm text-slate-500">
                  Lớp: {item.sectionCode}
                </p>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-600">
              Không có sinh viên chưa hoàn thành trong phạm vi được giao.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
