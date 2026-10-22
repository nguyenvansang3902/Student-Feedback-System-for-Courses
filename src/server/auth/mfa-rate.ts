import { getDb } from "../../lib/db";
import { AuthError } from "./types";
import { checkRateLimit, rateKey } from "./rate-limit";

export function mfaRateKeys(userId: string, ip: string): string[] {
  return [rateKey("mfa-account", userId), rateKey("mfa-ip", ip)].sort();
}
export async function checkMfaRate(keys: readonly string[]): Promise<void> {
  for (const value of keys) await checkRateLimit(value);
}
/** Ghi riêng sau transaction xác minh: lỗi OTP không rollback bộ đếm. */
export async function recordMfaFailure(
  keys: readonly string[],
): Promise<never> {
  for (const value of keys) {
    await getDb().$transaction(async (tx) => {
      const now = new Date();
      await tx.$executeRaw`INSERT INTO RateLimitBucket (keyHash, attempts, windowStart) VALUES (${value}, 0, ${now}) ON DUPLICATE KEY UPDATE keyHash = keyHash`;
      const [bucket] = await tx.$queryRaw<
        { attempts: number; windowStart: Date; lockedUntil: Date | null }[]
      >`SELECT attempts, windowStart, lockedUntil FROM RateLimitBucket WHERE keyHash = ${value} FOR UPDATE`;
      if (!bucket) throw new Error("Không thể lấy bộ đếm MFA.");
      if (bucket.lockedUntil && bucket.lockedUntil > now) return;
      const expired = now.getTime() - bucket.windowStart.getTime() >= 900000;
      const attempts = expired ? 1 : bucket.attempts + 1;
      await tx.rateLimitBucket.update({
        where: { keyHash: value },
        data: {
          attempts,
          windowStart: expired ? now : bucket.windowStart,
          lockedUntil: attempts >= 5 ? new Date(now.getTime() + 900000) : null,
        },
      });
    });
  }
  throw new AuthError(
    "Mã xác thực không hợp lệ, đã dùng hoặc đã hết hạn.",
    400,
    "INVALID_MFA_CODE",
  );
}
