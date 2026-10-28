"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
} from "../admin/ui";
import { templateRequest, useTemplatesResource } from "./template-client";
import { messageOf, type TemplateDetail, type TemplateSummary } from "./types";

export function TemplateList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  const resource = useTemplatesResource<{
    items: TemplateSummary[];
    total: number;
  }>(`/api/templates?${query}`);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSearch(String(data.get("search") ?? "").trim());
    setStatus(String(data.get("status") ?? ""));
    setPage(1);
  }
  async function handleDefault() {
    setBusy(true);
    setError(undefined);
    try {
      const data = await templateRequest<{ items: TemplateSummary[] }>(
        "/api/templates?isDefault=true&pageSize=1",
      );
      const template = data.items[0];
      if (!template)
        throw new Error(
          "Chưa có mẫu mặc định. Hãy chọn một mẫu đã khóa làm mặc định hoặc chạy dữ liệu demo theo README.",
        );
      const created = await templateRequest<{ item: TemplateDetail }>(
        `/api/templates/${template.id}/clone`,
        { expectedRevision: template.revision },
      );
      router.push(`/mau-phieu/${created.item.id}`);
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold tracking-wider text-teal-800 uppercase">
            Thiết kế khảo sát
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Mẫu phiếu khảo sát
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Soạn nhóm tiêu chí, câu hỏi và trọng số. Giữ nguyên mẫu đã khóa bằng
            cách tạo phiên bản mới khi cần chỉnh sửa.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/mau-phieu/moi" className={buttonStyle}>
            + Tạo mẫu phiếu
          </Link>
          <button
            type="button"
            disabled={busy}
            className={secondaryStyle}
            onClick={() => void handleDefault()}
          >
            {busy ? "Đang tạo…" : "Dùng mẫu mặc định"}
          </button>
        </div>
      </div>
      <Notice message={error} error />
      <form
        onSubmit={filter}
        className="mt-7 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-56">
          <Field label="Tìm tên mẫu phiếu" id="template-search">
            <input
              id="template-search"
              name="search"
              maxLength={100}
              className={inputStyle}
            />
          </Field>
        </div>
        <div className="min-w-0 basis-44">
          <Field label="Trạng thái" id="template-status">
            <select id="template-status" name="status" className={inputStyle}>
              <option value="">Tất cả</option>
              <option value="NHAP">Bản nháp</option>
              <option value="DA_KHOA">Đã khóa</option>
            </select>
          </Field>
        </div>
        <button className={secondaryStyle}>Tìm kiếm</button>
      </form>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải mẫu phiếu…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "DA_KHOA" ? "bg-amber-100 text-amber-900" : "bg-teal-50 text-teal-800"}`}
                  >
                    {item.status === "DA_KHOA" ? "Đã khóa" : "Bản nháp"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    Phiên bản {item.version}
                  </span>
                  {item.isDefault && (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">
                      Mặc định
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-bold break-words text-slate-950">
                  {item.name}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.groupCount} nhóm tiêu chí · {item.questionCount} câu hỏi
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/mau-phieu/${item.id}`}
                    className={secondaryStyle}
                  >
                    {item.status === "DA_KHOA"
                      ? "Xem chi tiết"
                      : "Mở trình soạn"}
                  </Link>
                  <Link
                    href={`/mau-phieu/${item.id}/xem-truoc`}
                    className={secondaryStyle}
                  >
                    Xem trước
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {resource.data.items.length === 0 && (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
              Chưa có mẫu phiếu phù hợp. Hãy tạo mới hoặc điều chỉnh tìm kiếm.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </div>
  );
}
