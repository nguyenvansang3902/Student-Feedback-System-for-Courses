import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webUrl = "http://localhost:3000";
const localDirectory = join(repository, ".local");
const lockPath = join(localDirectory, "local-start.lock");
const runtimePath = join(localDirectory, "local-runtime.json");

/** Env object thông thường phân biệt hoa/thường dù process.env của Windows không phân biệt. */
export function withToolPaths(env, directories, platform = process.platform) {
  const result = { ...env };
  const pathKeys = Object.keys(result).filter((key) =>
    platform === "win32" ? key.toLowerCase() === "path" : key === "PATH",
  );
  const inherited = pathKeys.map((key) => result[key]).filter(Boolean);
  for (const key of pathKeys) delete result[key];
  result.PATH = [...directories, ...inherited].join(
    platform === "win32" ? ";" : ":",
  );
  return result;
}

export function validateLocalEnvironment(
  value,
  nodeVersion = process.versions.node,
) {
  if (Number(nodeVersion.split(".")[0]) < 24)
    throw new Error("Cần Node.js 24 trở lên để khởi động dự án.");
  if ((value.APP_URL || webUrl).replace(/\/$/, "") !== webUrl)
    throw new Error(
      "APP_URL trong .env cần là http://localhost:3000 để dùng cách mở này.",
    );
  if (
    !/^[a-f0-9]{64,}$/i.test(value.JWT_SECRET || "") ||
    !/^[a-f0-9]{64}$/i.test(value.MFA_ENCRYPTION_KEY || "")
  )
    throw new Error(
      "Tệp .env chưa có khóa xác thực hợp lệ. Xem hướng dẫn thiết lập lần đầu trong README; chương trình không ghi đè khóa hiện có.",
    );
  let target;
  try {
    target = new URL(value.DATABASE_URL || "");
  } catch {
    /* Thông báo không chứa chuỗi kết nối. */
  }
  if (
    !target ||
    target.protocol !== "mysql:" ||
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    decodeURIComponent(target.pathname.slice(1)) !== value.MYSQL_DATABASE ||
    !/^[A-Za-z0-9_]{1,64}$/.test(value.MYSQL_DATABASE || "") ||
    !value.MYSQL_USER ||
    !value.MYSQL_PASSWORD ||
    !value.MYSQL_ROOT_PASSWORD
  )
    throw new Error(
      "Cấu hình MySQL cục bộ trong .env chưa đồng bộ. Xem phần cài đặt trong README; không xuất mật khẩu hoặc chuỗi kết nối.",
    );
  return {
    ...value,
    APP_URL: webUrl,
    NODE_ENV: "development",
    SFS_TEST_DIST_DIR: "",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function normalized(value) {
  let result = String(value || "");
  try {
    result = decodeURIComponent(result);
  } catch {
    /* Giữ nguyên chuỗi không phải URI. */
  }
  return result.replaceAll("\\", "/").toLowerCase();
}

/** Không nhận PID còn sống là bằng chứng đủ: lệnh phải thuộc đúng thư mục dự án. */
export function isProjectProcess(entry, root, role) {
  const command = normalized(entry?.commandLine);
  const prefix = normalized(resolve(root));
  if (
    !Number.isInteger(entry?.pid) ||
    entry.pid <= 0 ||
    !command.includes(`${prefix}/`)
  )
    return false;
  if (role === "scheduler")
    return /(?:\/|[\s"'])scripts\/scheduler\.ts(?:[\s"']|$)/.test(command);
  if (role === "launcher") return command.includes("/scripts/start-local.mjs");
  if (role === "busy")
    return (
      /\/next\/dist\/bin\/next["\s]+build(?:["\s]|$)/.test(command) ||
      /\/prisma\/build\/index\.js["\s]+(?:generate|migrate)(?:["\s]|$)/.test(
        command,
      )
    );
  return (
    role === "web" &&
    (command.includes("/next/dist/server/lib/start-server.js") ||
      /\/next\/dist\/bin\/next["\s]+(?:dev|start)(?:["\s]|$)/.test(command))
  );
}

export function localStartDecision(
  { available, health, processes, listenerPids },
  root,
) {
  const projectWeb = processes.filter((item) =>
    isProjectProcess(item, root, "web"),
  );
  if (!available) {
    const ownListener = projectWeb.some((item) =>
      listenerPids.includes(item.pid),
    );
    if (
      !ownListener ||
      health?.status !== "ok" ||
      health?.application !== "available"
    )
      throw new Error(
        "Cổng 3000 đang được chương trình khác sử dụng hoặc website chưa sẵn sàng. Chương trình sẽ không tự đóng tiến trình đó.",
      );
    return "reuse";
  }
  if (projectWeb.length)
    throw new Error(
      "Dự án đang có một phiên web ở cổng khác. Hãy đóng phiên đó trước khi mở bằng tệp khởi động, để tránh hai máy chủ cùng sửa tệp chạy web.",
    );
  if (processes.some((item) => isProjectProcess(item, root, "busy")))
    throw new Error(
      "Dự án đang được kiểm tra hoặc dựng bản mới. Đợi tác vụ đó hoàn tất rồi mở lại tệp khởi động.",
    );
  return "start";
}

function processSnapshot() {
  if (process.platform !== "win32") {
    const result = spawnSync("ps", ["-eo", "pid=,args="], {
      encoding: "utf8",
      timeout: 10000,
    });
    if (result.error || result.status !== 0)
      throw new Error(
        "Chưa kiểm tra được các tiến trình đang chạy; dừng trước khi mở thêm máy chủ.",
      );
    const processes = result.stdout.split(/\r?\n/).flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      return match ? [{ pid: Number(match[1]), commandLine: match[2] }] : [];
    });
    const listener = spawnSync(
      "lsof",
      ["-nP", "-iTCP:3000", "-sTCP:LISTEN", "-t"],
      { encoding: "utf8", timeout: 10000 },
    );
    return {
      processes,
      listenerPids:
        listener.status === 0
          ? listener.stdout.trim().split(/\s+/).map(Number)
          : [],
    };
  }
  const command = [
    "$taskProcesses=@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { [pscustomobject]@{pid=[int]$_.ProcessId;commandLine=$_.CommandLine} });",
    "$taskListeners=@(Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess);",
    "[pscustomobject]@{processes=$taskProcesses;listenerPids=$taskListeners} | ConvertTo-Json -Depth 4 -Compress;",
  ].join(" ");
  const powershell = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const result = spawnSync(
    powershell,
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", timeout: 20000, windowsHide: true },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "Chưa kiểm tra được các tiến trình đang chạy. Chương trình không tự đóng hoặc mở thêm máy chủ.",
    );
  try {
    const data = JSON.parse(result.stdout.trim());
    if (!Array.isArray(data.processes) || !Array.isArray(data.listenerPids))
      throw new Error();
    return data;
  } catch {
    throw new Error(
      "Chưa đọc được trạng thái tiến trình của Windows; chưa khởi động thêm phiên.",
    );
  }
}

