import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError } from "./types";
import { getAuthLimits } from "./limits";

function limited(): AuthError {
  return new AuthError(
    "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau thời gian tạm khóa.",
    429,
    "RATE_LIMITED",
  );
}

export function rateKey(scope: string, value: string): string {
  return createHash("sha256").update(`${scope}\0${value}`).digest("hex");
}

export async function checkRateLimit(key: string): Promise<void> {
  const bucket = await getDb().rateLimitBucket.findUnique({
    where: { keyHash: key },
    select: { lockedUntil: true },
  });
  if (bucket?.lockedUntil && bucket.lockedUntil > new Date()) throw limited();
}

/**
 * Recheck trong transaction tạo phiên, sau bcrypt. Khóa hàng theo cùng một thứ tự
 * để yêu cầu đang xác minh không tạo phiên sau khi lần sai thứ 5 đã commit khóa.
 */
export async function assertLoginAllowed(
  tx: Prisma.TransactionClient,
  keys: readonly string[],
): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    if (!/^[a-f0-9]{64}$/.test(key)) {
      throw new Error("Khóa giới hạn tần suất không hợp lệ.");
    }
    await tx.$executeRaw`
      INSERT INTO RateLimitBucket (keyHash, attempts, windowStart)
      VALUES (${key}, 0, ${new Date()})
      ON DUPLICATE KEY UPDATE keyHash = keyHash
    `;
    const [bucket] = await tx.$queryRaw<{ lockedUntil: Date | null }[]>`
      SELECT lockedUntil FROM RateLimitBucket
      WHERE keyHash = ${key} FOR UPDATE
    `;
    if (!bucket) throw new Error("Không thể lấy bộ đếm giới hạn tần suất.");
    if (bucket.lockedUntil && bucket.lockedUntil > new Date()) throw limited();
  }
}

async function incrementRateLimit(
  key: string,
  blockAt: number,
  windowSeconds: number,
  lockSeconds: number,
): Promise<boolean> {
  if (
    !/^[a-f0-9]{64}$/.test(key) ||
    ![blockAt, windowSeconds, lockSeconds].every(
      (value) => Number.isInteger(value) && value > 0,
    )
  ) {
    throw new Error("Cấu hình giới hạn tần suất không hợp lệ.");
  }
  const now = new Date();
  const isLimited = await getDb().$transaction(async (tx) => {
    // INSERT..ON DUPLICATE KEY UPDATE lấy khóa hàng ngay cả khi bucket chưa có.
    await tx.$executeRaw`
      INSERT INTO RateLimitBucket (keyHash, attempts, windowStart)
      VALUES (${key}, 0, ${now})
      ON DUPLICATE KEY UPDATE keyHash = keyHash
    `;
    const [bucket] = await tx.$queryRaw<
      { attempts: number; windowStart: Date; lockedUntil: Date | null }[]
    >`
      SELECT attempts, windowStart, lockedUntil FROM RateLimitBucket
      WHERE keyHash = ${key} FOR UPDATE
    `;
    if (!bucket) throw new Error("Không thể lấy bộ đếm giới hạn tần suất.");
    if (bucket.lockedUntil && bucket.lockedUntil > now) return true;
    const expired =
      now.getTime() - bucket.windowStart.getTime() >= windowSeconds * 1000;
    const attempts = expired ? 1 : bucket.attempts + 1;
    const lockedUntil =
      attempts >= blockAt ? new Date(now.getTime() + lockSeconds * 1000) : null;
    await tx.rateLimitBucket.update({
      where: { keyHash: key },
      data: {
        attempts,
        windowStart: expired ? now : bucket.windowStart,
        lockedUntil,
      },
    });
    return lockedUntil !== null;
  });
  return isLimited;
}

/** Cho phép đủ limit yêu cầu, ghi khóa rồi mới ném lỗi ở lần kế tiếp. */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  lockSeconds: number,
): Promise<void> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Cấu hình giới hạn tần suất không hợp lệ.");
  }
  if (await incrementRateLimit(key, limit + 1, windowSeconds, lockSeconds))
    throw limited();
}

/** BR-33: sai lần thứ 5 ghi khóa 15 phút; caller vẫn trả lỗi đăng nhập chung. */
export async function recordLoginFailure(key: string): Promise<void> {
  const limits = getAuthLimits();
  await incrementRateLimit(
    key,
    limits.LOGIN_MAX_FAILURES,
    limits.LOGIN_WINDOW_SECONDS,
    limits.LOGIN_LOCK_SECONDS,
  );
}
