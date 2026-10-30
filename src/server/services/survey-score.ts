import type { QuestionType } from "../../generated/prisma/enums";

type Fraction = { numerator: bigint; denominator: bigint };
const ZERO: Fraction = { numerator: BigInt(0), denominator: BigInt(1) };
const ONE: Fraction = { numerator: BigInt(1), denominator: BigInt(1) };
const MAX_COUNT = 2_147_483_647;

export interface SurveyScoreOption {
  id: string;
  label: string;
  position: number;
}
export interface SurveyScoreQuestion {
  id: string;
  label: string;
  type: QuestionType;
  position: number;
  weight: string | number;
  scaleMin: number | null;
  scaleMax: number | null;
  options: SurveyScoreOption[];
}
export interface SurveyScoreGroup {
  id: string;
  title: string;
  position: number;
  weight: string | number;
  isAssessmentGroup: boolean;
  questions: SurveyScoreQuestion[];
}
export interface SurveyScoreTemplate {
  groups: SurveyScoreGroup[];
}
/** Không nhận ID phiếu/người dùng, ngày nộp hoặc nội dung tự luận. */
export interface SurveyScoreAnswer {
  questionId: string;
  isNotApplicable?: boolean;
  valueNumber?: string | number | null;
  valueBoolean?: boolean | null;
  valueOptionIds?: string[] | null;
  hasText?: boolean;
  count?: number;
}
export interface SurveyScoreCounts {
  responseCount: number;
  taskCount: number;
  doneTaskCount: number;
  minResponses: number;
  minRate: string | number;
}
export interface SurveyRatingBand {
  minScore: string | number;
  label: string;
}
export const DEFAULT_SURVEY_RATING_BANDS: readonly SurveyRatingBand[] = [
  { minScore: "4.5", label: "Rất tốt" },
  { minScore: "4", label: "Tốt" },
  { minScore: "3", label: "Đạt" },
  { minScore: "2", label: "Cần cải thiện" },
  { minScore: "0", label: "Kém" },
];
export interface SurveyQuestionScore {
  questionId: string;
  label: string;
  type: QuestionType;
  position: number;
  weight: number;
  scaleMin: number | null;
  scaleMax: number | null;
  validCount: number;
  naCount: number;
  blankCount: number;
  sum: number | null;
  mean: number | null;
  distribution: { value: string; label: string; count: number }[];
}
export interface SurveyGroupScore {
  groupId: string;
  title: string;
  position: number;
  weight: number;
  isAssessmentGroup: boolean;
  score: number | null;
  questions: SurveyQuestionScore[];
}
export interface SurveyScoreResult {
  version: 2;
  responseCount: number;
  taskCount: number;
  doneTaskCount: number;
  participationRate: number;
  eligibleToPublish: boolean;
  overallScore: number | null;
  rating: string | null;
  groups: SurveyGroupScore[];
  precision: {
    overall: { numerator: string; denominator: string } | null;
  };
}
/** Ảnh chụp nội bộ của dữ liệu gộp; teacherIds chỉ phục vụ ngưỡng BR-57. */
export interface SurveyAggregateDetails {
  version: 2;
  templateId: string;
  template: SurveyScoreTemplate;
  teacherIds: string[];
  bands: SurveyRatingBand[];
  score: SurveyScoreResult;
}

