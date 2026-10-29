export interface SurveyClock {
  serverMillis: number;
  tickMillis: number;
}
/** Giờ máy chủ + thời gian trôi đơn điệu, không lấy đồng hồ lịch của thiết bị để khóa form. */
export function createSurveyClock(
  serverMillis: number,
  tickMillis = performance.now(),
): SurveyClock {
  return { serverMillis, tickMillis };
}
export function readSurveyClock(
  clock: SurveyClock,
  tickMillis = performance.now(),
): number {
  return clock.serverMillis + Math.max(0, tickMillis - clock.tickMillis);
}
export function syncSurveyClock(
  clock: SurveyClock,
  value: unknown,
  tickMillis = performance.now(),
): SurveyClock {
  if (typeof value !== "string") return clock;
  const serverMillis = Date.parse(value);
  return Number.isFinite(serverMillis)
    ? createSurveyClock(serverMillis, tickMillis)
    : clock;
}
