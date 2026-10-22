import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".env"))
  throw new Error("Tạo .env từ .env.example trước khi sinh khóa.");
let text = readFileSync(".env", "utf8");
for (const name of ["JWT_SECRET", "MFA_ENCRYPTION_KEY"]) {
  const line = new RegExp(`^${name}\\s*=\\s*(.*)$`, "m");
  const existing = text
    .match(line)?.[1]
    .trim()
    .replace(/^["']|["']$/g, "");
  if (existing) {
    const valid =
      name === "JWT_SECRET" ? /^[a-f0-9]{64,}$/i : /^[a-f0-9]{64}$/i;
    if (!valid.test(existing))
      throw new Error(
        `${name} đã có nhưng sai định dạng; giữ nguyên, cần kiểm tra thủ công trước khi đổi khóa.`,
      );
    console.log(`Giữ nguyên ${name} đã có; không xuất khóa ra log.`);
    continue;
  }
  const assignment = `${name}=${randomBytes(32).toString("hex")}`;
  text = line.test(text)
    ? text.replace(line, () => assignment)
    : text.trimEnd() + "\n" + assignment + "\n";
  console.log(
    `Đã sinh ${name} 32 byte riêng vào .env; không xuất khóa ra log.`,
  );
}
if (!/^MFA_KEY_VERSION\s*=/m.test(text))
  text = text.trimEnd() + "\nMFA_KEY_VERSION=v1\n";
writeFileSync(".env", text);
