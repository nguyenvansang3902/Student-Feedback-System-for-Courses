// Giữ bộ kiểm WEEK12 riêng vì fixture của bộ này giữ User/AuditLog làm lịch sử.
import "./prepare-database.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";
import { parse } from "dotenv";

// prepare-database có thể vừa ghi shadow URL lần đầu; chỉ nạp các URL cần kiểm.
const environment = parse(readFileSync(".env", "utf8"));
if (!process.env.SHADOW_DATABASE_URL)
  process.env.SHADOW_DATABASE_URL = environment.SHADOW_DATABASE_URL;
const main = new URL(process.env.DATABASE_URL);
const mainDatabase = decodeURIComponent(main.pathname.slice(1));
const shadowDatabase = decodeURIComponent(
  new URL(process.env.SHADOW_DATABASE_URL).pathname.slice(1),
);
const week4Url =
  process.env.W4_TEST_DATABASE_URL || environment.W4_TEST_DATABASE_URL;
const week4Database = week4Url
  ? decodeURIComponent(new URL(week4Url).pathname.slice(1))
  : null;
const week4Marker = existsSync(".local/week4-test-database.json")
  ? JSON.parse(readFileSync(".local/week4-test-database.json", "utf8"))
  : null;
const published = spawnSync("docker", ["compose", "port", "db", "3306"], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 15000,
});
if (
  published.error ||
  published.status !== 0 ||
  !published.stdout
    .split(/\r?\n/)
    .some(
      (line) =>
        Number(line.match(/:(\d+)$/)?.[1]) === Number(main.port || "3306"),
    )
)
  throw new Error(
    "Cổng MySQL không khớp Docker Compose cục bộ; dừng trước khi tạo database WEEK12.",
  );
const serverUuid = requireMysql(mysql("SELECT @@server_uuid;", { root: true }));
const markerFile = ".local/week12-test-database.json";
const previous = existsSync(markerFile)
  ? JSON.parse(readFileSync(markerFile, "utf8"))
  : null;
if (
  previous &&
  (previous.serverUuid !== serverUuid ||
    previous.mainDatabase !== mainDatabase ||
    previous.purpose !== "isolated-week12-tests")
)
  throw new Error(
    "Marker WEEK12 không khớp MySQL Compose hiện tại; giữ nguyên để kiểm tra thủ công.",
  );
const prefix = `${mainDatabase.slice(0, 34)}_w12test_`;
const database = identifier(
  previous?.database ?? `${prefix}${randomBytes(4).toString("hex")}`,
  "Database WEEK12",
);
if (
  !database.startsWith(prefix) ||
  !/^[a-f0-9]{8}$/.test(database.slice(prefix.length)) ||
  [mainDatabase, shadowDatabase, week4Database, week4Marker?.database].includes(
    database,
  )
)
  throw new Error(
    "Database WEEK12 phải riêng, đúng tiền tố và khác main, shadow, Tuần4.",
  );
const existing = Number(
  requireMysql(
    mysql(
      `SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';`,
      { root: true },
    ),
  ),
);
if (existing && !previous)
  throw new Error(
    "Database WEEK12 đã tồn tại nhưng không có marker; không sử dụng.",
  );
if (!existing)
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
writeFileSync(
  markerFile,
  JSON.stringify(
    {
      database,
      mainDatabase,
      serverUuid,
      purpose: "isolated-week12-tests",
    },
    null,
    2,
  ) + "\n",
);
const testUrl = new URL(main);
testUrl.pathname = `/${database}`;
const text = readFileSync(".env", "utf8");
const assignment = `WEEK12_TEST_DATABASE_URL="${testUrl.href}"`;
writeFileSync(
  ".env",
  /^WEEK12_TEST_DATABASE_URL\s*=/m.test(text)
    ? text.replace(/^WEEK12_TEST_DATABASE_URL\s*=.*$/gm, () => assignment)
    : text.trimEnd() + "\n" + assignment + "\n",
);
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: { ...process.env, DATABASE_URL: testUrl.href },
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  },
);
if (result.error || result.status !== 0)
  throw new Error(
    "Migration database WEEK12 chưa hoàn tất; không xuất SQL hoặc chuỗi kết nối.",
  );
console.log(
  "Database kiểm thử Tuần12 riêng đã sẵn sàng; giữ database và marker Tuần4, không sao chép, reset hoặc xóa database.",
);
