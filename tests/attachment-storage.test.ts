import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readPrivateAttachment,
  removePrivateAttachment,
  writePrivateAttachment,
} from "../src/server/feedback/attachment-storage";

const localRoot = resolve(".local");
let testRoot: string;
beforeEach(async () => {
  testRoot = resolve(localRoot, `attachment-storage-test-${randomUUID()}`);
  vi.stubEnv("FEEDBACK_STORAGE_DIR", resolve(testRoot, "private"));
  await mkdir(testRoot, { recursive: true });
});
afterEach(async () => {
  vi.unstubAllEnvs();
  const relativeTarget = relative(localRoot, testRoot);
  if (
    !relativeTarget.startsWith("attachment-storage-test-") ||
    relativeTarget.includes(sep) ||
    isAbsolute(relativeTarget)
  )
    throw new Error("Từ chối dọn đường dẫn không thuộc thư mục thử đã tạo.");
  await rm(testRoot, { recursive: true, force: true });
});

describe("BR-28 — kho riêng, khóa UUID và giới hạn truy cập đường dẫn", () => {
  it("ghi bằng tên UUID ngoài public, đọc lại đủ byte và dọn đúng khóa riêng", async () => {
    const key = `${randomUUID()}.pdf`,
      bytes = Buffer.from("fixture-private");
    await writePrivateAttachment(key, bytes);
    expect((await readPrivateAttachment(key)).equals(bytes)).toBe(true);
    await removePrivateAttachment(key);
    await expect(readPrivateAttachment(key)).rejects.toMatchObject({
      code: "ATTACHMENT_STORAGE_ERROR",
    });
  });
  it("không ghi đè khóa đã có", async () => {
    const key = `${randomUUID()}.pdf`;
    await writePrivateAttachment(key, Buffer.from("first"));
    await expect(
      writePrivateAttachment(key, Buffer.from("second")),
    ).rejects.toMatchObject({ code: "ATTACHMENT_STORAGE_ERROR" });
    expect((await readPrivateAttachment(key)).toString()).toBe("first");
  });
  it.each([
    "../private.pdf",
    "..\\private.pdf",
    "C:\\secret.pdf",
    "file.pdf",
    `${randomUUID()}.pdf:stream`,
    `${randomUUID()}.html`,
  ])("chặn storageKey không do server cấp: %s", async (key) => {
    await expect(
      writePrivateAttachment(key, Buffer.from("fixture")),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(readPrivateAttachment(key)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(removePrivateAttachment(key)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(stat(resolve(testRoot, "private"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("từ chối cấu hình kho trong public trước khi tạo thư mục", async () => {
    const folder = resolve("public", `forbidden-upload-${randomUUID()}`);
    vi.stubEnv("FEEDBACK_STORAGE_DIR", folder);
    await expect(
      writePrivateAttachment(`${randomUUID()}.pdf`, Buffer.from("fixture")),
    ).rejects.toMatchObject({ code: "ATTACHMENT_STORAGE_ERROR" });
    await expect(stat(folder)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("không đọc symlink trỏ ra ngoài kho riêng", async (context) => {
    const root = resolve(testRoot, "private"),
      outside = resolve(testRoot, "outside.pdf"),
      key = `${randomUUID()}.pdf`;
    await mkdir(root);
    await writeFile(outside, "private-outside");
    try {
      await symlink(outside, resolve(root, key), "file");
    } catch (error) {
      // Báo skipped nếu Windows không cấp quyền tạo file symlink, không nhận là đã kiểm qua.
      if ((error as NodeJS.ErrnoException).code === "EPERM") context.skip();
      throw error;
    }
    await expect(readPrivateAttachment(key)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await readFile(outside)).toString()).toBe("private-outside");
  });
});
