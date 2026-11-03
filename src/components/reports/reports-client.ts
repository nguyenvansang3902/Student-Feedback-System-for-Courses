"use client";
import { useEffect, useState } from "react";
import { refreshSession } from "../auth/auth-client";
import type { ReportsQuery } from "@/server/services/reports-types";

export type ReportDownloadFormat = "csv" | "xlsx" | "pdf";
export const reportFilterKeys = [
  "role",
  "semesterId",
  "campaignId",
  "facultyId",
  "departmentId",
  "courseId",
] as const;
export type ReportFilterDraft = Record<
  (typeof reportFilterKeys)[number],
  string
>;
export function normalizedReportFilters(
  filters: ReportsQuery,
): ReportFilterDraft {
  return Object.fromEntries(
    reportFilterKeys.map((key) => [key, filters[key] ?? ""]),
  ) as ReportFilterDraft;
}
export function buildReportQuery(
  filters: Partial<ReportFilterDraft>,
  format?: ReportDownloadFormat,
) {
  const query = new URLSearchParams();
  for (const key of reportFilterKeys) {
    const value = filters[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  if (format) query.set("format", format);
  return query.toString();
}
export function changeReportFilter(
  filters: ReportFilterDraft,
  key: keyof ReportFilterDraft,
  value: string,
): ReportFilterDraft {
  const next = { ...filters, [key]: value };
  if (key === "role")
    return {
      role: value,
      semesterId: "",
      campaignId: "",
      facultyId: "",
      departmentId: "",
      courseId: "",
    };
  if (key === "semesterId") next.campaignId = "";
  if (key === "facultyId") {
    next.departmentId = "";
    next.courseId = "";
  }
  if (key === "departmentId") next.courseId = "";
  return next;
}
export class ReportRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}
export const reportError = (error: unknown) =>
  error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Chưa nhận được báo cáo từ máy chủ. Hãy thử tải lại.";
let cachedCsrf: { token: string; expiresAt: number } | null = null;
let csrfRequest: Promise<string> | null = null;
async function csrf() {
  if (cachedCsrf && cachedCsrf.expiresAt > Date.now()) return cachedCsrf.token;
  if (!csrfRequest)
    csrfRequest = reportsRequest<{ csrfToken: string }>("/api/reports/csrf")
      .then((data) => {
        if (typeof data.csrfToken !== "string")
          throw new ReportRequestError(
            "Chưa lấy được xác nhận bảo mật. Hãy tải lại trang.",
            503,
          );
        cachedCsrf = { token: data.csrfToken, expiresAt: Date.now() + 840000 };
        return data.csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  return csrfRequest;
}
async function responseError(response: Response): Promise<never> {
  const data = await response.json().catch(() => ({}));
  if (response.status === 403 && data.code === "INVALID_CSRF")
    cachedCsrf = null;
  throw new ReportRequestError(
    typeof data.message === "string"
      ? data.message
      : "Chưa xử lý được yêu cầu báo cáo. Hãy thử lại.",
    response.status,
    typeof data.code === "string" ? data.code : undefined,
  );
}
async function fetchReport(path: string, body?: unknown) {
  const send = async () =>
    fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": await csrf(),
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  let response = await send();
  if (response.status === 401) {
    cachedCsrf = null;
    const refreshed = await refreshSession();
    if (body === undefined && refreshed) response = await send();
    else if (!refreshed) window.location.replace("/dang-nhap");
  }
  if (!response.ok) return responseError(response);
  return response;
}
export async function reportsRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetchReport(path, body);
  const data = await response.json().catch(() => {
    throw new ReportRequestError(
      "Dữ liệu báo cáo trả về chưa hợp lệ. Hãy tải lại.",
      503,
    );
  });
  return data as T;
}
const downloadTypes: Record<
  ReportDownloadFormat,
  { mime: string; fileName: string }
> = {
  csv: { mime: "text/csv", fileName: "bao-cao-khao-sat.csv" },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: "bao-cao-khao-sat.xlsx",
  },
  pdf: { mime: "application/pdf", fileName: "bao-cao-khao-sat.pdf" },
};
export async function prepareReportDownload(
  filters: Partial<ReportFilterDraft>,
  format: ReportDownloadFormat,
) {
  const expected = downloadTypes[format];
  if (!expected)
    throw new ReportRequestError("Định dạng tệp báo cáo chưa hợp lệ.", 400);
  const response = await fetchReport(
    `/api/reports/export?${buildReportQuery(filters, format)}`,
  );
  if (
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    expected.mime
  )
    throw new ReportRequestError(
      "Máy chủ chưa trả về đúng định dạng báo cáo. Hãy thử lại.",
      503,
    );
  const blob = await response.blob();
  if (!blob.size)
    throw new ReportRequestError(
      "Tệp báo cáo trả về đang trống. Hãy thử lại.",
      503,
    );
  return { blob, fileName: expected.fileName };
}
export function saveReportDownload(download: { blob: Blob; fileName: string }) {
  const url = URL.createObjectURL(download.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = download.fileName;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
export function useReportsResource<T>(path: string | null) {
  const [version, setVersion] = useState(0),
    key = `${path}:${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    if (!path) return;
    let active = true;
    void reportsRequest<T>(path)
      .then((data) => {
        if (active) setState({ key, data });
      })
      .catch((error) => {
        if (active) setState({ key, error: reportError(error) });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: !!path && state.key !== key,
    reload: () => setVersion((v) => v + 1),
  };
}
