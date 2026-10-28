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
import { catalogRequest, useCatalogResource } from "./catalog-client";
import { RelationPicker } from "./relation-picker";
import {
  catalogLabels,
  type CatalogEntity,
  type CatalogList,
  type CatalogRecord,
} from "./types";

const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Chưa lưu được dữ liệu. Vui lòng thử lại.";
function dateLabel(value?: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function CatalogForm({
  entity,
  item,
  close,
  saved,
}: {
  entity: CatalogEntity;
  item: CatalogRecord | null;
  close: () => void;
  saved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form.entries());
    if (
      entity === "faculties" ||
      entity === "departments" ||
      entity === "courses"
    )
      data.isActive = form.get("isActive") === "on";
    if (entity === "courses") data.credits = Number(form.get("credits"));
    if (entity === "teaching") data.isLead = form.get("isLead") === "on";
    setBusy(true);
    setError(undefined);
    try {
      await catalogRequest(
        `/api/catalog/${entity}${item ? `/${encodeURIComponent(item.id)}` : ""}`,
        data,
      );
      saved();
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="catalog-form-title"
      className="mt-6 rounded-2xl border border-teal-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="catalog-form-title"
          className="text-lg font-bold text-slate-900"
        >
          {item ? "Chỉnh sửa" : "Thêm"} {catalogLabels[entity].toLowerCase()}
        </h2>
        <button
          type="button"
          disabled={busy}
          className={secondaryStyle}
          onClick={close}
        >
          Đóng biểu mẫu
        </button>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
          {entity !== "teaching" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Mã" id="catalog-code">
                <input
                  id="catalog-code"
                  name="code"
                  required
                  maxLength={32}
                  defaultValue={item?.code ?? ""}
                  className={inputStyle}
                />
              </Field>
              {entity !== "sections" && (
                <Field label="Tên" id="catalog-name">
                  <input
                    id="catalog-name"
                    name="name"
                    required
                    maxLength={160}
                    defaultValue={item?.name ?? ""}
                    className={inputStyle}
                  />
                </Field>
              )}
            </div>
          )}
          {entity === "semesters" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ngày bắt đầu" id="catalog-starts">
                <input
                  id="catalog-starts"
                  name="startsOn"
                  type="date"
                  required
                  defaultValue={item?.startsOn?.slice(0, 10) ?? ""}
                  className={inputStyle}
                />
              </Field>
              <Field label="Ngày kết thúc" id="catalog-ends">
                <input
                  id="catalog-ends"
                  name="endsOn"
                  type="date"
                  required
                  defaultValue={item?.endsOn?.slice(0, 10) ?? ""}
                  className={inputStyle}
                />
              </Field>
            </div>
          )}
          {entity === "departments" && (
            <RelationPicker
              name="facultyId"
              label="Khoa trực thuộc"
              source="faculties"
              initialId={item?.facultyId}
              initialLabel={item?.facultyName}
            />
          )}
          {entity === "courses" && (
            <>
              <RelationPicker
                name="departmentId"
                label="Bộ môn phụ trách"
                source="departments"
                initialId={item?.departmentId}
                initialLabel={item?.departmentName}
              />
              <Field
                label="Số tín chỉ"
                id="catalog-credits"
                hint="Số dương, tối đa một chữ số thập phân."
              >
                <input
                  id="catalog-credits"
                  name="credits"
                  type="number"
                  min="0.1"
                  max="999.9"
                  step="0.1"
                  required
                  defaultValue={item?.credits ?? 3}
                  className={`${inputStyle} max-w-xs`}
                />
              </Field>
            </>
          )}
          {entity === "sections" && (
            <>
              <RelationPicker
                name="semesterId"
                label="Học kỳ"
                source="semesters"
                initialId={item?.semesterId}
                initialLabel={item?.semesterName}
              />
              <RelationPicker
                name="courseId"
                label="Môn học"
                source="courses"
                initialId={item?.courseId}
                initialLabel={item?.courseName}
              />
            </>
          )}
          {entity === "teaching" && (
            <>
              <p className="text-sm leading-7 text-slate-600">
                Mỗi phân công gắn một giảng viên với một lớp học phần. Khi chỉnh
                sửa, chỉ thay đổi vai trò phụ trách; muốn đổi lớp hoặc giảng
                viên, hãy tạo phân công mới.
              </p>
              <RelationPicker
                name="sectionId"
                label="Lớp học phần"
                source="sections"
                initialId={item?.sectionId}
                initialLabel={item?.sectionCode}
                disabled={!!item}
              />
              <RelationPicker
                name="teacherId"
                label="Giảng viên"
                source="teachers"
                initialId={item?.teacherId}
                initialLabel={item?.teacherName}
                disabled={!!item}
              />
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isLead"
                  className="size-4 accent-teal-800"
                  defaultChecked={item?.isLead ?? false}
                />
                Giảng viên phụ trách chính
              </label>
            </>
          )}
          {(entity === "faculties" ||
            entity === "departments" ||
            entity === "courses") && (
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                className="size-4 accent-teal-800"
                defaultChecked={item?.isActive ?? true}
              />
              Đang sử dụng
            </label>
          )}
        </fieldset>
        <Notice message={error} error />
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className={buttonStyle}>
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={secondaryStyle}
            onClick={close}
          >
            Hủy
          </button>
        </div>
      </form>
    </section>
  );
}

