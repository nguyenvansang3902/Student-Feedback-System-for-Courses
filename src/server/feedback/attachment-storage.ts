import { constants } from "node:fs";
import { mkdir, open, realpath, lstat, unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { AuthError } from "../auth/types";
import { MAX_ATTACHMENT_BYTES } from "./attachment-files";

const storageKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|pdf)$/;

function inside(parent: string, child: string): boolean {
  const difference = relative(parent, child);
  return (
    difference === "" ||
    (!difference.startsWith(`..${sep}`) &&
      difference !== ".." &&
      !isAbsolute(difference))
  );
}
function storageError(): AuthError {
  return new AuthError(
    "Chưa truy cập được tệp đính kèm. Vui lòng thử lại.",
    503,
    "ATTACHMENT_STORAGE_ERROR",
  );
}
function assertStorageKey(key: string): void {
  if (!storageKeyPattern.test(key))
    throw new AuthError("Không tìm thấy tệp đính kèm.", 404, "NOT_FOUND");
}

/** Chỉ gọi sau khi service đã xác minh quyền trên phản hồi trong database. */
async function storageRoot(create: boolean): Promise<string> {
  const configured = resolve(
    /* turbopackIgnore: true */ process.env.FEEDBACK_STORAGE_DIR ||
      ".local/private-feedback-attachments",
  );
  const publicPath = resolve("public");
  if (inside(publicPath, configured)) throw storageError();
  if (create) await mkdir(configured, { recursive: true, mode: 0o700 });
  const actualRoot = await realpath(/* turbopackIgnore: true */ configured);
  let actualPublic: string;
  try {
    actualPublic = await realpath(publicPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw storageError();
    actualPublic = publicPath;
  }
  if (inside(actualPublic, actualRoot)) throw storageError();
  return actualRoot;
}

function privatePath(root: string, key: string): string {
  assertStorageKey(key);
  const file = resolve(root, key);
  if (!inside(root, file) || file === root) throw storageError();
  return file;
}

export async function writePrivateAttachment(
  storageKey: string,
  content: Buffer,
): Promise<void> {
  assertStorageKey(storageKey);
  if (!content.length || content.length > MAX_ATTACHMENT_BYTES)
    throw storageError();
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let createdPath: string | undefined;
  try {
    const root = await storageRoot(true);
    createdPath = privatePath(root, storageKey);
    handle = await open(createdPath, "wx", 0o600);
    await handle.writeFile(content);
    await handle.close();
    handle = undefined;
  } catch (error) {
    if (handle && createdPath) {
      await handle.close().catch(() => undefined);
      handle = undefined;
      await unlink(createdPath).catch(() => undefined);
    }
    if (error instanceof AuthError) throw error;
    throw storageError();
  } finally {
    await handle?.close();
  }
}

export async function readPrivateAttachment(
  storageKey: string,
): Promise<Buffer> {
  assertStorageKey(storageKey);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const root = await storageRoot(false);
    const file = privatePath(root, storageKey);
    const entry = await lstat(file);
    if (
      !entry.isFile() ||
      entry.isSymbolicLink() ||
      entry.size < 1 ||
      entry.size > MAX_ATTACHMENT_BYTES
    )
      throw new AuthError("Không tìm thấy tệp đính kèm.", 404, "NOT_FOUND");
    // O_NOFOLLOW được hỗ trợ trên Unix; lstat vẫn bắt symlink/reparse thông thường ở Windows.
    handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const actual = await handle.stat();
    if (
      !actual.isFile() ||
      actual.size !== entry.size ||
      actual.ino !== entry.ino ||
      actual.dev !== entry.dev
    )
      throw storageError();
    return await handle.readFile();
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw storageError();
  } finally {
    await handle?.close();
  }
}

/** Chỉ xóa khóa UUID do chính lần upload thất bại tạo ra, không nhận đường dẫn từ client. */
export async function removePrivateAttachment(
  storageKey: string,
): Promise<void> {
  assertStorageKey(storageKey);
  const root = await storageRoot(false);
  const file = privatePath(root, storageKey);
  try {
    await unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw storageError();
  }
}