function invalid(): never {
  throw new Error("Dữ liệu tổng hợp khảo sát không hợp lệ.");
}
function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a < BigInt(0) ? -a : a;
}
function fraction(numerator: bigint, denominator = BigInt(1)): Fraction {
  if (denominator <= BigInt(0) || numerator < BigInt(0)) invalid();
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
function decimal(value: number | string): Fraction {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,4})?$/.test(text) || text.length > 20) invalid();
  const [whole, digits = ""] = text.split(".");
  const denominator = BigInt(10) ** BigInt(digits.length);
  return fraction(
    BigInt(whole) * denominator + BigInt(digits || "0"),
    denominator,
  );
}
function add(a: Fraction, b: Fraction): Fraction {
  return fraction(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}
function multiply(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.numerator, a.denominator * b.denominator);
}
function divide(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === BigInt(0)) invalid();
  return fraction(a.numerator * b.denominator, a.denominator * b.numerator);
}
function compare(a: Fraction, b: Fraction): number {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
}
/** Chỉ gọi ở biên đầu ra; mọi phép cộng/chia/trọng số trước đó dùng phân số. */
function rounded(value: Fraction, digits = 2): number {
  const scale = BigInt(10) ** BigInt(digits);
  const twice = value.numerator * scale * BigInt(2);
  return (
    Number((twice + value.denominator) / (value.denominator * BigInt(2))) /
    Number(scale)
  );
}
function count(value: number, minimum = 0): number {
  if (!Number.isInteger(value) || value < minimum || value > MAX_COUNT)
    invalid();
  return value;
}
function weight(value: string | number): Fraction {
  const result = decimal(value);
  if (
    compare(result, decimal("0.0001")) < 0 ||
    compare(result, decimal(1000)) > 0
  )
    invalid();
  return result;
}
function validateBands(
  bands: readonly SurveyRatingBand[],
): { min: Fraction; label: string }[] {
  if (!bands.length || bands.length > 20) invalid();
  const result = bands.map((band) => {
    const min = decimal(band.minScore);
    if (
      compare(min, decimal(5)) > 0 ||
      !band.label.trim() ||
      band.label.length > 100
    )
      invalid();
    return { min, label: band.label.trim() };
  });
  if (
    result.some(
      (band, index) =>
        index > 0 && compare(result[index - 1].min, band.min) <= 0,
    )
  )
    invalid();
  if (compare(result[result.length - 1].min, ZERO) !== 0) invalid();
  return result;
}
/** Xếp mức trên điểm đủ độ chính xác, không nâng mức vì làm tròn hiển thị. */
export function surveyScoreBand(
  value: number | string,
  bands: readonly SurveyRatingBand[] = DEFAULT_SURVEY_RATING_BANDS,
): string {
  const score = decimal(value);
  if (compare(score, decimal(5)) > 0) invalid();
  return validateBands(bands).find((band) => compare(score, band.min) >= 0)!
    .label;
}

