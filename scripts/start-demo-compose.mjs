import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const project = "sfs-week14-demo";
const envFile = join(cwd, ".local", "week14-demo", ".env");
const secrets = [
  "SFS_DEMO_DB_PASSWORD",
  "SFS_DEMO_DB_ROOT_PASSWORD",
  "SFS_DEMO_JWT_SECRET",
  "SFS_DEMO_MFA_KEY",
];
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(?:SFS_DEMO_|COMPOSE_)/i.test(key)) delete env[key];
}

function docker(args, print = false) {
  const result = spawnSync("docker", args, {
    cwd,
    env,
    windowsHide: true,
    encoding: "utf8",
    stdio: print ? "inherit" : ["ignore", "pipe", "pipe"],
    ...(print ? {} : { timeout: 30_000 }),
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("Chưa tìm thấy Docker CLI. Mở Docker Desktop và thử lại.");
  }
  if (result.error || result.status !== 0) {
    throw new Error(
      "Lệnh Docker không hoàn tất. Kiểm tra engine và log Compose.",
    );
  }
  return result.stdout?.trim() ?? "";
}

try {
  if (process.argv.length !== 2 || process.env.DOCKER_HOST) {
    throw new Error(
      "Chạy node scripts/start-demo-compose.mjs với Docker context cục bộ, không đặt DOCKER_HOST.",
    );
  }
  const context = docker(["context", "show"]);
  const endpoint = docker([
    "context",
    "inspect",
    context,
    "--format",
    "{{.Endpoints.docker.Host}}",
  ]);
  if (!/^(?:npipe:\/\/\/\/\.\/pipe\/|unix:\/\/\/)/i.test(endpoint)) {
    throw new Error("Demo chỉ chạy trên Docker context cục bộ.");
  }
  const pin = ["--context", context];
  if (docker([...pin, "info", "--format", "{{.OSType}}"]) !== "linux") {
    throw new Error("Docker phải chạy Linux containers.");
  }

  if (!existsSync(envFile)) {
    const label = [
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "-q",
    ];
    if (
      docker([...pin, "volume", "ls", ...label]) ||
      docker([...pin, "ps", "-a", ...label])
    ) {
      throw new Error(
        "Demo đã có dữ liệu nhưng thiếu tệp .local/week14-demo/.env. Hãy lấy lại tệp cấu hình đã lưu.",
      );
    }
    mkdirSync(dirname(envFile), { recursive: true });
    const content = secrets
      .map((key) => `${key}=${randomBytes(32).toString("hex")}`)
      .join("\n");
    writeFileSync(envFile, content + "\n", { flag: "wx", mode: 0o600 });
  }

  const saved = parseEnv(readFileSync(envFile, "utf8"));
  if (
    Object.keys(saved).length !== secrets.length ||
    secrets.some((key) => !/^[a-f0-9]{64}$/.test(saved[key] ?? "")) ||
    new Set(secrets.map((key) => saved[key])).size !== secrets.length
  ) {
    throw new Error("Tệp cấu hình demo không hợp lệ. Kiểm tra bản lưu riêng.");
  }
  const compose = [
    ...pin,
    "compose",
    "--env-file",
    envFile,
    "-f",
    "compose.demo.yml",
    "--project-name",
    project,
  ];
  docker(
    [...compose, "up", "--build", "-d", "--wait", "--wait-timeout", "300"],
    true,
  );
  console.log("Website demo: http://127.0.0.1:3014");
  console.log("Hộp thư demo: http://127.0.0.1:8034");
  console.log("Tài khoản mẫu và cách dừng xem README.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
