import { inflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { z } from "zod";
import { AuthError } from "../auth/types";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const MAX_ACCOUNT_IMPORT_ROWS = 500;
export const importKinds = ["students", "teachers", "sections", "enrollments"] as const;
export type ImportKind = (typeof importKinds)[number];
export type ImportFormat = "csv" | "xlsx";
export interface ImportRowError { row: number; column: string; code: string; message: string }
export interface ImportRow { row: number; values: Record<string, string> }
export interface ParsedImport { kind: ImportKind; rows: ImportRow[]; rowCount: number; errors: ImportRowError[] }

export const IMPORT_COLUMNS: Record<ImportKind, readonly string[]> = {
  students: ["loginCode", "email", "displayName"],
  teachers: ["loginCode", "email", "displayName"],
  sections: ["code", "courseCode", "semesterCode"],
  enrollments: ["semesterCode", "sectionCode", "studentCode"],
};
const templateExamples: Record<ImportKind, readonly string[]> = {
  students: ["SV_MAU_001", "sinh-vien-mau@example.invalid", "Sinh viên mẫu (hãy thay)"],
  teachers: ["GV_MAU_001", "giang-vien-mau@example.invalid", "Giảng viên mẫu (hãy thay)"],
  sections: ["LP_MAU_001", "MH_MAU_001", "HK_MAU_001"],
  enrollments: ["HK_MAU_001", "LP_MAU_001", "SV_MAU_001"],
};

export function parseImportKind(value: unknown): ImportKind {
  const parsed = z.enum(importKinds).safeParse(value);
  if (!parsed.success) throw new AuthError("Loại dữ liệu nhập không hợp lệ.", 400, "INVALID_IMPORT_KIND");
  return parsed.data;
}

const invalidFile = () => new AuthError("Tệp không hợp lệ. Chỉ nhận CSV UTF-8 hoặc XLSX có một trang dữ liệu, tối đa 2 MB.", 400, "INVALID_IMPORT_FILE");
const plainText = z.string().trim().min(1).max(160).refine((text) => !/[\p{Cc}\p{Cf}]/u.test(text));
const code = z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/);
const email = z.email().max(254);

/** Kiểm giới hạn ZIP trước khi ExcelJS giải nén; không tin kích thước khai báo. */
function inspectXlsxZip(content: Buffer): void {
  let end = -1;
  for (let index = content.length - 22; index >= Math.max(0, content.length - 65557); index--) {
    if (content.readUInt32LE(index) === 0x06054b50 && index + 22 + content.readUInt16LE(index + 20) === content.length) { end = index; break; }
  }
  if (end < 0 || content.readUInt16LE(end + 4) !== 0 || content.readUInt16LE(end + 6) !== 0) throw invalidFile();
  const entries = content.readUInt16LE(end + 10), centralSize = content.readUInt32LE(end + 12), centralOffset = content.readUInt32LE(end + 16);
  if (!entries || entries > 256 || content.readUInt16LE(end + 8) !== entries || centralOffset + centralSize !== end) throw invalidFile();
  let offset = centralOffset, expanded = 0;
  const names = new Set<string>();
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > end || content.readUInt32LE(offset) !== 0x02014b50) throw invalidFile();
    const flags = content.readUInt16LE(offset + 8), method = content.readUInt16LE(offset + 10);
    const compressed = content.readUInt32LE(offset + 20), size = content.readUInt32LE(offset + 24);
    const nameLength = content.readUInt16LE(offset + 28), extra = content.readUInt16LE(offset + 30), comment = content.readUInt16LE(offset + 32);
    const local = content.readUInt32LE(offset + 42), next = offset + 46 + nameLength + extra + comment;
    if (next > end || flags & 1 || ![0, 8].includes(method) || size > 8 * 1024 * 1024 || expanded + size > 16 * 1024 * 1024 || compressed > MAX_IMPORT_BYTES) throw invalidFile();
    const name = content.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || names.has(name) || name.includes("..") || name.includes("\\") || name.startsWith("/") || /vbaProject|externalLinks|embeddings/i.test(name)) throw invalidFile();
    names.add(name);
    if (local + 30 > centralOffset || content.readUInt32LE(local) !== 0x04034b50) throw invalidFile();
    const localNameLength = content.readUInt16LE(local + 26), localExtra = content.readUInt16LE(local + 28);
    const start = local + 30 + localNameLength + localExtra;
    if (start + compressed > centralOffset || content.subarray(local + 30, local + 30 + localNameLength).toString("utf8") !== name || content.readUInt16LE(local + 8) !== method) throw invalidFile();
    const bytes = content.subarray(start, start + compressed);
    let actual: Buffer;
    try { actual = method === 0 ? bytes : inflateRawSync(bytes, { maxOutputLength: 8 * 1024 * 1024 }); } catch { throw invalidFile(); }
    if (actual.length !== size) throw invalidFile();
    expanded += actual.length;
    offset = next;
  }
  if (offset !== end || !names.has("[Content_Types].xml") || !names.has("xl/workbook.xml")) throw invalidFile();
}

