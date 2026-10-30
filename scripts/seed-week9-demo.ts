import "dotenv/config";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db";
import { demoId } from "../src/server/services/demo-seed";
import { lockAdminMutations } from "../src/server/services/access";
import { seedWeek9ResultsData } from "../src/server/services/week9-demo-seed";

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
      const teacherIds = Array.from({ length: 2 }, (_, i) => demoId(`GV:${i}`)),
        studentIds = Array.from({ length: 10 }, (_, i) => demoId(`SV:${i}`)),
        createdById = demoId("DBCL2026001"),
        approvedById = demoId("LD2026001");
      const users = await tx.user.count({
        where: {
          id: { in: [...teacherIds, ...studentIds, createdById, approvedById] },
        },
      });
      assert(
        users === 14 &&
          (await tx.department.count({
            where: { id: demoId("department:0") },
          })) === 1,
        "Cần dữ liệu demo danh mục/tài khoản trước khi bổ sung Tuần 9; không tự tạo hoặc sửa dữ liệu khác.",
      );
      return seedWeek9ResultsData(
        {
          kind: "SERVER_CONSOLE",
          reason:
            "Bổ sung bundle kết quả Tuần 9 bằng dữ liệu giả, giữ nguyên dữ liệu trước",
        },
        tx,
        {
          id: demoId,
          departmentId: demoId("department:0"),
          teacherIds,
          studentIds,
          createdById,
          approvedById,
        },
      );
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
  console.log(JSON.stringify({ week: 9, ...result }));
} catch (error) {
  console.error(
    "Chưa thêm được dữ liệu giả Tuần 9. Giữ nguyên dữ liệu hiện có; kiểm tra Docker, cấu hình và dữ liệu demo tiền đề.",
  );
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.name : "Error",
      code: /^[A-Z0-9_]+$/.test(code) ? code : "UNKNOWN",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
