import { spawnSync } from "node:child_process";

// Output riêng, không dùng hoặc xóa cache dev của chủ dự án.
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    env: {
      ...process.env,
      SFS_TEST_DIST_DIR: ".next-week13-load",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
