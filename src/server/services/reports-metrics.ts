import type { ReportRow } from "./reports-types";

export interface FeedbackMetricInput {
  status: string;
  createdAt: Date;
  acceptDueAt: Date;
  replyDueAt: Date;
  acceptedAt: Date | null;
  answeredAt: Date | null;
  closedAt: Date | null;
  rating: { score: number } | null;
}
export interface InspectionMetricInput {
  status: string;
  createdAt: Date;
  acceptDueAt: Date;
  completeDueAt: Date;
  acceptedAt: Date | null;
  closedAt: Date | null;
  conclusion: string | null;
}
const DAY = 86400000;
const round = (value: number) => Math.round(value * 100) / 100;
function average(values: number[], minimum: number): number | null {
  return values.length >= minimum
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}
/** Không trả tổng khi một ô thành phần nhỏ có thể được suy ra bằng phép trừ. */
export function sparseCounts(
  counts: readonly number[],
  minimum: number,
): boolean {
  return counts.some((count) => count > 0 && count < minimum);
}
export function feedbackMetricRow(
  key: string,
  label: string,
  values: readonly FeedbackMetricInput[],
  minimum: number,
  now = new Date(),
): ReportRow {
  const count = values.length;
  const open = values.filter((value) =>
    ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(value.status),
  );
  const answered = values.filter((value) => value.status === "DA_TRA_LOI");
  const closed = values.filter((value) => value.status === "DA_DONG");
  const rejected = values.filter((value) => value.status === "TU_CHOI");
  const overdue = open.filter(
    (value) =>
      (value.status === "MOI" && now > value.acceptDueAt) ||
      now > value.replyDueAt,
  );
  // Chỉ đánh giá lần trả lời hiện tại theo hạn đã lưu; không dùng cờ isOverdue cho lịch sử.
  const lateReplies = values.filter(
    (value) => value.answeredAt && value.answeredAt > value.replyDueAt,
  );
  const replySamples = values.filter(
    (value) => value.answeredAt !== null,
  ).length;
  const suppressed =
    count < minimum ||
    sparseCounts(
      [
        open.length,
        answered.length,
        closed.length,
        rejected.length,
        overdue.length,
        lateReplies.length,
      ],
      minimum,
    );
  const ratings = values.flatMap((value) =>
    value.rating ? [value.rating.score] : [],
  );
  const durations = closed.flatMap((value) =>
    value.closedAt && value.closedAt >= value.createdAt
      ? [(value.closedAt.getTime() - value.createdAt.getTime()) / DAY]
      : [],
  );
  const cells = {
    count,
    open: open.length,
    answered: answered.length,
    closed: closed.length,
    rejected: rejected.length,
    overdue: overdue.length,
    lateReplies: lateReplies.length,
    overdueRate: open.length >= minimum ? overdue.length / open.length : null,
    lateReplyRate:
      replySamples >= minimum ? lateReplies.length / replySamples : null,
    averageCloseDays: average(durations, minimum),
    averageSatisfaction: average(ratings, minimum),
  };
  return {
    key,
    label,
    suppressed,
    cells: suppressed
      ? Object.fromEntries(Object.keys(cells).map((name) => [name, null]))
      : cells,
  };
}
export function inspectionMetricRow(
  key: string,
  label: string,
  values: readonly InspectionMetricInput[],
  minimum: number,
  now = new Date(),
): ReportRow {
  const statuses = [
    "TIEP_NHAN",
    "XAC_MINH",
    "KET_LUAN",
    "THONG_BAO",
    "DONG",
    "TU_CHOI",
    "CHUYEN_LAI",
  ];
  const counts = statuses.map(
    (status) => values.filter((value) => value.status === status).length,
  );
  const overdue = values.filter(
    (value) =>
      !["DONG", "TU_CHOI", "CHUYEN_LAI"].includes(value.status) &&
      ((!value.acceptedAt && now > value.acceptDueAt) ||
        now > value.completeDueAt),
  ).length;
  const open = values.filter(
    (value) => !["DONG", "TU_CHOI", "CHUYEN_LAI"].includes(value.status),
  );
  const completed = values.filter(
    (value) => value.status === "DONG" && value.closedAt !== null,
  );
  const completedLate = completed.filter(
    (value) => value.closedAt && value.closedAt > value.completeDueAt,
  ).length;
  const outcomes = [
    "CO_CAN_CU",
    "KHONG_CAN_CU",
    "KHONG_DU_THONG_TIN",
    "CHUYEN_DON_VI_KHAC",
  ];
  const conclusionCounts = outcomes.map(
    (outcome) => values.filter((value) => value.conclusion === outcome).length,
  );
  const suppressed =
    values.length < minimum ||
    sparseCounts(
      [...counts, overdue, completedLate, ...conclusionCounts],
      minimum,
    );
  const durations = completed.flatMap((value) =>
    value.closedAt && value.closedAt >= value.createdAt
      ? [(value.closedAt.getTime() - value.createdAt.getTime()) / DAY]
      : [],
  );
  const cells: Record<string, number | null> = {
    count: values.length,
    overdue,
    completedLate,
    overdueRate: open.length >= minimum ? overdue / open.length : null,
    completedLateRate:
      completed.length >= minimum ? completedLate / completed.length : null,
    averageCloseDays: average(durations, minimum),
  };
  statuses.forEach((status, index) => {
    cells[status] = counts[index];
  });
  outcomes.forEach((outcome, index) => {
    cells[outcome] = conclusionCounts[index];
  });
  return {
    key,
    label,
    suppressed,
    cells: suppressed
      ? Object.fromEntries(Object.keys(cells).map((name) => [name, null]))
      : cells,
  };
}
/** Tổng chỉ hiện nếu toàn bộ các nhóm lá dùng để tạo tổng được phép hiển thị. */
export function suppressComplementaryTotals(
  total: ReportRow,
  leaves: readonly ReportRow[],
): ReportRow {
  if (!leaves.some((row) => row.suppressed)) {
    const cells = { ...total.cells };
    for (const key of [
      "averageCloseDays",
      "averageSatisfaction",
      "overdueRate",
      "lateReplyRate",
      "completedLateRate",
    ]) {
      if (leaves.some((row) => row.cells[key] === null)) cells[key] = null;
    }
    return { ...total, cells };
  }
  return {
    ...total,
    suppressed: true,
    cells: Object.fromEntries(
      Object.keys(total.cells).map((key) => [key, null]),
    ),
  };
}
