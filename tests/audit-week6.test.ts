import { describe, expect, it } from "vitest";
import { redactAuditSummary } from "../src/server/services/audit";
describe("BR-30 — nhật ký mẫu phiếu Tuần 6", () => {
  it("giữ ID/phiên bản/số lượng, không phát lại tên hoặc nội dung mẫu", () => {
    const metadata = {
      familyId: "00000000-0000-4000-8000-000000000001",
      sourceId: "00000000-0000-4000-8000-000000000002",
      revision: 2,
      version: 1,
      groupCount: 2,
      questionCount: 6,
      previousDefaultCount: 1,
      isDefault: true,
      status: "DA_KHOA",
    };
    expect(
      redactAuditSummary({
        ...metadata,
        name: "Tên có dữ liệu nhạy cảm",
        questions: [{ label: "Nội dung riêng tư" }],
        token: "khong-duoc-lo",
      }),
    ).toEqual(metadata);
  });
  it("chặn kiểu giả, số ngoài giới hạn và văn bản không phải UUID", () => {
    expect(
      redactAuditSummary({
        familyId: "ten@that.invalid",
        sourceId: 123,
        revision: -1,
        version: Infinity,
        groupCount: "999",
        questionCount: -1,
        previousDefaultCount: Number.MAX_SAFE_INTEGER + 1,
        isDefault: "true",
      }),
    ).toEqual({
      familyId: null,
      sourceId: null,
      revision: null,
      version: null,
      groupCount: null,
      questionCount: null,
      previousDefaultCount: null,
      isDefault: null,
    });
  });
});
