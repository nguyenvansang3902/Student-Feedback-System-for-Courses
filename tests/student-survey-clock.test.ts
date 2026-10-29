import { describe, expect, it, vi } from "vitest";
import {
  createSurveyClock,
  readSurveyClock,
  syncSurveyClock,
} from "../src/components/student-surveys/survey-clock";
describe("W8 BR-04 — giờ máy chủ quyết định cửa sổ khảo sát", () => {
  it("đồng hồ thiết bị nhanh một tháng không đổi giờ tham chiếu của form", () => {
    const server = Date.parse("2026-10-29T00:00:00Z");
    const clock = createSurveyClock(server, 100);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    expect(readSurveyClock(clock, 1100)).toBe(server + 1000);
    vi.useRealTimers();
  });
  it("đồng bộ lại bằng GET serverTime, không nhận giá trị lỗi", () => {
    const clock = createSurveyClock(1000, 100);
    expect(syncSurveyClock(clock, "invalid", 200)).toBe(clock);
    expect(syncSurveyClock(clock, null, 200)).toBe(clock);
    const synced = syncSurveyClock(clock, "2026-10-29T00:00:00Z", 200);
    expect(readSurveyClock(synced, 700)).toBe(
      Date.parse("2026-10-29T00:00:00Z") + 500,
    );
  });
});