/** BR-11: gộp các giá trị gốc trước khi lấy trung bình, không lấy trung bình điểm lớp. */
export function calculateSurveyScore(
  template: SurveyScoreTemplate,
  answers: readonly SurveyScoreAnswer[],
  counts: SurveyScoreCounts,
  bands: readonly SurveyRatingBand[] = DEFAULT_SURVEY_RATING_BANDS,
): SurveyScoreResult {
  const { responseCount, taskCount, doneTaskCount, minResponses } = counts;
  count(responseCount);
  count(taskCount);
  count(doneTaskCount);
  count(minResponses, 1);
  if (doneTaskCount > taskCount || responseCount > taskCount) invalid();
  const minRate = decimal(counts.minRate);
  if (compare(minRate, ONE) > 0) invalid();
  const ratingBands = validateBands(bands);
  if (!template.groups.length || template.groups.length > 20) invalid();
  const questions = new Map<
    string,
    {
      question: SurveyScoreQuestion;
      seen: number;
      valid: number;
      na: number;
      sum: number;
      distribution: Map<string, number>;
    }
  >();
  const groupIds = new Set<string>(),
    optionIds = new Set<string>();
  for (const group of template.groups) {
    if (groupIds.has(group.id) || !group.questions.length) invalid();
    groupIds.add(group.id);
    weight(group.weight);
    for (const question of group.questions) {
      if (questions.has(question.id)) invalid();
      weight(question.weight);
      if (
        question.type === "LIKERT" &&
        (question.scaleMin !== 1 || ![4, 5].includes(question.scaleMax ?? 0))
      )
        invalid();
      if (
        ![
          "LIKERT",
          "SINGLE_CHOICE",
          "MULTIPLE_CHOICE",
          "BOOLEAN",
          "TEXT",
        ].includes(question.type)
      )
        invalid();
      const choices = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(
        question.type,
      );
      if (
        (choices &&
          (question.options.length < 2 || question.options.length > 20)) ||
        (!choices && question.options.length)
      )
        invalid();
      for (const option of question.options) {
        if (optionIds.has(option.id)) invalid();
        optionIds.add(option.id);
      }
      questions.set(question.id, {
        question,
        seen: 0,
        valid: 0,
        na: 0,
        sum: 0,
        distribution: new Map(),
      });
    }
  }
  if (questions.size > 100) invalid();
  for (const answer of answers) {
    const state = questions.get(answer.questionId);
    if (!state) invalid();
    const multiplier = count(answer.count ?? 1, 1);
    state.seen += multiplier;
    if (state.seen > responseCount) invalid();
    if (
      answer.isNotApplicable !== undefined &&
      typeof answer.isNotApplicable !== "boolean"
    )
      invalid();
    if (answer.hasText !== undefined && typeof answer.hasText !== "boolean")
      invalid();
    const hasNumber =
      answer.valueNumber !== null && answer.valueNumber !== undefined;
    const hasBoolean =
      answer.valueBoolean !== null && answer.valueBoolean !== undefined;
    const options = answer.valueOptionIds ?? [];
    if (
      !Array.isArray(options) ||
      options.some((id) => typeof id !== "string") ||
      new Set(options).size !== options.length
    )
      invalid();
    const hasOptions = options.length > 0,
      hasText = !!answer.hasText;
    if (answer.isNotApplicable) {
      if (hasNumber || hasBoolean || hasOptions || hasText) invalid();
      state.na += multiplier;
      continue;
    }
    if (!hasNumber && !hasBoolean && !hasOptions && !hasText) continue;
    const question = state.question;
    const bump = (key: string) =>
      state.distribution.set(
        key,
        (state.distribution.get(key) ?? 0) + multiplier,
      );
    if (question.type === "LIKERT") {
      if (!hasNumber || hasBoolean || hasOptions || hasText) invalid();
      const value = decimal(answer.valueNumber!);
      if (
        value.denominator !== BigInt(1) ||
        compare(value, ONE) < 0 ||
        compare(value, decimal(question.scaleMax!)) > 0
      )
        invalid();
      const numeric = Number(value.numerator);
      state.sum += numeric * multiplier;
      bump(String(numeric));
    } else if (question.type === "BOOLEAN") {
      if (
        !hasBoolean ||
        typeof answer.valueBoolean !== "boolean" ||
        hasNumber ||
        hasOptions ||
        hasText
      )
        invalid();
      bump(String(answer.valueBoolean));
    } else if (question.type === "TEXT") {
      if (!hasText || hasBoolean || hasNumber || hasOptions) invalid();
    } else {
      if (
        !hasOptions ||
        hasNumber ||
        hasBoolean ||
        hasText ||
        (question.type === "SINGLE_CHOICE" && options.length !== 1)
      )
        invalid();
      for (const option of options) {
        if (!question.options.some((choice) => choice.id === option)) invalid();
        bump(option);
      }
    }
    state.valid += multiplier;
  }
  let overallNumerator = ZERO,
    overallDenominator = ZERO;
  const groups = [...template.groups]
    .sort((a, b) => a.position - b.position)
    .map((group): SurveyGroupScore => {
      let numerator = ZERO,
        denominator = ZERO;
      const groupQuestions = [...group.questions]
        .sort((a, b) => a.position - b.position)
        .map((question): SurveyQuestionScore => {
          const state = questions.get(question.id)!;
          let mean: Fraction | null = null;
          if (question.type === "LIKERT" && state.valid) {
            mean = fraction(BigInt(state.sum), BigInt(state.valid));
            numerator = add(numerator, multiply(weight(question.weight), mean));
            denominator = add(denominator, weight(question.weight));
          }
          const distribution =
            question.type === "LIKERT"
              ? Array.from({ length: question.scaleMax! }, (_, index) => ({
                  value: String(index + 1),
                  label: String(index + 1),
                  count: state.distribution.get(String(index + 1)) ?? 0,
                }))
              : question.type === "BOOLEAN"
                ? [
                    {
                      value: "true",
                      label: "Có",
                      count: state.distribution.get("true") ?? 0,
                    },
                    {
                      value: "false",
                      label: "Không",
                      count: state.distribution.get("false") ?? 0,
                    },
                  ]
                : question.options.map((option) => ({
                    value: option.id,
                    label: option.label,
                    count: state.distribution.get(option.id) ?? 0,
                  }));
          return {
            questionId: question.id,
            label: question.label,
            type: question.type,
            position: question.position,
            weight: Number(question.weight),
            scaleMin: question.scaleMin,
            scaleMax: question.scaleMax,
            validCount: state.valid,
            naCount: state.na,
            blankCount: responseCount - state.valid - state.na,
            sum: question.type === "LIKERT" ? state.sum : null,
            mean: mean ? rounded(mean) : null,
            distribution,
          };
        });
      const score = denominator.numerator
        ? divide(numerator, denominator)
        : null;
      if (score) {
        overallNumerator = add(
          overallNumerator,
          multiply(weight(group.weight), score),
        );
        overallDenominator = add(overallDenominator, weight(group.weight));
      }
      return {
        groupId: group.id,
        title: group.title,
        position: group.position,
        weight: Number(group.weight),
        isAssessmentGroup: group.isAssessmentGroup,
        score: score ? rounded(score) : null,
        questions: groupQuestions,
      };
    });
  const overall = overallDenominator.numerator
    ? divide(overallNumerator, overallDenominator)
    : null;
  const rate = taskCount
    ? fraction(BigInt(doneTaskCount), BigInt(taskCount))
    : ZERO;
  return {
    version: 2,
    responseCount,
    taskCount,
    doneTaskCount,
    participationRate: rounded(rate, 4),
    eligibleToPublish:
      responseCount >= minResponses &&
      taskCount > 0 &&
      compare(rate, minRate) >= 0,
    overallScore: overall ? rounded(overall) : null,
    rating: overall
      ? ratingBands.find((band) => compare(overall, band.min) >= 0)!.label
      : null,
    groups,
    precision: {
      overall: overall
        ? {
            numerator: String(overall.numerator),
            denominator: String(overall.denominator),
          }
        : null,
    },
  };
}

