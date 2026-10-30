"use client";
import { useId, useState, type FormEvent } from "react";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
} from "../admin/ui";
import { useCampaignResource, messageOf } from "./campaign-client";
import {
  scopeLabels,
  vietnamInput,
  vietnamIso,
  type CampaignDetail,
  type CampaignInput,
  type CampaignOption,
  type SurveyDefaults,
} from "./types";

interface Options {
  items: CampaignOption[];
  total: number;
  page: number;
  pageSize: number;
}
function OptionPicker({
  kind,
  label,
  value,
  change,
  initialLabel,
}: {
  kind: "semesters" | "templates" | "faculties" | "departments";
  label: string;
  value: string;
  change: (id: string) => void;
  initialLabel?: string;
}) {
  const id = useId();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{ id: string; label: string }>();
  const query = new URLSearchParams({
    kind,
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
  });
  const resource = useCampaignResource<Options>(
    `/api/campaigns/options?${query}`,
  );
  const options = resource.data?.items ?? [];
  return (
    <section className="min-w-0" aria-label={label}>
      <Field label={label} id={id}>
        <select
          id={id}
          className={inputStyle}
          value={value}
          onChange={(event) => {
            setSelection({
              id: event.target.value,
              label:
                event.target.selectedOptions[0]?.textContent ?? "Mục đang chọn",
            });
            change(event.target.value);
          }}
          required
        >
          <option value="">Chọn {label.toLowerCase()}</option>
          {value && !options.some((option) => option.id === value) && (
            <option value={value}>
              {selection?.id === value
                ? selection.label
                : (initialLabel ?? "Mục đang chọn")}
            </option>
          )}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.code ? `${option.code} · ` : ""}
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <label
        htmlFor={`${id}-search`}
        className="mt-3 block text-xs font-medium text-slate-500"
      >
        Tìm {label.toLowerCase()}
      </label>
      <input
        id={`${id}-search`}
        className={`${inputStyle} mt-1`}
        type="search"
        value={search}
        maxLength={100}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {resource.loading && (
        <p role="status" className="mt-2 text-xs text-slate-500">
          Đang tải danh sách…
        </p>
      )}
      <Notice message={resource.error} error />
      {(resource.data?.total ?? 0) > 20 && (
        <Pager page={page} total={resource.data!.total} change={setPage} />
      )}
    </section>
  );
}

