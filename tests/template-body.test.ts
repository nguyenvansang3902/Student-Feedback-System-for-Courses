import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_TEMPLATE_BODY_BYTES,
  readTemplateBody,
} from "../src/server/auth/template-body";
const request = (body: string, type = "application/json", length?: string) =>
  new NextRequest("http://localhost/api/templates", {
    method: "POST",
    body,
    headers: {
      "Content-Type": type,
      ...(length ? { "Content-Length": length } : {}),
    },
  });
describe("W6 FR-30 BR-32 — giới hạn body mẫu phiếu", () => {
  it("đọc JSON dưới giới hạn kể cả nhiều ký tự tiếng Việt", async () => {
    const data = { name: "Khảo sát học phần", groups: [] };
    await expect(
      readTemplateBody(request(JSON.stringify(data))),
    ).resolves.toEqual(data);
  });
  it("từ chối kiểu dữ liệu khác và JSON hỏng", async () => {
    await expect(
      readTemplateBody(request("{}", "text/plain")),
    ).rejects.toMatchObject({ status: 415 });
    await expect(readTemplateBody(request("{"))).rejects.toMatchObject({
      status: 400,
    });
  });
  it("chặn theo byte stream khi thiếu hoặc giả Content-Length", async () => {
    const body = JSON.stringify({ name: "đ".repeat(MAX_TEMPLATE_BODY_BYTES) });
    await expect(readTemplateBody(request(body))).rejects.toMatchObject({
      status: 413,
    });
    await expect(
      readTemplateBody(request(body, "application/json", "2")),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("từ chối Content-Length quá lớn hoặc không hợp lệ", async () => {
    for (const length of [String(MAX_TEMPLATE_BODY_BYTES + 1), "-1", "a"])
      await expect(
        readTemplateBody(request("{}", "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
  });
});
