import "dotenv/config";
import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";
import { getAuthConfig } from "../src/lib/env";

const config = getAuthConfig();
const url = new URL(config.databaseUrl);
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(config.appUrl).hostname)
)
  throw new Error(
    "Tài khoản demo chỉ được tạo trong môi trường phát triển cục bộ.",
  );
const demoPassword = "Demo2026!HocTap";
const db = getDb();
try {
  const passwordHash = await hash(demoPassword, config.bcryptCost);
  const accounts = [
    {
      loginCode: "SV2026001",
      email: "sinhvien@demo.invalid",
      displayName: "Sinh viên minh họa",
      role: "SINH_VIEN" as const,
      status: "ACTIVE" as const,
      mustChangePassword: false,
    },
    {
      loginCode: "GV2026001",
      email: "giangvien@demo.invalid",
      displayName: "Giảng viên minh họa",
      role: "GIANG_VIEN" as const,
      status: "ACTIVE" as const,
      mustChangePassword: false,
    },
    {
      loginCode: "TEMP2026001",
      email: "tam@demo.invalid",
      displayName: "Sinh viên dùng mật khẩu tạm",
      role: "SINH_VIEN" as const,
      status: "ACTIVE" as const,
      mustChangePassword: true,
    },
    {
      loginCode: "NEW2026001",
      email: "moikichhoat@demo.invalid",
      displayName: "Sinh viên chờ kích hoạt",
      role: "SINH_VIEN" as const,
      status: "PENDING_ACTIVATION" as const,
      mustChangePassword: true,
    },
  ];
  for (const account of accounts) {
    await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { loginCode: account.loginCode },
      });
      if (existing) {
        if (existing.email !== account.email)
          throw new Error(
            "Mã demo trùng tài khoản khác; không thay đổi dữ liệu hiện có.",
          );
        console.log(
          `Giữ tài khoản đã có: ${account.loginCode}; không đặt lại mật khẩu.`,
        );
        return;
      }
      const { role, ...data } = account;
      await tx.user.create({
        data: {
          ...data,
          passwordHash: account.status === "ACTIVE" ? passwordHash : null,
          roles: { create: { role, scopeType: "GLOBAL", scopeKey: "GLOBAL" } },
        },
      });
      console.log(
        `Đã tạo tài khoản giả: ${account.loginCode} (${account.status}).`,
      );
    });
  }
  console.log(
    "Seed chỉ tạo tài khoản minh họa, chưa tạo dữ liệu khảo sát. Mật khẩu mẫu xem README.",
  );
} finally {
  await db.$disconnect();
}
