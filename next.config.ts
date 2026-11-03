import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Giữ AGENTS.md đúng nguyên văn yêu cầu của đề tài.
  agentRules: false,
  // Máy chủ kiểm thử auth tách output để không dừng phiên dev của người dùng.
  distDir: [
    ".next-auth",
    ".next-demo",
    ".next-week5",
    ".next-week6",
    ".next-week7",
    ".next-week7-settings",
    ".next-week8",
    ".next-week9",
    ".next-week10",
    ".next-week12",
  ].includes(process.env.SFS_TEST_DIST_DIR ?? "")
    ? process.env.SFS_TEST_DIST_DIR
    : ".next",
  outputFileTracingIncludes: {
    "/api/reports/*": [
      "./resources/fonts/NotoSans-Regular.ttf",
      "./resources/fonts/OFL.txt",
    ],
  },
};

export default nextConfig;
