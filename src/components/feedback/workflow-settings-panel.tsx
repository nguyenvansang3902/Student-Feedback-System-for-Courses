"use client";
import { useRef, useState, type FormEvent } from "react";
import type { WorkflowSettings } from "@/server/services/workflow-settings";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  feedbackRequest,
  feedbackError,
  useFeedbackResource,
} from "./feedback-client";
const fields = {
  normalAcceptDays: "Tiếp nhận phản hồi thường (ngày làm việc)",
  normalReplyDays: "Trả lời phản hồi thường (ngày làm việc)",
  complaintReplyDays: "Trả lời khiếu nại thường (ngày làm việc)",
  officeAcceptDays: "PĐT và Khảo thí tiếp nhận (ngày làm việc)",
  officeReplyDays: "PĐT và Khảo thí trả lời (ngày làm việc)",
  inspectionAcceptDays: "Thanh tra tiếp nhận (ngày làm việc)",
  inspectionCompleteDays: "Thanh tra hoàn tất (ngày làm việc)",
  escalationDays: "Khoảng cách giữa các lần leo thang (ngày làm việc)",
  dailyFeedbackLimit: "Số phản hồi tối đa mỗi sinh viên mỗi ngày",
  duplicateHours: "Cửa sổ cảnh báo nội dung trùng (giờ)",
  satisfactionDays: "Thời hạn đánh giá sau trả lời (ngày)",
  reopenDays: "Thời hạn mở lại sau đóng (ngày)",
  examReviewDays: "Thời hạn phản hồi kiến nghị rà soát (ngày)",
} as const;
export function WorkflowSettingsPanel() {
  const ready = useClientReady(),
    resource = useFeedbackResource<{ item: WorkflowSettings }>(
      "/api/feedback/workflow-settings",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false),
    request = useRef({ signature: "", id: "" });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || pending.current || !resource.data) return;
    const values = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(
        Object.keys(fields).map((k) => [k, Number(values.get(k))]),
      ),
      revision: resource.data.item.revision,
    };
    const signature = JSON.stringify(data);
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await feedbackRequest("/api/feedback/workflow-settings", {
        ...data,
        requestId: request.current.id,
      });
      setNotice(
        "Đã lưu cấu hình thời hạn. Cấu hình mới áp dụng cho phản hồi và kiến nghị tạo tiếp theo.",
      );
      request.current = { signature: "", id: "" };
      resource.reload();
    } catch (e) {
      setError(feedbackError(e));
      resource.reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-950">
        Thời hạn và giới hạn gửi
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Ngày làm việc không tính thứ Bảy, Chủ nhật, theo múi giờ Việt Nam.
        Ngưỡng điểm và hạn giải trình được cấu hình theo từng đợt khảo sát.
      </p>
      <Notice error message={error || resource.error} />
      <Notice message={notice} />
      {resource.loading && (
        <p role="status" className="py-4">
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
          key={resource.data.item.revision}
          method="post"
          onSubmit={submit}
          aria-busy={busy}
          className="mt-5 space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            {Object.entries(fields).map(([key, label]) => (
              <Field key={key} label={label} id={`workflow-${key}`}>
                <input
                  id={`workflow-${key}`}
                  name={key}
                  type="number"
                  min={1}
                  max={
                    key === "dailyFeedbackLimit"
                      ? 100
                      : key === "duplicateHours"
                        ? 168
                        : 365
                  }
                  required
                  defaultValue={resource.data!.item[key as keyof typeof fields]}
                  className={inputStyle}
                  disabled={!ready || busy}
                />
              </Field>
            ))}
          </div>
          <button className={buttonStyle} disabled={!ready || busy}>
            {busy ? "Đang lưu…" : "Lưu thời hạn và giới hạn"}
          </button>
        </form>
      )}
    </section>
  );
}
