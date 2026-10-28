import { identifier, mysql, requireMysql } from "./lib/mysql.mjs";
import { spawnSync } from "node:child_process";

// Enum cũ trộn lịch học và cơ sở vật chất. Không đoán cách phân loại lại.
const target = new URL(process.env.DATABASE_URL ?? "");
if (target.protocol !== "mysql:" || !["localhost", "127.0.0.1"].includes(target.hostname))
  throw new Error("Preflight Điều chỉnh 01 chỉ hỗ trợ MySQL cục bộ của dự án.");
const database = identifier(decodeURIComponent(target.pathname.slice(1)), "Database đích");
const published = spawnSync("docker", ["compose", "port", "db", "3306"], {encoding: "utf8", timeout: 15000, windowsHide: true});
const context = spawnSync("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], {encoding: "utf8", timeout: 15000, windowsHide: true});
const endpoint = context.stdout?.trim();
if (published.status !== 0 || context.status !== 0 ||
    !(endpoint?.startsWith("npipe://") || endpoint === "unix:///var/run/docker.sock") ||
    !published.stdout.split(/\r?\n/).some((line) => Number(line.match(/:(\d+)$/)?.[1]) === Number(target.port || 3306)))
  throw new Error("Database đích không khớp cổng MySQL do Docker Compose cục bộ công bố; dừng trước migration.");
const exists = Number(requireMysql(mysql(`SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${database}' AND TABLE_NAME='Feedback';`)));
const count = exists ? Number(requireMysql(mysql(`SELECT COUNT(*) FROM \`${database}\`.Feedback WHERE category = 'CSVC_LICH_HOC';`))) : 0;
if (count !== 0) {
  throw new Error("Có phản hồi CSVC_LICH_HOC cũ. Dừng migration Điều chỉnh 01; cần người dùng xác nhận cách phân loại từng phản hồi, không tự chuyển nội dung.");
}
console.log("Điều chỉnh 01: không có phản hồi thuộc enum cũ; có thể áp dụng migration.");
