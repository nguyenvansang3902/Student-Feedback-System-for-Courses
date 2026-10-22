import { type ReactNode } from "react";
import { focusRing } from "../auth/auth-shell";
export const inputStyle = `w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:bg-slate-100 ${focusRing}`;
export const buttonStyle = `rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-50 ${focusRing}`;
export const secondaryStyle = `rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`;
export function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>}
    </div>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message?: string;
  error?: boolean;
}) {
  return message ? (
    <div
      role={error ? "alert" : "status"}
      className={`my-4 rounded-xl border p-4 text-sm leading-7 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}
    >
      {message}
    </div>
  ) : null;
}
export function Pager({
  page,
  total,
  pageSize = 20,
  change,
}: {
  page: number;
  total: number;
  pageSize?: number;
  change: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Phân trang"
      className="mt-5 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-slate-500">
        Trang {page} / {Math.max(1, Math.ceil(total / pageSize))} · {total} kết
        quả
      </p>
      <div className="flex gap-2">
        <button
          className={secondaryStyle}
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Trước
        </button>
        <button
          className={secondaryStyle}
          disabled={page * pageSize >= total}
          onClick={() => change(page + 1)}
        >
          Sau
        </button>
      </div>
    </nav>
  );
}
export function vietnamTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "medium",
      }).format(date);
}
