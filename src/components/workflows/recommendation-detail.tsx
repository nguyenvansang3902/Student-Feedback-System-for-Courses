"use client";
import Link from "next/link";
import type { FormEvent } from "react";
import type { RecommendationDetail } from "@/server/services/improvement-types";
import { useFeedbackResource } from "../feedback/feedback-client";
import { useClientReady } from "../auth/use-client-ready";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useWorkflowMutation } from "./workflow-client";
import {
  recommendationStatusLabels,
  recommendationOutcomeLabels,
} from "./labels";
export function RecommendationDetailPanel({ id }: { id: string }) {
  const ready = useClientReady(),
    resource = useFeedbackResource<{ item: RecommendationDetail }>(
      `/api/exam-recommendations/${encodeURIComponent(id)}`,
    ),
    mutation = useWorkflowMutation(),
    row = resource.data?.item;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !row) return;
    const data = new FormData(event.currentTarget);
    const result = await mutation.submit(
      `/api/exam-recommendations/${encodeURIComponent(id)}`,
      {
        revision: row.revision,
        outcome: String(data.get("outcome") ?? ""),
        reason: String(data.get("reason") ?? ""),
      },
    );
    if (result) resource.reload();
  }
  return (
    <>
      <Link
        href="/kien-nghi"
        className="text-sm font-semibold text-teal-800 underline"
      >
        Danh sách kiến nghị
      </Link>
      <Notice error message={resource.error || mutation.error} />
      <Notice message={mutation.message} />
      {resource.loading && (
        <p role="status" className="py-8">
          Đang tải kiến nghị…
        </p>
      )}
      {row && (
        <>
          <header className="my-6">
            <h1 className="text-3xl font-bold text-slate-950">
              {row.courseName}
            </h1>
            <p className="mt-3 text-slate-600">
              {row.campaignTitle} · {row.departmentName}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Người nhận: {row.recipientName}
            </p>
            <p className="mt-2 font-semibold text-slate-700">
              {recommendationStatusLabels[row.status]} · Hạn phản hồi:{" "}
              {vietnamTime(row.dueAt)}
            </p>
            {row.isOverdue && (
              <Notice error message="Kiến nghị đã quá hạn phản hồi." />
            )}
            {row.semesterLocked && (
              <Notice message="Học kỳ đã khóa sổ, hồ sơ chỉ được xem." />
            )}
          </header>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Nội dung kiến nghị
              </h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {row.body}
              </p>
            </section>
            <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Phản hồi của trưởng bộ môn
              </h2>
              {row.status === "DA_PHAN_HOI" ? (
                <>
                  <p className="font-semibold text-teal-800">
                    {recommendationOutcomeLabels[row.outcome ?? ""]}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {row.responseReason}
                  </p>
                  {row.respondedAt && (
                    <p className="text-xs text-slate-500">
                      Phản hồi lúc {vietnamTime(row.respondedAt)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600">Chưa có phản hồi.</p>
              )}
              {row.canRespond && (
                <form
                  key={row.revision}
                  method="post"
                  onSubmit={submit}
                  className="space-y-5"
                >
                  <Field label="Kết quả xem xét" id="recommendation-outcome">
                    <select
                      id="recommendation-outcome"
                      name="outcome"
                      required
                      className={inputStyle}
                      disabled={!ready || mutation.busy}
                    >
                      <option value="DA_TIEP_THU">Đã tiếp thu</option>
                      <option value="KHONG_TIEP_THU">Không tiếp thu</option>
                    </select>
                  </Field>
                  <Field
                    label="Lý do và nội dung phản hồi"
                    id="recommendation-reason"
                  >
                    <textarea
                      id="recommendation-reason"
                      name="reason"
                      className={`${inputStyle} min-h-40`}
                      required
                      minLength={10}
                      maxLength={5000}
                      disabled={!ready || mutation.busy}
                    />
                  </Field>
                  <button
                    className={buttonStyle}
                    disabled={!ready || mutation.busy}
                  >
                    {mutation.busy ? "Đang lưu…" : "Gửi phản hồi"}
                  </button>
                </form>
              )}
              <button
                className={secondaryStyle}
                onClick={resource.reload}
                disabled={!ready || mutation.busy}
              >
                Tải lại hồ sơ
              </button>
            </section>
          </div>
        </>
      )}
    </>
  );
}
