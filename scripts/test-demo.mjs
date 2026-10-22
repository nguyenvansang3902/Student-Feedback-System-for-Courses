import "dotenv/config";
import { spawnSync } from "node:child_process";

// Suite có số liệu medium cố định, độc lập DEMO_SIZE người dùng đang chọn.
for (const args of [
  ["scripts/demo.mjs", "--prepare"],
  ["node_modules/tsx/dist/cli.mjs", "scripts/verify-demo.ts"],
]) {
  const result = spawnSync(process.execPath, args, {
    env: { ...process.env, DEMO_SIZE: "medium" },
    stdio: "inherit",
    windowsHide: true,
    timeout: 240000,
  });
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
