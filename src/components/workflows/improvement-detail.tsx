"use client";
import Link from "next/link";
import type { FormEvent } from "react";
import type { ImprovementDetail } from "@/server/services/improvement-types";
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
import { improvementStatusLabels } from "./labels";
export function ImprovementDetailPanel({ id }: { id: string }) {
  const ready = useClientReady(),
    resource = useFeedbackResource<{ item: ImprovementDetail }>(
      `/api/improvements/${encodeURIComponent(id)}`,
    ),
    mutation = useWorkflowMutation(),
    row = resource.data?.item;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !row) return;
    const data = new FormData(event.currentTarget);
    const action = String(data.get("action"));
    const result = await mutation.submit(
      `/api/improvements/${encodeURIComponent(id)}`,
      {
        revision: row.revision,
        action,
        ...(action === "submit"
          ? {
              explanation: String(data.get("explanation") ?? ""),
              actionPlan: String(data.get("actionPlan") ?? ""),
            }
          : { comment: String(data.get("comment") ?? "") }),
      },
    );
    if (result) resource.reload();
  }
  return (
    <>
      <Link
        href="/giai-trinh"
        className="text-sm font-semibold text-teal-800 underline"
      >
        Danh sách giải trình
      </Link>
      <Notice error message={resource.error || mutation.error} />
      <Notice message={mutation.message} />
      {resource.loading && (
        <p role="status" className="py-8">
          Đang tải giải trình…
        </p>
      )}
      {row && (
        <>
          <header className="my-6">
            <h1 className="text-3xl font-bold text-slate-950">
              {row.sectionCode} · {row.courseName}
            </h1>
            <p className="mt-3 text-slate-600">
              {row.campaignTitle} · {row.teacherName}
            </p>
            <p className="mt-2 font-semibold text-slate-700">
              {improvementStatusLabels[row.status]} · Hạn gửi:{" "}
              {vietnamTime(row.dueAt)}
            </p>
            {row.isOverdue && (
              <Notice error message="Yêu cầu giải trình đã quá hạn gửi." />
            )}
            {row.semesterLocked && (
              <Notice message="Học kỳ đã khóa sổ, hồ sơ chỉ được xem." />
            )}
          </header>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Nội dung giải trình
              </h2>
              {row.explanation ? (
                <>
                  <div>
                    <h3 className="font-semibold">Nguyên nhân và giải trình</h3>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {row.explanation}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Kế hoạch cải tiến</h3>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {row.actionPlan}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Giảng viên chưa gửi giải trình.
                </p>
              )}
              {row.reviewComment && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold">Nhận xét của trưởng bộ môn</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                    {row.reviewComment}
                  </p>
                </div>
              )}
              {row.submittedAt && (
                <p className="text-sm text-slate-500">
                  Gửi lúc {vietnamTime(row.submittedAt)}
                </p>
              )}
              {row.confirmedAt && (
                <p className="text-sm text-slate-500">
                  Xác nhận lúc {vietnamTime(row.confirmedAt)}
                </p>
              )}
            </section>
            <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Xử lý giải trình
              </h2>
              {row.canSubmit && (
                <form
                  key={`submit-${row.revision}`}
                  method="post"
                  onSubmit={submit}
                  className="space-y-5"
                >
                  <input type="hidden" name="action" value="submit" />
                  <Field
                    label="Nguyên nhân và giải trình"
                    id="improvement-explanation"
                  >
                    <textarea
                      id="improvement-explanation"
                      name="explanation"
                      defaultValue={row.explanation ?? ""}
                      className={`${inputStyle} min-h-36`}
                      required
                      minLength={20}
                      maxLength={10000}
                      disabled={!ready || mutation.busy}
                    />
                  </Field>
                  <Field label="Kế hoạch cải tiến" id="improvement-plan">
                    <textarea
                      id="improvement-plan"
                      name="actionPlan"
                      defaultValue={row.actionPlan ?? ""}
                      className={`${inputStyle} min-h-36`}
                      required
                      minLength={20}
                      maxLength={10000}
                      disabled={!ready || mutation.busy}
                    />
                  </Field>
                  <button
                    className={buttonStyle}
                    disabled={!ready || mutation.busy}
                  >
                    {mutation.busy ? "Đang gửi…" : "Gửi giải trình"}
                  </button>
                </form>
              )}
              {row.canReview && (
                <form
                  key={`review-${row.revision}`}
                  method="post"
                  onSubmit={submit}
                  className="space-y-5"
                >
                  <Field label="Hình thức xử lý" id="improvement-action">
                    <select
                      id="improvement-action"
                      name="action"
                      className={inputStyle}
                      disabled={!ready || mutation.busy}
                    >
                      <option value="confirm">Xác nhận giải trình</option>
                      <option value="supplement">Yêu cầu bổ sung</option>
                    </select>
                  </Field>
                  <Field label="Nhận xét" id="improvement-comment">
                    <textarea
                      id="improvement-comment"
                      name="comment"
                      className={`${inputStyle} min-h-36`}
                      required
                      minLength={10}
                      maxLength={2000}
                      disabled={!ready || mutation.busy}
                    />
                  </Field>
                  <button
                    className={buttonStyle}
                    disabled={!ready || mutation.busy}
                  >
                    {mutation.busy ? "Đang lưu…" : "Lưu kết quả xem xét"}
                  </button>
                </form>
              )}
              {!row.canSubmit && !row.canReview && (
                <p className="text-sm leading-7 text-slate-600">
                  Không có thao tác cần thực hiện ở trạng thái hiện tại.
                </p>
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
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold">Lịch sử giải trình</h2>
            <ol className="mt-4 space-y-5">
              {row.history.map((h) => (
                <li key={h.id} className="border-l-2 border-teal-200 pl-4">
                  <p className="font-semibold text-slate-800">
                    {improvementStatusLabels[h.fromStatus]} →{" "}
                    {improvementStatusLabels[h.toStatus]}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {h.actorLabel} · {vietnamTime(h.occurredAt)}
                  </p>
                  {h.note && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                      {h.note}
                    </p>
                  )}
                </li>
              ))}
              {!row.history.length && (
                <li className="text-sm text-slate-600">
                  Chưa có thao tác gửi hoặc xem xét.
                </li>
              )}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
