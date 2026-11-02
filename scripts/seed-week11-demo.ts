import "dotenv/config";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db";
import { lockAdminMutations } from "../src/server/services/access";
import { seedWeek11WorkflowData } from "../src/server/services/week11-demo-seed";
const url = new URL(process.env.DATABASE_URL ?? "");
assert(
  process.env.NODE_ENV !== "production" &&
    url.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname),
);
try {
  const result = await getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      return seedWeek11WorkflowData(
        {
          kind: "SERVER_CONSOLE",
          reason: "Thêm bundle dữ liệu giả Tuần11, giữ nguyên dữ liệu đã có",
        },
        tx,
      );
    },
    { maxWait: 15000, timeout: 60000 },
  );
  console.log(JSON.stringify({ week: 11, ...result }));
} finally {
  await getDb().$disconnect();
}
