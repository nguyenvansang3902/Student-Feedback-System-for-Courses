"use client";
import { useRef, useState, type FormEvent } from "react";
import type { FeedbackAttachment } from "@/server/services/feedback-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import { feedbackError, feedbackRequest } from "./feedback-client";
import { Panel, validateFeedbackFiles } from "./labels";

export function FeedbackAttachments({
  feedbackId,
  attachments,
  canAttach,
  reload,
}: {
  feedbackId: string;
  attachments: FeedbackAttachment[];
  canAttach: boolean;
  reload: () => void;
}) {
  const ready = useClientReady();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy || pending.current) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem("files") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const problem = validateFeedbackFiles(files, attachments.length);
    if (!files.length || problem) {
      setError(problem ?? "Chọn ít nhất một tệp để đính kèm.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    const body = new FormData();
    for (const file of files) body.append("files", file);
    try {
      await feedbackRequest(`/api/feedback/${feedbackId}/attachments`, body);
      form.reset();
      reload();
    } catch (caught) {
      setError(feedbackError(caught));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Panel title="Tệp đính kèm">
      <Notice error message={error} />
      {attachments.length ? (
        <ul className="space-y-3">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
            >
              <div>
                <a
                  className="rounded text-sm font-semibold text-teal-800 underline focus-visible:outline-2 focus-visible:outline-teal-700"
                  href={file.downloadUrl}
                >
                  {file.displayName}
                </a>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {file.mimeType === "application/pdf"
                    ? "PDF"
                    : file.mimeType === "image/png"
                      ? "PNG"
                      : "JPG"}{" "}
                  · {Math.ceil(file.byteSize / 1024)} KB ·{" "}
                  {vietnamTime(file.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Chưa có tệp đính kèm.</p>
      )}
      {canAttach && attachments.length < 3 && (
        <form
          method="post"
          onSubmit={submit}
          aria-busy={busy}
          className="mt-5 space-y-4"
        >
          <Field
            label="Thêm tệp đính kèm"
            id="detail-feedback-files"
            hint={`Còn ${3 - attachments.length} tệp có thể thêm. Chỉ PNG, JPG hoặc PDF, mỗi tệp không quá 5 MB. Tên tệp được ẩn; nội dung và thông tin bên trong tệp có thể tiết lộ danh tính.`}
          >
            <input
              type="file"
              id="detail-feedback-files"
              name="files"
              multiple
              accept=".png,.jpg,.jpeg,.pdf"
              className={inputStyle}
              disabled={!ready || busy}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className={buttonStyle}
              disabled={!ready || busy}
            >
              {busy ? "Đang tải tệp…" : "Thêm tệp"}
            </button>
            <button
              type="button"
              className={secondaryStyle}
              disabled={!ready || busy}
              onClick={reload}
            >
              Kiểm tra danh sách tệp
            </button>
          </div>
          {error && (
            <p className="text-xs leading-6 text-slate-600">
              Nếu kết nối vừa bị ngắt, kiểm tra danh sách tệp trước khi tải lại.
            </p>
          )}
        </form>
      )}
    </Panel>
  );
}