/** Đọc phiên bản mới, dữ liệu cũ/không hợp lệ phải được xử lý riêng và không tự ghi lại. */
export function parseSurveyAggregateDetails(
  value: unknown,
): SurveyAggregateDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const details = value as Partial<SurveyAggregateDetails>;
  if (
    details.version !== 2 ||
    typeof details.templateId !== "string" ||
    !Array.isArray(details.teacherIds) ||
    !details.teacherIds.every((id) => typeof id === "string") ||
    !details.template ||
    !Array.isArray(details.template.groups) ||
    !Array.isArray(details.bands) ||
    !details.score ||
    details.score.version !== 2 ||
    !Array.isArray(details.score.groups)
  )
    return null;
  try {
    // Kiểm cấu trúc mẫu và ngưỡng trước khi tính lại từ số đếm đã lưu.
    calculateSurveyScore(
      details.template,
      [],
      {
        responseCount: 0,
        taskCount: 0,
        doneTaskCount: 0,
        minResponses: 1,
        minRate: 0,
      },
      details.bands,
    );
    const complete = details as SurveyAggregateDetails;
    const checked = poolSurveyScores([complete], {
      minResponses: 1,
      minRate: 0,
    });
    if (!checked) return null;
    return complete;
  } catch {
    return null;
  }
}

