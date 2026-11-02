"use client";
import Link from "next/link";
import { useState } from "react";
import type { NotificationList } from "@/server/services/notifications";
import {
  buttonStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  feedbackError,
  useFeedbackResource,
} from "../feedback/feedback-client";
import { notificationMutation } from "./notification-client";

export function NotificationListPanel() {
  const ready = useClientReady();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const resource = useFeedbackResource<NotificationList>(
    `/api/notifications?page=${page}&pageSize=20&unreadOnly=${unreadOnly}`,
  );
  async function mark(id?: string) {
    if (!ready || pending) return;
    setPending(true);
    setError(undefined);
    try {
      await notificationMutation(
        id ? "/api/notifications/read" : "/api/notifications/read-all",
        id ? { id } : {},
      );
      resource.reload();
    } catch (failure) {
      setError(feedbackError(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Thông báo</h1>
          {resource.data && (
            <p className="mt-2 text-sm text-slate-600">
              {resource.data.unreadCount} thông báo chưa đọc
            </p>
          )}
        </div>
        <button
          type="button"
          className={secondaryStyle}
          disabled={!ready || pending || !resource.data?.unreadCount}
          onClick={() => void mark()}
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>
      <div
        className="mt-6 flex flex-wrap items-center gap-3"
        role="group"
        aria-label="Lọc thông báo"
      >
        {[
          [false, "Tất cả"],
          [true, "Chưa đọc"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            className={unreadOnly === value ? buttonStyle : secondaryStyle}
            aria-pressed={unreadOnly === value}
            disabled={!ready || pending}
            onClick={() => {
              setUnreadOnly(Boolean(value));
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={secondaryStyle}
          disabled={!ready || resource.loading || pending}
          onClick={resource.reload}
        >
          Tải lại
        </button>
      </div>
      <Notice error message={error ?? resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-600">
          Đang tải thông báo…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 space-y-4">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-5 sm:p-6 ${item.readAt ? "border-slate-200" : "border-teal-300"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="break-words text-lg font-bold text-slate-950">
                    {item.title}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.readAt ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-800"}`}
                  >
                    {item.readAt ? "Đã đọc" : "Chưa đọc"}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {item.body}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {vietnamTime(item.createdAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {item.href && (
                    <Link className={secondaryStyle} href={item.href}>
                      Xem chi tiết
                    </Link>
                  )}
                  {!item.readAt && (
                    <button
                      type="button"
                      className={secondaryStyle}
                      disabled={!ready || pending}
                      onClick={() => void mark(item.id)}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </article>
            ))}
            {resource.data.items.length === 0 && (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Không có thông báo trong danh sách này.
              </p>
            )}
          </div>
          <Pager
            page={page}
            pageSize={resource.data.pageSize}
            total={resource.data.total}
            change={setPage}
          />
        </>
      )}
    </>
  );
}