/** CSV theo quy tắc dấu ngoặc kép; không tách chuỗi theo dấu phẩy đơn thuần. */
function csvRows(content: Buffer): string[][] {
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(content).replace(/^\uFEFF/, ""); } catch { throw invalidFile(); }
  if (text.includes("\0")) throw invalidFile();
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const saveField = () => { if (field.length > 1024 || row.length >= 10) throw invalidFile(); row.push(field); field = ""; closed = false; };
  const saveRow = () => { saveField(); rows.push(row); row = []; if (rows.length > MAX_IMPORT_ROWS + 2) throw invalidFile(); };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; } else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ",") saveField();
    else if (char === "\r" || char === "\n") { saveRow(); if (char === "\r" && text[index + 1] === "\n") index++; }
    else if (char === '"') { if (field || closed) throw invalidFile(); quoted = true; }
    else { if (closed) throw invalidFile(); field += char; }
    if (field.length > 1024) throw invalidFile();
  }
  if (quoted) throw invalidFile();
  if (field || row.length || closed) saveRow();
  return rows;
}

async function xlsxRows(content: Buffer): Promise<string[][]> {
  inspectXlsxZip(content);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(content as unknown as Parameters<typeof workbook.xlsx.load>[0]); } catch { throw invalidFile(); }
  if (workbook.worksheets.length !== 1) throw invalidFile();
  const sheet = workbook.worksheets[0];
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > 10 || Object.keys(sheet.model.merges ?? {}).length) throw invalidFile();
  const rows: string[][] = [];
  for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
    const row: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column++) {
      const cell = sheet.getCell(rowIndex, column), value = cell.value;
      // Không dùng cached result của công thức, richtext, hyperlink, ngày hay lỗi Excel.
      if (value !== null && typeof value !== "string" && typeof value !== "number") { row.push("\0UNSAFE_CELL"); continue; }
      const text = value === null ? "" : String(value);
      if (text.length > 1024 || typeof value === "number" && !Number.isFinite(value)) throw invalidFile();
      row.push(text);
    }
    rows.push(row);
  }
  return rows;
}

