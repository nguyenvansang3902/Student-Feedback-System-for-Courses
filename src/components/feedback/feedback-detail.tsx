"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { FeedbackDetail as FeedbackDTO } from "@/server/services/feedback-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import { FeedbackAttachments } from "./attachments";
import {
  feedbackError,
  feedbackRequest,
  useFeedbackResource,
} from "./feedback-client";
import {
  actionLabels,
  categoryLabels,
  eventLabels,
  FeedbackStatus,
  Panel,
  severityLabels,
  statusLabels,
} from "./labels";

export function FeedbackContent({
  item,
  reload,
  inspection = false,
}: {
  item: FeedbackDTO;
  reload: () => void;
  inspection?: boolean;
}) {
  const ready = useClientReady();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState("");
  const pending = useRef(false);
  const mutation = useRef<{ signature: string; id: string } | null>(null);
  const actions = item.allowedActions.filter((value) => value !== "message");
  const currentAction = actions.includes(action as (typeof actions)[number])
    ? action
    : (actions[0] ?? "");
  async function submit(event: FormEvent<HTMLFormElement>, message: boolean) {
    event.preventDefault();
    if (!ready || pending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const data = message
      ? {
          body: String(values.get("body") ?? "").trim(),
          revision: item.revision,
        }
      : {
          action: currentAction,
          revision: item.revision,
          ...(currentAction === "answer"
            ? { body: String(values.get("body") ?? "").trim() }
            : {}),
          ...(["reject", "forward"].includes(currentAction)
            ? { reason: String(values.get("reason") ?? "").trim() }
            : {}),
          ...(currentAction === "forward"
            ? { targetUserId: String(values.get("targetUserId") ?? "") }
            : {}),
        };
    const signature = JSON.stringify({ message, ...data });
    if (mutation.current?.signature !== signature)
      mutation.current = { signature, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await feedbackRequest(
        `/api/feedback/${item.id}/${message ? "messages" : "transition"}`,
        { ...data, requestId: mutation.current.id },
      );
      mutation.current = null;
      form.reset();
      if (!message && currentAction === "forward") {
        router.push("/phan-hoi?view=queue");
        return;
      }
      setNotice(message ? "Đã gửi trao đổi." : "Đã cập nhật phản hồi.");
      reload();
    } catch (caught) {
      setError(feedbackError(caught));
      reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">
            {categoryLabels[item.category]} · {severityLabels[item.severity]}
          </p>
          <h1 className="mt-2 break-words text-3xl font-bold text-slate-950">
            {item.title}
          </h1>
        </div>
        <FeedbackStatus status={item.status} />
      </div>
      <Notice error message={error} />
      <Notice message={notice} />
      {item.examNotice && (
        <div
          role="note"
          className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
        >
          {item.examNotice}
        </div>
      )}
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0 space-y-6">
          <Panel title="Nội dung phản hồi">
            <p className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-800">
              {item.body}
            </p>
          </Panel>
          <FeedbackAttachments
            feedbackId={item.id}
            attachments={item.attachments}
            canAttach={item.canAttach}
            reload={reload}
          />
          <Panel title="Trao đổi">
            {!item.messages.length && (
              <p className="text-sm text-slate-500">
                Chưa có trao đổi bổ sung.
              </p>
            )}
            <ol className="space-y-4">
              {item.messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-xl border p-4 ${message.isOwn ? "border-teal-100 bg-teal-50/50" : "border-slate-200 bg-slate-50"}`}
                >
                  <p className="text-xs font-semibold text-slate-600">
                    {message.authorLabel} · {vietnamTime(message.createdAt)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                    {message.body}
                  </p>
                </li>
              ))}
            </ol>
            {item.allowedActions.includes("message") && (
              <form
                method="post"
                className="mt-5 space-y-4"
                onSubmit={(event) => void submit(event, true)}
                aria-busy={busy}
              >
                <Field label="Nội dung trao đổi" id="feedback-message">
                  <textarea
                    id="feedback-message"
                    name="body"
                    required
                    maxLength={10000}
                    rows={4}
                    className={inputStyle}
                    disabled={!ready || busy}
                  />
                </Field>
                <button
                  type="submit"
                  className={buttonStyle}
                  disabled={!ready || busy}
                >
                  {busy ? "Đang gửi…" : "Gửi trao đổi"}
                </button>
              </form>
            )}
          </Panel>
        </div>
        <aside className="min-w-0 space-y-6">
          <Panel title="Thông tin phản hồi">
            <dl className="space-y-4 text-sm leading-7">
              <div>
                <dt className="text-xs text-slate-500">Lớp học phần</dt>
                <dd className="break-words font-semibold text-slate-800">
                  {item.section.code} · {item.section.courseName}
                </dd>
                <dd className="text-slate-500">{item.section.semesterName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Người gửi</dt>
                <dd className="font-semibold text-slate-800">
                  {item.authorLabel}
                </dd>
                {item.author && (
                  <dd className="break-all text-xs text-slate-500">
                    {item.author.loginCode} · {item.author.email}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-slate-500">Người xử lý</dt>
                <dd>{item.assignee?.displayName ?? "Chờ tiếp nhận"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Thời điểm gửi</dt>
                <dd>{vietnamTime(item.createdAt)}</dd>
              </div>
              {item.identityLevel && (
                <div>
                  <dt className="text-xs text-slate-500">Danh tính</dt>
                  <dd>
                    {item.identityLevel === "AN_DANH_HOAN_TOAN"
                      ? "Ẩn danh với người xử lý"
                      : "Chỉ Phòng Thanh tra được biết"}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
          {actions.length > 0 && !inspection && (
            <Panel title="Xử lý phản hồi">
              <form
                method="post"
                className="space-y-4"
                onSubmit={(event) => void submit(event, false)}
                aria-busy={busy}
              >
                <Field label="Thao tác" id="feedback-action">
                  <select
                    id="feedback-action"
                    value={currentAction}
                    onChange={(event) => setAction(event.target.value)}
                    className={inputStyle}
                    disabled={!ready || busy}
                  >
                    {actions.map((value) => (
                      <option key={value} value={value}>
                        {actionLabels[value] ?? value}
                      </option>
                    ))}
                  </select>
                </Field>
                {currentAction === "answer" && (
                  <Field label="Nội dung trả lời" id="feedback-answer">
                    <textarea
                      id="feedback-answer"
                      name="body"
                      rows={5}
                      required
                      maxLength={10000}
                      className={inputStyle}
                      disabled={!ready || busy}
                    />
                  </Field>
                )}
                {currentAction === "forward" && (
                  <Field label="Người nhận chuyển tiếp" id="feedback-forward">
                    <select
                      id="feedback-forward"
                      name="targetUserId"
                      required
                      className={inputStyle}
                      disabled={!ready || busy}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Chưa chọn người nhận
                      </option>
                      {item.forwardTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.displayName} · {target.roleLabel}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {["reject", "forward"].includes(currentAction) && (
                  <Field label="Lý do" id="feedback-reason">
                    <textarea
                      id="feedback-reason"
                      name="reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={4}
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
                  {busy
                    ? "Đang cập nhật…"
                    : (actionLabels[currentAction] ?? "Cập nhật")}
                </button>
              </form>
            </Panel>
          )}
        </aside>
      </div>
      <div className="mt-6">
        <Panel title="Lịch sử xử lý">
          <ol className="space-y-4">
            {item.history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-teal-200 pl-4">
                <p className="text-sm font-semibold text-slate-800">
                  {eventLabels[entry.event] ?? entry.event} · {entry.actorLabel}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {vietnamTime(entry.occurredAt)} ·{" "}
                  {statusLabels[entry.fromStatus] ?? entry.fromStatus} →{" "}
                  {statusLabels[entry.toStatus] ?? entry.toStatus}
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
  );
}

export function FeedbackDetailPanel({ id }: { id: string }) {
  const resource = useFeedbackResource<{ item: FeedbackDTO }>(
    `/api/feedback/${id}`,
  );
  return (
    <>
      <Link href="/phan-hoi" className={`${secondaryStyle} mb-5 inline-flex`}>
        ← Danh sách phản hồi
      </Link>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải phản hồi…
        </p>
      )}
      {resource.error && (
        <button className={secondaryStyle} onClick={resource.reload}>
          Tải lại dữ liệu
        </button>
      )}
      {resource.data && (
        <FeedbackContent item={resource.data.item} reload={resource.reload} />
      )}
    </>
  );
}
