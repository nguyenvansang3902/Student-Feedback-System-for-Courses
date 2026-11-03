import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { renderReportExport } from "../src/server/services/reports-export";
import type { ReportsDashboard } from "../src/server/services/reports-types";

const passed: string[] = [];
const check = (name: string, test: () => void) => {
  test();
  passed.push(name);
  console.log(
    `QUA W12-EXPORT-${String(passed.length).padStart(2, "0")} ${name}`,
  );
};
const canary = "CANARY_STUDENT_PRIVATE_4927";
const python = process.env.PDF_TEST_PYTHON || "python";
const readPdf = (bytes: Uint8Array) => {
  const result = spawnSync(
    python,
    [
      "-c",
      "import sys,io; from pypdf import PdfReader; r=PdfReader(io.BytesIO(sys.stdin.buffer.read())); print('\\n'.join(p.extract_text() or '' for p in r.pages))",
    ],
    {
      input: Buffer.from(bytes),
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  assert(
    !result.error && result.status === 0,
    "Cần Python+pypdf6.10.0 để đọc PDF thật, không bỏ qua phép kiểm",
  );
  return result.stdout;
};
mkdirSync(".local", { recursive: true });
mkdirSync("output/pdf", { recursive: true });
for (const role of ["PHONG_DAO_TAO", "PHONG_KHAO_THI", "THANH_TRA"] as const) {
  const dto: ReportsDashboard = {
    role,
    generatedAt: "2026-11-03T00:00:00Z",
    filters: { role },
    exportable: true,
    sections: [
      {
        key: "summary",
        title:
          role === "PHONG_DAO_TAO"
            ? "Độ sẵn sàng dữ liệu"
            : role === "PHONG_KHAO_THI"
              ? "Thống kê phản hồi thi"
              : "Thống kê hồ sơ Thanh tra",
        columns: [
          { key: "count", label: "Số hồ sơ", format: "count" },
          { key: "days", label: "Thời gian xử lý (ngày)", format: "days" },
          { key: "rate", label: "Tỉ lệ quá hạn", format: "percent" },
        ],
        rows: [
          {
            key: "safe",
            label: "Tổng hợp dữ liệu giả",
            cells: { count: 20, days: 2.5, rate: 0.25 },
            suppressed: false,
          },
          {
            key: "hidden",
            label: "Nhóm chưa đủ mẫu",
            cells: { count: canary, days: canary, rate: canary },
            suppressed: true,
          },
        ],
        message: "Số liệu minh họa, chỉ phục vụ kiểm tra chức năng xuất.",
      },
    ],
  };
  const csv = await renderReportExport(dto, "csv"),
    xlsx = await renderReportExport(dto, "xlsx"),
    pdf = await renderReportExport(dto, "pdf");
  const csvText = Buffer.from(csv.bytes).toString("utf8");
  check(`BR-67 ${role} CSV giữ tiếng Việt, che dữ liệu không đủ mẫu`, () => {
    assert.equal(csvText.charCodeAt(0), 0xfeff);
    assert(csvText.includes("Tổng hợp dữ liệu giả"));
    assert(!csvText.includes(canary));
    assert(csvText.includes("25%"));
  });
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(xlsx.bytes) as never);
  const values: unknown[] = [];
  book.eachSheet((sheet) =>
    sheet.eachRow((row) => row.eachCell((cell) => values.push(cell.value))),
  );
  check(`BR-67 ${role} XLSX đọc lại được, ô che không thay bằng số0`, () => {
    assert(values.includes(20) && values.includes(0.25));
    assert(!JSON.stringify(values).includes(canary));
    assert.equal(values.filter((x) => x === "Chưa đủ dữ liệu").length, 3);
  });
  const pdfText = readPdf(pdf.bytes);
  check(`BR-67 ${role} PDF giải mã nội dung thật, không có ô bị che`, () => {
    assert(pdfText.includes("Báo cáo khảo sát và phản hồi"));
    assert(pdfText.includes("Tổng hợp dữ liệu giả"));
    assert(pdfText.includes("Chưa đủ dữ liệu"));
    assert(!pdfText.includes(canary));
  });
  if (role === "THANH_TRA")
    writeFileSync("output/pdf/bao-cao-thanh-tra-demo.pdf", pdf.bytes);
}
const long: ReportsDashboard = {
  role: "CAN_BO_DBCL",
  generatedAt: "2026-11-03T00:00:00Z",
  filters: { role: "CAN_BO_DBCL" },
  exportable: true,
  sections: [
    {
      key: "long",
      title: "Báo cáo nhiều trang - dữ liệu giả",
      columns: [
        { key: "count", label: "Số phiếu", format: "count" },
        { key: "rate", label: "Tỉ lệ", format: "percent" },
      ],
      rows: Array.from({ length: 80 }, (_, i) => ({
        key: `row${i}`,
        label: `Môn học ${String(i + 1).padStart(3, "0")} - Tiếng Việt có dấu`,
        cells: { count: 20 + i, rate: 0.75 },
        suppressed: false,
      })),
      message: null,
    },
  ],
};
const longPdf = await renderReportExport(long, "pdf"),
  text = readPdf(longPdf.bytes),
  parsed = await PDFDocument.load(longPdf.bytes);
check("FR-93 bảng nhiều trang không bỏ dòng cuối, đánh số trang", () => {
  assert(parsed.getPageCount() > 2);
  assert(text.includes("Môn học 001") && text.includes("Môn học 080"));
  assert(
    text.includes(`Trang ${parsed.getPageCount()}/${parsed.getPageCount()}`),
  );
});
writeFileSync("output/pdf/bao-cao-nhieu-trang-demo.pdf", longPdf.bytes);
writeFileSync(
  ".local/week12-exports-result.json",
  JSON.stringify(
    {
      status: "passed",
      passed: passed.length,
      cases: passed,
      pdfPages: parsed.getPageCount(),
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Tuần12 xuấtfile: ${passed.length}/${passed.length} nhóm qua; chỉ dùng DTO giả, không truy cập database.`,
);
