import { spawnSync } from "node:child_process";
import { getDb } from "../src/lib/db";
import { getAuthConfig } from "../src/lib/env";

const config = getAuthConfig();
const target = new URL(config.databaseUrl);
if (
  process.env.NODE_ENV !== "production" ||
  target.protocol !== "mysql:" ||
  target.hostname !== "db" ||
  target.port !== "3306" ||
  target.search ||
  target.hash ||
  !/^[A-Za-z0-9_]{1,32}$/.test(target.username) ||
  target.username.toLowerCase() === "root" ||
  !/^[a-fA-F0-9]{32,}$/.test(target.password) ||
  !/^\/[A-Za-z0-9_]{1,64}$/.test(target.pathname)
)
  throw new Error(
    "Chỉ migrate database riêng của Compose production với user ứng dụng và mật khẩu hex.",
  );

const db = getDb();
try {
  // Giữ preflight Điều chỉnh 01 của launcher cục bộ trong môi trường container.
  const columns = await db.$queryRaw<{ COLUMN_TYPE: string }[]>`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Feedback'
      AND COLUMN_NAME = 'category'`;
  if (columns.some((row) => row.COLUMN_TYPE.includes("'CSVC_LICH_HOC'"))) {
    const rows = await db.$queryRaw<{ amount: bigint }[]>`
      SELECT COUNT(*) AS amount FROM Feedback WHERE category = 'CSVC_LICH_HOC'`;
    if (Number(rows[0]?.amount ?? 0) > 0)
      throw new Error(
        "Còn phản hồi CSVC_LICH_HOC cũ. Dừng migration và phân loại dữ liệu theo quyết định nghiệp vụ.",
      );
  }
} finally {
  await db.$disconnect();
}

const migration = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit" },
);
if (migration.error || migration.status !== 0) process.exitCode = 1;
