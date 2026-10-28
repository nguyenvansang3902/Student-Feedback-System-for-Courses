// Tạo môi trường demo mới, không xóa/reset database đã có.
import "./prepare-database.mjs";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";

const args = process.argv.slice(2);
if (args.some((a) => a !== "--prepare"))
  throw new Error("Cách dùng: npm run demo [-- --prepare]");
const size = process.env.DEMO_SIZE ?? "medium";
if (!["small", "medium", "large"].includes(size))
  throw new Error("DEMO_SIZE phải là small, medium hoặc large.");
if (process.env.NODE_ENV === "production")
  throw new Error("Demo chỉ dùng ở phát triển cục bộ.");
const port = Number(process.env.DEMO_PORT ?? 3001);
if (
  !Number.isInteger(port) ||
  port < 1025 ||
  port > 65535 ||
  [3000, 3002, 3003, 3004].includes(port)
)
  throw new Error("DEMO_PORT cần cổng riêng, mặc định 3001.");
if (!args.includes("--prepare"))
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(new Error("Cổng demo đang dùng; chọn DEMO_PORT khác.")),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
const main = new URL(process.env.DATABASE_URL);
const database = identifier(
  `${main.pathname.slice(1, 29)}_demo_${randomBytes(8).toString("hex")}`,
  "Database demo",
);
const exists = Number(
  requireMysql(
    mysql(
      `SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';`,
      { root: true },
    ),
  ),
);
if (exists) throw new Error("Tên database đã tồn tại; không sử dụng.");
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
const demoUrl = new URL(main);
demoUrl.pathname = `/${database}`;
const env = {
  ...process.env,
  DATABASE_URL: demoUrl.href,
  APP_URL: `http://127.0.0.1:${port}`,
  DEMO_SIZE: size,
  SFS_TEST_DIST_DIR: ".next-demo",
};
mkdirSync(".local/demo", { recursive: true });
const marker = {
  database,
  mainDatabase: main.pathname.slice(1),
  serverUuid: requireMysql(mysql("SELECT @@server_uuid;", { root: true })),
  purpose: "isolated-demo",
  size,
  port,
  createdAt: new Date().toISOString(),
};
writeFileSync(`.local/demo/${database}.json`, JSON.stringify(marker, null, 2));
writeFileSync(".local/demo/latest.json", JSON.stringify(marker, null, 2));
const text = readFileSync(".env", "utf8");
const assignment = `DEMO_DATABASE_URL="${demoUrl.href}"`;
writeFileSync(
  ".env",
  /^DEMO_DATABASE_URL\s*=/m.test(text)
    ? text.replace(/^DEMO_DATABASE_URL\s*=.*$/gm, () => assignment)
    : text.trimEnd() + "\n" + assignment + "\n",
);
for (const command of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["node_modules/tsx/dist/cli.mjs", "scripts/seed-auth.ts"],
  ["node_modules/tsx/dist/cli.mjs", "scripts/seed-demo.ts"],
]) {
  const result = spawnSync(process.execPath, command, {
    env,
    stdio: "inherit",
    windowsHide: true,
    timeout: 180000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      "Chuẩn bị demo chưa hoàn tất; database mới được giữ để kiểm tra, không reset dữ liệu.",
    );
}
console.log(
  `Demo ${size} đã sẵn sàng tại http://127.0.0.1:${port}. Database chính được giữ nguyên.`,
);
console.log(
  "Đăng nhập PDT2026001 để mở Danh mục & nhập liệu; DBCL2026001 để mở Mẫu phiếu. Mật khẩu mẫu xem README.",
);
if (!args.includes("--prepare")) {
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: "inherit", windowsHide: true },
  );
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}
