"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  anomalyDecisions,
  anomalyStatuses,
  anomalyStatusLabels,
  anomalyRuleLabels,
  type AnomalyMetrics,
  type AnomalySettings,
  type SurveyAnomalyDetail,
} from "@/server/survey-anomaly-contract";
import { useClientReady } from "../auth/use-client-ready";
import {
  Field,
  inputStyle,
  buttonStyle,
  secondaryStyle,
  Notice,
  Pager,
  vietnamTime,
} from "../admin/ui";
import { Panel } from "../feedback/labels";
import {
  feedbackError,
  feedbackRequest,
  useFeedbackResource,
} from "../feedback/feedback-client";
export function AnomalyMetricsPanel({ metrics }: { metrics: AnomalyMetrics }) {
  return (
    <Panel title="Chỉ số khảo sát">
      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Số phiếu</dt>
          <dd className="mt-1 font-semibold">{metrics.responseCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tỉ lệ tham gia</dt>
          <dd className="mt-1 font-semibold">
            {(metrics.participationRate * 100).toFixed(2)}%
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Tỉ lệ phiếu đồng nhất</dt>
          <dd className="mt-1 font-semibold">
            {metrics.uniformRate === null
              ? "Không đủ câu thang điểm"
              : `${(metrics.uniformRate * 100).toFixed(2)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">
            Chênh lệch tuyệt đối với học kỳ trước
          </dt>
          <dd className="mt-1 font-semibold">
            {metrics.scoreDeltaAbs === null
              ? "Không có dữ liệu tương thích"
              : `${metrics.scoreDeltaAbs.toFixed(2)} điểm`}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Phiếu đồng nhất có ít nhất hai câu thang điểm hợp lệ cùng giá trị; bỏ
        qua câu trống và Không áp dụng. Tỉ lệ tính trên toàn bộ số phiếu. So
        sánh học kỳ trước dùng cùng môn, cùng mẫu phiếu và dữ liệu đủ ngưỡng.
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-500">
        Ngưỡng tại thời điểm ghi nhận: {metrics.thresholds.minResponses} phiếu;
        đồng nhất từ {(metrics.thresholds.uniformRate * 100).toFixed(2)}%; chênh
        từ {metrics.thresholds.scoreDelta} điểm.
      </p>
    </Panel>
  );
}
export function SurveyAnomalyList() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("");
  const resource = useFeedbackResource<{
    items: SurveyAnomalyDetail[];
    total: number;
  }>(
    `/api/survey-anomalies?page=${page}&pageSize=20${status ? `&status=${status}` : ""}`,
  );
  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">
        Cảnh báo bất thường khảo sát
      </h1>
      <p className="my-4 text-sm leading-7 text-slate-600">
        Chỉ số vượt ngưỡng cần được xem xét; không tự kết luận vi phạm hoặc chặn
        công bố.
      </p>
      <label htmlFor="anomaly-filter" className="text-sm font-semibold">
        Trạng thái
      </label>
      <select
        id="anomaly-filter"
        className={`${inputStyle} mt-2 max-w-sm`}
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="">Tất cả</option>
        {anomalyStatuses.map((value) => (
          <option key={value} value={value}>
            {anomalyStatusLabels[value]}
          </option>
        ))}
      </select>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-6 text-sm">
          Đang tải cảnh báo…
        </p>
      )}
      <div className="my-5 space-y-4">
        {resource.data?.items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs text-slate-500">
              {item.campaignTitle} · {item.semesterName}
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              <Link
                className="text-teal-900 underline"
                href={`/thanh-tra/bat-thuong/${item.id}`}
              >
                {item.sectionCode} · {item.courseName}
              </Link>
            </h2>
            <p className="mt-3 text-sm">
              {anomalyRuleLabels[item.ruleCode] ?? item.ruleCode} ·{" "}
              {anomalyStatusLabels[item.status] ?? item.status}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {item.metrics.responseCount} phiếu · {vietnamTime(item.createdAt)}
            </p>
          </article>
        ))}
      </div>
      {resource.data && !resource.data.items.length && (
        <p className="my-6 text-sm text-slate-600">
          Chưa có cảnh báo trong phạm vi được phép.
        </p>
      )}
      {resource.data && (
        <Pager page={page} total={resource.data.total} change={setPage} />
      )}
      <button
        className={`${secondaryStyle} mt-4`}
        disabled={resource.loading}
        onClick={resource.reload}
      >
        Tải lại
      </button>
    </>
  );
}
export function SurveyAnomalyDetailPanel({ id }: { id: string }) {
  const resource = useFeedbackResource<{ item: SurveyAnomalyDetail }>(
      `/api/survey-anomalies/${id}`,
    ),
    ready = useClientReady(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    request = useRef({ hash: "", id: "" });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const item = resource.data?.item;
    if (!ready || !item || pending.current) return;
    const form = new FormData(e.currentTarget),
      input = {
        revision: item.revision,
        decision: String(form.get("decision") ?? ""),
        note: String(form.get("note") ?? "").trim(),
      },
      signature = JSON.stringify(input);
    if (request.current.hash !== signature)
      request.current = { hash: signature, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await feedbackRequest(`/api/survey-anomalies/${id}/review`, {
        ...input,
        requestId: request.current.id,
      });
      request.current = { hash: "", id: "" };
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
      <Link
        href="/thanh-tra/bat-thuong"
        className={`${secondaryStyle} mb-5 inline-flex`}
      >
        ← Danh sách cảnh báo
      </Link>
      <Notice error message={resource.error ?? error} />
      {resource.loading && <p role="status">Đang tải cảnh báo…</p>}
      {item && (
        <>
          <h1 className="text-3xl font-bold">
            {anomalyRuleLabels[item.ruleCode] ?? item.ruleCode}
          </h1>
          <p className="mb-6 mt-3 text-sm leading-7 text-slate-600">
            {item.sectionCode} · {item.courseName} · {item.campaignTitle} ·{" "}
            {anomalyStatusLabels[item.status]}
          </p>
          <AnomalyMetricsPanel metrics={item.metrics} />
          {item.canReview && (
            <div className="mt-6">
              <Panel title="Xem xét cảnh báo">
                <form
                  method="post"
                  className="space-y-4"
                  onSubmit={(e) => void submit(e)}
                  aria-busy={busy}
                >
                  <Field label="Kết quả xem xét" id="anomaly-decision">
                    <select
                      id="anomaly-decision"
                      name="decision"
                      className={inputStyle}
                      required
                      defaultValue=""
                      disabled={!ready || busy}
                    >
                      <option value="" disabled>
                        Chọn kết quả
                      </option>
                      {anomalyDecisions.map((value) => (
                        <option value={value} key={value}>
                          {anomalyStatusLabels[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ghi chú xem xét" id="anomaly-note">
                    <textarea
                      id="anomaly-note"
                      name="note"
                      rows={4}
                      required
                      minLength={10}
                      maxLength={5000}
                      className={inputStyle}
                      disabled={!ready || busy}
                    />
                  </Field>
                  <button
                    className={buttonStyle}
                    type="submit"
                    disabled={!ready || busy}
                  >
                    {busy ? "Đang lưu…" : "Lưu kết quả xem xét"}
                  </button>
                </form>
              </Panel>
            </div>
          )}
          {item.caseId && (
            <Link
              className={`${secondaryStyle} mt-6 inline-flex`}
              href={`/thanh-tra/${item.caseId}`}
            >
              Mở hồ sơ xác minh
            </Link>
          )}
          {!!item.events.length && (
            <div className="mt-6">
              <Panel title="Lịch sử xem xét">
                <ol className="space-y-4">
                  {item.events.map((event) => (
                    <li
                      key={event.id}
                      className="border-l-2 border-teal-200 pl-4"
                    >
                      <p className="text-sm font-semibold">
                        {event.actorLabel} ·{" "}
                        {anomalyStatusLabels[event.decision]}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vietnamTime(event.occurredAt)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                        {event.note}
                      </p>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}
export function SurveyAnomalySettings() {
  const resource = useFeedbackResource<{ item: AnomalySettings }>(
      "/api/survey-anomalies/settings",
    ),
    ready = useClientReady(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || !resource.data || pending.current) return;
    const values = new FormData(e.currentTarget);
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await feedbackRequest("/api/survey-anomalies/settings", {
        minResponses: Number(values.get("minResponses")),
        uniformRate: Number(values.get("uniformPercent")) / 100,
        scoreDelta: Number(values.get("scoreDelta")),
        revision: resource.data.item.revision,
        requestId: crypto.randomUUID(),
      });
      resource.reload();
    } catch (caught) {
      setError(feedbackError(caught));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Ngưỡng cảnh báo bất thường</h1>
      <Notice error message={resource.error ?? error} />
      {resource.data && (
        <Panel title="Cấu hình ngưỡng">
          <form
            key={resource.data.item.revision}
            method="post"
            onSubmit={(e) => void submit(e)}
            className="max-w-xl space-y-5"
            aria-busy={busy}
          >
            <Field label="Số phiếu tối thiểu (từ 10)" id="anomaly-min">
              <input
                id="anomaly-min"
                name="minResponses"
                type="number"
                required
                min={10}
                max={100000}
                defaultValue={resource.data.item.minResponses}
                className={inputStyle}
                disabled={!ready || busy}
              />
            </Field>
            <Field label="Tỉ lệ phiếu đồng nhất (%)" id="anomaly-uniform">
              <input
                id="anomaly-uniform"
                name="uniformPercent"
                type="number"
                required
                min={1}
                max={100}
                step={0.01}
                defaultValue={resource.data.item.uniformRate * 100}
                className={inputStyle}
                disabled={!ready || busy}
              />
            </Field>
            <Field
              label="Chênh lệch tuyệt đối với học kỳ trước (điểm)"
              id="anomaly-shift"
            >
              <input
                id="anomaly-shift"
                name="scoreDelta"
                type="number"
                required
                min={0.0001}
                max={5}
                step={0.0001}
                defaultValue={resource.data.item.scoreDelta}
                className={inputStyle}
                disabled={!ready || busy}
              />
            </Field>
            <p className="text-sm leading-7 text-slate-600">
              Cảnh báo đã ghi nhận giữ ngưỡng và lịch sử của thời điểm tạo; việc
              đổi cấu hình không xóa kết quả xem xét cũ.
            </p>
            <button
              type="submit"
              className={buttonStyle}
              disabled={!ready || busy}
            >
              {busy ? "Đang lưu…" : "Lưu ngưỡng"}
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}
