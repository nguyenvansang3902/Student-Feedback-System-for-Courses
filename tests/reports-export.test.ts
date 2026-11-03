import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import {
  neutralizeSpreadsheetText,
  renderReportExport,
} from "@/server/services/reports-export";
import type { ReportsDashboard } from "@/server/services/reports-types";

function report(): ReportsDashboard {
  return {
    role: "PHONG_KHAO_THI",
    generatedAt: "2026-11-03T00:00:00Z",
    filters: { role: "PHONG_KHAO_THI" },
    exportable: true,
    sections: [
      {
        key: "assessment",
        title: "Kiểm tra, đánh giá",
        columns: [
          { key: "count", label: "Số phiếu", format: "count" },
          { key: "rate", label: "Tỉ lệ", format: "percent" },
          { key: "score", label: "Điểm gộp", format: "score" },
        ],
        rows: [
          {
            key: "safe",
            label: "Lập trình ứng dụng",
            cells: { count: 12, rate: 0.75, score: 3.25 },
            suppressed: false,
          },
          {
            key: "hidden",
            label: "Môn chưa đủ mẫu",
            cells: { count: 2, rate: 0.2, score: "CANARY_HIDDEN_VALUE" },
            suppressed: true,
          },
        ],
        message: null,
      },
    ],
  };
}
describe("FR-92/93, BR-67 xuất báo cáo", () => {
  it.each([
    '=HYPERLINK("https://invalid")',
    " +1",
    "\t@SUM(A1:A2)",
    "\r-1",
    "\u0000=1",
  ])("chặn công thức trong ô chuỗi %j", (value) => {
    expect(neutralizeSpreadsheetText(value)).toMatch(/^'/);
  });
  it("CSV có BOM, tiếng Việt, escape dấu nháy và che cả ô số nhỏ", async () => {
    const dto = report();
    dto.scopeLabel = "Học kỳ giả - Khoa Công nghệ thông tin";
    dto.sections[0].rows[0].label = 'Môn, "thực hành"';
    const result = await renderReportExport(dto, "csv");
    const text = Buffer.from(result.bytes).toString("utf8");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('"Môn, ""thực hành"""');
    expect(text).toContain('"75%"');
    expect(text).toContain("Chưa đủ dữ liệu");
    expect(text).toContain("Phạm vi: Học kỳ giả - Khoa Công nghệ thông tin");
    expect(text).not.toContain("CANARY_HIDDEN_VALUE");
    expect(result.fileName).toBe("bao-cao-khao-sat.csv");
  });
  it("XLSX giữ numeric cells, phần trăm, không tạo formula và không lộ ô bị che", async () => {
    const dto = report();
    dto.sections[0].rows[0].label = "=SUM(A1:A2)";
    const result = await renderReportExport(dto, "xlsx");
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(result.bytes) as never);
    const sheet = book.worksheets[0],
      values: unknown[] = [];
    sheet.eachRow((row) => row.eachCell((cell) => values.push(cell.value)));
    expect(values).toContain(12);
    expect(values).toContain(0.75);
    expect(values).toContain("'=SUM(A1:A2)");
    expect(JSON.stringify(values)).not.toContain("CANARY_HIDDEN_VALUE");
    expect(
      values.some(
        (value) => value && typeof value === "object" && "formula" in value,
      ),
    ).toBe(false);
    expect(values.filter((value) => value === "Chưa đủ dữ liệu")).toHaveLength(
      3,
    );
  });
  it("PDF tiếng Việt có font nhúng và phân trang cho bảng dài", async () => {
    const dto = report();
    dto.sections[0].rows = Array.from({ length: 100 }, (_, i) => ({
      key: String(i),
      label: `Môn học ${i + 1}: Tiếng Việt có dấu`,
      cells: { count: 20, rate: 0.8, score: 3.5 },
      suppressed: false,
    }));
    const output = await renderReportExport(dto, "pdf");
    expect(Buffer.from(output.bytes).subarray(0, 4).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(output.bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getTitle()).toBe("Báo cáo khảo sát và phản hồi");
  });
  it("không xuất báo cáo chưa được dịch vụ cấp khả năng export", async () => {
    const dto = report();
    dto.exportable = false;
    await expect(renderReportExport(dto, "csv")).rejects.toThrow(
      "không cho phép",
    );
  });
});
