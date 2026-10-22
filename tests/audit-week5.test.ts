import { describe, expect, it } from "vitest";
import { redactAuditSummary } from "../src/server/services/audit";

describe("FR-12/20/21 BR-30 — metadata Tuần5 không phát lại nội dung tệp/người dùng", () => {
  it.each(["students", "teachers", "sections", "enrollments"])("giữ đúng loại import %s và số dòng đãtạo", (kind) => {
    expect(redactAuditSummary({ kind, created: 123 })).toEqual({ kind, created: 123 });
  });
  it.each(["small", "medium", "large"])("giữ đúng mứcseed %s, console và tươnglaichưalàm", (size) => {
    expect(redactAuditSummary({ console: true, size, newUsers: 1500, futureModules: false }))
      .toEqual({ console: true, size, newUsers: 1500, futureModules: false });
  });
  it("giữ purpose kíchhoạt/đặtlại và metadata lýdo, không giữ rawtoken/email/tênfile/nộidung", () => {
    const result = redactAuditSummary({
      purpose: "ACTIVATION", status: "PENDING_ACTIVATION", role: "SINH_VIEN",
      reasonProvided: true, reasonLength: 25, reason: "Lý do riêng tư", token: "a".repeat(43),
      password: "PrivatePassword123", tokenHash: "b".repeat(64), email: "fake@example.invalid",
      fileName: "Danh sách Nguyễn Văn An.xlsx", content: "Tên người giả", rows: [{ displayName: "Người giả" }],
    });
    expect(result).toEqual({ purpose: "ACTIVATION", status: "PENDING_ACTIVATION", role: "SINH_VIEN", reasonProvided: true, reasonLength: 25 });
    expect(redactAuditSummary({ purpose: "PASSWORD_RESET" })).toEqual({ purpose: "PASSWORD_RESET" });
  });
  it("enums chặt theo trường, không nhận trạngthái/UUID/enum khác đặt vào kind,size,purpose", () => {
    for (const value of ["ADMIN", "ACTIVE", "server-console", "12345678-1234-1234-1234-123456789012", "bí mật", true, 42, ["students"], { kind: "students" }])
      expect(redactAuditSummary({ kind: value, size: value, purpose: value })).toEqual({ kind: null, size: null, purpose: null });
    expect(redactAuditSummary({ kind: "small", size: "students", purpose: "teachers" }))
      .toEqual({ kind: null, size: null, purpose: null });
  });
  it("trườngboolean không chấpnhận string, số, object hay array dù giátrị con hợplệ", () => {
    for (const value of ["true", "ADMIN", 1, null, [true], { success: true }])
      expect(redactAuditSummary({ console: value, futureModules: value, reasonProvided: value }))
        .toEqual({ console: null, futureModules: null, reasonProvided: null });
    expect(redactAuditSummary({ console: false, futureModules: true, reasonProvided: false }))
      .toEqual({ console: false, futureModules: true, reasonProvided: false });
  });
  it("trườngđếm chỉ nhận số nguyên không âm antoàn; không nhận nan/infinity/decimal/string", () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, "100", true, { count: 1 }, [1]])
      expect(redactAuditSummary({ created: value, newUsers: value, reasonLength: value }))
        .toEqual({ created: null, newUsers: null, reasonLength: null });
    expect(redactAuditSummary({ created: 0, newUsers: 1560, reasonLength: 1000 }))
      .toEqual({ created: 0, newUsers: 1560, reasonLength: 1000 });
  });
  it("kiểm lại từng trường trong before/after và giữ ngưỡngđộsâu hiệncó", () => {
    expect(redactAuditSummary({ before: { kind: "students", created: 0, token: "secret" }, after: { kind: "teachers", created: 1, fileName: "secret.csv" } }))
      .toEqual({ before: { kind: "students", created: 0 }, after: { kind: "teachers", created: 1 } });
    expect(redactAuditSummary({ before: { after: { before: { after: { before: { kind: "students" } } } } } }))
      .toEqual({ before: { after: { before: { after: { before: null } } } } });
  });
});
