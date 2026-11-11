import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.SFS_STANDALONE === "1" ? { output: "standalone" } : {}),
  ...(process.env.NODE_ENV === "development" &&
  process.env.SFS_DOCKER_DEMO === "1"
    ? { allowedDevOrigins: ["127.0.0.1"] }
    : {}),
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
    ".next-week13-load",
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
