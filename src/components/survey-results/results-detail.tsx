"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  ResultsClassDetail,
  ResultsDetail,
  ResultsMutationInput,
  ResultsMutationResult,
} from "@/server/services/survey-results-types";
import { buttonStyle, inputStyle, Notice, secondaryStyle } from "../admin/ui";
import {
  resultsMessageOf,
  resultsRequest,
  ResultsRequestError,
  useResultsResource,
} from "./results-client";
import {
  levelNames,
  ResultCampaignHeading,
  ResultGroups,
  ResultSummary,
} from "./result-view";

export function ResultsDetailPanel({ campaignId }: { campaignId: string }) {
  const [audience, setAudience] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{
    action: "aggregate" | "publish";
    input: ResultsMutationInput;
  } | null>(null);
  const resource = useResultsResource<{ item: ResultsDetail }>(
    `/api/survey-results/${campaignId}${audience ? `?audience=${audience}` : ""}`,
  );
  async function execute(operation: NonNullable<typeof pending>) {
    if (busy) return;
    setPending(operation);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await resultsRequest<{ item: ResultsMutationResult }>(
        `/api/survey-results/${campaignId}/${operation.action}`,
        operation.input,
      );
      setNotice(
        response.item.replayed
          ? "Thao tác đã được thực hiện trước đó. Trạng thái đã được đối chiếu."
          : operation.action === "aggregate"
            ? "Đã tổng hợp kết quả."
            : "Đã công bố kết quả.",
      );
      setPending(null);
      resource.reload();
    } catch (problem) {
      setError(resultsMessageOf(problem));
      if (
        problem instanceof ResultsRequestError &&
        [400, 403, 404, 409].includes(problem.status)
      )
        setPending(null);
      resource.reload();
    } finally {
      setBusy(false);
    }
  }
  const detail = resource.data?.item;
  function perform(action: "aggregate" | "publish") {
    if (detail)
      void execute({
        action,
        input: {
          requestId: crypto.randomUUID(),
          expectedRevision: detail.campaign.revision,
        },
      });
  }
  return (
    <>
      <Link
        href="/ket-qua"
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        ← Các đợt khảo sát
      </Link>
      <Notice message={resource.error || error} error />
      <Notice message={notice} />
      {pending && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-7 text-amber-900">
            {busy
              ? "Đang xử lý thao tác…"
              : "Chưa xác nhận được kết quả thao tác. Hãy kiểm tra trạng thái; nếu cần thử lại, hệ thống sẽ dùng cùng mã yêu cầu để tránh thực hiện trùng."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              className={secondaryStyle}
              onClick={resource.reload}
            >
              Kiểm tra trạng thái
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondaryStyle}
              onClick={() => void execute(pending)}
            >
              Thử lại thao tác
            </button>
          </div>
        </div>
      )}
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải kết quả…
        </p>
      )}
      {detail && (
        <>
          <ResultCampaignHeading campaign={detail.campaign} />
          <div className="mt-6 flex flex-wrap items-end gap-3">
            {detail.campaign.capabilities.standard &&
              detail.campaign.capabilities.assessment && (
                <div>
                  <label
                    htmlFor="results-audience"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phạm vi kết quả
                  </label>
                  <select
                    id="results-audience"
                    className={inputStyle}
                    value={audience || detail.audience}
                    disabled={busy}
                    onChange={(event) => setAudience(event.target.value)}
                  >
                    <option value="STANDARD">Kết quả khảo sát</option>
                    <option value="ASSESSMENT">Nhóm kiểm tra, đánh giá</option>
                  </select>
                </div>
              )}
            <button
              type="button"
              className={secondaryStyle}
              disabled={busy}
              onClick={resource.reload}
            >
              Tải lại trạng thái
            </button>
            {detail.campaign.capabilities.moderate && (
              <Link
                href={`/kiem-duyet/${campaignId}`}
                className={secondaryStyle}
              >
                Kiểm duyệt góp ý
                {detail.pendingModeration !== null
                  ? ` (${detail.pendingModeration} chờ)`
                  : ""}
              </Link>
            )}
            {detail.campaign.capabilities.incomplete && (
              <Link
                href={`/chua-hoan-thanh/${campaignId}`}
                className={secondaryStyle}
              >
                Sinh viên chưa hoàn thành
              </Link>
            )}
          </div>
          {!detail.campaign.semesterLocked && !pending && (
            <div className="mt-4 flex flex-wrap gap-3">
              {detail.campaign.capabilities.aggregate &&
                detail.campaign.status === "DA_DONG" && (
                  <button
                    type="button"
                    className={buttonStyle}
                    disabled={busy}
                    onClick={() => perform("aggregate")}
                  >
                    Tổng hợp kết quả
                  </button>
                )}
              {detail.campaign.capabilities.publish &&
                detail.campaign.status === "DA_TONG_HOP" && (
                  <button
                    type="button"
                    className={buttonStyle}
                    disabled={busy || (detail.pendingModeration ?? 0) > 0}
                    onClick={() => perform("publish")}
                  >
                    Công bố kết quả
                  </button>
                )}
            </div>
          )}
          {detail.pendingModeration !== null &&
            detail.pendingModeration > 0 &&
            detail.campaign.status === "DA_TONG_HOP" && (
              <p className="mt-4 text-sm leading-7 text-amber-900">
                Cần kiểm duyệt hết góp ý tự luận trước khi công bố.
              </p>
            )}
          {detail.audience === "ASSESSMENT" && (
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Kết quả nhóm kiểm tra, đánh giá được gộp theo môn học, bộ môn và
              khoa.
            </p>
          )}
          <div className="mt-6 space-y-5">
            {detail.buckets.map((bucket) => (
              <article
                key={`${bucket.level}:${bucket.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <p className="text-xs text-slate-500">
                  {levelNames[bucket.level]} · {bucket.code}
                </p>
                <h2 className="mt-2 break-words text-xl font-bold text-slate-900">
                  {detail.audience === "STANDARD" &&
                  bucket.level === "CLASS" ? (
                    <Link
                      href={`/ket-qua/${campaignId}/lop/${bucket.id}`}
                      className="rounded hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                    >
                      {bucket.name}
                    </Link>
                  ) : (
                    bucket.name
                  )}
                </h2>
                <ResultSummary result={bucket} />
                {bucket.level !== "CLASS" && <ResultGroups result={bucket} />}
              </article>
            ))}
          </div>
          {!detail.buckets.length && (
            <p className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-600">
              Chưa có kết quả trong phạm vi này.
            </p>
          )}
        </>
      )}
    </>
  );
}

export function ResultsClassPanel({
  campaignId,
  sectionId,
}: {
  campaignId: string;
  sectionId: string;
}) {
  const resource = useResultsResource<{ item: ResultsClassDetail }>(
    `/api/survey-results/${campaignId}/classes/${sectionId}`,
  );
  const detail = resource.data?.item;
  return (
    <>
      <Link
        href={`/ket-qua/${campaignId}`}
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        ← Kết quả đợt khảo sát
      </Link>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải kết quả lớp…
        </p>
      )}
      {detail && (
        <>
          <ResultCampaignHeading campaign={detail.campaign} />
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs text-slate-500">
              Lớp học phần · {detail.result.code}
            </p>
            <h2 className="mt-2 break-words text-xl font-bold text-slate-900">
              {detail.result.name}
            </h2>
            <ResultSummary result={detail.result} />
            <ResultGroups result={detail.result} />
          </section>
          {detail.comparisons.length > 0 && (
            <section className="mt-7">
              <h2 className="text-xl font-bold text-slate-900">So sánh</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {detail.comparisons.map((comparison) => (
                  <article
                    key={comparison.label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <h3 className="font-semibold text-slate-800">
                      {comparison.label}
                    </h3>
                    {comparison.result ? (
                      <ResultSummary result={comparison.result} />
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        {comparison.message || "Không có dữ liệu tương thích"}
                      </p>
                    )}
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Chỉ đối chiếu dữ liệu dùng cùng mẫu phiếu. Điểm hiển thị được
                làm tròn hai chữ số; mức đánh giá dùng điểm trước khi làm tròn.
              </p>
            </section>
          )}
          {detail.result.available && (
            <section className="mt-7">
              <h2 className="text-xl font-bold text-slate-900">
                Góp ý đã kiểm duyệt
              </h2>
              {detail.comments.length ? (
                <ul className="mt-4 space-y-3">
                  {detail.comments.map((comment, index) => (
                    <li
                      key={index}
                      className="rounded-xl border border-slate-200 bg-white p-5"
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {comment.questionLabel}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                        {comment.text}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Chưa có góp ý được hiển thị.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
