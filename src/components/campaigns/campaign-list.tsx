"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  buttonStyle,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useCampaignResource } from "./campaign-client";
import {
  CampaignStatus,
  scopeLabels,
  statusLabels,
  type CampaignSummary,
} from "./types";

export function CampaignList({ canCreate }: { canCreate: boolean }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  const resource = useCampaignResource<{
    items: CampaignSummary[];
    total: number;
  }>(`/api/campaigns?${query}`);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSearch(String(data.get("search") ?? "").trim());
    setStatus(String(data.get("status") ?? ""));
    setPage(1);
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            Tổ chức khảo sát
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Đợt khảo sát môn học
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Lập đợt, xác nhận dữ liệu đào tạo và phê duyệt trước khi mở khảo
            sát. Chọn một đợt để xem lịch và các bước cần thực hiện.
          </p>
        </div>
        {canCreate && (
          <Link href="/dot-khao-sat/moi" className={buttonStyle}>
            Tạo đợt khảo sát
          </Link>
        )}
      </div>
      <form
        onSubmit={filter}
        className="mt-7 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-52">
          <label
            htmlFor="campaign-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tìm tên đợt
          </label>
          <input
            id="campaign-search"
            name="search"
            type="search"
            className={inputStyle}
            maxLength={100}
            placeholder="Nhập tên đợt khảo sát"
          />
        </div>
        <div className="min-w-0 flex-1 basis-52">
          <label
            htmlFor="campaign-status"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Trạng thái
          </label>
          <select id="campaign-status" name="status" className={inputStyle}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button className={secondaryStyle} type="submit">
          Lọc danh sách
        </button>
      </form>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-10 text-sm text-slate-500">
          Đang tải các đợt khảo sát…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 grid gap-4">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      {item.semesterCode} · {scopeLabels[item.scope]}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-bold text-slate-950">
                      <Link
                        href={`/dot-khao-sat/${item.id}`}
                        className="rounded hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                      >
                        {item.title}
                      </Link>
                    </h2>
                  </div>
                  <CampaignStatus status={item.status} />
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">
                      Bắt đầu · giờ Việt Nam
                    </dt>
                    <dd className="mt-1.5 font-medium text-slate-700">
                      {vietnamTime(item.startsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      Kết thúc · giờ Việt Nam
                    </dt>
                    <dd className="mt-1.5 font-medium text-slate-700">
                      {vietnamTime(item.endsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Mẫu phiếu</dt>
                    <dd className="mt-1.5 break-words text-slate-700">
                      {item.templateName} · v{item.templateVersion}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs leading-6 text-slate-500">
                    {item.sectionCount} lớp trong phạm vi
                    {item.semesterLocked ? " · Học kỳ đã khóa sổ" : ""}
                  </p>
                  <Link
                    className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                    href={`/dot-khao-sat/${item.id}`}
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="font-bold text-slate-800">
                Chưa có đợt khảo sát phù hợp
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Thử đổi bộ lọc
                {canCreate
                  ? " hoặc tạo bản nháp mới."
                  : ". Các đợt cần bạn xử lý sẽ xuất hiện tại đây."}
              </p>
            </div>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
