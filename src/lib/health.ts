export type HealthReport = {
  status: "ok";
  application: "available";
  database: "not_checked";
};

// Tuần 1 chỉ xác nhận tiến trình web có thể trả lời HTTP.
export function getHealthReport(): HealthReport {
  return {
    status: "ok",
    application: "available",
    database: "not_checked",
  };
}
