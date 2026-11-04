export interface LoadMarker {
  purpose: string;
  mainDatabase: string;
  database: string;
  serverUuid: string;
}
export interface LoadSample {
  durationMs: number;
  status: number;
}
export function assertLoadDatabase(
  mainText: string,
  testText: string,
  marker: LoadMarker,
  forbidden?: string[],
): URL;
export function summarizeLoad(
  samples: LoadSample[],
  elapsedMs: number,
): {
  requests: number;
  elapsedMs: number;
  throughputPerSecond: number;
  latencyMs: { p50: number; p95: number; p99: number; max: number };
  statuses: Record<string, number>;
  transportErrors: number;
  serverErrors: number;
};
