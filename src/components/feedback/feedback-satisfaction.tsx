"use client";
import { useRef, useState, type FormEvent } from "react";
import type { FeedbackDetail } from "@/server/services/feedback-types";
import { buttonStyle, Field, inputStyle, Notice } from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import { feedbackRequest, feedbackError } from "./feedback-client";
import { Panel } from "./labels";
export function FeedbackSatisfaction({
  item,
  reload,
}: {
  item: FeedbackDetail;
  reload: () => void;
}) {
  const ready = useClientReady(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    request = useRef({ signature: "", id: "" });
  async function submit(event: FormEvent<HTMLFormElement>, reopen: boolean) {
    event.preventDefault();
    if (!ready || pending.current) return;
    const form = new FormData(event.currentTarget);
    const data = {
      revision: item.revision,
      ...(reopen
        ? { reason: String(form.get("reason") ?? "") }
        : {
            score: Number(form.get("score")),
            comment: String(form.get("comment") ?? ""),
          }),
    };
    const signature = JSON.stringify({ reopen, data });
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await feedbackRequest(
        `/api/feedback/${item.id}/${reopen ? "reopen" : "rating"}`,
        { ...data, requestId: request.current.id },
      );
      request.current = { signature: "", id: "" };
      reload();
    } catch (e) {
      setError(feedbackError(e));
      reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!item.rating && !item.canRate && !item.canReopen) return null;
  return (
    <Panel title="Đánh giá xử lý">
      <Notice error message={error} />
      {item.rating && (
        <p className="text-sm leading-7 text-slate-700">
          Mức hài lòng: {item.rating.score}/5
          {item.rating.comment && ` · ${item.rating.comment}`}
        </p>
      )}
      {item.canRate && (
        <form
          method="post"
          className="mt-4 space-y-4"
          onSubmit={(e) => void submit(e, false)}
          aria-busy={busy}
        >
          <Field label="Mức hài lòng" id="feedback-rating">
            <select
              id="feedback-rating"
              name="score"
              required
              className={inputStyle}
              disabled={!ready || busy}
              defaultValue=""
            >
              <option value="" disabled>
                Chọn mức hài lòng
              </option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} —{" "}
                  {
                    [
                      "Rất không hài lòng",
                      "Không hài lòng",
                      "Bình thường",
                      "Hài lòng",
                      "Rất hài lòng",
                    ][n - 1]
                  }
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhận xét (không bắt buộc)" id="feedback-rating-comment">
            <textarea
              id="feedback-rating-comment"
              name="comment"
              rows={3}
              maxLength={1000}
              className={inputStyle}
              disabled={!ready || busy}
            />
          </Field>
          <p className="text-xs leading-6 text-slate-600">
            Gửi đánh giá sẽ đóng phản hồi. Mỗi phản hồi chỉ được đánh giá một
            lần.
          </p>
          <button className={buttonStyle} disabled={!ready || busy}>
            {busy ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
        </form>
      )}
      {item.canReopen && (
        <form
          method="post"
          className="mt-4 space-y-4"
          onSubmit={(e) => void submit(e, true)}
          aria-busy={busy}
        >
          <Field label="Lý do đề nghị xử lý tiếp" id="feedback-reopen-reason">
            <textarea
              id="feedback-reopen-reason"
              name="reason"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              className={inputStyle}
              disabled={!ready || busy}
            />
          </Field>
          <p className="text-xs leading-6 text-slate-600">
            Phản hồi có mức hài lòng từ 1 đến 2 được mở lại tối đa một lần trong
            thời hạn quy định.
          </p>
          <button className={buttonStyle} disabled={!ready || busy}>
            {busy ? "Đang cập nhật…" : "Mở lại phản hồi"}
          </button>
        </form>
      )}
    </Panel>
  );
}
