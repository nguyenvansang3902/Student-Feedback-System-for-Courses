export function addBusinessDays(from: Date, count: number): Date {
  const result = new Date(from);
  while (count > 0) {
    result.setTime(result.getTime() + 86400000);
    if (![0, 6].includes(new Date(result.getTime() + 7 * 3600000).getUTCDay()))
      count--;
  }
  return result;
}
export function feedbackOverdue(
  row: { status: string; acceptDueAt: Date; replyDueAt: Date },
  now = new Date(),
): boolean {
  return (
    (row.status === "MOI" && now > row.acceptDueAt) ||
    (["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"].includes(row.status) &&
      now > row.replyDueAt)
  );
}
export function ratingAllowed(
  row: { status: string; answeredAt: Date | null; reopenCount: number },
  days: number,
  now = new Date(),
) {
  return (
    ["DA_TRA_LOI", "DA_DONG"].includes(row.status) &&
    !!row.answeredAt &&
    now.getTime() <= row.answeredAt.getTime() + days * 86400000
  );
}
export function reopenAllowed(
  row: {
    status: string;
    closedAt: Date | null;
    reopenCount: number;
    rating?: { score: number } | null;
  },
  days: number,
  now = new Date(),
) {
  return (
    row.status === "DA_DONG" &&
    row.reopenCount === 0 &&
    !!row.closedAt &&
    now.getTime() <= row.closedAt.getTime() + days * 86400000 &&
    !!row.rating &&
    row.rating.score <= 2
  );
}
