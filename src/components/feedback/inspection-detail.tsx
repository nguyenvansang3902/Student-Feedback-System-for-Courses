"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { InspectionWorkflowDetail } from "@/server/services/inspection-workflow-types";
import { InspectionWorkflowPanel } from "./inspection-workflow-panel";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  feedbackError,
  feedbackRequest,
  useFeedbackResource,
} from "./feedback-client";
import { FeedbackContent } from "./feedback-detail";
import { FeedbackStatus, Panel, statusLabels, violationLabels } from "./labels";

const conclusionLabels: Record<string, string> = {
  CO_CAN_CU: "Có căn cứ",
  KHONG_CAN_CU: "Không có căn cứ",
  KHONG_DU_THONG_TIN: "Không đủ thông tin",
  CHUYEN_DON_VI_KHAC: "Chuyển đơn vị khác",
};
export function InspectionDetailPanel({ id }: { id: string }) {
  const ready = useClientReady();
  const resource = useFeedbackResource<{ item: InspectionWorkflowDetail }>(
    `/api/inspection-cases/${id}`,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    requestId = useRef("");
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = resource.data?.item;
    if (!ready || !item || pending.current || !item.canAssign) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      await feedbackRequest(`/api/inspection-cases/${id}/assign`, {
        assigneeId: String(values.get("assigneeId") ?? ""),
        reason: String(values.get("reason") ?? "").trim(),
        revision: item.revision,
        requestId: requestId.current,
      });
      requestId.current = "";
      form.reset();
      resource.reload();
    } catch (caught) {
      setError(feedbackError(caught));
      resource.reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const item = resource.data?.item;
  return (
    <>
      <Link href="/thanh-tra" className={`${secondaryStyle} mb-5 inline-flex`}>
        ← Danh sách hồ sơ
      </Link>
      <Notice error message={resource.error ?? error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải hồ sơ…
        </p>
      )}
      {resource.error && (
        <button className={secondaryStyle} onClick={resource.reload}>
          Tải lại dữ liệu
        </button>
      )}
      {item && (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                {item.level === "summary"
                  ? "Tóm tắt hồ sơ Thanh tra"
                  : "Hồ sơ Thanh tra"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.violation
                  ? violationLabels[item.violation]
                  : "Khiếu nại nghiêm trọng"}{" "}
                · {vietnamTime(item.createdAt)}
              </p>
            </div>
            <FeedbackStatus status={item.status} />
          </div>
          {item.level === "summary" ? (
            <Panel title="Thông tin tóm tắt">
              <dl className="space-y-4 text-sm leading-7">
                <div>
                  <dt className="text-xs text-slate-500">Loại vi phạm</dt>
                  <dd>
                    {item.violation
                      ? violationLabels[item.violation]
                      : "Chưa phân loại"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Trạng thái</dt>
                  <dd>{statusLabels[item.status] ?? item.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kết luận</dt>
                  <dd>
                    {item.conclusion
                      ? (conclusionLabels[item.conclusion] ?? item.conclusion)
                      : "Chưa có kết luận"}
                  </dd>
                </div>
              </dl>
            </Panel>
          ) : (
            <>
              <div
                role="note"
                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"
              >
                Hồ sơ được bảo mật theo quyền truy cập. Việc ghi nhận tại đây
                không thay thế quy trình thanh tra hoặc kỷ luật chính thức của
                trường.
              </div>
              {item.conclusion && (
                <div className="mb-6">
                  <Panel title="Kết luận đã lưu">
                    <dl className="space-y-4 text-sm leading-7">
                      <div>
                        <dt className="text-xs text-slate-500">Kết luận</dt>
                        <dd className="font-semibold text-slate-900">
                          {conclusionLabels[item.conclusion] ?? item.conclusion}
                        </dd>
                      </div>
                      {item.conclusionReason && (
                        <div>
                          <dt className="text-xs text-slate-500">
                            Lý do kết luận
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-slate-700">
                            {item.conclusionReason}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Panel>
                </div>
              )}
              {item.canAssign && (
                <div className="mb-6">
                  <Panel title="Giao xử lý">
                    <p className="mb-4 text-sm text-slate-600">
                      Người đang được giao:{" "}
                      {item.assignee?.displayName ?? "Chưa có"}
                    </p>
                    {item.assignTargets.length ? (
                      <form
                        method="post"
                        className="space-y-4"
                        onSubmit={(event) => void assign(event)}
                        aria-busy={busy}
                      >
                        <Field
                          label="Cán bộ Thanh tra"
                          id="inspection-assignee"
                        >
                          <select
                            id="inspection-assignee"
                            name="assigneeId"
                            required
                            defaultValue=""
                            className={inputStyle}
                            disabled={!ready || busy}
                          >
                            <option value="" disabled>
                              Chưa chọn cán bộ xử lý
                            </option>
                            {item.assignTargets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.displayName}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          label="Lý do giao xử lý"
                          id="inspection-assign-reason"
                        >
                          <textarea
                            id="inspection-assign-reason"
                            name="reason"
                            required
                            minLength={10}
                            maxLength={1000}
                            rows={3}
                            className={inputStyle}
                            disabled={!ready || busy}
                          />
                        </Field>
                        <button
                          type="submit"
                          className={buttonStyle}
                          disabled={!ready || busy}
                        >
                          {busy ? "Đang cập nhật…" : "Giao xử lý"}
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm leading-7 text-slate-600">
                        Chưa có cán bộ phù hợp để giao xử lý.
                      </p>
                    )}
                  </Panel>
                </div>
              )}
              {item.feedback && (
                <FeedbackContent
                  item={item.feedback}
                  reload={resource.reload}
                  inspection
                />
              )}
              <InspectionWorkflowPanel item={item} reload={resource.reload} />
              <div className="mt-6">
                <Panel title="Lịch sử hồ sơ">
                  <ol className="space-y-4">
                    {item.events?.map((entry) => (
                      <li
                        key={entry.id}
                        className="border-l-2 border-teal-200 pl-4"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {entry.actorLabel} ·{" "}
                          {statusLabels[entry.toStatus] ?? entry.toStatus}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          {vietnamTime(entry.occurredAt)}
                        </p>
                        {entry.reason && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                            {entry.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
