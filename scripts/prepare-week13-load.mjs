import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";
import { assertLoadDatabase } from "./lib/week13-load-safety.mjs";

const args = process.argv.slice(2);
assert(
  args.length === 0 || (args.length === 1 && args[0] === "--locks"),
  "Chỉ nhận tùy chọn --locks.",
);
const locks = args.includes("--locks");
const main = new URL(process.env.DATABASE_URL ?? "");
const mainDatabase = identifier(
  decodeURIComponent(main.pathname.slice(1)),
  "Database chính",
);
assert(
  main.protocol === "mysql:" &&
    ["127.0.0.1", "localhost"].includes(main.hostname),
);
const published = spawnSync("docker", ["compose", "port", "db", "3306"], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 15000,
});
assert(
  !published.error &&
    published.status === 0 &&
    published.stdout
      .split(/\r?\n/)
      .some(
        (line) =>
          Number(line.match(/:(\d+)$/)?.[1]) === Number(main.port || "3306"),
      ),
  "Cổng MySQL không khớp Compose.",
);
const serverUuid = requireMysql(mysql("SELECT @@server_uuid;", { root: true }));
mkdirSync(".local", { recursive: true });
const markerFile = locks
  ? ".local/week13-lock-database.json"
  : ".local/week13-load-database.json";
const otherMarkerFile = locks
  ? ".local/week13-load-database.json"
  : ".local/week13-lock-database.json";
const marker = existsSync(markerFile)
  ? JSON.parse(readFileSync(markerFile, "utf8"))
  : {
      purpose: "isolated-week13-load-tests",
      mainDatabase,
      serverUuid,
      database: `${mainDatabase.slice(0, 34)}_w13load_${randomBytes(4).toString("hex")}`,
    };
const test = new URL(main);
test.pathname = `/${marker.database}`;
const forbidden = Object.entries(process.env)
  .filter(([key]) => /(?:SHADOW|TEST).*DATABASE_URL/.test(key))
  .map(([, value]) => value)
  .filter(Boolean);
if (existsSync(otherMarkerFile)) {
  const other = new URL(main);
  other.pathname = `/${JSON.parse(readFileSync(otherMarkerFile, "utf8")).database}`;
  forbidden.push(other.href);
}
assertLoadDatabase(main.href, test.href, marker, forbidden);
assert.equal(
  marker.serverUuid,
  serverUuid,
  "Marker không thuộc MySQL Compose hiện tại.",
);
const database = identifier(marker.database, "Database tải");
const exists = Number(
  requireMysql(
    mysql(
      `SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';`,
      { root: true },
    ),
  ),
);
assert(
  !exists || existsSync(markerFile),
  "Database đã tồn tại mà không có marker; không sử dụng.",
);
if (!exists)
  requireMysql(
    mysql(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;`,
      { root: true },
    ),
  );
const user = identifier(process.env.MYSQL_USER, "Tài khoản MySQL");
requireMysql(
  mysql(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${user}'@'%';`, {
    root: true,
  }),
);
writeFileSync(markerFile, JSON.stringify(marker, null, 2) + "\n");
const migrated = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: { ...process.env, DATABASE_URL: test.href },
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  },
);
assert(
  !migrated.error && migrated.status === 0,
  "Migration database tải chưa hoàn tất; không xuất cấu hình riêng.",
);
console.log(
  "Database tải Tuần13 riêng đã sẵn sàng; không reset/xóa/sao chép database hoặc sửa .env.",
);
