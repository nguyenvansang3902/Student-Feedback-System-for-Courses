import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".env"))
  throw new Error("Tạo .env từ .env.example trước khi sinh khóa.");
let text = readFileSync(".env", "utf8");
const found = text.match(/^JWT_SECRET\s*=\s*["']?([a-f0-9]{64,})["']?\s*$/im);
if (found) {
  console.log(
    "Đã có khóa JWT trong .env, giữ nguyên để không ngắt các phiên hiện tại.",
  );
} else {
  const assignment = `JWT_SECRET=${randomBytes(32).toString("hex")}`;
  text = /^JWT_SECRET\s*=/m.test(text)
    ? text.replace(/^JWT_SECRET\s*=.*$/gm, () => assignment)
    : text.trimEnd() + "\n" + assignment + "\n";
  writeFileSync(".env", text);
  console.log(
    "Đã sinh khóa JWT 32 byte và lưu trong .env; không xuất khóa ra log.",
  );
}
