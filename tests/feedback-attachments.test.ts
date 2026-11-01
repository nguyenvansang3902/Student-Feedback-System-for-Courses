import { createHash, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, type AuthActor } from "../src/server/auth/types";
import {
  downloadFeedbackAttachment,
  uploadFeedbackAttachments,
} from "../src/server/services/feedback-attachments";

const { db, resource, files } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    attachment: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  resource: { requireFeedbackResource: vi.fn(), lockFeedback: vi.fn() },
  files: {
    readPrivateAttachment: vi.fn(),
    removePrivateAttachment: vi.fn(),
    writePrivateAttachment: vi.fn(),
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
vi.mock("../src/server/services/feedback", () => resource);
vi.mock("../src/server/feedback/attachment-storage", () => files);

const feedbackId = randomUUID(),
  attachmentId = randomUUID();
const bytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const upload = { name: "Nguyen-Van-A-MSSV123456.pdf", content: bytes };
function actor(role: AuthActor["roles"][number] = "SINH_VIEN"): AuthActor {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    loginCode: "SV_FAKE",
    email: "student@example.invalid",
    displayName: "Sinh viên giả",
    roles: [role],
    purpose: "FULL",
    mustChangePassword: false,
    mfa: role === "ADMIN",
    mfaRequired: role === "ADMIN",
    assignments: [
      { role, scopeType: "GLOBAL", facultyId: null, departmentId: null },
    ],
  };
}
function stored() {
  return {
    id: attachmentId,
    feedbackId,
    storageKey: `${randomUUID()}.pdf`,
    originalName: upload.name,
    mimeType: "application/pdf",
    byteSize: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    createdAt: new Date(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback) => callback(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.attachment.count.mockResolvedValue(0);
  db.attachment.create.mockImplementation(async ({ data }) => ({
    ...data,
    createdAt: new Date(),
  }));
  db.attachment.findFirst.mockResolvedValue(stored());
  resource.lockFeedback.mockResolvedValue(undefined);
  resource.requireFeedbackResource.mockImplementation(async (_tx, current) => ({
    actor: current,
    feedback: { id: feedbackId },
    isAuthor: true,
    inspectionId: null,
  }));
  files.writePrivateAttachment.mockResolvedValue(undefined);
  files.removePrivateAttachment.mockResolvedValue(undefined);
  files.readPrivateAttachment.mockResolvedValue(bytes);
  db.auditLog.create.mockResolvedValue({});
});

describe("FR-70 BR-24/28/34 — upload riêng tư và giới hạn cộng dồn", () => {
  it("chặn ADMIN, handler, phiên tạm trước truy cập database hoặc kho tệp", async () => {
    for (const current of [
      actor("ADMIN"),
      actor("GIANG_VIEN"),
      { ...actor(), purpose: "MFA_VERIFY" as const },
    ]) {
      await expect(
        uploadFeedbackAttachments(current, feedbackId, [upload]),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(files.writePrivateAttachment).not.toHaveBeenCalled();
  });
  it("quyền tài nguyên được đọc lại trước count hoặc fileIO; khóa feedback trước kiểm cộng dồn", async () => {
    const current = actor();
    resource.requireFeedbackResource.mockRejectedValue(
      new AuthError("Không tìm thấy.", 404, "NOT_FOUND"),
    );
    await expect(
      uploadFeedbackAttachments(current, feedbackId, [upload]),
    ).rejects.toMatchObject({ status: 404 });
    expect(resource.requireFeedbackResource).toHaveBeenCalledWith(
      db,
      current,
      feedbackId,
      "attach",
    );
    expect(resource.lockFeedback.mock.invocationCallOrder[0]).toBeLessThan(
      resource.requireFeedbackResource.mock.invocationCallOrder[0],
    );
    expect(db.attachment.count).not.toHaveBeenCalled();
    expect(files.writePrivateAttachment).not.toHaveBeenCalled();
  });
  it("tệp đổi đuôi, quá3tệp và quá5MiB bị chặn trước fileIO/metadataDB", async () => {
    const current = actor();
    await expect(
      uploadFeedbackAttachments(current, feedbackId, [
        { ...upload, name: "fake.png" },
      ]),
    ).rejects.toMatchObject({ code: "INVALID_ATTACHMENT_TYPE" });
    db.attachment.count.mockResolvedValue(3);
    await expect(
      uploadFeedbackAttachments(current, feedbackId, [upload]),
    ).rejects.toMatchObject({ code: "ATTACHMENT_LIMIT" });
    db.attachment.count.mockResolvedValue(0);
    await expect(
      uploadFeedbackAttachments(current, feedbackId, [
        { name: "large.pdf", content: Buffer.alloc(5 * 1024 * 1024 + 1) },
      ]),
    ).rejects.toMatchObject({ status: 413 });
    expect(files.writePrivateAttachment).not.toHaveBeenCalled();
    expect(db.attachment.create).not.toHaveBeenCalled();
  });
  it("cấp khóa UUID, lưu SHA256 nhưng DTO/audit không lộ tên gốc, storageKey hoặc hash", async () => {
    const output = await uploadFeedbackAttachments(actor(), feedbackId, [
      upload,
    ]);
    const saved = db.attachment.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      feedbackId,
      originalName: upload.name,
      mimeType: "application/pdf",
      byteSize: bytes.length,
    });
    expect(saved.storageKey).toMatch(/^[a-f0-9-]{36}\.pdf$/);
    expect(saved.storageKey).not.toContain("MSSV");
    expect(saved.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(files.writePrivateAttachment).toHaveBeenCalledWith(
      saved.storageKey,
      bytes,
    );
    expect(
      resource.requireFeedbackResource.mock.invocationCallOrder[0],
    ).toBeLessThan(files.writePrivateAttachment.mock.invocationCallOrder[0]);
    expect(output).toMatchObject([
      {
        displayName: "tep-dinh-kem.pdf",
        mimeType: "application/pdf",
        byteSize: bytes.length,
      },
    ]);
    const dto = JSON.stringify(output),
      audit = JSON.stringify(db.auditLog.create.mock.calls);
    for (const value of [upload.name, saved.storageKey, saved.sha256]) {
      expect(dto).not.toContain(value);
      expect(audit).not.toContain(value);
    }
    expect(output[0].downloadUrl).toBe(
      `/api/feedback/${feedbackId}/attachments/${saved.id}`,
    );
  });
  it("giao dịch nối tiếp do khóa hàng giữ tối đa3khi hai lần upload đồng thời", async () => {
    let count = 0,
      tail: Promise<unknown> = Promise.resolve();
    db.$transaction.mockImplementation((callback) => {
      const result = tail.then(() => callback(db));
      tail = result.catch(() => undefined);
      return result;
    });
    db.attachment.count.mockImplementation(async () => count);
    db.attachment.create.mockImplementation(async ({ data }) => {
      count++;
      return { ...data, createdAt: new Date() };
    });
    const current = actor();
    const results = await Promise.allSettled([
      uploadFeedbackAttachments(current, feedbackId, [upload, upload]),
      uploadFeedbackAttachments(current, feedbackId, [upload, upload]),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(count).toBe(2);
    expect(files.writePrivateAttachment).toHaveBeenCalledTimes(2);
  });
  it("DB lưu lỗi phải dọn đúng file vừa tạo, không xóa file của lần gọi khác", async () => {
    db.attachment.create.mockRejectedValue(new Error("fixture-db-failure"));
    await expect(
      uploadFeedbackAttachments(actor(), feedbackId, [upload]),
    ).rejects.toMatchObject({ code: "ATTACHMENT_SAVE_FAILED" });
    const written = files.writePrivateAttachment.mock.calls[0][0];
    expect(files.removePrivateAttachment).toHaveBeenCalledOnce();
    expect(files.removePrivateAttachment).toHaveBeenCalledWith(written);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("file thứ2 lỗi hoặc audit lỗi đều dọn các khóa thuộc lần upload chưa commit", async () => {
    files.writePrivateAttachment
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new AuthError("fixture", 503, "ATTACHMENT_STORAGE_ERROR"),
      );
    await expect(
      uploadFeedbackAttachments(actor(), feedbackId, [upload, upload]),
    ).rejects.toMatchObject({ code: "ATTACHMENT_STORAGE_ERROR" });
    expect(files.removePrivateAttachment).toHaveBeenCalledWith(
      files.writePrivateAttachment.mock.calls[0][0],
    );
    files.writePrivateAttachment.mockResolvedValue(undefined);
    db.auditLog.create.mockRejectedValue(new Error("audit-unavailable"));
    files.removePrivateAttachment.mockClear();
    await expect(
      uploadFeedbackAttachments(actor(), feedbackId, [upload]),
    ).rejects.toMatchObject({ code: "ATTACHMENT_SAVE_FAILED" });
    expect(files.removePrivateAttachment).toHaveBeenCalledOnce();
  });
});

describe("FR-70 BR-28/61/62/63/68 — download có quyền, bảo toàn tệp và audit", () => {
  it("chặn ADMIN trước DB; quyền mới bị thu hồi hoặc conflict trả404 trước metadata/fileIO", async () => {
    await expect(
      downloadFeedbackAttachment(actor("ADMIN"), feedbackId, attachmentId),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
    resource.requireFeedbackResource.mockRejectedValue(
      new AuthError("Không tìm thấy.", 404, "NOT_FOUND"),
    );
    await expect(
      downloadFeedbackAttachment(actor("THANH_TRA"), feedbackId, attachmentId),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.attachment.findFirst).not.toHaveBeenCalled();
    expect(files.readPrivateAttachment).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("không dùng attachmentID của phản hồi khác để vượt quyền", async () => {
    db.attachment.findFirst.mockResolvedValue(null);
    await expect(
      downloadFeedbackAttachment(actor(), feedbackId, attachmentId),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.attachment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: attachmentId, feedbackId } }),
    );
    expect(files.readPrivateAttachment).not.toHaveBeenCalled();
  });
  it("mỗi lần tải hồ sơ Thanh tra có audit riêng; tên tải xuống không lộ danh tính", async () => {
    const current = actor("THANH_TRA"),
      inspectionId = randomUUID();
    resource.requireFeedbackResource.mockResolvedValue({
      actor: current,
      inspectionId,
      isAuthor: false,
      feedback: { id: feedbackId },
    });
    const first = await downloadFeedbackAttachment(
      current,
      feedbackId,
      attachmentId,
    );
    await downloadFeedbackAttachment(current, feedbackId, attachmentId);
    expect(first.content.equals(bytes)).toBe(true);
    expect(first.headers["Content-Disposition"]).toBe(
      'attachment; filename="tep-dinh-kem.pdf"',
    );
    expect(first.headers["Cache-Control"]).toContain("no-store");
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: current.userId,
        action: "INSPECTION_ATTACHMENT_DOWNLOADED",
        objectType: "InspectionCase",
        objectId: inspectionId,
      }),
    });
    expect(JSON.stringify(first.headers)).not.toContain(upload.name);
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(
      upload.name,
    );
    expect(
      resource.requireFeedbackResource.mock.invocationCallOrder[0],
    ).toBeLessThan(files.readPrivateAttachment.mock.invocationCallOrder[0]);
  });
  it("không trả byte nếu kích thước/hash bị đổi hoặc không ghi được audit", async () => {
    files.readPrivateAttachment.mockResolvedValue(Buffer.from("tampered"));
    await expect(
      downloadFeedbackAttachment(actor(), feedbackId, attachmentId),
    ).rejects.toMatchObject({ code: "ATTACHMENT_INTEGRITY_ERROR" });
    expect(db.auditLog.create).not.toHaveBeenCalled();
    files.readPrivateAttachment.mockResolvedValue(bytes);
    db.auditLog.create.mockRejectedValue(new Error("audit-failure"));
    await expect(
      downloadFeedbackAttachment(actor(), feedbackId, attachmentId),
    ).rejects.toMatchObject({ code: "ATTACHMENT_DOWNLOAD_FAILED" });
  });
});
