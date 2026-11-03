import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync, openSync, closeSync, mkdirSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";

const marker = JSON.parse(
  readFileSync(".local/week12-test-database.json", "utf8"),
);
const main = new URL(process.env.DATABASE_URL ?? ""),
  test = new URL(process.env.WEEK12_TEST_DATABASE_URL ?? "");
assert(
  marker.purpose === "isolated-week12-tests" &&
    marker.mainDatabase === main.pathname.slice(1),
);
assert(
  ["127.0.0.1", "localhost"].includes(main.hostname) &&
    main.host === test.host &&
    main.username === test.username &&
    main.password === test.password,
);
assert(
  test.pathname === `/${marker.database}` &&
    test.pathname !== main.pathname &&
    test.pathname.startsWith(`/${main.pathname.slice(1, 35)}_w12test_`) &&
    /_[a-f0-9]{8}$/.test(test.pathname),
);
const origin = "http://127.0.0.1:3007";
await new Promise((done, reject) => {
  const server = createServer();
  server.once("error", () =>
    reject(
      new Error(
        "Cổng3007 đang được sử dụng; không nối vào máy chủ không do bộ kiểm mở.",
      ),
    ),
  );
  server.listen(3007, "127.0.0.1", () => server.close(done));
});
mkdirSync(".local", { recursive: true });
const log = openSync(".local/week12-e2e-server.log", "w");
const environment = {
  ...process.env,
  APP_URL: origin,
  DATABASE_URL: test.href,
  E2E_MAIN_DATABASE_URL: main.href,
  SFS_E2E_MAIN_DATABASE_URL: main.href,
  SFS_E2E_BASE_URL: origin,
  WEEK12_E2E_URL: origin,
  SFS_TEST_DIST_DIR: ".next-week12",
  NEXT_TELEMETRY_DISABLED: "1",
  PLAYWRIGHT_HTML_OPEN: "never",
};
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3007",
  ],
  { env: environment, stdio: ["ignore", log, log], windowsHide: true },
);
let runner;
const stop = () => {
  for (const processToStop of [runner, server])
    if (processToStop?.pid && processToStop.exitCode === null) {
      if (process.platform === "win32") {
        try {
          execFileSync(
            "taskkill",
            ["/PID", String(processToStop.pid), "/T", "/F"],
            { stdio: "ignore", windowsHide: true },
          );
        } catch {}
      } else processToStop.kill("SIGTERM");
    }
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw Error(
        "Máy chủ E2E đã dừng; xem log riêng, không xuất cấu hình nhạy cảm.",
      );
    try {
      const response = await fetch(origin + "/api/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  assert(ready, "Máy chủ E2E chưa sẵn sàng trong thời hạn");
  runner = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { env: environment, stdio: "inherit", windowsHide: true },
  );
  process.exitCode = await new Promise((done) =>
    runner.once("exit", (code) => done(code ?? 1)),
  );
} finally {
  stop();
  closeSync(log);
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
