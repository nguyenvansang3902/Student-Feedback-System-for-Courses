import "dotenv/config";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { assertSeparateShadowDatabase } from "../prisma/database-urls.ts";
import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";

if (!existsSync(".env"))
  throw new Error("Cần tạo .env từ .env.example trước khi chuẩn bị.");
const main = new URL(process.env.DATABASE_URL ?? "");
const database = identifier(
  decodeURIComponent(main.pathname.slice(1)),
  "Tên database",
);
const user = identifier(process.env.MYSQL_USER, "Tên tài khoản MySQL");
if (
  main.protocol !== "mysql:" ||
  !["127.0.0.1", "localhost"].includes(main.hostname) ||
  (main.port || "3306") !== "3306" ||
  database !== process.env.MYSQL_DATABASE ||
  decodeURIComponent(main.username) !== user ||
  decodeURIComponent(main.password) !== process.env.MYSQL_PASSWORD
) {
  throw new Error("Lệnh chuẩn bị chỉ dùng cho MySQL Compose cục bộ khớp .env.");
}
assertSeparateShadowDatabase(
  main.href,
  process.env.SHADOW_DATABASE_URL?.trim() || undefined,
);

// Không dùng một Docker daemon từ xa để chuẩn bị cho URL MySQL loopback.
if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT)
  throw new Error(
    "Bỏ Docker endpoint override trước khi chuẩn bị database cục bộ.",
  );
const context = spawnSync(
  "docker",
  ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
  { encoding: "utf8", windowsHide: true, timeout: 15_000 },
);
const endpoint = context.stdout?.trim();
if (
  context.error ||
  context.status !== 0 ||
  !(
    endpoint?.startsWith("npipe://") ||
    endpoint === "unix:///var/run/docker.sock" ||
    endpoint?.startsWith("unix:///run/user/")
  )
)
  throw new Error("Cần Docker context cục bộ trước khi chuẩn bị database.");
const serverUuid = requireMysql(mysql("SELECT @@server_uuid;", { root: true }));
if (!/^[a-f0-9-]{36}$/i.test(serverUuid))
  throw new Error("Không đọc được định danh MySQL Compose.");
// Xác minh chính DATABASE_URL trỏ tới cùng server trước mọi CREATE/GRANT.
// Nhánh khác server cố ý tạo lỗi PREPARE; không sửa bảng hay dữ liệu.
const probe = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "db", "execute", "--stdin"],
  {
    input: `SET @w2_probe_sql = IF(@@server_uuid='${serverUuid}', 'SELECT 1', 'INVALID_SERVER_IDENTITY');\nPREPARE w2_probe FROM @w2_probe_sql;\nEXECUTE w2_probe;\nDEALLOCATE PREPARE w2_probe;\n`,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  },
);
if (probe.error || probe.status !== 0)
  throw new Error(
    "DATABASE_URL chưa được xác minh trùng server MySQL Compose; dừng trước khi tạo hoặc cấp quyền shadow.",
  );

const markerPath = ".local/shadow-database.json";
const previous = existsSync(markerPath)
  ? JSON.parse(readFileSync(markerPath, "utf8"))
  : null;
const configuredShadow = process.env.SHADOW_DATABASE_URL?.trim() || undefined;
const shadowUrl = new URL(configuredShadow ?? main.href);
if (!configuredShadow)
  shadowUrl.pathname = `/${database.slice(0, 40)}_shadow_${randomBytes(4).toString("hex")}`;
assertSeparateShadowDatabase(main.href, shadowUrl.href);
if (
  main.protocol !== shadowUrl.protocol ||
  main.host !== shadowUrl.host ||
  main.username !== shadowUrl.username ||
  main.password !== shadowUrl.password
) {
  throw new Error(
    "Shadow phải dùng cùng MySQL Compose và tài khoản phát triển; tên database phải khác.",
  );
}
const shadow = identifier(
  decodeURIComponent(shadowUrl.pathname.slice(1)),
  "Tên shadow database",
);
const existing = Number(
  requireMysql(
    mysql(
      `SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${shadow}';`,
      { root: true },
    ),
  ),
);
if (
  existing &&
  (previous?.database !== shadow ||
    previous?.mainDatabase !== database ||
    previous?.serverUuid !== serverUuid ||
    previous?.disposable !== true)
) {
  throw new Error(
    "Database shadow đã tồn tại nhưng không do lệnh này tạo. Chọn database shadow mới, không dùng database có dữ liệu cần giữ.",
  );
}
if (!existing)
  requireMysql(
    mysql(
      `CREATE DATABASE \`${shadow}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;`,
      { root: true },
    ),
  );
requireMysql(
  mysql(`GRANT ALL PRIVILEGES ON \`${shadow}\`.* TO '${user}'@'%';`, {
    root: true,
  }),
);
mkdirSync(".local", { recursive: true });
writeFileSync(
  markerPath,
  JSON.stringify(
    { database: shadow, mainDatabase: database, serverUuid, disposable: true },
    null,
    2,
  ) + "\n",
);
if (!configuredShadow) {
  const text = readFileSync(".env", "utf8");
  const assignment = "SHADOW_DATABASE_URL=" + JSON.stringify(shadowUrl.href);
  const updated = /^\s*(?:export\s+)?SHADOW_DATABASE_URL\s*=.*$/m.test(text)
    ? text.replace(
        /^\s*(?:export\s+)?SHADOW_DATABASE_URL\s*=.*$/gm,
        () => assignment,
      )
    : text.trimEnd() +
      "\n\n# Database shadow riêng, có thể bị Prisma làm rỗng.\n" +
      assignment +
      "\n";
  writeFileSync(".env", updated);
}
console.log(
  "Đã chuẩn bị database shadow riêng; quyền chỉ áp dụng trên database này. Database phát triển và volume được giữ.",
);