export async function parseImportFile(kindValue: unknown, fileName: string, content: Buffer): Promise<ParsedImport> {
  const kind = parseImportKind(kindValue);
  if (!Buffer.isBuffer(content) || !content.length || content.length > MAX_IMPORT_BYTES || typeof fileName !== "string" || fileName.length > 200 || /[\x00-\x1f]/.test(fileName)) throw invalidFile();
  const format = fileName.toLowerCase().endsWith(".xlsx") ? "xlsx" : fileName.toLowerCase().endsWith(".csv") ? "csv" : null;
  if (!format) throw invalidFile();
  if (format === "csv" && content[0] === 0x50 && content[1] === 0x4b || format === "xlsx" && (content.length < 22 || content.readUInt32LE(0) !== 0x04034b50)) throw invalidFile();
  const matrix = format === "csv" ? csvRows(content) : await xlsxRows(content);
  while (matrix.length && matrix.at(-1)!.every((value) => !value.trim())) matrix.pop();
  const expected = IMPORT_COLUMNS[kind], headers = matrix[0]?.map((value) => value.trim()) ?? [];
  const rowCount = Math.max(0, matrix.length - 1), errors: ImportRowError[] = [], rows: ImportRow[] = [];
  if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index]))
    return { kind, rows, rowCount, errors: [{ row: 1, column: "header", code: "INVALID_HEADER", message: `Dòng tiêu đề phải đúng thứ tự: ${expected.join(", ")}.` }] };
  const limit = kind === "students" || kind === "teachers" ? MAX_ACCOUNT_IMPORT_ROWS : MAX_IMPORT_ROWS;
  if (!rowCount || rowCount > limit)
    return { kind, rows, rowCount, errors: [{ row: 1, column: "file", code: "ROW_LIMIT", message: `Tệp cần từ 1 đến ${limit} dòng dữ liệu.` }] };
  const seen = new Map<string, number>();
  for (let index = 1; index < matrix.length; index++) {
    const number = index + 1, cells = matrix[index], values: Record<string, string> = {};
    const error = (column: string, code: string, message: string) => errors.push({ row: number, column, code, message });
    if (cells.length !== expected.length) { error("row", "COLUMN_COUNT", `Dòng phải có đúng ${expected.length} cột.`); continue; }
    let valid = true;
    for (let column = 0; column < expected.length; column++) {
      const key = expected[column], text = cells[column].trim().normalize("NFC");
      values[key] = key === "email" ? text.toLowerCase() : text;
      if (text.includes("\0UNSAFE_CELL")) { error(key, "UNSAFE_CELL", "Chỉ nhận văn bản hoặc số thuần; không nhận công thức, liên kết, ngày hoặc lỗi Excel."); valid = false; continue; }
      if (/^[=+\-@]/.test(text)) { error(key, "FORMULA_NOT_ALLOWED", "Không nhận công thức hoặc giá trị bắt đầu bằng =, +, -, @."); valid = false; continue; }
      const schema = key === "email" ? email : key === "displayName" ? plainText : code;
      if (!schema.safeParse(values[key]).success) { error(key, "INVALID_VALUE", key === "email" ? "Email không hợp lệ (tối đa 254 ký tự)." : key === "displayName" ? "Họ tên cần 1–160 ký tự, không có ký tự điều khiển." : "Mã cần 2–32 ký tự chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ/số."); valid = false; }
    }
    if (!valid) continue;
    const keys = kind === "students" || kind === "teachers" ? [`loginCode:${values.loginCode.toLowerCase()}`, `email:${values.email}`]
      : kind === "sections" ? [`section:${values.semesterCode.toLowerCase()}:${values.code.toLowerCase()}`]
      : [`enrollment:${values.semesterCode.toLowerCase()}:${values.sectionCode.toLowerCase()}:${values.studentCode.toLowerCase()}`];
    for (const key of keys) {
      const previous = seen.get(key);
      if (previous) { error(key.split(":")[0], "DUPLICATE_IN_FILE", `Dữ liệu bị trùng với dòng ${previous}.`); valid = false; } else seen.set(key, number);
    }
    if (valid) rows.push({ row: number, values });
  }
  return { kind, rows, rowCount, errors };
}

export async function makeImportTemplate(kindValue: unknown, format: ImportFormat): Promise<{ fileName: string; contentType: string; content: Buffer }> {
  const kind = parseImportKind(kindValue), columns = IMPORT_COLUMNS[kind];
  if (format !== "csv" && format !== "xlsx") throw new AuthError("Định dạng mẫu không hợp lệ.", 400, "INVALID_IMPORT_FORMAT");
  if (format === "csv") return { fileName: `mau-${kind}.csv`, contentType: "text/csv; charset=utf-8", content: Buffer.from(`\uFEFF${columns.join(",")}\r\n${templateExamples[kind].map((value) => `"${value.replaceAll('"', '""')}"`).join(",")}\r\n`, "utf8") };
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet("Du lieu");
  sheet.columns = columns.map((header) => ({ header, key: header, width: header === "displayName" ? 35 : 28, style: { numFmt: "@" } }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(templateExamples[kind].slice());
  return { fileName: `mau-${kind}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: Buffer.from(await workbook.xlsx.writeBuffer()) };
}
