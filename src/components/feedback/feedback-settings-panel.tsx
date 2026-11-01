"use client";
import { useRef, useState, type FormEvent } from "react";
import type { FeedbackSettings } from "@/server/services/feedback-settings";
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

export function FeedbackSettingsPanel() {
  const ready = useClientReady();
  const resource = useFeedbackResource<{ item: FeedbackSettings }>(
    "/api/feedback/settings",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false),
    requestId = useRef("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = resource.data?.item;
    if (!ready || !item || pending.current) return;
    const values = new FormData(event.currentTarget);
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    requestId.current ||= crypto.randomUUID();
    try {
      await feedbackRequest("/api/feedback/settings", {
        examNotice: String(values.get("examNotice") ?? "").trim(),
        allowPreviousSemester: values.get("allowPreviousSemester") === "on",
        revision: item.revision,
        requestId: requestId.current,
      });
      requestId.current = "";
      setNotice("Đã lưu cấu hình phản hồi.");
      resource.reload();
    } catch (caught) {
      setError(feedbackError(caught));
      resource.reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">Cấu hình phản hồi</h1>
      <Notice error message={resource.error ?? error} />
      <Notice message={notice} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải cấu hình…
        </p>
      )}
      {resource.error && (
        <button className={secondaryStyle} onClick={resource.reload}>
          Tải lại cấu hình
        </button>
      )}
      {resource.data && (
        <form
          method="post"
          onSubmit={submit}
          aria-busy={busy}
          className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <Field
            label="Lời nhắc khi gửi phản hồi thi kết thúc học phần"
            id="feedback-exam-notice"
          >
            <textarea
              id="feedback-exam-notice"
              name="examNotice"
              required
              minLength={20}
              maxLength={1000}
              rows={5}
              defaultValue={resource.data.item.examNotice}
              className={inputStyle}
              disabled={!ready || busy}
            />
          </Field>
          <label className="flex items-start gap-3 text-sm leading-7 text-slate-700">
            <input
              className="mt-1 accent-teal-800"
              type="checkbox"
              name="allowPreviousSemester"
              defaultChecked={resource.data.item.allowPreviousSemester}
              disabled={!ready || busy}
            />
            Cho phép sinh viên gửi phản hồi cho lớp học phần đã đăng ký trong
            học kỳ liền trước.
          </label>
          <p className="text-xs leading-6 text-slate-500">
            Lớp trong học kỳ hiện hành vẫn được áp dụng. Học kỳ đã khóa không
            nhận thao tác ghi.
          </p>
          <button
            type="submit"
            className={buttonStyle}
            disabled={!ready || busy}
          >
            {busy ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </form>
      )}
    </>
  );
}