function ConfirmAction({
  entity,
  item,
  action,
  close,
  saved,
}: {
  entity: CatalogEntity;
  item: CatalogRecord;
  action: "delete" | "lock" | "unlock";
  close: () => void;
  saved: (message?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      const result = await catalogRequest<{
        notification?: {
          status: string;
          sent: number;
          failed: number;
          auditRecorded: boolean;
        };
      }>(
        `/api/catalog/${entity}/${encodeURIComponent(item.id)}/${action}`,
        action !== "delete" ? { reason: String(data.get("reason") ?? "") } : {},
      );
      saved(
        action === "unlock" &&
          (result.notification?.status !== "SENT" ||
            !result.notification.auditRecorded)
          ? "Đã mở khóa học kỳ. Thông báo ĐBCL chưa hoàn tất; cần kiểm tra email và biên nhận thông báo trước khi tiếp tục cập nhật dữ liệu."
          : action === "unlock"
            ? "Đã mở khóa học kỳ và gửi thông báo đến cán bộ Đảm bảo chất lượng."
            : undefined,
      );
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="confirm-catalog-title"
      className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6"
    >
      <h2
        id="confirm-catalog-title"
        className="text-lg font-bold text-slate-950"
      >
        {action === "lock"
          ? "Khóa sổ học kỳ"
          : action === "unlock"
            ? "Mở khóa học kỳ"
            : "Xác nhận xóa"}
        : {item.code}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {action === "lock"
          ? "Sau khi khóa sổ, dữ liệu của học kỳ chỉ được xem. Hãy kiểm tra danh mục và đăng ký học trước khi xác nhận. Chỉ Phòng Đào tạo được mở khóa kèm lý do."
          : action === "unlock"
            ? "Dữ liệu đào tạo sẽ được phép cập nhật trở lại. Hệ thống ghi nhật ký và gửi email cho cán bộ Đảm bảo chất lượng để kiểm tra tác động đến khảo sát."
            : "Thao tác xóa không thể hoàn tác. Bản ghi đang được tham chiếu hoặc thuộc học kỳ đã khóa sẽ bị từ chối; với khoa, bộ môn hoặc môn học, có thể chọn ngừng sử dụng khi cần giữ lịch sử."}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {action !== "delete" && (
          <Field
            label={action === "unlock" ? "Lý do mở khóa" : "Lý do khóa sổ"}
            id="lock-reason"
            hint="Từ 10 đến 500 ký tự. Chỉ nhập lý do nghiệp vụ, không nhập thông tin nhạy cảm."
          >
            <textarea
              id="lock-reason"
              name="reason"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              className={inputStyle}
              disabled={busy}
            />
          </Field>
        )}
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
          <input
            required
            type="checkbox"
            disabled={busy}
            className="mt-1 size-4 shrink-0 accent-teal-800"
          />
          Tôi đã kiểm tra đúng bản ghi và xác nhận thực hiện thao tác này.
        </label>
        <Notice message={error} error />
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className={buttonStyle}>
            {busy
              ? "Đang xử lý…"
              : action === "lock"
                ? "Xác nhận khóa sổ"
                : action === "unlock"
                  ? "Xác nhận mở khóa"
                  : "Xác nhận xóa bản ghi"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={secondaryStyle}
            onClick={close}
          >
            Hủy
          </button>
        </div>
      </form>
    </section>
  );
}

function RecordDetails({
  entity,
  item,
}: {
  entity: CatalogEntity;
  item: CatalogRecord;
}) {
  return (
    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
      {entity === "semesters" && (
        <p>
          {dateLabel(item.startsOn)} – {dateLabel(item.endsOn)}
        </p>
      )}
      {item.facultyName && <p>Khoa: {item.facultyName}</p>}
      {item.departmentName && <p>Bộ môn: {item.departmentName}</p>}
      {item.courseName && (
        <p>
          Môn học: {item.courseCode} · {item.courseName}
        </p>
      )}
      {item.semesterName && <p>Học kỳ: {item.semesterName}</p>}
      {entity === "teaching" && (
        <>
          <p>Lớp: {item.sectionCode}</p>
          <p>
            Giảng viên: {item.teacherCode} · {item.teacherName}
          </p>
          <p>{item.isLead ? "Phụ trách chính" : "Cùng giảng dạy"}</p>
        </>
      )}
      {item.credits !== undefined && <p>{item.credits} tín chỉ</p>}
    </div>
  );
}

export function CatalogPanel({
  entity,
  writable,
}: {
  entity: CatalogEntity;
  writable: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ item: CatalogRecord | null } | null>(null);
  const [confirm, setConfirm] = useState<{
    item: CatalogRecord;
    action: "delete" | "lock" | "unlock";
  } | null>(null);
  const [message, setMessage] = useState<string>();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
  });
  const resource = useCatalogResource<CatalogList>(
    `/api/catalog/${entity}?${query}`,
  );
  function done(message?: string) {
    setForm(null);
    setConfirm(null);
    setMessage(message ?? "Đã lưu thay đổi. Danh sách đang được cập nhật.");
    resource.reload();
  }
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(
      String(new FormData(event.currentTarget).get("search") ?? "").trim(),
    );
    setPage(1);
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-teal-800 uppercase">
            Danh mục đào tạo
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {catalogLabels[entity]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Quản lý dữ liệu nền cho khảo sát và phản hồi môn học. Dữ liệu thuộc
            học kỳ đã khóa sổ được giữ ở chế độ chỉ đọc.
          </p>
        </div>
        {writable && (
          <button
            type="button"
            className={buttonStyle}
            onClick={() => {
              setForm({ item: null });
              setConfirm(null);
              setMessage(undefined);
            }}
          >
            + Thêm {catalogLabels[entity].toLowerCase()}
          </button>
        )}
      </div>
      <Notice message={message} />
      {!writable && (
        <p className="mt-4 text-sm text-slate-600">
          Bạn đang xem danh mục ở chế độ chỉ đọc.
        </p>
      )}
      {writable && form && (
        <CatalogForm
          key={`${entity}:${form.item?.id ?? "new"}`}
          entity={entity}
          item={form.item}
          close={() => setForm(null)}
          saved={done}
        />
      )}
      {writable && confirm && (
        <ConfirmAction
          key={`${confirm.action}:${confirm.item.id}`}
          entity={entity}
          item={confirm.item}
          action={confirm.action}
          close={() => setConfirm(null)}
          saved={done}
        />
      )}
      <form
        onSubmit={filter}
        className="mt-7 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-56">
          <Field label="Tìm theo mã hoặc tên" id="catalog-search">
            <input
              id="catalog-search"
              name="search"
              className={inputStyle}
              maxLength={100}
            />
          </Field>
        </div>
        <button className={secondaryStyle}>Tìm kiếm</button>
      </form>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải danh mục…
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all text-xs font-bold text-teal-800">
                    {item.code}
                  </p>
                  {item.lockedAt ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      Đã khóa sổ
                    </span>
                  ) : item.isActive === false ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      Ngừng sử dụng
                    </span>
                  ) : entity === "semesters" ? (
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">
                      Đang mở
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-base font-bold break-words text-slate-900">
                  {item.name}
                </h2>
                <RecordDetails entity={entity} item={item} />
                {writable && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!!item.lockedAt}
                      className={secondaryStyle}
                      onClick={() => {
                        setForm({ item });
                        setConfirm(null);
                        setMessage(undefined);
                      }}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      disabled={!!item.lockedAt}
                      className={secondaryStyle}
                      onClick={() => {
                        setConfirm({ item, action: "delete" });
                        setForm(null);
                        setMessage(undefined);
                      }}
                    >
                      Xóa
                    </button>
                    {entity === "semesters" && (
                      <button
                        type="button"
                        className={secondaryStyle}
                        onClick={() => {
                          setConfirm({
                            item,
                            action: item.lockedAt ? "unlock" : "lock",
                          });
                          setForm(null);
                          setMessage(undefined);
                        }}
                      >
                        {item.lockedAt ? "Mở khóa" : "Khóa sổ"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-500">
              Chưa có bản ghi phù hợp. Bạn có thể thêm mới hoặc điều chỉnh từ
              khóa tìm kiếm.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </div>
  );
}
