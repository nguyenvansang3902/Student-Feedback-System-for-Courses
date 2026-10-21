import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Giữ AGENTS.md đúng nguyên văn yêu cầu của đề tài.
  agentRules: false,
  // Máy chủ kiểm thử auth tách output để không dừng phiên dev của người dùng.
  distDir:
    process.env.SFS_TEST_DIST_DIR === ".next-auth" ? ".next-auth" : ".next",
};

export default nextConfig;
