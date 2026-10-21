import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthLimits } from "../src/server/auth/limits";

afterEach(() => vi.unstubAllEnvs());
describe("BR-33 thời hạn/giới hạn cấu hình được", () => {
  it("nhận cấu hình khác mặc định cho số lần sai và hạn token", () => {
    vi.stubEnv("LOGIN_MAX_FAILURES", "3");
    vi.stubEnv("PASSWORD_RESET_TTL_SECONDS", "600");
    expect(getAuthLimits()).toMatchObject({
      LOGIN_MAX_FAILURES: 3,
      PASSWORD_RESET_TTL_SECONDS: 600,
    });
  });
  it("từ chối cấu hình tắt giới hạn hoặc hết hạn âm", () => {
    vi.stubEnv("LOGIN_MAX_FAILURES", "0");
    expect(() => getAuthLimits()).toThrow("không hợp lệ");
    vi.stubEnv("LOGIN_MAX_FAILURES", "5");
    vi.stubEnv("PASSWORD_RESET_TTL_SECONDS", "-1");
    expect(() => getAuthLimits()).toThrow("không hợp lệ");
  });
});
