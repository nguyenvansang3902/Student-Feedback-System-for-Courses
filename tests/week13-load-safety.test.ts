import { describe, expect, it } from "vitest";
import {
  assertLoadDatabase,
  summarizeLoad,
} from "../scripts/lib/week13-load-safety.mjs";

const main = "mysql://fixture:secret@127.0.0.1:3306/sfs";
const test = "mysql://fixture:secret@127.0.0.1:3306/sfs_w13load_a1b2c3d4";
const marker = {
  purpose: "isolated-week13-load-tests",
  mainDatabase: "sfs",
  database: "sfs_w13load_a1b2c3d4",
  serverUuid: "fixture-server",
};
describe("NFR-16 BR-03 tải cục bộ có guard", () => {
  it("chỉ chấp nhận database tải đúng marker, không trùng database khác", () => {
    expect(assertLoadDatabase(main, test, marker, [main]).pathname).toBe(
      "/sfs_w13load_a1b2c3d4",
    );
    expect(() => assertLoadDatabase(main, test, marker, [test])).toThrow();
  });
  it.each([
    [main, main, marker],
    [main, test, { ...marker, purpose: "isolated-week12-tests" }],
    [main, test, { ...marker, mainDatabase: "another" }],
    [main, test, { ...marker, database: "another_w13load_a1b2c3d4" }],
    [main, test, { ...marker, serverUuid: "" }],
    [main, test.replace("secret", "other"), marker],
    [main, test.replace(":3306", ":3307"), marker],
    [
      main.replace("127.0.0.1", "example.com"),
      test.replace("127.0.0.1", "example.com"),
      marker,
    ],
    [main, test.replace("w13load", "w12test"), marker],
  ])("từ chối target sai trước thao tác ghi %#", (primary, target, proof) => {
    expect(() =>
      assertLoadDatabase(
        primary as string,
        target as string,
        proof as typeof marker,
      ),
    ).toThrow();
  });
  it("tính percentile nearest-rank và giữ cả attempt lỗi trong mẫu số", () => {
    const result = summarizeLoad(
      Array.from({ length: 200 }, (_, i) => ({
        durationMs: i + 1,
        status: i < 198 ? 200 : i === 198 ? 500 : 0,
      })),
      1000,
    );
    expect(result.latencyMs).toEqual({
      p50: 100,
      p95: 190,
      p99: 198,
      max: 200,
    });
    expect(result.requests).toBe(200);
    expect(result.statuses).toEqual({ 0: 1, 200: 198, 500: 1 });
    expect(result.serverErrors).toBe(1);
    expect(result.transportErrors).toBe(1);
    expect(result.throughputPerSecond).toBe(200);
  });
  it("từ chối số đo rỗng/không hữu hạn", () => {
    expect(() => summarizeLoad([], 10)).toThrow();
    expect(() =>
      summarizeLoad([{ durationMs: NaN, status: 200 }], 10),
    ).toThrow();
    expect(() => summarizeLoad([{ durationMs: 1, status: 200 }], 0)).toThrow();
  });
});
