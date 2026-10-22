"use client";
import { useState, type FormEvent } from "react";
import { useAdminResource } from "./admin-client";
import {
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "./ui";
type AuditDTO = {
  id: string;
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string | null;
  redactedSummary: unknown;
  occurredAt: string;
};
export function AuditList() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [validation, setValidation] = useState("");
  const query = new URLSearchParams({
    ...filters,
    page: String(page),
    pageSize: "20",
  });
  const resource = useAdminResource<{ items: AuditDTO[]; total: number }>(
    `/api/admin/audit?${query}`,
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "").trim();
    const from = get("from"),
      to = get("to");
    if (from && to && from > to) {
      setValidation("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
      return;
    }
    setValidation("");
    const next: Record<string, string> = {};
    for (const name of ["action", "actorId", "objectType"])
      if (get(name)) next[name] = get(name);
    if (from) next.from = `${from}T00:00:00+07:00`;
    if (to) next.to = `${to}T23:59:59.999+07:00`;
    setFilters(next);
    setPage(1);
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-950">Nhật ký kiểm toán</h1>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Theo dõi thao tác hệ thống. Ngày và giờ hiển thị theo Việt Nam (UTC+7).
      </p>
      <form
        onSubmit={filter}
        className="mt-7 grid items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[
          ["action", "Hành động"],
          ["actorId", "ID người thực hiện"],
          ["objectType", "Loại đối tượng"],
        ].map(([name, label]) => (
          <Field key={name} id={name} label={label}>
            <input
              id={name}
              name={name}
              maxLength={100}
              className={inputStyle}
            />
          </Field>
        ))}
        <Field id="from" label="Từ ngày">
          <input id="from" name="from" type="date" className={inputStyle} />
        </Field>
        <Field id="to" label="Đến hết ngày">
          <input id="to" name="to" type="date" className={inputStyle} />
        </Field>
        <button className={secondaryStyle}>Lọc nhật ký</button>
      </form>
      <Notice message={validation || resource.error} error />
      {resource.loading && (
        <p role="status" className="py-7 text-sm text-slate-500">
          Đang tải nhật ký…
        </p>
      )}
      {resource.data && (
        <>
          <ol className="mt-6 space-y-3">
            {resource.data.items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="break-all text-sm font-bold text-teal-900">
                    {item.action}
                  </span>
                  <time
                    dateTime={item.occurredAt}
                    className="text-xs text-slate-500"
                  >
                    {vietnamTime(item.occurredAt)}
                  </time>
                </div>
                <dl className="mt-4 grid gap-3 text-xs leading-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Người thực hiện</dt>
                    <dd className="break-all font-mono text-slate-700">
                      {item.actorId ?? "Hệ thống / chưa xác thực"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Đối tượng</dt>
                    <dd className="break-all font-mono text-slate-700">
                      {item.objectType} · {item.objectId ?? "—"}
                    </dd>
                  </div>
                </dl>
                {item.redactedSummary != null && (
                  <details className="mt-3 text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold">
                      Tóm tắt đã che dữ liệu nhạy cảm
                    </summary>
                    <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3">
                      {JSON.stringify(item.redactedSummary, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
          {resource.data.items.length === 0 && (
            <p className="py-8 text-sm text-slate-500">
              Không có nhật ký phù hợp.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </div>
  );
}
