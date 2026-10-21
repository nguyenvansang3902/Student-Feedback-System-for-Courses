import bcrypt from "bcryptjs";
import { getAuthConfig } from "../../lib/env";
import { AuthError } from "./types";

// Danh sách nhỏ trong repo, đối chiếu không phân biệt hoa thường.
export const commonPasswords: ReadonlySet<string> = new Set([
  "1234567890",
  "12345678901",
  "123456789012",
  "password123",
  "password1234",
  "password12345",
  "qwerty12345",
  "qwertyuiop",
  "admin123456",
  "administrator",
  "iloveyou123",
  "letmein1234",
  "welcome123",
  "welcome1234",
  "changeme123",
]);

export function validatePassword(password: string): void {
  if ([...password].length < 10) {
    throw new AuthError(
      "Mật khẩu phải có ít nhất 10 ký tự.",
      400,
      "WEAK_PASSWORD",
    );
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new AuthError(
      "Mật khẩu không được vượt quá 72 byte UTF-8 (ký tự tiếng Việt có thể chiếm nhiều byte).",
      400,
      "PASSWORD_TOO_LONG",
    );
  }
  if (commonPasswords.has(password.toLowerCase())) {
    throw new AuthError(
      "Mật khẩu này quá phổ biến. Hãy chọn mật khẩu khác.",
      400,
      "COMMON_PASSWORD",
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const { bcryptCost } = getAuthConfig();
  if (!Number.isInteger(bcryptCost) || bcryptCost < 12 || bcryptCost > 16) {
    throw new Error("BCRYPT_COST phải là số nguyên từ 12 đến 16.");
  }
  return bcrypt.hash(password, bcryptCost);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // Không cho bcrypt âm thầm cắt phần vượt quá giới hạn 72 byte.
  if (Buffer.byteLength(password, "utf8") > 72) return false;
  return bcrypt.compare(password, hash);
}

// Hash giả cost 12; luôn chạy compare khi tài khoản không có mật khẩu hợp lệ.
// Không phải mật khẩu của bất kỳ tài khoản seed nào.
export const dummyPasswordHash =
  "$2b$12$jXy5hawpjCg15CaiqeWb8uNri2EJ/XZ7iB5SwOBu.fkl6hLAuWvvC";
