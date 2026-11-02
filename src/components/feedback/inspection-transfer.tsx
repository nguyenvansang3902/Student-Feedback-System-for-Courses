"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { FeedbackDetail } from "@/server/services/feedback-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  feedbackError,
  feedbackRequest,
  useFeedbackResource,
} from "./feedback-client";
import { Panel, statusLabels, violationLabels } from "./labels";
import { inspectionConclusionLabels } from "./inspection-workflow-panel";
type Summary = {
  feedbackId: string;
  caseId: string;
  status: string;
  conclusion: string | null;
};
export function InspectionTransferForm({ item }: { item: FeedbackDetail }) {
  const ready = useClientReady(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    request = useRef({ fingerprint: "", id: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pending.current) return;
    const values = new FormData(event.currentTarget),
      input = {
        reason: String(values.get("reason") ?? "").trim(),
        violation: String(values.get("violation") ?? ""),
        revision: item.revision,
      };
    const fingerprint = JSON.stringify(input);
    if (request.current.fingerprint !== fingerprint)
      request.current = { fingerprint, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await feedbackRequest(`/api/feedback/${item.id}/inspection-transfer`, {
        ...input,
        requestId: request.current.id,
      });
      router.push(`/phan-hoi/chuyen/${item.id}`);
    } catch (caught) {
      setError(feedbackError(caught));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="my-6">
      <Panel title="Chuyển sang Thanh tra">
        <p className="mb-4 text-sm leading-7 text-slate-600">
          Chỉ chuyển khi nội dung cần được xử lý theo quy trình Thanh tra. Sau
          khi chuyển, người chuyển chỉ theo dõi trạng thái và kết luận tóm tắt.
        </p>
        <Notice error message={error} />
        <form
          method="post"
          onSubmit={(event) => void submit(event)}
          className="space-y-4"
          aria-busy={busy}
        >
          <Field label="Loại vi phạm" id="transfer-inspection-violation">
            <select
              id="transfer-inspection-violation"
              name="violation"
              required
              defaultValue=""
              className={inputStyle}
              disabled={!ready || busy}
            >
              <option value="" disabled>
                Chọn loại vi phạm
              </option>
              {Object.entries(violationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lý do chuyển" id="transfer-inspection-reason">
            <textarea
              id="transfer-inspection-reason"
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
            {busy ? "Đang chuyển…" : "Chuyển sang Thanh tra"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
export function TransferredInspectionSummaryPanel({
  feedbackId,
}: {
  feedbackId: string;
}) {
  const resource = useFeedbackResource<{ item: Summary }>(
    `/api/feedback/${feedbackId}/inspection-summary`,
  );
  return (
    <>
      <Link href="/phan-hoi" className={`${secondaryStyle} mb-6 inline-flex`}>
        ← Danh sách phản hồi
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-slate-950">
        Hồ sơ đã chuyển sang Thanh tra
      </h1>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="text-sm text-slate-600">
          Đang tải trạng thái…
        </p>
      )}
      {resource.data && (
        <Panel title="Thông tin tóm tắt">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Trạng thái</dt>
              <dd className="mt-1 font-semibold">
                {statusLabels[resource.data.item.status] ??
                  resource.data.item.status}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Kết luận</dt>
              <dd className="mt-1">
                {resource.data.item.conclusion
                  ? (inspectionConclusionLabels[
                      resource.data.item.conclusion
                    ] ?? resource.data.item.conclusion)
                  : "Chưa có kết luận"}
              </dd>
            </div>
          </dl>
        </Panel>
      )}
      <button
        type="button"
        className={`${secondaryStyle} mt-5`}
        onClick={resource.reload}
        disabled={resource.loading}
      >
        Tải lại trạng thái
      </button>
    </>
  );
}
export function TransferredInspectionList() {
  const resource = useFeedbackResource<{ items: Summary[] }>(
    "/api/inspection-transfers",
  );
  if (!resource.data?.items.length && !resource.error) return null;
  return (
    <div className="my-6">
      <Panel title="Phản hồi đã chuyển sang Thanh tra">
        <Notice error message={resource.error} />
        <ul className="space-y-3">
          {resource.data?.items.map((item) => (
            <li
              key={item.caseId}
              className="rounded-xl border border-slate-200 p-4"
            >
              <Link
                href={`/phan-hoi/chuyen/${item.feedbackId}`}
                className="text-sm font-semibold text-teal-800 underline"
              >
                {statusLabels[item.status] ?? item.status} ·{" "}
                {item.conclusion
                  ? (inspectionConclusionLabels[item.conclusion] ??
                    item.conclusion)
                  : "Chưa có kết luận"}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
