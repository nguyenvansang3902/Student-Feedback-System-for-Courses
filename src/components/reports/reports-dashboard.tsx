"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  ReportsDashboard,
  ReportsOptions,
} from "@/server/services/reports-types";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { roleLabels } from "../auth/destination";
import { useClientReady } from "../auth/use-client-ready";
import {
  buildReportQuery,
  changeReportFilter,
  normalizedReportFilters,
  prepareReportDownload,
  reportError,
  saveReportDownload,
  useReportsResource,
  type ReportDownloadFormat,
  type ReportFilterDraft,
} from "./reports-client";
import { ReportSectionView } from "./report-view";

function ScopeSelect({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { id: string; name: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} id={id}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className={inputStyle}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Tất cả {label.toLocaleLowerCase("vi")}</option>
        {value && !options.some((option) => option.id === value) && (
          <option value={value}>Đang tải lựa chọn…</option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
function filterDescription(
  filters: ReportFilterDraft,
  options: ReportsOptions,
) {
  const entries = [
    filters.semesterId
      ? (options.semesters.find((row) => row.id === filters.semesterId)?.name ??
        "Học kỳ đã chọn")
      : "Tất cả học kỳ",
    filters.campaignId
      ? (options.campaigns.find((row) => row.id === filters.campaignId)
          ?.title ?? "Đợt đã chọn")
      : "Tất cả đợt trong phạm vi",
    filters.facultyId
      ? options.faculties.find((row) => row.id === filters.facultyId)?.name
      : null,
    filters.departmentId
      ? options.departments.find((row) => row.id === filters.departmentId)?.name
      : null,
    filters.courseId
      ? options.courses.find((row) => row.id === filters.courseId)?.name
      : null,
  ];
  return entries.filter((entry): entry is string => !!entry).join(" · ");
}
export function ReportsDashboardPanel() {
  const resource = useReportsResource<ReportsOptions>("/api/reports/options");
  return (
    <>
      <Notice error message={resource.error} />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải phạm vi báo cáo…
        </p>
      )}
      {resource.data && <ReportsWorkspace initialOptions={resource.data} />}
    </>
  );
}

export function ReportsWorkspace({
  initialOptions,
}: {
  initialOptions: ReportsOptions;
}) {
  const ready = useClientReady();
  const initial: ReportFilterDraft = {
    role: initialOptions.defaultRole,
    semesterId: "",
    campaignId: "",
    facultyId: "",
    departmentId: "",
    courseId: "",
  };
  const [draft, setDraft] = useState<ReportFilterDraft>(initial),
    [applied, setApplied] = useState<ReportFilterDraft>(initial),
    [appliedMetadata, setAppliedMetadata] = useState(initialOptions),
    [downloadBusy, setDownloadBusy] = useState<ReportDownloadFormat | null>(
      null,
    ),
    [downloadError, setDownloadError] = useState<string>(),
    [downloadNotice, setDownloadNotice] = useState<string>();
  const activeDownload = useRef(false);
  const draftQuery = buildReportQuery(draft),
    appliedQuery = buildReportQuery(applied);
  const optionResource = useReportsResource<ReportsOptions>(
      `/api/reports/options?${draftQuery}`,
    ),
    resource = useReportsResource<{ item: ReportsDashboard }>(
      `/api/reports?${appliedQuery}`,
    );
  const options = optionResource.data ?? initialOptions,
    dashboard = resource.data?.item;
  const exportFilters = dashboard
    ? normalizedReportFilters(dashboard.filters)
    : applied;
  const appliedDescription = filterDescription(exportFilters, appliedMetadata);
  const pendingOptions =
    optionResource.loading && draftQuery !== buildReportQuery(initial);
  const change = (key: keyof ReportFilterDraft, value: string) =>
    setDraft((previous) => changeReportFilter(previous, key, value));
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pendingOptions) return;
    setApplied({ ...draft });
    setAppliedMetadata(options);
    setDownloadError(undefined);
    setDownloadNotice(undefined);
    if (draftQuery === appliedQuery) resource.reload();
  }
  async function download(format: ReportDownloadFormat) {
    if (
      !ready ||
      activeDownload.current ||
      resource.loading ||
      !dashboard?.exportable
    )
      return;
    activeDownload.current = true;
    setDownloadBusy(format);
    setDownloadError(undefined);
    setDownloadNotice(undefined);
    try {
      saveReportDownload(await prepareReportDownload(exportFilters, format));
      setDownloadNotice("Đã tải tệp báo cáo theo bộ lọc đang hiển thị.");
    } catch (error) {
      setDownloadError(reportError(error));
    } finally {
      activeDownload.current = false;
      setDownloadBusy(null);
    }
  }
  const departments = options.departments.filter(
      (row) => !draft.facultyId || row.facultyId === draft.facultyId,
    ),
    courses = options.courses.filter(
      (row) => !draft.departmentId || row.departmentId === draft.departmentId,
    ),
    campaigns = options.campaigns.filter(
      (row) => !draft.semesterId || row.semesterId === draft.semesterId,
    );
  const appliedRole =
    dashboard?.role ?? (applied.role as keyof typeof roleLabels);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Báo cáo</h1>
          <p className="mt-3 text-sm font-semibold text-teal-800">
            {roleLabels[appliedRole]}
          </p>
        </div>
        {initialOptions.capabilities.settingsRead && (
          <Link href="/bao-cao/cau-hinh" className={secondaryStyle}>
            Cấu hình ngưỡng báo cáo
          </Link>
        )}
      </div>
      <form
        method="post"
        onSubmit={apply}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Góc nhìn theo vai trò" id="report-role">
            <select
              id="report-role"
              value={draft.role}
              disabled={!ready || downloadBusy !== null}
              className={inputStyle}
              onChange={(event) => change("role", event.target.value)}
            >
              {initialOptions.roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </Field>
          {(options.semesters.length > 0 || draft.semesterId) && (
            <ScopeSelect
              id="report-semester"
              label="Học kỳ"
              value={draft.semesterId}
              options={options.semesters}
              disabled={!ready || pendingOptions}
              onChange={(value) => change("semesterId", value)}
            />
          )}{" "}
          {(options.campaigns.length > 0 || draft.campaignId) && (
            <ScopeSelect
              id="report-campaign"
              label="Đợt khảo sát"
              value={draft.campaignId}
              options={campaigns.map((row) => ({
                id: row.id,
                name: row.title,
              }))}
              disabled={!ready || pendingOptions}
              onChange={(value) => change("campaignId", value)}
            />
          )}{" "}
          {(options.faculties.length > 0 || draft.facultyId) && (
            <ScopeSelect
              id="report-faculty"
              label="Khoa"
              value={draft.facultyId}
              options={options.faculties}
              disabled={!ready || pendingOptions}
              onChange={(value) => change("facultyId", value)}
            />
          )}{" "}
          {(options.departments.length > 0 || draft.departmentId) && (
            <ScopeSelect
              id="report-department"
              label="Bộ môn"
              value={draft.departmentId}
              options={departments}
              disabled={!ready || pendingOptions}
              onChange={(value) => change("departmentId", value)}
            />
          )}{" "}
          {(options.courses.length > 0 || draft.courseId) && (
            <ScopeSelect
              id="report-course"
              label="Môn học"
              value={draft.courseId}
              options={courses}
              disabled={!ready || pendingOptions}
              onChange={(value) => change("courseId", value)}
            />
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className={buttonStyle}
            disabled={!ready || pendingOptions || downloadBusy !== null}
          >
            Xem báo cáo
          </button>
          <button
            type="button"
            className={secondaryStyle}
            disabled={!ready || downloadBusy !== null}
            onClick={() => {
              const reset = { ...initial, role: draft.role };
              setDraft(reset);
              setApplied(reset);
              setAppliedMetadata(options);
              setDownloadError(undefined);
              setDownloadNotice(undefined);
              if (buildReportQuery(reset) === appliedQuery) resource.reload();
            }}
          >
            Bỏ bộ lọc
          </button>
          <button
            type="button"
            className={secondaryStyle}
            disabled={!ready || resource.loading || downloadBusy !== null}
            onClick={resource.reload}
          >
            Tải lại
          </button>
        </div>
        {draftQuery !== appliedQuery && (
          <p className="mt-4 text-xs leading-6 text-slate-500">
            Nhấn Xem báo cáo để áp dụng các lựa chọn mới.
          </p>
        )}
      </form>
      <Notice
        error
        message={optionResource.error || resource.error || downloadError}
      />
      <Notice message={downloadNotice} />
      {pendingOptions && (
        <p role="status" className="mt-3 text-xs text-slate-500">
          Đang tải danh sách bộ lọc…
        </p>
      )}
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tổng hợp báo cáo…
        </p>
      )}
      {dashboard && (
        <>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-7 text-slate-600">
              {appliedDescription}
            </p>
            <p className="text-xs text-slate-500">
              Dữ liệu báo cáo lúc {vietnamTime(dashboard.generatedAt)}
            </p>
            {dashboard.exportable && (
              <div
                role="group"
                aria-label="Tải tệp báo cáo"
                className="flex flex-wrap gap-2"
              >
                {initialOptions.exportFormats.map((format) => (
                  <button
                    type="button"
                    key={format}
                    className={secondaryStyle}
                    disabled={
                      !ready || downloadBusy !== null || resource.loading
                    }
                    onClick={() => void download(format)}
                  >
                    {downloadBusy === format
                      ? "Đang tạo tệp…"
                      : format === "csv"
                        ? "Tải CSV"
                        : format === "xlsx"
                          ? "Tải Excel"
                          : "Tải PDF"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            {dashboard.sections.map((section) => (
              <ReportSectionView key={section.key} section={section} />
            ))}
            {!dashboard.sections.length && (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Chưa có dữ liệu báo cáo trong phạm vi được phép.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
