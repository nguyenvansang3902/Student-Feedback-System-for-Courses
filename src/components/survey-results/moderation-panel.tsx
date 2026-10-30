"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  ModerationItem,
  ResultsDetail,
  ResultsPage,
} from "@/server/services/survey-results-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
} from "../admin/ui";
import {
  resultsMessageOf,
  resultsRequest,
  useResultsResource,
} from "./results-client";
const statusNames = {
  CHO_KIEM_DUYET: "Chờ kiểm duyệt",
  HIEN_THI: "Hiển thị",
  DA_AN: "Đã ẩn",
};

function ModerationForm({
  item,
  campaignId,
  reload,
  readOnly,
}: {
  item: ModerationItem;
  campaignId: string;
  reload: () => void;
  readOnly: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await resultsRequest(`/api/survey-results/${campaignId}/moderation`, {
        answerId: item.id,
        status: String(data.get("status")),
        reason: String(data.get("reason") ?? "").trim(),
      });
      reload();
    } catch (problem) {
      setError(resultsMessageOf(problem));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-sm font-semibold text-slate-800">
          {item.questionLabel}
        </h2>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {statusNames[item.status]}
        </span>
      </div>
      {item.flagged && (
        <p className="mt-3 text-xs font-semibold text-amber-900">
          Có từ khóa cần xem xét
        </p>
      )}
      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800">
        {item.text}
      </p>
      <Notice message={error} error />
      {item.status === "CHO_KIEM_DUYET" && !readOnly ? (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]"
        >
          <Field id={`decision-${item.id}`} label="Kết quả kiểm duyệt">
            <select
              id={`decision-${item.id}`}
              name="status"
              className={inputStyle}
              disabled={busy}
            >
              <option value="HIEN_THI">Cho phép hiển thị</option>
              <option value="DA_AN">Ẩn góp ý</option>
            </select>
          </Field>
          <Field id={`reason-${item.id}`} label="Lý do">
            <textarea
              id={`reason-${item.id}`}
              name="reason"
              required
              minLength={1}
              maxLength={500}
              rows={2}
              className={inputStyle}
              disabled={busy}
            />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className={buttonStyle} disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu kiểm duyệt"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 break-words text-sm leading-7 text-slate-600">
          {item.status === "CHO_KIEM_DUYET"
            ? "Góp ý chưa kiểm duyệt. Đợt khảo sát hiện chỉ được đọc."
            : `Lý do: ${item.reason || "—"}`}
        </p>
      )}
    </article>
  );
}
export function ModerationPanel({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("CHO_KIEM_DUYET");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(status ? { status } : {}),
  });
  const resource = useResultsResource<ResultsPage<ModerationItem>>(
    `/api/survey-results/${campaignId}/moderation?${query}`,
  );
  const metadata = useResultsResource<{ item: ResultsDetail }>(
    `/api/survey-results/${campaignId}`,
  );
  const campaign = metadata.data?.item.campaign;
  const readOnly =
    !campaign ||
    campaign.semesterLocked ||
    !["DANG_MO", "DA_DONG", "DA_TONG_HOP"].includes(campaign.status);
  return (
    <>
      <Link
        href={`/ket-qua/${campaignId}`}
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        ← Kết quả đợt khảo sát
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">
        Kiểm duyệt góp ý
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Chọn hiển thị hoặc ẩn từng góp ý tự luận và ghi rõ lý do.
      </p>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="moderation-status"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Trạng thái
          </label>
          <select
            id="moderation-status"
            className={inputStyle}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(statusNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={secondaryStyle}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </div>
      <Notice message={resource.error || metadata.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải góp ý…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 space-y-4">
            {resource.data.items.map((item) => (
              <ModerationForm
                key={`${item.id}:${item.status}`}
                item={item}
                campaignId={campaignId}
                reload={resource.reload}
                readOnly={readOnly}
              />
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-600">
              Không có góp ý phù hợp với trạng thái đã chọn.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
