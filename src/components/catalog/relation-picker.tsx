"use client";
import { useState } from "react";
import { Field, inputStyle, Notice, Pager, secondaryStyle } from "../admin/ui";
import { useCatalogResource } from "./catalog-client";
import type { CatalogRecord } from "./types";

/** Tra cứu quan hệ theo từng trang; không tải toàn bộ danh mục vào select. */
export function RelationPicker({
  name,
  label,
  source,
  initialId = "",
  initialLabel = "",
  disabled = false,
}: {
  name: string;
  label: string;
  source: string;
  initialId?: string;
  initialLabel?: string;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState({
    id: initialId,
    label: initialLabel,
  });
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "10",
    ...(search ? { search } : {}),
  });
  const resource = useCatalogResource<{
    items: CatalogRecord[];
    total: number;
  }>(`/api/catalog/${source}?${query}`);
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4">
      <Field label={label} id={`relation-${name}`}>
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 break-words text-sm leading-6 text-slate-700">
            {selected.id ? selected.label || "Đã chọn bản ghi" : "Chưa chọn"}
          </p>
          <button
            id={`relation-${name}`}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-controls={`options-${name}`}
            className={secondaryStyle}
            onClick={() => setOpen(!open)}
          >
            {open ? "Đóng tra cứu" : "Chọn / thay đổi"}
          </button>
        </div>
      </Field>
      {open && !disabled && (
        <section
          id={`options-${name}`}
          aria-label={`Tra cứu ${label.toLowerCase()}`}
          className="mt-4 border-t border-slate-200 pt-4"
        >
          <Field
            label={`Tìm ${label.toLowerCase()} theo mã hoặc tên`}
            id={`search-${name}`}
          >
            <input
              id={`search-${name}`}
              className={inputStyle}
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Notice message={resource.error} error />
          {resource.loading && (
            <p role="status" className="mt-3 text-sm text-slate-500">
              Đang tìm…
            </p>
          )}
          {resource.data && (
            <>
              <ul className="mt-3 space-y-2">
                {resource.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`${secondaryStyle} w-full text-left break-words`}
                      onClick={() => {
                        setSelected({
                          id: item.id,
                          label: `${item.code} · ${item.name}`,
                        });
                        setOpen(false);
                      }}
                    >
                      {item.code} · {item.name}
                      {item.lockedAt ? " · Đã khóa sổ" : ""}
                      {item.isActive === false ? " · Ngừng sử dụng" : ""}
                    </button>
                  </li>
                ))}
              </ul>
              {!resource.data.items.length && (
                <p className="mt-3 text-sm text-slate-500">
                  Không tìm thấy bản ghi phù hợp.
                </p>
              )}
              <Pager
                page={page}
                pageSize={10}
                total={resource.data.total}
                change={setPage}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
