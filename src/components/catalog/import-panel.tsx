"use client";
import { useState, type FormEvent } from "react";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
} from "../admin/ui";
import {
  catalogFetch,
  catalogRequest,
  CatalogRequestError,
} from "./catalog-client";

type ImportKind = "students" | "teachers" | "sections" | "enrollments";
type Preview = {
  kind: ImportKind;
  fileName: string;
  rowCount: number;
  validRows: number;
  errors: { row: number; column: string; code: string; message: string }[];
  sample: { row: number; values: Record<string, string> }[];
  previewToken: string | null;
  expiresAt: string | null;
};
const labels: Record<ImportKind, string> = {
  students: "Sinh viên",
  teachers: "Giảng viên",
  sections: "Lớp học phần",
  enrollments: "Đăng ký học phần",
};
const headers: Record<ImportKind, string[]> = {
  students: ["loginCode", "email", "displayName"],
  teachers: ["loginCode", "email", "displayName"],
  sections: ["code", "courseCode", "semesterCode"],
  enrollments: ["semesterCode", "sectionCode", "studentCode"],
};
const errorOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Chưa xử lý được tệp. Vui lòng thử lại.";

export function ImportPanel() {
  const [kind, setKind] = useState<ImportKind>("students");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  function reset() {
    setPreview(null);
    setPage(1);
    setError(undefined);
    setMessage(undefined);
  }
  function data() {
    if (!file) throw new Error("Hãy chọn tệp để chạy thử.");
    const result = new FormData();
    result.set("file", file);
    return result;
  }
  async function runPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    setPreview(null);
    setPage(1);
    try {
      setPreview(
        await catalogRequest<Preview>(
          `/api/catalog/import/${kind}/preview`,
          data(),
        ),
      );
    } catch (error) {
      setError(errorOf(error));
    } finally {
      setBusy(false);
    }
  }
  async function commit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview?.previewToken) return;
    setBusy(true);
    setError(undefined);
    try {
      const form = data();
      form.set("previewToken", preview.previewToken);
      const result = await catalogRequest<{
        created: number;
        activation: { sent: number; failed: number; revocationPending?: number };
      }>(`/api/catalog/import/${kind}/commit`, form);
      setPreview(null);
      setMessage(
        `Đã nhập ${result.created} bản ghi. ${kind === "students" || kind === "teachers" ? `Tài khoản ở trạng thái chờ kích hoạt. Đã gửi ${result.activation.sent} email kích hoạt${result.activation.failed ? `; ${result.activation.failed} email chưa gửi được. Người dùng có thể yêu cầu lại tại trang Kích hoạt tài khoản` : ""}.${result.activation.revocationPending ? ` Có ${result.activation.revocationPending} liên kết chưa thu hồi được; liên kết vẫn tự hết hạn. Hãy liên hệ quản trị viên và yêu cầu liên kết mới tại trang kích hoạt.` : ""}` : "Dữ liệu danh mục đã được cập nhật."}`,
      );
    } catch (error) {
      setError(errorOf(error));
      if (error instanceof CatalogRequestError && error.errors.length) {
        const invalidRows = new Set(error.errors.map((issue) => issue.row));
        setPreview({
          ...preview,
          errors: error.errors,
          previewToken: null,
          expiresAt: null,
          validRows: Math.max(0, preview.rowCount - invalidRows.size),
        });
        setPage(1);
      } else setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "csv" | "xlsx") {
    setBusy(true);
    setError(undefined);
    try {
      const response = await catalogFetch(
        `/api/catalog/import/${kind}/template?format=${format}`,
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message ?? "Chưa tải được tệp mẫu.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mau-${kind}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(errorOf(error));
    } finally {
      setBusy(false);
    }
  }
  const columns = preview?.sample[0]
    ? Object.keys(preview.sample[0].values)
    : [];
  return (
    <div>
      <p className="text-xs font-bold tracking-wider text-teal-800 uppercase">
        Danh mục đào tạo
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">
        Nhập dữ liệu từ tệp
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Tải mẫu, điền dữ liệu, rồi chạy thử để kiểm tra từng dòng. Chỉ khi tệp
        hoàn toàn hợp lệ mới có thể xác nhận ghi toàn bộ dữ liệu.
      </p>
      <ol
        className="mt-7 grid gap-3 sm:grid-cols-3"
        aria-label="Các bước nhập dữ liệu"
      >
        {[
          "1. Chọn loại và tải mẫu",
          "2. Chạy thử, sửa lỗi",
          "3. Xác nhận ghi dữ liệu",
        ].map((label) => (
          <li
            key={label}
            className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm font-semibold text-teal-900"
          >
            {label}
          </li>
        ))}
      </ol>
      <section
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        aria-labelledby="import-file-title"
      >
        <h2 id="import-file-title" className="text-lg font-bold text-slate-900">
          Chuẩn bị tệp
        </h2>
        <form onSubmit={runPreview} className="mt-5 space-y-5">
          <Field label="Loại dữ liệu" id="import-kind">
            <select
              id="import-kind"
              disabled={busy}
              value={kind}
              className={`${inputStyle} max-w-md`}
              onChange={(event) => {
                setKind(event.target.value as ImportKind);
                setFile(null);
                reset();
              }}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryStyle}
              disabled={busy}
              onClick={() => void download("xlsx")}
            >
              Tải mẫu Excel (.xlsx)
            </button>
            <button
              type="button"
              className={secondaryStyle}
              disabled={busy}
              onClick={() => void download("csv")}
            >
              Tải mẫu CSV
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            <p>
              Giữ nguyên các cột:{" "}
              <span className="font-semibold break-words text-slate-800">
                {headers[kind].join(", ")}
              </span>
              .
            </p>
            <p>Thay dòng ví dụ trong mẫu bằng dữ liệu cần nhập. Các mã môn học, học kỳ, lớp và sinh viên phải khớp dữ liệu đã có trong hệ thống.</p>
            <p>
              Tệp .xlsx hoặc CSV UTF-8, tối đa 2 MiB và{" "}
              {kind === "students" || kind === "teachers" ? "500" : "2.000"}{" "}
              dòng dữ liệu. Mỗi tệp chỉ chứa một loại dữ liệu; không dùng công
              thức trong ô.
            </p>
            <p className="mt-2">
              {kind === "students" || kind === "teachers"
                ? "Tài khoản mới sẽ chờ kích hoạt qua email. Tệp không chứa mật khẩu và không được cấp vai trò quản trị."
                : kind === "sections"
                  ? "Môn học và học kỳ phải có sẵn. Không nhập vào học kỳ đã khóa sổ."
                  : "Sinh viên, học kỳ và lớp học phần phải có sẵn. Không nhập đăng ký trùng hoặc vào học kỳ đã khóa sổ."}
            </p>
          </div>
          <Field label="Chọn tệp dữ liệu" id="import-file">
            <input
              key={kind}
              id="import-file"
              type="file"
              accept=".csv,.xlsx"
              required
              disabled={busy}
              className={`${inputStyle} file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-900`}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                reset();
              }}
            />
          </Field>
          <button disabled={busy || !file} className={buttonStyle}>
            {busy ? "Đang xử lý…" : "Chạy thử và kiểm tra tệp"}
          </button>
        </form>
      </section>
      <Notice message={error} error />
      <Notice message={message} />
      {preview && (
        <section
          aria-labelledby="preview-title"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2 id="preview-title" className="text-xl font-bold text-slate-900">
            Kết quả chạy thử
          </h2>
          <p className="mt-2 text-sm break-all text-slate-500">
            {preview.fileName} · {labels[preview.kind]}
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Tổng dòng dữ liệu", preview.rowCount],
              ["Dòng hợp lệ", preview.validRows],
              ["Lỗi cần sửa", preview.errors.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-2 text-2xl font-bold text-slate-950">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {preview.errors.length > 0 ? (
            <div className="mt-5">
              <Notice
                message="Chưa ghi dữ liệu. Hãy sửa các lỗi bên dưới trong tệp gốc rồi chọn lại tệp và chạy thử lần nữa."
                error
              />
              <h3 className="font-bold text-slate-900">Lỗi theo dòng</h3>
              <ul className="mt-3 space-y-3">
                {preview.errors
                  .slice((page - 1) * 20, page * 20)
                  .map((issue, index) => (
                    <li
                      key={`${issue.row}:${issue.column}:${index}`}
                      className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-900"
                    >
                      <strong>
                        Dòng {issue.row}
                        {issue.column ? ` · ${issue.column}` : ""}
                      </strong>
                      <p>{issue.message}</p>
                    </li>
                  ))}
              </ul>
              <Pager
                page={page}
                total={preview.errors.length}
                change={setPage}
              />
            </div>
          ) : (
            <Notice message="Tệp hợp lệ ở thời điểm chạy thử. Chưa có dữ liệu nào được ghi. Hệ thống sẽ kiểm tra lại khi xác nhận." />
          )}
          {preview.sample.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-slate-900">
                Một số dòng được đọc từ tệp
              </h3>
              <div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Dữ liệu mẫu để đối chiếu trước khi nhập
                  </caption>
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Dòng
                      </th>
                      {columns.map((column) => (
                        <th key={column} scope="col" className="px-4 py-3">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row) => (
                      <tr key={row.row} className="border-t border-slate-200">
                        <th scope="row" className="px-4 py-3 font-medium">
                          {row.row}
                        </th>
                        {columns.map((column) => (
                          <td
                            key={column}
                            className="max-w-sm px-4 py-3 break-words text-slate-600"
                          >
                            {row.values[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {preview.previewToken && preview.errors.length === 0 && (
            <form
              onSubmit={commit}
              className="mt-6 space-y-4 border-t border-slate-200 pt-5"
            >
              <p className="text-sm leading-7 text-slate-600">
                {preview.expiresAt
                  ? `Kết quả chạy thử có hiệu lực đến ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(preview.expiresAt))}. `
                  : ""}
                Cần chạy thử lại nếu dữ liệu nền thay đổi hoặc xác nhận hết hạn.
              </p>
              <label className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                <input
                  type="checkbox"
                  required
                  disabled={busy}
                  className="mt-1.5 size-4 shrink-0 accent-teal-800"
                />
                Tôi đã đối chiếu tệp và xác nhận nhập toàn bộ {preview.rowCount}{" "}
                dòng dữ liệu.
              </label>
              <button disabled={busy} className={buttonStyle}>
                {busy
                  ? "Đang ghi dữ liệu…"
                  : `Xác nhận nhập ${preview.rowCount} dòng`}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
