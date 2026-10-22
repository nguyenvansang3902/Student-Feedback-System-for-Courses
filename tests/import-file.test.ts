import { deflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { IMPORT_COLUMNS, MAX_IMPORT_BYTES, makeImportTemplate, parseImportFile, type ImportKind } from "../src/server/services/import-file";

const csv = (text: string) => Buffer.from(text, "utf8");
const accountHeader = "loginCode,email,displayName\r\n";
async function xlsx(values: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dữ liệu");
  values.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("FR-21/22 — đọc tệp có giới hạn và chỉ dữ liệu thuần", () => {
  it("đọc CSV UTF-8 BOM, dấu phẩy trong tên và dấu ngoặc kép thoát", async () => {
    const parsed = await parseImportFile("students", "danh-sach.CSV", csv(`\uFEFF${accountHeader}SV01,New@example.invalid,"Nguyễn, Văn ""An"""\r\n`));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toEqual({ row: 2, values: { loginCode: "SV01", email: "new@example.invalid", displayName: 'Nguyễn, Văn "An"' } });
  });
  it("không tin phần mở rộng, chặn tệp nhị phân/UTF-8 lỗi, quá2MB và tên sai", async () => {
    for (const [fileName, content] of [
      ["file.exe", csv(accountHeader)], ["file.xlsx", csv(accountHeader)], ["file.csv", Buffer.from([0xff, 0xff])],
      ["file.csv", Buffer.alloc(MAX_IMPORT_BYTES + 1)], ["file.csv", Buffer.alloc(0)], ["bad\n.csv", csv(accountHeader)],
    ] as [string, Buffer][]) await expect(parseImportFile("students", fileName, content)).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
    const content = await xlsx([IMPORT_COLUMNS.students.slice(), ["SV01", "a@example.invalid", "Tên giả"]]);
    await expect(parseImportFile("students", "file.csv", content)).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
  });
  it("tiêu đề phải đúng, không nhận thêm cột quyền/mật khẩu", async () => {
    const parsed = await parseImportFile("students", "file.csv", csv(`${accountHeader.trim()},roles\nSV01,a@example.invalid,Tên,ADMIN`));
    expect(parsed.errors).toMatchObject([{ row: 1, code: "INVALID_HEADER" }]);
    expect(parsed.rows).toEqual([]);
  });
  it("báo đúng dòng/cột lỗi email, mã, tên và công thức CSV", async () => {
    const parsed = await parseImportFile("teachers", "file.csv", csv(`${accountHeader}bad code,notemail,Tên\nGV02,b@example.invalid,=HYPERLINK(1)\nGV03,c@example.invalid,\n`));
    expect(parsed.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, column: "loginCode", code: "INVALID_VALUE" }),
      expect.objectContaining({ row: 2, column: "email", code: "INVALID_VALUE" }),
      expect.objectContaining({ row: 3, column: "displayName", code: "FORMULA_NOT_ALLOWED" }),
      expect.objectContaining({ row: 4, column: "displayName", code: "INVALID_VALUE" }),
    ]));
    expect(parsed.rows).toEqual([]);
  });
  it("phát hiện trùng mã/email không phân biệt chữ hoa trong cùng tệp", async () => {
    const parsed = await parseImportFile("students", "file.csv", csv(`${accountHeader}SV01,a@example.invalid,Tên\nsv01,b@example.invalid,Tên\nSV03,A@example.invalid,Tên`));
    expect(parsed.errors.filter((error) => error.code === "DUPLICATE_IN_FILE").map((error) => error.row)).toEqual([3, 4]);
  });
  it("email theo z.email() chỉASCII; không nhận accentunicode để tránh so khóaJS khác collation MySQL", async () => {
    const parsed = await parseImportFile("students", "file.csv", csv(`${accountHeader}SV01,nguyen@example.invalid,Tên\nSV02,nguyễn@example.invalid,Tên\nSV03,user@vídụ.invalid,Tên`));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toMatchObject([{ row: 3, column: "email", code: "INVALID_VALUE" }, { row: 4, column: "email", code: "INVALID_VALUE" }]);
  });
  it("lớp chỉ trùng trong cùng học kỳ, đăng ký trùng theo học kỳ+lớp+sinh viên", async () => {
    const sections = await parseImportFile("sections", "file.csv", csv("code,courseCode,semesterCode\nLP01,MH01,HK01\nLP01,MH02,HK02\nlp01,MH02,hk01"));
    expect(sections.rows).toHaveLength(2); expect(sections.errors).toMatchObject([{ row: 4, code: "DUPLICATE_IN_FILE" }]);
    const enrollments = await parseImportFile("enrollments", "file.csv", csv("semesterCode,sectionCode,studentCode\nHK01,LP01,SV01\nhk01,lp01,sv01"));
    expect(enrollments.errors).toMatchObject([{ row: 3, code: "DUPLICATE_IN_FILE" }]);
  });
  it("không tự bỏ dòng giữa tệp hoặc cột thừa", async () => {
    const parsed = await parseImportFile("students", "file.csv", csv(`${accountHeader}SV01,a@example.invalid,Tên\n\nSV02,b@example.invalid,Tên,thừa\n\n`));
    expect(parsed.rowCount).toBe(3);
    expect(parsed.errors).toMatchObject([{ row: 3, code: "COLUMN_COUNT" }, { row: 4, code: "COLUMN_COUNT" }]);
  });
  it("chặn CSV quote thiếu hoặc ký tự ngoài quote đã đóng", async () => {
    for (const text of [`${accountHeader}SV01,a@example.invalid,"Thiếu`, `${accountHeader}SV01,a@example.invalid,"Tên"x`, `${accountHeader}SV01,a@example.invalid,Te"n`])
      await expect(parseImportFile("students", "file.csv", csv(text))).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
  });
  it("giới hạn500 tài khoản/lần và2000 dòng danh mục", async () => {
    const accountRows = Array.from({ length: 501 }, (_, index) => `SV${index},fake${index}@example.invalid,Tên`).join("\n");
    expect((await parseImportFile("students", "file.csv", csv(accountHeader + accountRows))).errors).toMatchObject([{ row: 1, code: "ROW_LIMIT" }]);
    const sectionRows = Array.from({ length: 2001 }, (_, index) => `LP${index},MH01,HK01`).join("\n");
    expect((await parseImportFile("sections", "file.csv", csv("code,courseCode,semesterCode\n" + sectionRows))).errors).toMatchObject([{ row: 1, code: "ROW_LIMIT" }]);
  });
  it("từ chối loại tệp không biết và ô dài hơn giới hạn", async () => {
    await expect(parseImportFile("admins", "file.csv", csv(accountHeader))).rejects.toMatchObject({ code: "INVALID_IMPORT_KIND" });
    await expect(parseImportFile("students", "file.csv", csv(accountHeader + "x".repeat(1025)))).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
  });
  it("đọc XLSX văn bản và báo công thức/cache, richtext/hyperlink theo dòng", async () => {
    const content = await xlsx([
      IMPORT_COLUMNS.students.slice(), ["SV01", "a@example.invalid", "Nguyễn Văn An"],
      ["SV02", "b@example.invalid", { formula: '"Tên giả"', result: "Tên giả" }],
      ["SV03", "c@example.invalid", { text: "Tên", hyperlink: "https://example.invalid" }],
    ]);
    const parsed = await parseImportFile("students", "file.xlsx", content);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toMatchObject([{ row: 3, column: "displayName", code: "UNSAFE_CELL" }, { row: 4, column: "displayName", code: "UNSAFE_CELL" }]);
  });
  it("không nhận XLSX nhiều sheet hoặc có ô gộp", async () => {
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Một"); sheet.addRow(IMPORT_COLUMNS.students.slice()); workbook.addWorksheet("Hai");
    await expect(parseImportFile("students", "file.xlsx", Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
    workbook.removeWorksheet("Hai"); sheet.mergeCells("A2:B2");
    await expect(parseImportFile("students", "file.xlsx", Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
  });
  it("ZIP khai kích thước nhỏ vẫn bị chặn trước ExcelJS khi giải nén vượt8MB", async () => {
    const name = Buffer.from("[Content_Types].xml"), expanded = Buffer.alloc(8 * 1024 * 1024 + 1, 65), compressed = deflateRawSync(expanded);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(8, 10); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(1, 24); central.writeUInt16LE(name.length, 28);
    const localBytes = Buffer.concat([local, name, compressed]), centralBytes = Buffer.concat([central, name]);
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(localBytes.length, 16);
    await expect(parseImportFile("students", "file.xlsx", Buffer.concat([localBytes, centralBytes, end]))).rejects.toMatchObject({ code: "INVALID_IMPORT_FILE" });
  });
  it.each(["students", "teachers", "sections", "enrollments"] as ImportKind[])("mẫuCSV/XLSX %s đúng cột, UTF-8, tải lại đọc được", async (kind) => {
    for (const format of ["csv", "xlsx"] as const) {
      const template = await makeImportTemplate(kind, format);
      const parsed = await parseImportFile(kind, template.fileName, template.content);
      expect(parsed.rowCount).toBe(1);
      expect(parsed.errors).toEqual([]);
      expect(Object.keys(parsed.rows[0].values)).toEqual(IMPORT_COLUMNS[kind]);
      expect(Object.values(parsed.rows[0].values).every((value) => typeof value === "string" && !/^[=+\-@]/.test(value))).toBe(true);
      expect(template.fileName).toBe(`mau-${kind}.${format}`);
    }
  });
});
