import "dotenv/config";
import { spawnSync } from "node:child_process";

export function identifier(value, label) {
  if (!/^[A-Za-z0-9_]{1,64}$/.test(value ?? "")) throw new Error(`${label} không hợp lệ.`);
  return value;
}

/** SQL qua stdin; mật khẩu chỉ lấy trong container, không ghi vào dòng lệnh/log. */
export function mysql(sql, { root = false } = {}) {
  const command = root
    ? 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --batch --skip-column-names'
    : 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE" --batch --skip-column-names';
  return spawnSync("docker", ["compose", "exec", "-T", "db", "sh", "-c", command], {
    input: sql, encoding: "utf8", timeout: 30_000, windowsHide: true,
  });
}

export function requireMysql(result) {
  if (result.error || result.status !== 0) {
    // Không xuất stderr tùy ý: có thể chứa dữ liệu SQL hoặc thông tin kết nối.
    const errorCode = result.stderr?.match(/ERROR (\d+)/)?.[1];
    throw new Error(`Không thực hiện được SQL${errorCode ? ` (MySQL ${errorCode})` : ""}; kiểm tra Docker, biến môi trường và quyền database.`);
  }
  return result.stdout.trim();
}
