import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ReportsOptions,
  ReportSection,
} from "../src/server/services/reports-types";
import {
  formatReportCell,
  ReportSectionView,
} from "../src/components/reports/report-view";

const fixture = vi.hoisted(() => ({
  loading: false,
  error: undefined as string | undefined,
  dashboard: {
    role: "PHONG_KHAO_THI",
    generatedAt: "2026-11-03T01:00:00Z",
    filters: { role: "PHONG_KHAO_THI" },
    exportable: true,
    sections: [] as unknown[],
  },
}));
vi.mock("../src/components/reports/reports-client", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../src/components/reports/reports-client")
  >()),
  useReportsResource: (path: string) => ({
    data: fixture.loading
      ? undefined
      : path.includes("/settings")
        ? {
            item: { minFeedbackRecords: 5, minInspectionCases: 5, revision: 1 },
          }
        : path.includes("/options")
          ? options
          : { item: fixture.dashboard },
    loading: fixture.loading,
    error: fixture.error,
    reload: vi.fn(),
  }),
}));
import { ReportsWorkspace } from "../src/components/reports/reports-dashboard";
import { ReportsSettingsPanel } from "../src/components/reports/reports-settings";
const options: ReportsOptions = {
  roles: ["PHONG_KHAO_THI"],
  defaultRole: "PHONG_KHAO_THI",
  semesters: [
    { id: "00000000-0000-4000-8000-000000000001", name: "Học kỳ giả" },
  ],
  campaigns: [],
  faculties: [],
  departments: [],
  courses: [],
  capabilities: { export: true, settingsRead: false, settingsWrite: false },
  exportFormats: ["csv", "xlsx", "pdf"],
};
const section: ReportSection = {
  key: "feedback",
  title: "Phản hồi thi",
  columns: [
    { key: "count", label: "Số phản hồi", format: "count" },
    { key: "rate", label: "Tỉ lệ", format: "percent" },
    { key: "note", label: "Mô tả", format: "text" },
  ],
  rows: [
    {
      key: "public",
      label: "Nhóm đủ mẫu",
      cells: {
        count: 3,
        rate: 0.25,
        note: "<script>bad()</script>",
        studentId: "PRIVATE-STUDENT-ID",
        email: "private@example.invalid",
      },
      suppressed: false,
    },
    {
      key: "hidden",
      label: "Nhóm thiếu mẫu",
      cells: { count: 987654321, rate: 0.9999, note: "PRIVATE-CELL-CANARY" },
      suppressed: true,
    },
  ],
  message: "Nhóm chưa đủ mẫu được ẩn số liệu.",
};
beforeEach(() => {
  fixture.loading = false;
  fixture.error = undefined;
  fixture.dashboard.sections = [section];
});
describe("FR-90/91, BR-67 — biểu đồ và bảng chỉ dùng ô được phép", () => {
  it("ép null cả văn bản/số của hàng bị che, kể cả thanh biểu đồ và nhãn", () => {
    const html = renderToStaticMarkup(
      createElement(ReportSectionView, { section }),
    );
    expect(html).not.toContain("987654321");
    expect(html).not.toContain("99,99%");
    expect(html).not.toContain("PRIVATE-CELL-CANARY");
    expect(html).not.toContain("PRIVATE-STUDENT-ID");
    expect(html).not.toContain("private@example.invalid");
    expect(html).toContain("Chưa đủ dữ liệu");
    expect(html).toContain("width:100%");
    expect(html).toContain("25%");
  });
  it("escape nội dung và có bảng dữ liệu cho biểu đồ", () => {
    const html = renderToStaticMarkup(
      createElement(ReportSectionView, { section }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain('scope="row"');
    expect(html).toContain("<figure");
    expect(html).toContain('aria-hidden="true"');
  });
  it("số không thực sự vẫn là 0, null không được đổi thành 0", () => {
    expect(formatReportCell(0, "count")).toBe("0");
    expect(formatReportCell(null, "count")).toBe("—");
    expect(formatReportCell(12, "count", true)).toBe("Chưa đủ dữ liệu");
    expect(formatReportCell(Number.NaN, "score")).toBe("—");
    expect(formatReportCell(0.25, "percent")).toBe("25%");
  });
  it("dashboard giữ ngữ cảnh vai trò, không placeholder và khóa thao tác trước hydration", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsWorkspace, { initialOptions: options }),
    );
    expect(html).toContain("Phòng Khảo thí");
    expect(html).toContain("Tất cả học kỳ");
    expect(html).toContain("Tải CSV");
    expect(html).not.toContain("placeholder=");
    expect(html).not.toContain("của bạn");
    expect(html).not.toContain("PRIVATE-STUDENT-ID");
    for (const button of html.match(/<button\b[^>]*>/g) ?? [])
      expect(button).toMatch(/\sdisabled(?:=|\s|>)/);
    for (const select of html.match(/<select\b[^>]*>/g) ?? [])
      expect(select).toMatch(/\sdisabled(?:=|\s|>)/);
  });
  it("đang tải không giữ bảng của bộ lọc cũ", () => {
    fixture.loading = true;
    const html = renderToStaticMarkup(
      createElement(ReportsWorkspace, { initialOptions: options }),
    );
    expect(html).toContain("Đang tổng hợp báo cáo");
    expect(html).not.toContain("Nhóm đủ mẫu");
    expect(html).not.toContain("Tải CSV");
  });
  it("cấu hình có nhãn, min2 và không gửi trước hydration", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsSettingsPanel, { canWrite: true }),
    );
    expect(html).toContain('min="2"');
    expect(html).toContain("Số phản hồi tối thiểu");
    expect(html).not.toContain("placeholder=");
    for (const control of html.match(/<(?:button|input)\b[^>]*>/g) ?? [])
      expect(control).toMatch(/\sdisabled(?:=|\s|>)/);
  });
});
