import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { readInspectionNote } from "../src/server/inspection-note-http";
const path =
  "http://localhost:3000/api/inspection-cases/00000000-0000-4000-8000-000000000001/notes";
function multipart() {
  const form = new FormData();
  form.set("body", "Đã kiểm chứng thông tin qua tài liệu giả.");
  form.set("revision", "2");
  form.set("requestId", randomUUID());
  return form;
}
describe("W11 FR-154 BR-28 — đọc ghi chú và tệp nội bộ", () => {
  it("đọc JSON ghi chú không có tệp và kiểm schema nghiêm ngặt", async () => {
    const value = {
      revision: 1,
      requestId: randomUUID(),
      body: "Đã đối chiếu thông tin xác minh giả.",
    };
    const result = await readInspectionNote(
      new NextRequest(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      }),
    );
    expect(result).toEqual({ input: value, uploads: [] });
    await expect(
      readInspectionNote(
        new NextRequest(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...value, authorId: randomUUID() }),
        }),
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
  });
  it("đọc multipart với đúng revision/requestId/body và byte tệp", async () => {
    const form = multipart(),
      bytes = "%PDF-1.7\n%%EOF\n";
    form.append("files", new File([bytes], "xac-minh.pdf"));
    const result = await readInspectionNote(
      new NextRequest(path, { method: "POST", body: form }),
    );
    expect(result.input).toMatchObject({ revision: 2 });
    expect(result.uploads).toHaveLength(1);
    expect(Buffer.from(result.uploads[0].content).toString()).toBe(bytes);
  });
  it("BR-28 từ chối trường lạ hoặc field lặp thay vì nhận quyền từ client", async () => {
    const form = multipart();
    form.set("storageKey", "duong-dan-tu-client.pdf");
    await expect(
      readInspectionNote(new NextRequest(path, { method: "POST", body: form })),
    ).rejects.toMatchObject({ status: 400 });
    const duplicate = multipart();
    duplicate.append("revision", "9");
    await expect(
      readInspectionNote(
        new NextRequest(path, { method: "POST", body: duplicate }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("BR-28 từ chối hơn ba tệp hoặc giá trị files không phải tệp", async () => {
    const form = multipart();
    for (let i = 0; i < 4; i++)
      form.append("files", new File(["x"], `test-${i}.pdf`));
    await expect(
      readInspectionNote(new NextRequest(path, { method: "POST", body: form })),
    ).rejects.toMatchObject({ status: 400 });
    const wrong = multipart();
    wrong.set("files", "fake.pdf");
    await expect(
      readInspectionNote(
        new NextRequest(path, { method: "POST", body: wrong }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("BR-28 giới hạn luồng multipart ngay cả khi Content-Length không báo đúng", async () => {
    const form = multipart();
    form.append(
      "files",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf"),
    );
    await expect(
      readInspectionNote(new NextRequest(path, { method: "POST", body: form })),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readInspectionNote(
        new NextRequest(path, {
          method: "POST",
          headers: {
            "content-type": "multipart/form-data; boundary=x",
            "content-length": "20000000",
          },
          body: "x",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
