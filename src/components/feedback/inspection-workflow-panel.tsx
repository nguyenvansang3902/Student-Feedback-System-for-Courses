"use client";
import { useRef, useState, type FormEvent } from "react";
import type {
  InspectionAction,
  InspectionWorkflowDetail,
} from "@/server/services/inspection-workflow-types";
import {
  inspectionConclusions,
  ordinaryFeedbackCategories,
} from "@/server/inspection-contract";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import { feedbackError, feedbackRequest } from "./feedback-client";
import { categoryLabels, Panel, validateFeedbackFiles } from "./labels";

export const inspectionConclusionLabels: Record<string, string> = {
  CO_CAN_CU: "Có căn cứ",
  KHONG_CAN_CU: "Không có căn cứ",
  KHONG_DU_THONG_TIN: "Không đủ thông tin",
  CHUYEN_DON_VI_KHAC: "Chuyển đơn vị khác",
};
const actionLabels: Record<InspectionAction, string> = {
  accept: "Tiếp nhận và bắt đầu xác minh",
  conclude: "Lưu kết luận",
  notify: "Gửi kết quả cho sinh viên",
  close: "Đóng hồ sơ",
  reject: "Từ chối tiếp nhận",
  return: "Chuyển về phản hồi thường",
};
export function InspectionWorkflowPanel({
  item,
  reload,
}: {
  item: InspectionWorkflowDetail;
  reload: () => void;
}) {
  const labelFor = (action: InspectionAction) =>
    action === "notify" && item.source === "BAT_THUONG_KHAO_SAT"
      ? "Ghi nhận thông báo kết quả"
      : actionLabels[action];
  const ready = useClientReady(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    previous = useRef({ fingerprint: "", id: "" });
  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: InspectionAction | "note",
  ) {
    event.preventDefault();
    if (!ready || pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form),
      files = values
        .getAll("files")
        .filter(
          (value): value is File => value instanceof File && value.size > 0,
        );
    if (action === "note") {
      const invalid = validateFeedbackFiles(files);
      if (files.length && invalid) {
        setError(invalid);
        return;
      }
    }
    const data = {
      revision: item.revision,
      ...(action !== "note" ? { action } : {}),
      ...Object.fromEntries(
        [
          "reason",
          "conclusion",
          "studentSummary",
          "returnCategory",
          "body",
        ].flatMap((key) =>
          values.has(key) ? [[key, String(values.get(key)).trim()]] : [],
        ),
      ),
    };
    const fingerprint = JSON.stringify({
      data,
      files: files.map((file) => [file.name, file.size, file.lastModified]),
    });
    if (previous.current.fingerprint !== fingerprint)
      previous.current = { fingerprint, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      let body: unknown = { ...data, requestId: previous.current.id };
      if (action === "note" && files.length) {
        const multipart = new FormData();
        multipart.set("body", String(values.get("body") ?? "").trim());
        multipart.set("revision", String(item.revision));
        multipart.set("requestId", previous.current.id);
        for (const file of files) multipart.append("files", file);
        body = multipart;
      }
      await feedbackRequest(
        `/api/inspection-cases/${item.id}/${action === "note" ? "notes" : "transition"}`,
        body,
      );
      previous.current = { fingerprint: "", id: "" };
      form.reset();
      reload();
    } catch (caught) {
      setError(feedbackError(caught));
      reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (item.level !== "full") return null;
  return (
    <div className="mt-6 space-y-6">
      <Notice error message={error} />
      <Panel title="Thời hạn xử lý">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Tiếp nhận trước</dt>
            <dd className="mt-1 font-medium">
              {item.acceptDueAt
                ? vietnamTime(item.acceptDueAt)
                : "Chưa xác định"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Hoàn tất trước</dt>
            <dd className="mt-1 font-medium">
              {item.completeDueAt
                ? vietnamTime(item.completeDueAt)
                : "Chưa xác định"}
            </dd>
          </div>
        </dl>
        {item.isOverdue && (
          <p role="status" className="mt-4 font-semibold text-red-700">
            Hồ sơ đã quá hạn xử lý.
          </p>
        )}
      </Panel>
      {!!item.allowedActions.length && (
        <Panel title="Cập nhật hồ sơ">
          <div className="space-y-6">
            {item.allowedActions.map((action) => (
              <form
                key={action}
                method="post"
                onSubmit={(event) => void submit(event, action)}
                className="space-y-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0"
                aria-busy={busy}
              >
                <h3 className="font-semibold text-slate-900">
                  {labelFor(action)}
                </h3>
                {action === "conclude" && (
                  <Field label="Kết luận" id="inspection-conclusion">
                    <select
                      id="inspection-conclusion"
                      name="conclusion"
                      required
                      defaultValue=""
                      className={inputStyle}
                      disabled={!ready || busy}
                    >
                      <option value="" disabled>
                        Chọn kết luận
                      </option>
                      {inspectionConclusions.map((value) => (
                        <option key={value} value={value}>
                          {inspectionConclusionLabels[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {["conclude", "reject", "return"].includes(action) && (
                  <Field label="Lý do" id={`inspection-${action}-reason`}>
                    <textarea
                      id={`inspection-${action}-reason`}
                      name="reason"
                      rows={3}
                      required
                      minLength={10}
                      maxLength={1000}
                      className={inputStyle}
                      disabled={!ready || busy}
                    />
                  </Field>
                )}
                {action === "return" && (
                  <Field
                    label="Loại phản hồi chuyển về"
                    id="inspection-return-category"
                  >
                    <select
                      id="inspection-return-category"
                      name="returnCategory"
                      required
                      defaultValue=""
                      className={inputStyle}
                      disabled={!ready || busy}
                    >
                      <option value="" disabled>
                        Chọn loại phản hồi
                      </option>
                      {ordinaryFeedbackCategories.map((value) => (
                        <option key={value} value={value}>
                          {categoryLabels[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {action === "notify" &&
                  item.source !== "BAT_THUONG_KHAO_SAT" && (
                    <Field
                      label="Tóm tắt kết quả gửi sinh viên"
                      id="inspection-student-summary"
                    >
                      <textarea
                        id="inspection-student-summary"
                        name="studentSummary"
                        rows={5}
                        required
                        minLength={10}
                        maxLength={5000}
                        className={inputStyle}
                        disabled={!ready || busy}
                      />
                    </Field>
                  )}
                <button
                  type="submit"
                  className={buttonStyle}
                  disabled={!ready || busy}
                >
                  {busy ? "Đang cập nhật…" : labelFor(action)}
                </button>
              </form>
            ))}
          </div>
        </Panel>
      )}
      {item.canNote && (
        <Panel title="Bổ sung ghi chú xác minh">
          <form
            method="post"
            onSubmit={(event) => void submit(event, "note")}
            className="space-y-4"
            aria-busy={busy}
          >
            <Field label="Nội dung xác minh" id="inspection-note-body">
              <textarea
                id="inspection-note-body"
                name="body"
                required
                minLength={10}
                maxLength={10000}
                rows={5}
                className={inputStyle}
                disabled={!ready || busy}
              />
            </Field>
            <Field
              label="Tệp nội bộ (không bắt buộc)"
              id="inspection-note-files"
            >
              <input
                id="inspection-note-files"
                name="files"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                multiple
                className={inputStyle}
                disabled={!ready || busy}
              />
            </Field>
            <p className="text-sm leading-7 text-slate-600">
              Tối đa 3 tệp cho mỗi ghi chú, mỗi tệp tối đa 5 MB. Chỉ cán bộ
              Thanh tra có quyền với hồ sơ được xem ghi chú và tệp nội bộ.
            </p>
            <button
              type="submit"
              className={buttonStyle}
              disabled={!ready || busy}
            >
              {busy ? "Đang lưu…" : "Lưu ghi chú"}
            </button>
          </form>
        </Panel>
      )}
      {!!item.notes?.length && (
        <Panel title="Ghi chú xác minh">
          <ol className="space-y-5">
            {item.notes.map((note) => (
              <li key={note.id} className="border-l-2 border-teal-200 pl-4">
                <p className="text-sm font-semibold">
                  {note.authorLabel} · {vietnamTime(note.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {note.body}
                </p>
                {!!note.attachments.length && (
                  <ul className="mt-3 space-y-2">
                    {note.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={file.downloadUrl}
                          className="text-sm font-semibold text-teal-800 underline"
                          download
                        >
                          {file.displayName} ({Math.ceil(file.byteSize / 1024)}{" "}
                          KB)
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
