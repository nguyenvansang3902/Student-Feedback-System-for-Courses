"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { ReportsSettings } from "@/server/services/reports-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  reportError,
  reportsRequest,
  useReportsResource,
} from "./reports-client";

export function ReportsSettingsPanel({ canWrite }: { canWrite: boolean }) {
  const ready = useClientReady(),
    resource = useReportsResource<{ item: ReportsSettings }>(
      "/api/reports/settings",
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [notice, setNotice] = useState<string>();
  const pending = useRef(false),
    attempt = useRef<{ signature: string; requestId: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !canWrite || pending.current || !resource.data) return;
    const form = new FormData(event.currentTarget),
      body = {
        minFeedbackRecords: Number(form.get("minFeedbackRecords")),
        minInspectionCases: Number(form.get("minInspectionCases")),
        revision: resource.data.item.revision,
      };
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, requestId: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await reportsRequest("/api/reports/settings", {
        ...body,
        requestId: attempt.current.requestId,
      });
      attempt.current = null;
      setNotice("Đã lưu ngưỡng báo cáo.");
      resource.reload();
    } catch (cause) {
      setError(reportError(cause));
      resource.reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href="/bao-cao"
        className="text-sm font-semibold text-teal-800 underline"
      >
        Báo cáo
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">
        Cấu hình ngưỡng báo cáo
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Số bản ghi tối thiểu để hiển thị một nhóm thống kê phản hồi hoặc hồ sơ
        Thanh tra. Nhóm chưa đủ mẫu được ẩn số liệu.
      </p>
      <Notice error message={resource.error || error} />
      <Notice message={notice} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải cấu hình báo cáo…
        </p>
      )}
      {resource.data && (
        <form
          key={resource.data.item.revision}
          method="post"
          onSubmit={submit}
          className="mt-6 max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <Field
            label="Số phản hồi tối thiểu trong một nhóm"
            id="report-min-feedback"
          >
            <input
              id="report-min-feedback"
              name="minFeedbackRecords"
              type="number"
              inputMode="numeric"
              required
              min={2}
              max={1000}
              step={1}
              defaultValue={resource.data.item.minFeedbackRecords}
              className={inputStyle}
              disabled={!ready || !canWrite || busy}
            />
          </Field>
          <Field
            label="Số hồ sơ Thanh tra tối thiểu trong một nhóm"
            id="report-min-inspection"
          >
            <input
              id="report-min-inspection"
              name="minInspectionCases"
              type="number"
              inputMode="numeric"
              required
              min={2}
              max={1000}
              step={1}
              defaultValue={resource.data.item.minInspectionCases}
              className={inputStyle}
              disabled={!ready || !canWrite || busy}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            {canWrite && (
              <button className={buttonStyle} disabled={!ready || busy}>
                {busy ? "Đang lưu…" : "Lưu cấu hình"}
              </button>
            )}
            <button
              type="button"
              className={secondaryStyle}
              disabled={!ready || busy}
              onClick={resource.reload}
            >
              Tải lại
            </button>
          </div>
        </form>
      )}
    </>
  );
}
