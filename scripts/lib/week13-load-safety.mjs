import assert from "node:assert/strict";

/** Refuse non-local, primary, shadow, foreign-server, or unmarked databases. */
export function assertLoadDatabase(mainText, testText, marker, forbidden = []) {
  const main = new URL(mainText),
    test = new URL(testText);
  assert(
    main.protocol === "mysql:" && test.protocol === "mysql:",
    "Chỉ dùng MySQL cục bộ.",
  );
  assert(
    ["localhost", "127.0.0.1"].includes(main.hostname),
    "Không đo tải máy chủ ngoài.",
  );
  assert(
    main.host === test.host &&
      main.username === test.username &&
      main.password === test.password,
    "Database tải phải cùng máy chủ và tài khoản đã xác minh.",
  );
  const database = decodeURIComponent(test.pathname.slice(1));
  const mainDatabase = decodeURIComponent(main.pathname.slice(1));
  assert(
    marker?.purpose === "isolated-week13-load-tests" &&
      marker.mainDatabase === mainDatabase &&
      marker.database === database &&
      typeof marker.serverUuid === "string" &&
      marker.serverUuid.length > 0,
    "Marker tải không khớp.",
  );
  assert(
    new RegExp(`^${mainDatabase.slice(0, 34)}_w13load_[a-f0-9]{8}$`).test(
      database,
    ) && /^[A-Za-z0-9_]{1,64}$/.test(mainDatabase),
    "Tên database tải không hợp lệ.",
  );
  assert(
    database !== mainDatabase &&
      !forbidden
        .filter(Boolean)
        .some(
          (item) =>
            database === decodeURIComponent(new URL(item).pathname.slice(1)),
        ),
    "Không đo trên database đang dùng.",
  );
  return test;
}

/** Nearest-rank percentiles over all HTTP attempts, including failures. */
export function summarizeLoad(samples, elapsedMs) {
  assert(samples.length > 0 && Number.isFinite(elapsedMs) && elapsedMs > 0);
  assert(
    samples.every(
      (sample) =>
        Number.isFinite(sample.durationMs) &&
        sample.durationMs >= 0 &&
        Number.isInteger(sample.status) &&
        sample.status >= 0 &&
        sample.status <= 599,
    ),
  );
  const sorted = samples
    .map((sample) => sample.durationMs)
    .sort((a, b) => a - b);
  const percentile = (value) =>
    Math.round(
      sorted[Math.max(0, Math.ceil(value * sorted.length) - 1)] * 100,
    ) / 100;
  const statuses = {};
  for (const sample of samples)
    statuses[sample.status] = (statuses[sample.status] ?? 0) + 1;
  return {
    requests: samples.length,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    throughputPerSecond:
      Math.round((samples.length / (elapsedMs / 1000)) * 100) / 100,
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      max: sorted.at(-1),
    },
    statuses,
    transportErrors: samples.filter((sample) => sample.status === 0).length,
    serverErrors: samples.filter((sample) => sample.status >= 500).length,
  };
}
