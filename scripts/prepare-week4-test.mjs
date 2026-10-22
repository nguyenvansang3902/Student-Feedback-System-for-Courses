// Tái dùng toàn bộ guard Compose/endpoint/server identity/tài khoản của shadow.
import "./prepare-database.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";
import { parse } from "dotenv";

// prepare-database có thể vừa ghi shadow URL lần đầu; nạp đúng trường mới vào process.
if (!process.env.SHADOW_DATABASE_URL)
  process.env.SHADOW_DATABASE_URL = parse(
    readFileSync(".env", "utf8"),
  ).SHADOW_DATABASE_URL;

const main = new URL(process.env.DATABASE_URL);
const serverUuid = requireMysql(mysql("SELECT @@server_uuid;", { root: true }));
const markerFile = ".local/week4-test-database.json";
const previous = existsSync(markerFile)
  ? JSON.parse(readFileSync(markerFile, "utf8"))
  : null;
if (
  previous &&
  (previous.serverUuid !== serverUuid ||
    previous.mainDatabase !== main.pathname.slice(1) ||
    previous.purpose !== "isolated-week4-tests")
)
  throw new Error(
    "Marker database thử không khớp MySQL Compose hiện tại; giữ nguyên và kiểm tra thủ công.",
  );
const database = identifier(
  previous?.database ??
    `${main.pathname.slice(1, 35)}_w4test_${randomBytes(4).toString("hex")}`,
  "Database thử",
);
if (
  database === main.pathname.slice(1) ||
  database === new URL(process.env.SHADOW_DATABASE_URL).pathname.slice(1)
)
  throw new Error("Database thử phải khác main và shadow.");
const existing = Number(
  requireMysql(
    mysql(
      `SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';`,
      { root: true },
    ),
  ),
);
if (existing && !previous)
  throw new Error("Database đã có nhưng không có marker; không sử dụng.");
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
      mainDatabase: main.pathname.slice(1),
      serverUuid,
      purpose: "isolated-week4-tests",
    },
    null,
    2,
  ),
);
const testUrl = new URL(main);
testUrl.pathname = `/${database}`;
const env = readFileSync(".env", "utf8");
const assignment = `W4_TEST_DATABASE_URL="${testUrl.href}"`;
writeFileSync(
  ".env",
  /^W4_TEST_DATABASE_URL\s*=/m.test(env)
    ? env.replace(/^W4_TEST_DATABASE_URL\s*=.*$/gm, () => assignment)
    : env.trimEnd() + "\n" + assignment + "\n",
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
    "Migration database thử chưa hoàn tất; không xuất SQL hoặc chuỗi kết nối.",
  );
console.log(
  "Database kiểm thử Tuần 4 riêng đã sẵn sàng; không sao chép hoặc thay đổi dữ liệu main, không reset/xóa database.",
);
