"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  ResultsCampaign,
  ResultsPage,
} from "@/server/services/survey-results-types";
import { inputStyle, Notice, Pager, secondaryStyle } from "../admin/ui";
import { CampaignStatus } from "../campaigns/types";
import { useResultsResource } from "./results-client";

export function ResultsList() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
  });
  const resource = useResultsResource<ResultsPage<ResultsCampaign>>(
    `/api/survey-results?${query}`,
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(
      String(new FormData(event.currentTarget).get("search") ?? "").trim(),
    );
    setPage(1);
  }
  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">Kết quả khảo sát</h1>
      <form
        onSubmit={filter}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-64">
          <label
            htmlFor="results-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tên đợt khảo sát
          </label>
          <input
            id="results-search"
            name="search"
            type="search"
            maxLength={100}
            className={inputStyle}
          />
        </div>
        <button type="submit" className={secondaryStyle}>
          Tìm kiếm
        </button>
        <button
          type="button"
          className={secondaryStyle}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </form>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải danh sách…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 space-y-4">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-slate-900">
                      <Link
                        href={`/ket-qua/${item.id}`}
                        className="rounded hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                      >
                        {item.title}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.semesterName} · {item.templateName}
                    </p>
                  </div>
                  <CampaignStatus status={item.status} />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/ket-qua/${item.id}`} className={secondaryStyle}>
                    Xem kết quả
                  </Link>
                  {item.capabilities.moderate && (
                    <Link
                      href={`/kiem-duyet/${item.id}`}
                      className={secondaryStyle}
                    >
                      Kiểm duyệt góp ý
                    </Link>
                  )}
                  {item.capabilities.incomplete && (
                    <Link
                      href={`/chua-hoan-thanh/${item.id}`}
                      className={secondaryStyle}
                    >
                      Sinh viên chưa hoàn thành
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Chưa có đợt khảo sát phù hợp trong phạm vi được giao.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
