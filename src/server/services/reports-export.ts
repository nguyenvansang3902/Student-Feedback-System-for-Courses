import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ReportsDashboard } from "./reports-types";

export type ReportExportFormat = "csv" | "xlsx" | "pdf";
export const INSUFFICIENT_REPORT_DATA = "Chưa đủ dữ liệu";
const roleNames: Record<string, string> = {
  SINH_VIEN: "Sinh viên",
  GIANG_VIEN: "Giảng viên",
  TRUONG_BO_MON: "Trưởng bộ môn",
  TRUONG_KHOA: "Trưởng khoa",
  CAN_BO_DBCL: "Đảm bảo chất lượng",
  LANH_DAO: "Lãnh đạo",
  PHONG_DAO_TAO: "Phòng Đào tạo",
  PHONG_KHAO_THI: "Phòng Khảo thí",
  THANH_TRA: "Phòng Thanh tra",
  ADMIN: "Quản trị hệ thống",
};
type Section = ReportsDashboard["sections"][number];
type Cell = string | number | null;
function printable(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
/** Dùng cho mọi ô chuỗi, gồm cả nhãn, tránh công thức Excel/CSV. */
export function neutralizeSpreadsheetText(value: string): string {
  const clean = printable(value);
  return /^[\s]*[=+\-@]/u.test(clean) ? "'" + clean : clean;
}
export function reportCellText(value: Cell, format: string): string {
  if (value === null || (typeof value === "number" && !Number.isFinite(value)))
    return INSUFFICIENT_REPORT_DATA;
  if (typeof value === "string") return printable(value);
  if (format === "percent")
    return `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: format === "count" ? 0 : 2,
  });
}
function rowCells(section: Section, row: Section["rows"][number]): Cell[] {
  return [
    printable(row.label),
    ...section.columns.map((column) =>
      row.suppressed ? null : (row.cells[column.key] ?? null),
    ),
  ];
}
function summary(report: ReportsDashboard): string[] {
  const time = new Date(report.generatedAt);
  return [
    "Báo cáo khảo sát và phản hồi",
    `Vai trò: ${roleNames[report.role] ?? report.role}`,
    ...(report.scopeLabel ? [`Phạm vi: ${report.scopeLabel}`] : []),
    `Thời điểm xuất: ${Number.isNaN(time.getTime()) ? "Không xác định" : time.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
    "Ô chưa đủ mẫu được che theo quyền và ngưỡng áp dụng.",
  ];
}
function csvCell(value: string): string {
  return '"' + neutralizeSpreadsheetText(value).replaceAll('"', '""') + '"';
}
function csv(report: ReportsDashboard): Uint8Array {
  const rows: string[][] = summary(report).map((value) => [value]);
  for (const section of report.sections) {
    rows.push(
      [],
      [section.title],
      ["Mục", ...section.columns.map((c) => c.label)],
    );
    for (const row of section.rows)
      rows.push(
        rowCells(section, row).map((value, index) =>
          reportCellText(
            value,
            index ? section.columns[index - 1].format : "text",
          ),
        ),
      );
    if (section.message) rows.push([section.message]);
    if (!section.rows.length && !section.message)
      rows.push([INSUFFICIENT_REPORT_DATA]);
  }
  return Buffer.from(
    "\uFEFF" +
      rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
      "\r\n",
    "utf8",
  );
}
async function xlsx(report: ReportsDashboard): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống khảo sát";
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet("Báo cáo", {
    views: [{ state: "frozen", ySplit: summary(report).length }],
  });
  for (const text of summary(report))
    sheet.addRow([neutralizeSpreadsheetText(text)]);
  for (const section of report.sections) {
    sheet.addRow([]);
    sheet.addRow([neutralizeSpreadsheetText(section.title)]).font = {
      bold: true,
      size: 12,
    };
    const header = sheet.addRow([
      "Mục",
      ...section.columns.map((c) => neutralizeSpreadsheetText(c.label)),
    ]);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF005E59" },
    };
    for (const row of section.rows) {
      const cells = rowCells(section, row).map((value) =>
        value === null
          ? INSUFFICIENT_REPORT_DATA
          : typeof value === "string"
            ? neutralizeSpreadsheetText(value)
            : Number.isFinite(value)
              ? value
              : INSUFFICIENT_REPORT_DATA,
      );
      const line = sheet.addRow(cells);
      section.columns.forEach((column, index) => {
        if (typeof cells[index + 1] === "number")
          line.getCell(index + 2).numFmt =
            column.format === "percent"
              ? "0.0%"
              : column.format === "count"
                ? "0"
                : "0.00";
      });
      line.alignment = { vertical: "top", wrapText: true };
    }
    if (section.message)
      sheet.addRow([neutralizeSpreadsheetText(section.message)]);
  }
  sheet.getColumn(1).width = 48;
  for (let index = 2; index <= sheet.columnCount; index++)
    sheet.getColumn(index).width = 23;
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const result: string[] = [];
  for (const paragraph of printable(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        result.push(line);
        line = "";
      }
      let fragment = "";
      for (const character of word) {
        if (
          fragment &&
          font.widthOfTextAtSize(fragment + character, size) > width
        ) {
          result.push(fragment);
          fragment = "";
        }
        fragment += character;
      }
      line = fragment;
    }
    result.push(line);
  }
  return result.length ? result : [""];
}
async function pdf(report: ReportsDashboard): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(
    await readFile(join(process.cwd(), "resources/fonts/NotoSans-Regular.ttf")),
    { subset: true },
  );
  document.setTitle("Báo cáo khảo sát và phản hồi");
  document.setAuthor("Hệ thống khảo sát");
  document.setCreationDate(new Date(report.generatedAt));
  const width = 841.89,
    height = 595.28,
    margin = 36,
    bodyWidth = width - 2 * margin,
    bottom = 44;
  let page: PDFPage,
    y = 0;
  const addPage = () => {
    page = document.addPage([width, height]);
    y = height - margin;
  };
  addPage();
  const text = (
    value: string,
    size = 10,
    color = rgb(0.09, 0.15, 0.23),
    x = margin,
  ) => {
    page.drawText(value, { x, y, size, font, color });
  };
  const block = (value: string, size = 10) => {
    for (const line of wrap(value, font, size, bodyWidth)) {
      if (y < bottom + 18) addPage();
      text(line, size);
      y -= size + 5;
    }
  };
  summary(report).forEach((value, index) =>
    block(value, index === 0 ? 18 : 10),
  );
  y -= 12;
  for (const section of report.sections) {
    if (y < bottom + 90) addPage();
    block(section.title, 13);
    y -= 4;
    const columns = [{ label: "Mục", format: "text" }, ...section.columns];
    // Chia bảng rộng thành các cụm tối đa năm cột, lặp nhãn để không bỏ dữ liệu.
    for (let offset = 1; offset < columns.length || offset === 1; offset += 4) {
      const group = [columns[0], ...columns.slice(offset, offset + 4)];
      const firstWidth = bodyWidth * (group.length > 1 ? 0.36 : 1),
        otherWidth =
          group.length > 1 ? (bodyWidth - firstWidth) / (group.length - 1) : 0;
      const widths = group.map((_, i) => (i ? otherWidth : firstWidth)),
        lineHeight = 13,
        size = 9;
      const drawRow = (values: string[], header = false) => {
        const lines = values.map((value, index) =>
          wrap(value, font, size, widths[index] - 14),
        );
        const count = Math.max(...lines.map((a) => a.length));
        let cursor = 0;
        while (cursor < count) {
          if (y < bottom + lineHeight + 12) {
            addPage();
            if (!header)
              drawRow(
                group.map((c) => c.label),
                true,
              );
          }
          const take = Math.min(
              count - cursor,
              Math.max(1, Math.floor((y - bottom - 12) / lineHeight)),
            ),
            h = take * lineHeight + 12;
          page.drawRectangle({
            x: margin,
            y: y - h,
            width: bodyWidth,
            height: h,
            color: header ? rgb(0.0, 0.37, 0.35) : rgb(0.96, 0.97, 0.98),
            borderColor: rgb(0.8, 0.85, 0.86),
            borderWidth: 0.5,
          });
          let x = margin;
          lines.forEach((column, index) => {
            column.slice(cursor, cursor + take).forEach((line, n) =>
              page.drawText(line, {
                x: x + 7,
                y: y - 14 - n * lineHeight,
                size,
                font,
                color: header ? rgb(1, 1, 1) : rgb(0.09, 0.15, 0.23),
              }),
            );
            x += widths[index];
          });
          y -= h;
          cursor += take;
        }
      };
      if (y < bottom + 50) addPage();
      drawRow(
        group.map((c) => c.label),
        true,
      );
      for (const row of section.rows) {
        const all = rowCells(section, row);
        const values = [all[0], ...all.slice(offset, offset + 4)];
        drawRow(
          values.map((value, index) =>
            reportCellText(value, group[index].format),
          ),
        );
      }
      if (!section.rows.length)
        block(section.message ?? INSUFFICIENT_REPORT_DATA);
      y -= 10;
    }
    if (section.message && section.rows.length) block(section.message);
    y -= 12;
  }
  const pages = document.getPages();
  pages.forEach((item, index) =>
    item.drawText(`Trang ${index + 1}/${pages.length}`, {
      x: width - margin - 90,
      y: 22,
      size: 9,
      font,
      color: rgb(0.3, 0.36, 0.4),
    }),
  );
  return document.save();
}
/** Chỉ nhận DTO đã kiểm quyền; không tự mở rộng hoặc đọc thêm dữ liệu. */
export async function renderReportExport(
  report: ReportsDashboard,
  format: ReportExportFormat,
): Promise<{ bytes: Uint8Array; mimeType: string; fileName: string }> {
  if (!report.exportable)
    throw new Error("Báo cáo này không cho phép xuất tệp.");
  if (format === "csv")
    return {
      bytes: csv(report),
      mimeType: "text/csv; charset=utf-8",
      fileName: "bao-cao-khao-sat.csv",
    };
  if (format === "xlsx")
    return {
      bytes: await xlsx(report),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "bao-cao-khao-sat.xlsx",
    };
  if (format !== "pdf") throw new Error("Định dạng báo cáo không hợp lệ.");
  return {
    bytes: await pdf(report),
    mimeType: "application/pdf",
    fileName: "bao-cao-khao-sat.pdf",
  };
}
