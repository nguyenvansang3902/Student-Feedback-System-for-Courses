import "dotenv/config";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db";
import { demoId } from "../src/server/services/demo-seed";
import { lockAdminMutations } from "../src/server/services/access";
import { seedWeek10FeedbackData } from "../src/server/services/week10-demo-seed";
const url = new URL(process.env.DATABASE_URL ?? "");
assert(
  process.env.NODE_ENV !== "production" &&
    url.protocol === "mysql:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname),
  "Seed chỉ dành cho MySQL cục bộ.",
);
const db = getDb();
try {
  const result = await db.$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      return seedWeek10FeedbackData(
        {
          kind: "SERVER_CONSOLE",
          reason: "Bổ sung dữ liệu giả phản hồi Tuần10, giữ nguyên dữ liệu cũ",
        },
        tx,
        {
          id: demoId,
          semesterId: demoId("semester:2026-1"),
          courseId: demoId("course:0"),
          teacherId: demoId("GV:0"),
          studentIds: [demoId("SV:0"), demoId("SV:1")],
          qualityId: demoId("DBCL2026001"),
          headId: demoId("TBM2026001"),
          trainingId: demoId("PDT2026001"),
          examId: demoId("KT2026001"),
          inspectorId: demoId("TT2026001"),
        },
      );
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
  console.log(JSON.stringify({ week: 10, ...result }));
} catch (error) {
  console.error("Chưa thêm dữ liệu giả Tuần10; giữ nguyên dữ liệu hiện có.");
  console.error(error instanceof Error ? error.name : "Lỗi dữ liệu");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
