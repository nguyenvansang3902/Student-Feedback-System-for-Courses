import { useId } from "react";
import type {
  ReportColumn,
  ReportRow,
  ReportSection,
} from "@/server/services/reports-types";

export function reportCellValue(row: ReportRow, column: ReportColumn) {
  return row.suppressed ? null : (row.cells[column.key] ?? null);
}
export function formatReportCell(
  value: string | number | null,
  format: ReportColumn["format"],
  suppressed = false,
): string {
  if (suppressed) return "Chưa đủ dữ liệu";
  if (value === null || (typeof value === "number" && !Number.isFinite(value)))
    return "—";
  if (typeof value === "string") return value;
  if (format === "percent")
    return new Intl.NumberFormat("vi-VN", {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(value);
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: format === "score" ? 2 : 0,
    maximumFractionDigits: format === "count" ? 0 : 2,
  }).format(value);
}
export function ReportDataTable({ section }: { section: ReportSection }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">Số liệu {section.title}</caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Mục
            </th>
            {section.columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 font-semibold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {section.rows.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="max-w-sm break-words px-4 py-3 font-medium text-slate-800"
              >
                {row.label}
              </th>
              {section.columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${row.suppressed ? "text-slate-500" : "text-slate-700"}`}
                >
                  {formatReportCell(
                    reportCellValue(row, column),
                    column.format,
                    row.suppressed,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ReportMetricCards({ section }: { section: ReportSection }) {
  const numeric = section.columns.filter((column) => column.format !== "text");
  const metrics =
    section.rows.length === 1
      ? numeric.map((column) => ({
          key: column.key,
          label: column.label,
          value: reportCellValue(section.rows[0], column),
          format: column.format,
          suppressed: section.rows[0].suppressed,
        }))
      : numeric.length === 1 && section.rows.length <= 8
        ? section.rows.map((row) => ({
            key: row.key,
            label: row.label,
            value: reportCellValue(row, numeric[0]),
            format: numeric[0].format,
            suppressed: row.suppressed,
          }))
        : [];
  if (!metrics.length) return null;
  return (
    <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className="min-w-0 rounded-xl border border-teal-100 bg-teal-50/50 p-4"
        >
          <dt className="break-words text-sm leading-6 text-slate-600">
            {metric.label}
          </dt>
          <dd
            className={`mt-2 break-words font-semibold ${metric.suppressed ? "text-sm text-slate-500" : "text-2xl text-teal-950"}`}
          >
            {formatReportCell(metric.value, metric.format, metric.suppressed)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function ReportBarChart({
  section,
  column,
}: {
  section: ReportSection;
  column: ReportColumn;
}) {
  const titleId = useId(),
    rows = section.rows.slice(0, 20);
  const values = rows
    .map((row) => reportCellValue(row, column))
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    );
  if (!values.length) return null;
  const max =
    column.format === "percent"
      ? 1
      : column.format === "score"
        ? 5
        : Math.max(1, ...values);
  const isOverdue = /overdue|late|qua_han/i.test(column.key);
  return (
    <figure
      className="min-w-0 rounded-xl border border-slate-200 p-4"
      aria-labelledby={titleId}
    >
      <figcaption id={titleId} className="font-semibold text-slate-800">
        {column.label}
      </figcaption>
      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const value = reportCellValue(row, column),
            numeric =
              typeof value === "number" && Number.isFinite(value) && value >= 0
                ? value
                : null;
          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-xs leading-5">
                <span className="min-w-0 break-words text-slate-600">
                  {row.label}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">
                  {formatReportCell(value, column.format, row.suppressed)}
                </span>
              </div>
              {numeric !== null && (
                <div
                  aria-hidden="true"
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full ${isOverdue ? "bg-red-700" : "bg-teal-700"}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (numeric / max) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {section.rows.length > 20 && (
        <p className="mt-4 text-xs leading-6 text-slate-500">
          Biểu đồ hiển thị 20 mục đầu. Bảng số liệu bên dưới có đầy đủ các mục.
        </p>
      )}
    </figure>
  );
}
export function ReportSectionView({ section }: { section: ReportSection }) {
  const chartColumns = section.columns
    .filter((column) => column.format !== "text")
    .slice(0, 2);
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
      {section.message && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-900">
          {section.message}
        </p>
      )}
      {section.rows.length > 0 ? (
        <>
          <ReportMetricCards section={section} />
          {section.rows.length > 1 && chartColumns.length > 0 && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {chartColumns.map((column) => (
                <ReportBarChart
                  key={column.key}
                  section={section}
                  column={column}
                />
              ))}
            </div>
          )}
          <ReportDataTable section={section} />
        </>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-500">
          Chưa có dữ liệu theo bộ lọc đã chọn.
        </p>
      )}
    </section>
  );
}
