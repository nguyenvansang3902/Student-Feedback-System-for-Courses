import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Tuần 1 chưa cần kết nối DB; lệnh migrate từ tuần 2 phải có DATABASE_URL.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
