import { describe, expect, it } from "vitest";
import {
  attachmentDownloadHeaders,
  MAX_ATTACHMENT_BYTES,
  safeAttachmentName,
  validateAttachment,
  validateAttachmentBatch,
} from "../src/server/feedback/attachment-files";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XcAAAAASUVORK5CYII=",
  "base64",
);
const jpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 4, 0x4a, 0x46, 0xff, 0xd9,
]);
const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

describe("BR-28 — phần mở rộng, magic và giới hạn tệp phản hồi", () => {
  it.each([
    ["chung-cu.PNG", png, "image/png", "png"],
    ["anh.jpeg", jpeg, "image/jpeg", "jpg"],
    ["anh.JPG", jpeg, "image/jpeg", "jpg"],
    ["tai-lieu.pdf", pdf, "application/pdf", "pdf"],
  ])(
    "nhận %s khi phần mở rộng khớp nội dung",
    (name, content, mimeType, extension) => {
      const value = validateAttachment({ name, content });
      expect(value).toMatchObject({
        originalName: name,
        mimeType,
        extension,
        byteSize: content.length,
      });
      expect(value.sha256).toMatch(/^[0-9a-f]{64}$/);
    },
  );
  it.each([
    ["anh.png", pdf],
    ["chung-cu.pdf", png],
    ["anh.jpg", png],
    ["anh.png.exe", png],
    ["anh.svg", Buffer.from("<svg/>")],
    ["anh.png", Buffer.from("MZ executable")],
    ["tai-lieu.pdf", Buffer.from("<html>%PDF-1.7\n%%EOF</html>")],
    ["anh.png", png.subarray(0, -12)],
    ["anh.jpg", jpeg.subarray(0, -2)],
  ])("chặn tên %s đổi đuôi giả hoặc chữ ký bị cắt", (name, content) => {
    expect(() => validateAttachment({ name, content })).toThrowError(
      expect.objectContaining({ code: "INVALID_ATTACHMENT_TYPE" }),
    );
  });
  it.each([
    "../MSSV.png",
    "..\\MSSV.png",
    "C:\\fakepath\\x.png",
    "x.png:stream",
    ".hidden.png",
    "x\r\nname.pdf",
    "a".repeat(256) + ".png",
    "",
  ])("không nhận tên có đường dẫn/control: %s", (name) => {
    expect(() => validateAttachment({ name, content: png })).toThrowError(
      expect.objectContaining({ code: "INVALID_ATTACHMENT_NAME" }),
    );
  });
  it("không nhận tệp rỗng hoặc hơn5MiB; không cấp bản byte có thể bị sửa từ input", () => {
    expect(() =>
      validateAttachment({ name: "x.png", content: Buffer.alloc(0) }),
    ).toThrowError(expect.objectContaining({ code: "EMPTY_ATTACHMENT" }));
    expect(() =>
      validateAttachment({
        name: "x.pdf",
        content: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1),
      }),
    ).toThrowError(
      expect.objectContaining({ code: "ATTACHMENT_TOO_LARGE", status: 413 }),
    );
    const boundary = Buffer.alloc(MAX_ATTACHMENT_BYTES, 32);
    pdf.copy(boundary);
    Buffer.from("%%EOF\n").copy(boundary, boundary.length - 6);
    expect(
      validateAttachment({ name: "boundary.pdf", content: boundary }).byteSize,
    ).toBe(MAX_ATTACHMENT_BYTES);
    const content = Buffer.from(png);
    const checked = validateAttachment({ name: "x.png", content });
    content.fill(0);
    expect(checked.content.equals(png)).toBe(true);
  });
  it("giới hạn3tệp áp dụng cộng dồn trên phản hồi, không phải mỗi lần upload", () => {
    const upload = { name: "x.png", content: png };
    expect(validateAttachmentBatch([upload, upload, upload], 0)).toHaveLength(
      3,
    );
    expect(validateAttachmentBatch([upload], 2)).toHaveLength(1);
    for (const [uploads, existing] of [
      [[upload], 3],
      [[upload, upload], 2],
      [[upload, upload, upload, upload], 0],
    ] as const)
      expect(() => validateAttachmentBatch(uploads, existing)).toThrowError(
        expect.objectContaining({ code: "ATTACHMENT_LIMIT" }),
      );
    expect(() => validateAttachmentBatch([], 0)).toThrowError(
      expect.objectContaining({ code: "NO_ATTACHMENTS" }),
    );
  });
});

describe("BR-24/28/62/63 — tên tải xuống trung tính và header tệp riêng tư", () => {
  it.each(["image/png", "image/jpeg", "application/pdf"])(
    "header %s không dùng tên gốc, không cho xem inline/cache",
    (mimeType) => {
      const headers = attachmentDownloadHeaders(mimeType, 100);
      expect(headers["Content-Disposition"]).toBe(
        `attachment; filename="${safeAttachmentName(mimeType)}"`,
      );
      expect(headers["Content-Type"]).toBe(mimeType);
      expect(headers["Cache-Control"]).toContain("no-store");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["Content-Security-Policy"]).toContain("sandbox");
      expect(headers["Content-Length"]).toBe("100");
    },
  );
  it("không đưa MIME/header hỏng từ database vào phản hồi", () => {
    for (const type of [
      "text/html",
      "image/png\r\nX-Test: bad",
      "application/pdf; name=MSSV",
    ])
      expect(() => attachmentDownloadHeaders(type, 100)).toThrowError(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    for (const length of [-1, 0, MAX_ATTACHMENT_BYTES + 1])
      expect(() => attachmentDownloadHeaders("image/png", length)).toThrow();
  });
});
