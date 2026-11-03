import type { SurveyScoreResult } from "./survey-score";
export interface AnomalyNumberAnswer {
  responseId: string;
  questionId: string;
  isNotApplicable: boolean;
  valueNumber: string | number | null;
}
/** NA/trống không tham gia phép so sánh; một phiếu cần ít nhất hai câu LIKERT hợp lệ. Mẫu số vẫn là toàn bộ số phiếu của lớp. */
export function uniformLikertCount(
  answers: readonly AnomalyNumberAnswer[],
  questionIds: readonly string[],
): number {
  const allowed = new Set(questionIds),
    responses = new Map<string, number[]>();
  for (const answer of answers) {
    if (
      !allowed.has(answer.questionId) ||
      answer.isNotApplicable ||
      answer.valueNumber === null
    )
      continue;
    const value = Number(answer.valueNumber);
    if (!Number.isFinite(value)) continue;
    const values = responses.get(answer.responseId) ?? [];
    values.push(value);
    responses.set(answer.responseId, values);
  }
  return [...responses.values()].filter(
    (values) =>
      values.length >= 2 && values.every((value) => value === values[0]),
  ).length;
}
function fraction(score: SurveyScoreResult) {
  const value = score.precision.overall;
  if (
    !value ||
    !/^\d{1,128}$/.test(value.numerator) ||
    !/^[1-9]\d{0,127}$/.test(value.denominator)
  )
    return null;
  return { n: BigInt(value.numerator), d: BigInt(value.denominator) };
}
/** So ngưỡng bằng phân số trước khi làm tròn; chỉ trả mức chênh tuyệt đối. */
export function scoreShift(
  current: SurveyScoreResult,
  prior: SurveyScoreResult,
  threshold: number,
): { value: number; exceeded: boolean } | null {
  const a = fraction(current),
    b = fraction(prior);
  if (!a || !b) return null;
  const difference = a.n * b.d - b.n * a.d,
    n = difference < 0 ? -difference : difference,
    d = a.d * b.d;
  const units = BigInt(Math.round(threshold * 10000));
  return {
    value: Math.round(Number((n * BigInt(1000000)) / d)) / 1000000,
    exceeded: n * BigInt(10000) >= d * units,
  };
}
export function uniformThresholdExceeded(
  count: number,
  total: number,
  threshold: number,
) {
  return (
    total > 0 &&
    BigInt(count) * BigInt(10000) >=
      BigInt(total) * BigInt(Math.round(threshold * 10000))
  );
}
