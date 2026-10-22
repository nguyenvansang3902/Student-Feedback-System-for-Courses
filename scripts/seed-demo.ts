import "dotenv/config";
import { getDb } from "../src/lib/db";
import { seedDemo, type DemoSize } from "../src/server/services/demo-seed";

try {
  const size = process.env.DEMO_SIZE ?? "medium";
  const result = await seedDemo(
    { kind: "SERVER_CONSOLE", reason: "Tạo dữ liệu giả minh họa Tuần 5" },
    size as DemoSize,
  );
  console.log(
    "Seed danh mục/tài khoản/đăng ký hoàn tất:",
    JSON.stringify(result),
  );
  console.log(
    "Đã thêm dữ liệu giả khảo sát/phản hồi theo quyền người dùng cho phép. Các API/màn hình nghiệp vụ sẽ được làm đúng tuần sau.",
  );
} catch {
  console.error(
    "Seed chưa hoàn tất; kiểm tra size, dữ liệu trùng hoặc học kỳ demo đã khóa. Không reset dữ liệu.",
  );
  process.exitCode = 1;
} finally {
  await getDb().$disconnect();
}
