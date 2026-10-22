import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { z } from "zod";
import { getDb } from "../src/lib/db";
import { getAuthConfig } from "../src/lib/env";
import {
  createConsoleAdmin,
  resetConsoleAdminMfa,
} from "../src/server/services/admin-console";
import { AuthError } from "../src/server/auth/types";

async function passwordPrompt(): Promise<string> {
  process.stdout.write("Mật khẩu mới (không hiển thị): ");
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.off("keypress", keypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const keypress = (text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        finish();
        reject(new AuthError("Đã hủy thao tác."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
        resolve(value);
      } else if (key.name === "backspace")
        value = [...value].slice(0, -1).join("");
      else if (
        text &&
        !/[\u0000-\u001f\u007f]/.test(text) &&
        value.length < 4096
      )
        value += text;
    };
    process.stdin.on("keypress", keypress);
  });
}

async function input(mode: string): Promise<Record<string, unknown>> {
  if (!process.stdin.isTTY) {
    let size = 0;
    const parts: Buffer[] = [];
    for await (const chunk of process.stdin) {
      const part = Buffer.from(chunk);
      size += part.length;
      if (size > 8192) throw new AuthError("Dữ liệu quá lớn.");
      parts.push(part);
    }
    return z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(Buffer.concat(parts).toString("utf8")));
  }
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const loginCode = (await terminal.question("Mã ADMIN: ")).trim();
  const reason = (await terminal.question("Lý do (10–500 ký tự): ")).trim();
  if (mode === "reset-mfa") {
    const confirmation = await terminal.question(
      "Nhập lại chính xác mã ADMIN để xác nhận đặt lại 2FA: ",
    );
    terminal.close();
    return { loginCode, confirmation, reason };
  }
  const email = (await terminal.question("Email: ")).trim();
  const displayName = (await terminal.question("Tên hiển thị: ")).trim();
  terminal.close();
  const password = await passwordPrompt();
  const confirmation = await passwordPrompt();
  if (password !== confirmation)
    throw new AuthError("Hai mật khẩu không khớp.");
  return { loginCode, email, displayName, password, reason };
}

try {
  getAuthConfig();
  const mode = process.argv[2];
  if (!["create", "reset-mfa"].includes(mode) || process.argv.length !== 3)
    throw new AuthError(
      "Dùng npm run admin:create hoặc npm run admin:reset-2fa; không truyền mật khẩu qua tham số dòng lệnh.",
    );
  const { reason, ...data } = await input(mode);
  const actor = {
    kind: "SERVER_CONSOLE" as const,
    reason: z.string().trim().min(10).max(500).parse(reason),
  };
  const result =
    mode === "create"
      ? await createConsoleAdmin(actor, data)
      : await resetConsoleAdminMfa(actor, data);
  console.log(
    `Đã ${mode === "create" ? "tạo ADMIN; đăng nhập để đăng ký TOTP" : "đặt lại 2FA và thu hồi mọi phiên"}: ${result.loginCode}.`,
  );
} catch (error) {
  console.error(
    error instanceof AuthError
      ? error.message
      : "Thao tác chưa hoàn tất. Kiểm tra dữ liệu/cấu hình và kết nối database; không xuất chi tiết bí mật.",
  );
  process.exitCode = 1;
} finally {
  await getDb().$disconnect();
}
