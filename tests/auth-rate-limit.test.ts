import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  consumeRateLimit,
  rateKey,
  recordLoginFailure,
} from "../src/server/auth/rate-limit";

const { db } = vi.hoisted(() => ({
  db: {
    rateLimitBucket: { findUnique: vi.fn(), update: vi.fn() },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock("../src/lib/db", () => ({ getDb: () => db }));

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.$executeRaw.mockResolvedValue(1);
  db.rateLimitBucket.update.mockResolvedValue({});
});

describe("BR-33 — bộ đếm MySQL và khóa tạm", () => {
  it("key có scope và không lưu identifier/IP rõ", () => {
    expect(rateKey("account", "SV0001")).toMatch(/^[a-f0-9]{64}$/);
    expect(rateKey("account", "SV0001")).not.toBe(rateKey("ip", "SV0001"));
  });
  it("đăng nhập sai lần 5 ghi khóa, không ném lỗi làm mất commit", async () => {
    db.$queryRaw.mockResolvedValue([
      { attempts: 4, windowStart: new Date(), lockedUntil: null },
    ]);
    await expect(
      recordLoginFailure(rateKey("account", "SV0001")),
    ).resolves.toBeUndefined();
    expect(db.rateLimitBucket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attempts: 5,
          lockedUntil: expect.any(Date),
        }),
      }),
    );
    expect(db.$executeRaw).toHaveBeenCalled();
  });
  it("public request cho phép đủ5 lần rồi khóa và lỗi ở lần6", async () => {
    const key = rateKey("reset", "unit@example.invalid");
    db.$queryRaw.mockResolvedValueOnce([
      { attempts: 4, windowStart: new Date(), lockedUntil: null },
    ]);
    await expect(consumeRateLimit(key, 5, 900, 900)).resolves.toBeUndefined();
    db.$queryRaw.mockResolvedValueOnce([
      { attempts: 5, windowStart: new Date(), lockedUntil: null },
    ]);
    await expect(consumeRateLimit(key, 5, 900, 900)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
    expect(db.rateLimitBucket.update.mock.calls[1][0].data.attempts).toBe(6);
  });
  it("hết cửa sổ thì bắt đầu đếm lại; khóa còn hiệu lực được từ chối", async () => {
    const key = rateKey("account", "SV0001");
    db.$queryRaw.mockResolvedValue([
      {
        attempts: 5,
        windowStart: new Date(Date.now() - 901000),
        lockedUntil: new Date(Date.now() - 1000),
      },
    ]);
    await recordLoginFailure(key);
    expect(db.rateLimitBucket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attempts: 1, lockedUntil: null }),
      }),
    );
    db.rateLimitBucket.findUnique.mockResolvedValue({
      lockedUntil: new Date(Date.now() + 10000),
    });
    await expect(checkRateLimit(key)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