function availablePort() {
  return new Promise((done) => {
    const server = createServer();
    server.once("error", () => done(false));
    server.listen(3000, "127.0.0.1", () => server.close(() => done(true)));
  });
}
async function healthReport(timeoutMs = 3000) {
  try {
    const response = await fetch("http://127.0.0.1:3000/api/health", {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
function checkedRun(executable, args, env, label, inherit = false) {
  const result = spawnSync(executable, args, {
    cwd: repository,
    env,
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8",
    timeout: 240000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error(label);
}
function dockerCommand(env) {
  const candidates = [
    "docker",
    join(
      process.env.ProgramFiles || "C:\\Program Files",
      "Docker",
      "Docker",
      "resources",
      "bin",
      "docker.exe",
    ),
  ];
  for (const executable of candidates) {
    const result = spawnSync(executable, ["--version"], {
      env,
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    });
    if (!result.error && result.status === 0) return executable;
  }
  throw new Error(
    "Chưa tìm thấy Docker. Cần cài Docker Desktop theo README trước khi mở dự án.",
  );
}
async function waitForDocker(executable, env) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const result = spawnSync(
      executable,
      ["info", "--format", "{{.ServerVersion}}"],
      { env, encoding: "utf8", timeout: 5000, windowsHide: true },
    );
    if (!result.error && result.status === 0) return;
    await delay(2000);
  }
  throw new Error(
    "Docker chưa sẵn sàng. Mở Docker Desktop, đợi Engine running rồi chạy lại tệp KHOI_DONG_DU_AN.cmd.",
  );
}

function acquireLock(snapshot) {
  mkdirSync(localDirectory, { recursive: true });
  const contents = {
    purpose: "student-feedback-local-start",
    pid: process.pid,
    repository,
    createdAt: new Date().toISOString(),
  };
  const write = () => {
    const fd = openSync(lockPath, "wx");
    try {
      writeFileSync(fd, JSON.stringify(contents));
    } finally {
      closeSync(fd);
    }
  };
  try {
    write();
  } catch (error) {
    if (error.code !== "EEXIST")
      throw new Error("Chưa tạo được tệp điều phối khởi động trong .local.");
    let previous;
    try {
      previous = JSON.parse(readFileSync(lockPath, "utf8"));
    } catch {
      throw new Error(
        "Tệp điều phối khởi động chưa đọc được. Chưa mở thêm phiên; cần kiểm tra .local/local-start.lock.",
      );
    }
    if (
      previous.purpose !== contents.purpose ||
      previous.repository !== repository
    )
      throw new Error(
        "Tệp điều phối không thuộc bản dự án này. Chưa thay đổi tệp hoặc tiến trình đang chạy.",
      );
    if (snapshot.processes.some((item) => item.pid === previous.pid))
      throw new Error(
        "Tệp điều phối đang gắn với một tiến trình còn chạy. Chưa mở thêm phiên; đợi cửa sổ khởi động hiện tại hoàn tất.",
      );
    unlinkSync(lockPath); // Chỉ tệp khóa riêng đã xác minh của launcher, không xóa dữ liệu dự án.
    write();
  }
  return () => {
    try {
      const saved = JSON.parse(readFileSync(lockPath, "utf8"));
      if (saved.pid === process.pid && saved.purpose === contents.purpose)
        unlinkSync(lockPath);
    } catch {
      /* Tiến trình khác không được phép bị ảnh hưởng bởi bước dọn khóa. */
    }
  };
}

export async function startLocal() {
  process.chdir(repository);
  if (!existsSync(join(repository, ".env")))
    throw new Error(
      "Chưa có tệp .env. Cần làm phần thiết lập lần đầu trong README; chương trình không tự thay khóa hoặc tài khoản.",
    );
  let values;
  try {
    values = parseEnv(readFileSync(join(repository, ".env"), "utf8"));
  } catch {
    throw new Error(
      "Chưa đọc được tệp .env. Không xuất nội dung cấu hình ra màn hình.",
    );
  }
  let env = { ...process.env, ...validateLocalEnvironment(values) };
  const snapshot = processSnapshot();
  const available = await availablePort();
  const decision = localStartDecision(
    {
      ...snapshot,
      available,
      health: available ? null : await healthReport(10000),
    },
    repository,
  );
  const release = acquireLock(snapshot);
  const children = [];
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const { child, role } of children) {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null)
        continue;
      if (process.platform === "win32") {
        let current;
        try {
          current = processSnapshot().processes.find(
            (entry) => entry.pid === child.pid,
          );
        } catch {
          /* Không kill PID khi chưa xác minh. */
        }
        if (current && isProjectProcess(current, repository, role))
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
            timeout: 10000,
          });
      } else {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          /* Child đã kết thúc. */
        }
      }
    }
    release();
  };
  const onSignal = () => {
    console.log(
      "\nĐang dừng các tiến trình do cửa sổ này mở; dữ liệu Docker được giữ.",
    );
    stop();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    console.log("Đang kiểm tra Docker...");
    const docker = dockerCommand(env);
    env = withToolPaths(env, [
      dirname(process.execPath),
      ...(isAbsolute(docker) ? [dirname(docker)] : []),
    ]);
    await waitForDocker(docker, env);
    console.log("Đang mở MySQL và dịch vụ email cục bộ...");
    checkedRun(
      docker,
      [
        "compose",
        "--project-directory",
        repository,
        "--file",
        join(repository, "docker-compose.yml"),
        "up",
        "-d",
        "--wait",
        "--wait-timeout",
        "120",
        "db",
        "mailpit",
      ],
      env,
      "Dịch vụ dữ liệu chưa sẵn sàng. Kiểm tra Docker Desktop rồi chạy lại tệp khởi động.",
    );
    if (decision === "start") {
      const npm = join(
        dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      );
      if (!existsSync(npm))
        throw new Error(
          "Chưa tìm thấy npm đi kèm Node.js. Cài đầy đủ Node.js 24 theo README rồi thử lại.",
        );
      if (
        !existsSync(
          join(repository, "node_modules", "next", "dist", "bin", "next"),
        )
      ) {
        console.log(
          "Đang cài thư viện đúng package-lock.json cho lần mở đầu...",
        );
        checkedRun(
          process.execPath,
          [npm, "ci"],
          env,
          "Chưa cài xong thư viện. Kiểm tra mạng và hướng dẫn npm ci trong README.",
          true,
        );
      }
      console.log("Đang kiểm tra cấu trúc dữ liệu và chuẩn bị máy chủ web...");
      checkedRun(
        process.execPath,
        [npm, "run", "db:deploy"],
        env,
        "Chưa cập nhật được cấu trúc dữ liệu. Dữ liệu hiện có được giữ; xem hướng dẫn migration trong README.",
        true,
      );
      checkedRun(
        process.execPath,
        [
          join(repository, "node_modules", "prisma", "build", "index.js"),
          "generate",
        ],
        env,
        "Chưa chuẩn bị được bộ kết nối dữ liệu. Xem hướng dẫn db:generate trong README.",
        true,
      );
      const web = spawn(
        process.execPath,
        [
          join(repository, "node_modules", "next", "dist", "bin", "next"),
          "dev",
          "--webpack",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3000",
        ],
        {
          cwd: repository,
          env,
          stdio: "inherit",
          windowsHide: true,
          detached: process.platform !== "win32",
        },
      );
      web.on("error", () => {
        console.error("Máy chủ web chưa mở được.");
        stop();
      });
      children.push({ child: web, role: "web" });
      let ready = false;
      for (let attempt = 0; attempt < 90 && !stopping; attempt++) {
        if (web.exitCode !== null || web.signalCode !== null) break;
        if ((await healthReport())?.status === "ok") {
          ready = true;
          break;
        }
        await delay(1000);
      }
      if (!ready)
        throw new Error(
          "Máy chủ web chưa sẵn sàng trên cổng 3000. Không tự chuyển sang cổng khác; xem thông báo ở cửa sổ này.",
        );
    } else
      console.log(
        "Website đang chạy trong thư mục dự án này. Không mở thêm máy chủ hoặc sinh lại tệp chạy web.",
      );
    if (stopping) return;
    const current = processSnapshot();
    let scheduler = current.processes.find((item) =>
      isProjectProcess(item, repository, "scheduler"),
    );
    if (!scheduler) {
      if (
        !existsSync(join(repository, "node_modules", "tsx", "dist", "cli.mjs"))
      )
        throw new Error(
          "Thiếu thư viện chạy tác vụ nền. Chạy npm ci theo README rồi mở lại dự án.",
        );
      const log = openSync(join(localDirectory, "local-scheduler.log"), "a");
      try {
        const child = spawn(
          process.execPath,
          [
            join(repository, "node_modules", "tsx", "dist", "cli.mjs"),
            join(repository, "scripts", "scheduler.ts"),
          ],
          {
            cwd: repository,
            env,
            stdio: ["ignore", log, log],
            windowsHide: true,
            detached: process.platform !== "win32",
          },
        );
        child.on("error", () => {
          console.error("Tác vụ lịch và email chưa mở được.");
          stop();
        });
        children.push({ child, role: "scheduler" });
        scheduler = { pid: child.pid };
      } finally {
        closeSync(log);
      }
    }
    writeFileSync(
      runtimePath,
      JSON.stringify(
        {
          purpose: "student-feedback-local-runtime",
          repository,
          webPid:
            children.find((item) => item.role === "web")?.child.pid ?? null,
          schedulerPid: scheduler.pid,
          url: webUrl,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    release();
    console.log(`\nWebsite đã sẵn sàng: ${webUrl}`);
    console.log(
      "Mở địa chỉ trên bằng trình duyệt. Không cần mở website trong Docker Desktop.",
    );
    if (!children.length) {
      console.log(
        "Website và tác vụ nền đã chạy ở cửa sổ khác; có thể đóng cửa sổ thông báo này.",
      );
      return;
    }
    console.log(
      "Giữ cửa sổ này mở trong lúc dùng website. Nhấn Ctrl+C để dừng; database và tệp đính kèm được giữ nguyên.",
    );
    await new Promise((done) => {
      for (const { child, role } of children)
        child.once("exit", (code) => {
          if (!stopping) {
            console.log(
              `${role === "web" ? "Máy chủ web" : "Tác vụ nền"} đã dừng${code ? ` (mã ${code})` : ""}.`,
            );
            stop();
          }
          if (
            children.every(
              (item) =>
                item.child.exitCode !== null || item.child.signalCode !== null,
            )
          )
            done();
        });
    });
  } finally {
    stop();
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startLocal().catch((error) => {
    console.error(
      `\nChưa khởi động được dự án: ${error instanceof Error ? error.message : "Lỗi chưa xác định."}`,
    );
    process.exitCode = 1;
  });
}