function SectionPicker({
  semesterId,
  selected,
  change,
}: {
  semesterId: string;
  selected: string[];
  change: (ids: string[]) => void;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const query = new URLSearchParams({
    kind: "sections",
    semesterId,
    page: String(page),
    pageSize: "20",
    ...(search ? { search } : {}),
  });
  const resource = useCampaignResource<Options>(
    semesterId ? `/api/campaigns/options?${query}` : null,
  );
  return (
    <section
      aria-labelledby="campaign-sections-title"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="campaign-sections-title"
          className="font-semibold text-slate-900"
        >
          Chọn lớp học phần{" "}
          <span className="text-sm font-normal text-slate-500">
            ({selected.length}/1.000)
          </span>
        </h3>
        <button
          type="button"
          className={secondaryStyle}
          disabled={!selected.length}
          onClick={() => change([])}
        >
          Bỏ chọn tất cả
        </button>
      </div>
      {!semesterId ? (
        <p className="mt-3 text-sm text-slate-600">
          Chọn học kỳ trước khi chọn các lớp.
        </p>
      ) : (
        <>
          <label
            className="mt-4 block text-sm font-medium text-slate-700"
            htmlFor="campaign-section-search"
          >
            Tìm lớp trong học kỳ đã chọn
          </label>
          <input
            id="campaign-section-search"
            className={`${inputStyle} mt-2`}
            type="search"
            value={search}
            maxLength={100}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Lựa chọn được giữ khi đổi trang hoặc tìm kiếm. Đợt sẽ áp dụng cho
            đúng các lớp đã chọn.
          </p>
          {resource.loading && (
            <p role="status" className="mt-3 text-sm text-slate-500">
              Đang tải lớp học phần…
            </p>
          )}
          <Notice message={resource.error} error />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {resource.data?.items.map((option) => (
              <label
                key={option.id}
                className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-teal-800"
                  checked={selected.includes(option.id)}
                  disabled={
                    !selected.includes(option.id) && selected.length >= 1000
                  }
                  onChange={(event) =>
                    change(
                      event.target.checked
                        ? [...selected, option.id]
                        : selected.filter((id) => id !== option.id),
                    )
                  }
                />
                <span className="min-w-0 break-words">
                  <strong className="block text-slate-900">
                    {option.code}
                  </strong>
                  {option.name}
                </span>
              </label>
            ))}
          </div>
          {resource.data && !resource.data.items.length && (
            <p className="mt-3 text-sm text-slate-500">Không có lớp phù hợp.</p>
          )}
          {resource.data && (
            <Pager page={page} total={resource.data.total} change={setPage} />
          )}
        </>
      )}
    </section>
  );
}

export function CampaignForm({
  initial,
  defaults,
  busy,
  onSave,
  onDirtyChange,
}: {
  initial?: CampaignDetail;
  defaults: SurveyDefaults;
  busy: boolean;
  onSave: (input: CampaignInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [scope, setScope] = useState<CampaignInput["scope"]>(
    initial?.scope ?? "GLOBAL",
  );
  const [semesterId, setSemesterId] = useState(initial?.semesterId ?? ""),
    [templateId, setTemplateId] = useState(initial?.templateId ?? "");
  const [facultyId, setFacultyId] = useState(initial?.facultyId ?? ""),
    [departmentId, setDepartmentId] = useState(initial?.departmentId ?? "");
  const [sectionIds, setSectionIds] = useState<string[]>(
      initial?.sectionIds ?? [],
    ),
    [error, setError] = useState<string>();
  const [start] = useState(
    () => initial?.startsAt ?? new Date(Date.now() + 86_400_000).toISOString(),
  );
  const [end] = useState(
    () =>
      initial?.endsAt ?? new Date(Date.now() + 8 * 86_400_000).toISOString(),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    try {
      await onSave({
        title: String(data.get("title") ?? "").trim(),
        semesterId,
        templateId,
        scope,
        facultyId: scope === "FACULTY" ? facultyId : null,
        departmentId: scope === "DEPARTMENT" ? departmentId : null,
        sectionIds: scope === "SECTIONS" ? sectionIds : [],
        startsAt: vietnamIso(String(data.get("startsAt") ?? "")),
        endsAt: vietnamIso(String(data.get("endsAt") ?? "")),
        minResponses: Number(data.get("minResponses")),
        minRate: Number(data.get("minRate")) / 100,
        warningScore: Number(data.get("warningScore")),
        explanationDays: Number(data.get("explanationDays")),
        mandatory: data.get("mandatory") === "on",
      });
      onDirtyChange?.(false);
    } catch (problem) {
      setError(messageOf(problem));
    }
  }
  return (
    <form
      onSubmit={submit}
      onChange={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement && target.type === "search"))
          onDirtyChange?.(true);
      }}
      className="space-y-6"
    >
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Thông tin đợt khảo sát
          </h2>
          <div className="mt-5">
            <Field label="Tên đợt khảo sát" id="campaign-title">
              <input
                id="campaign-title"
                name="title"
                className={inputStyle}
                defaultValue={initial?.title ?? ""}
                required
                maxLength={200}
              />
            </Field>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <OptionPicker
              kind="semesters"
              label="Học kỳ"
              value={semesterId}
              initialLabel={
                initial
                  ? `${initial.semesterCode} · ${initial.semesterName}`
                  : undefined
              }
              change={(value) => {
                setSemesterId(value);
                setSectionIds([]);
              }}
            />
            <OptionPicker
              kind="templates"
              label="Mẫu phiếu"
              value={templateId}
              initialLabel={
                initial
                  ? `${initial.templateName} · phiên bản ${initial.templateVersion}`
                  : undefined
              }
              change={setTemplateId}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Phạm vi và thời gian
          </h2>
          <div className="mt-5 max-w-xl">
            <Field
              label="Phạm vi khảo sát"
              id="campaign-scope"
              hint="Phạm vi toàn trường, khoa hoặc bộ môn dùng dữ liệu đăng ký hiện tại khi mở đợt. Danh sách lớp giữ đúng các lớp được chọn."
            >
              <select
                id="campaign-scope"
                className={inputStyle}
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as CampaignInput["scope"])
                }
              >
                {Object.entries(scopeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-5">
            {scope === "FACULTY" && (
              <OptionPicker
                kind="faculties"
                label="Khoa"
                value={facultyId}
                initialLabel={initial?.facultyName ?? undefined}
                change={setFacultyId}
              />
            )}
            {scope === "DEPARTMENT" && (
              <OptionPicker
                kind="departments"
                label="Bộ môn"
                value={departmentId}
                initialLabel={initial?.departmentName ?? undefined}
                change={setDepartmentId}
              />
            )}
            {scope === "SECTIONS" && (
              <SectionPicker
                key={semesterId}
                semesterId={semesterId}
                selected={sectionIds}
                change={(ids) => {
                  setSectionIds(ids);
                  onDirtyChange?.(true);
                }}
              />
            )}
          </div>
          <p className="mt-5 text-xs font-semibold text-teal-800">
            Các thời điểm dưới đây theo giờ Việt Nam (UTC+7).
          </p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <Field label="Bắt đầu" id="campaign-start">
              <input
                className={inputStyle}
                id="campaign-start"
                name="startsAt"
                type="datetime-local"
                defaultValue={vietnamInput(start)}
                required
              />
            </Field>
            <Field label="Kết thúc" id="campaign-end">
              <input
                className={inputStyle}
                id="campaign-end"
                name="endsAt"
                type="datetime-local"
                defaultValue={vietnamInput(end)}
                required
              />
            </Field>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Ngưỡng của đợt</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Giá trị mặc định lấy từ cấu hình hệ thống. Việc công bố và xử lý kết
            quả thực hiện ở giai đoạn sau.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field
              label="Số phiếu tối thiểu để công bố"
              id="campaign-min-responses"
            >
              <input
                id="campaign-min-responses"
                name="minResponses"
                className={inputStyle}
                type="number"
                min={1}
                max={10000}
                step={1}
                defaultValue={initial?.minResponses ?? defaults.minResponses}
                required
              />
            </Field>
            <Field label="Tỷ lệ tham gia tối thiểu (%)" id="campaign-min-rate">
              <input
                id="campaign-min-rate"
                name="minRate"
                className={inputStyle}
                type="number"
                min={0}
                max={100}
                step={0.01}
                defaultValue={Number(
                  ((initial?.minRate ?? defaults.minRate) * 100).toFixed(2),
                )}
                required
              />
            </Field>
            <Field label="Ngưỡng điểm cảnh báo cải tiến" id="campaign-warning">
              <input
                id="campaign-warning"
                name="warningScore"
                className={inputStyle}
                type="number"
                min={1}
                max={5}
                step={0.01}
                defaultValue={initial?.warningScore ?? defaults.warningScore}
                required
              />
            </Field>
            <Field label="Thời hạn giải trình (ngày)" id="campaign-explanation">
              <input
                id="campaign-explanation"
                name="explanationDays"
                className={inputStyle}
                type="number"
                min={1}
                max={365}
                step={1}
                defaultValue={
                  initial?.explanationDays ?? defaults.explanationDays
                }
                required
              />
            </Field>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm leading-7 text-slate-700">
            <input
              className="mt-1.5 size-4 shrink-0 accent-teal-800"
              type="checkbox"
              name="mandatory"
              defaultChecked={initial?.mandatory ?? false}
            />
            Đánh dấu đợt khảo sát cần hoàn thành
          </label>
        </section>
      </fieldset>
      <Notice message={error} error />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className={buttonStyle}>
          {busy
            ? "Đang lưu…"
            : initial
              ? "Lưu thay đổi bản nháp"
              : "Tạo bản nháp"}
        </button>
        <p className="text-xs leading-6 text-slate-500">
          Sau khi lưu, ĐBCL trình PĐT xác nhận dữ liệu rồi lãnh đạo phê duyệt.
        </p>
      </div>
    </form>
  );
}