/** BR-11/FR-64: cộng số phiếu, phân bố và tổng giá trị gốc; không gộp điểm đã làm tròn. */
export function poolSurveyScores(
  details: readonly SurveyAggregateDetails[],
  thresholds: { minResponses: number; minRate: string | number },
  assessmentOnly = false,
): SurveyScoreResult | null {
  if (!details.length) return null;
  const first = details[0];
  const signature = JSON.stringify(first.template);
  if (
    details.some(
      (item) =>
        item.version !== 2 ||
        item.templateId !== first.templateId ||
        JSON.stringify(item.template) !== signature,
    )
  )
    return null;
  const template = {
    groups: first.template.groups.filter(
      (group) => !assessmentOnly || group.isAssessmentGroup,
    ),
  };
  if (!template.groups.length) return null;
  // Bắt dữ liệu mẫu sai ngay cả khi số phiếu bằng 0.
  calculateSurveyScore(
    template,
    [],
    {
      responseCount: 0,
      taskCount: 0,
      doneTaskCount: 0,
      minResponses: 1,
      minRate: 0,
    },
    first.bands,
  );
  let responseCount = 0,
    taskCount = 0,
    doneTaskCount = 0;
  for (const item of details) {
    count(item.score.responseCount);
    count(item.score.taskCount);
    count(item.score.doneTaskCount);
    if (
      item.score.responseCount > item.score.taskCount ||
      item.score.doneTaskCount > item.score.taskCount
    )
      invalid();
    responseCount += item.score.responseCount;
    taskCount += item.score.taskCount;
    doneTaskCount += item.score.doneTaskCount;
  }
  count(responseCount);
  count(taskCount);
  count(doneTaskCount);
  count(thresholds.minResponses, 1);
  const minRate = decimal(thresholds.minRate);
  if (compare(minRate, ONE) > 0) invalid();
  const bands = validateBands(first.bands);
  let overallNumerator = ZERO,
    overallDenominator = ZERO;
  const groups = template.groups.map((group): SurveyGroupScore => {
    let numerator = ZERO,
      denominator = ZERO;
    const questions = group.questions.map((question): SurveyQuestionScore => {
      let validCount = 0,
        naCount = 0,
        blankCount = 0,
        sum = 0;
      const distribution = new Map<string, number>();
      for (const item of details) {
        const source = item.score.groups
          .find((candidate) => candidate.groupId === group.id)
          ?.questions.find((candidate) => candidate.questionId === question.id);
        if (!source || source.type !== question.type) invalid();
        count(source.validCount);
        count(source.naCount);
        count(source.blankCount);
        if (
          source.validCount + source.naCount + source.blankCount !==
          item.score.responseCount
        )
          invalid();
        validCount += source.validCount;
        naCount += source.naCount;
        blankCount += source.blankCount;
        if (question.type === "LIKERT") {
          count(source.sum!);
          if (
            source.sum! < source.validCount ||
            source.sum! > source.validCount * question.scaleMax!
          )
            invalid();
          sum += source.sum!;
        }
        const sourceDistribution = new Map<string, number>();
        for (const entry of source.distribution) {
          if (sourceDistribution.has(entry.value)) invalid();
          count(entry.count);
          sourceDistribution.set(entry.value, entry.count);
          distribution.set(
            entry.value,
            (distribution.get(entry.value) ?? 0) + entry.count,
          );
        }
        const entries = [...sourceDistribution];
        if (question.type === "LIKERT") {
          if (
            entries.some(
              ([value]) =>
                !Array.from({ length: question.scaleMax! }, (_, index) =>
                  String(index + 1),
                ).includes(value),
            ) ||
            entries.reduce((total, [, amount]) => total + amount, 0) !==
              source.validCount ||
            entries.reduce(
              (total, [value, amount]) => total + Number(value) * amount,
              0,
            ) !== source.sum
          )
            invalid();
        } else if (question.type === "BOOLEAN") {
          if (
            entries.some(([value]) => !["true", "false"].includes(value)) ||
            entries.reduce((total, [, amount]) => total + amount, 0) !==
              source.validCount
          )
            invalid();
        } else if (
          ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(question.type)
        ) {
          if (
            entries.some(
              ([value, amount]) =>
                !question.options.some((option) => option.id === value) ||
                amount > source.validCount,
            )
          )
            invalid();
          const selections = entries.reduce(
            (total, [, amount]) => total + amount,
            0,
          );
          if (
            question.type === "SINGLE_CHOICE"
              ? selections !== source.validCount
              : selections < source.validCount
          )
            invalid();
        } else if (entries.length) invalid();
      }
      let mean: Fraction | null = null;
      if (question.type === "LIKERT" && validCount) {
        mean = fraction(BigInt(sum), BigInt(validCount));
        numerator = add(numerator, multiply(weight(question.weight), mean));
        denominator = add(denominator, weight(question.weight));
      }
      const values =
        question.type === "LIKERT"
          ? Array.from({ length: question.scaleMax! }, (_, index) => ({
              value: String(index + 1),
              label: String(index + 1),
            }))
          : question.type === "BOOLEAN"
            ? [
                { value: "true", label: "Có" },
                { value: "false", label: "Không" },
              ]
            : question.options.map((option) => ({
                value: option.id,
                label: option.label,
              }));
      return {
        questionId: question.id,
        label: question.label,
        type: question.type,
        position: question.position,
        weight: Number(question.weight),
        scaleMin: question.scaleMin,
        scaleMax: question.scaleMax,
        validCount,
        naCount,
        blankCount,
        sum: question.type === "LIKERT" ? sum : null,
        mean: mean ? rounded(mean) : null,
        distribution: values.map((entry) => ({
          ...entry,
          count: distribution.get(entry.value) ?? 0,
        })),
      };
    });
    const score = denominator.numerator ? divide(numerator, denominator) : null;
    if (score) {
      overallNumerator = add(
        overallNumerator,
        multiply(weight(group.weight), score),
      );
      overallDenominator = add(overallDenominator, weight(group.weight));
    }
    return {
      groupId: group.id,
      title: group.title,
      position: group.position,
      weight: Number(group.weight),
      isAssessmentGroup: group.isAssessmentGroup,
      score: score ? rounded(score) : null,
      questions,
    };
  });
  const overall = overallDenominator.numerator
    ? divide(overallNumerator, overallDenominator)
    : null;
  const rate = taskCount
    ? fraction(BigInt(doneTaskCount), BigInt(taskCount))
    : ZERO;
  return {
    version: 2,
    responseCount,
    taskCount,
    doneTaskCount,
    participationRate: rounded(rate, 4),
    eligibleToPublish:
      responseCount >= thresholds.minResponses &&
      taskCount > 0 &&
      compare(rate, minRate) >= 0,
    overallScore: overall ? rounded(overall) : null,
    rating: overall
      ? bands.find((band) => compare(overall, band.min) >= 0)!.label
      : null,
    groups,
    precision: {
      overall: overall
        ? {
            numerator: String(overall.numerator),
            denominator: String(overall.denominator),
          }
        : null,
    },
  };
}
