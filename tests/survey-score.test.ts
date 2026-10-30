import { describe, expect, it } from "vitest";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  parseSurveyAggregateDetails,
  poolSurveyScores,
  surveyScoreBand,
  type SurveyAggregateDetails,
  type SurveyScoreAnswer,
  type SurveyScoreTemplate,
} from "../src/server/services/survey-score";

const template: SurveyScoreTemplate = {
  groups: [
    {
      id: "A",
      title: "Nhóm A",
      weight: 2,
      position: 1,
      isAssessmentGroup: false,
      questions: [
        {
          id: "Q1",
          label: "Câu 1",
          type: "LIKERT",
          position: 1,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
        {
          id: "Q2",
          label: "Câu 2",
          type: "LIKERT",
          position: 2,
          weight: 2,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
      ],
    },
    {
      id: "B",
      title: "Nhóm B",
      weight: 1,
      position: 2,
      isAssessmentGroup: true,
      questions: [
        {
          id: "Q3",
          label: "Câu 3",
          type: "LIKERT",
          position: 1,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
      ],
    },
  ],
};
const answers: SurveyScoreAnswer[] = [
  ...[5, 4, 4, 5].map((valueNumber) => ({ questionId: "Q1", valueNumber })),
  ...[3, 4, 5].map((valueNumber) => ({ questionId: "Q2", valueNumber })),
  { questionId: "Q2", isNotApplicable: true },
  ...[4, 4, 4, 4].map((valueNumber) => ({ questionId: "Q3", valueNumber })),
];
const counts = {
  responseCount: 4,
  taskCount: 10,
  doneTaskCount: 4,
  minResponses: 4,
  minRate: 0.4,
};
function details(
  extra: Partial<SurveyAggregateDetails> = {},
): SurveyAggregateDetails {
  return {
    version: 2,
    templateId: "template-v1",
    template,
    teacherIds: ["teacher-a"],
    bands: [...DEFAULT_SURVEY_RATING_BANDS],
    score: calculateSurveyScore(template, answers, counts),
    ...extra,
  };
}

describe("FR-60/61 — BR-07/11/12 tổng hợp chính xác", () => {
  it("TC-AGG-01 tính tay Q1=4.50, Q2=4.00, A=4.17, B=4.00, tổng=4.11, tỷ lệ=40%", () => {
    const result = calculateSurveyScore(template, answers, counts);
    expect(result.groups[0].questions.map((question) => question.mean)).toEqual(
      [4.5, 4],
    );
    expect(result.groups.map((group) => group.score)).toEqual([4.17, 4]);
    expect(result.overallScore).toBe(4.11);
    expect(result.participationRate).toBe(0.4);
    expect(result.eligibleToPublish).toBe(true);
    expect(result.precision.overall).toEqual({
      numerator: "37",
      denominator: "9",
    });
  });
  it("BR-07 so sánh ngưỡng tỷ lệ đủ chính xác, không lấy tỷ lệ đã làm tròn", () => {
    const result = calculateSurveyScore(template, answers, {
      ...counts,
      taskCount: 40001,
      doneTaskCount: 12000,
      minRate: 0.3,
    });
    expect(result.participationRate).toBe(0.3);
    expect(result.eligibleToPublish).toBe(false);
  });
  it("BR-07 cần đồng thời đủ số phiếu và tỷ lệ, nhận đúng bằng ngưỡng", () => {
    expect(
      calculateSurveyScore(template, answers, counts).eligibleToPublish,
    ).toBe(true);
    expect(
      calculateSurveyScore(template, answers, { ...counts, minResponses: 5 })
        .eligibleToPublish,
    ).toBe(false);
    expect(
      calculateSurveyScore(template, answers, { ...counts, minRate: 0.4001 })
        .eligibleToPublish,
    ).toBe(false);
  });
  it("BR-11 toàn NA/bỏ trống không trở thành điểm 0 và không cộng trọng số nhóm rỗng", () => {
    const onlyB = answers.filter((answer) => answer.questionId === "Q3");
    const result = calculateSurveyScore(template, onlyB, counts);
    expect(result.groups[0].score).toBeNull();
    expect(result.overallScore).toBe(4);
    const allNa = calculateSurveyScore(
      template,
      [{ questionId: "Q1", isNotApplicable: true, count: 4 }],
      counts,
    );
    expect(allNa.overallScore).toBeNull();
    expect(allNa.rating).toBeNull();
    expect(allNa.eligibleToPublish).toBe(true);
    expect(allNa.groups[0].questions[0].naCount).toBe(4);
    expect(allNa.groups[0].questions[1].blankCount).toBe(4);
  });
  it("BR-11 xếp mức trước khi làm tròn (4.499 hiển thị 4.50 nhưng mức Tốt)", () => {
    const simple = {
      groups: [
        { ...template.groups[0], questions: [template.groups[0].questions[0]] },
      ],
    };
    const result = calculateSurveyScore(
      simple,
      [
        { questionId: "Q1", valueNumber: 4, count: 501 },
        { questionId: "Q1", valueNumber: 5, count: 499 },
      ],
      {
        responseCount: 1000,
        taskCount: 1000,
        doneTaskCount: 1000,
        minResponses: 1,
        minRate: 0,
      },
    );
    expect(result.overallScore).toBe(4.5);
    expect(result.rating).toBe("Tốt");
    expect(surveyScoreBand("4.499")).toBe("Tốt");
  });
  it("BR-11 thang 1–4 giữ giá trị gốc, không tự chuẩn hóa lên thang 5", () => {
    const simple = {
      groups: [
        {
          ...template.groups[0],
          questions: [{ ...template.groups[0].questions[0], scaleMax: 4 }],
        },
      ],
    };
    expect(
      calculateSurveyScore(simple, [{ questionId: "Q1", valueNumber: 4 }], {
        ...counts,
        responseCount: 1,
      }).overallScore,
    ).toBe(4);
  });
  it("BR-11 không gán điểm số cho câu Có/Không, chọn đáp án hay tự luận", () => {
    const mixed: SurveyScoreTemplate = {
      groups: [
        {
          ...template.groups[0],
          questions: [
            {
              ...template.groups[0].questions[0],
              id: "boolean",
              type: "BOOLEAN",
              scaleMin: null,
              scaleMax: null,
            },
            {
              ...template.groups[0].questions[0],
              id: "text",
              type: "TEXT",
              scaleMin: null,
              scaleMax: null,
            },
            {
              ...template.groups[0].questions[0],
              id: "choice",
              type: "MULTIPLE_CHOICE",
              scaleMin: null,
              scaleMax: null,
              options: [
                { id: "o1", label: "A", position: 1 },
                { id: "o2", label: "B", position: 2 },
              ],
            },
          ],
        },
      ],
    };
    const result = calculateSurveyScore(
      mixed,
      [
        { questionId: "boolean", valueBoolean: false },
        { questionId: "text", hasText: true },
        { questionId: "choice", valueOptionIds: ["o1", "o2"] },
      ],
      { ...counts, responseCount: 1 },
    );
    expect(result.overallScore).toBeNull();
    expect(
      result.groups[0].questions.map((question) => question.validCount),
    ).toEqual([1, 1, 1]);
    expect(
      result.groups[0].questions[2].distribution.map((entry) => entry.count),
    ).toEqual([1, 1]);
    const data = details({ template: mixed, score: result });
    const pooled = poolSurveyScores([data, data], {
      minResponses: 1,
      minRate: 0,
    });
    expect(pooled?.groups[0].questions[2].validCount).toBe(2);
    expect(
      pooled?.groups[0].questions[2].distribution.map((entry) => entry.count),
    ).toEqual([2, 2]);
    expect(pooled?.overallScore).toBeNull();
  });
  it.each([
    [{ questionId: "Q1", valueNumber: 6 }],
    [{ questionId: "Q1", valueNumber: 0 }],
    [{ questionId: "Q1", valueNumber: 4.2 }],
    [{ questionId: "Q1", valueNumber: 5, isNotApplicable: true }],
    [{ questionId: "Q1", valueBoolean: true }],
    [{ questionId: "unknown", valueNumber: 4 }],
    [{ questionId: "Q1", valueNumber: 4, count: 5 }],
  ])(
    "BR-11 từ chối dữ liệu sai loại/thang/câu/số đếm mà không lộ nội dung",
    (invalidAnswers) => {
      expect(() =>
        calculateSurveyScore(template, [invalidAnswers], counts),
      ).toThrow("Dữ liệu tổng hợp khảo sát không hợp lệ.");
    },
  );
  it("BR-12 không có nhiệm vụ cho tỷ lệ 0, không đủ mẫu", () => {
    const result = calculateSurveyScore(template, [], {
      ...counts,
      responseCount: 0,
      taskCount: 0,
      doneTaskCount: 0,
    });
    expect(result.participationRate).toBe(0);
    expect(result.eligibleToPublish).toBe(false);
  });
  it("FR-64 gộp toàn bộ phiếu, không trung bình các lớp", () => {
    const simple = {
      groups: [
        { ...template.groups[0], questions: [template.groups[0].questions[0]] },
      ],
    };
    const make = (value: number, amount: number) =>
      details({
        template: simple,
        score: calculateSurveyScore(
          simple,
          [{ questionId: "Q1", valueNumber: value, count: amount }],
          {
            ...counts,
            responseCount: amount,
            taskCount: amount,
            doneTaskCount: amount,
          },
        ),
      });
    const pooled = poolSurveyScores([make(5, 1), make(1, 9)], {
      minResponses: 5,
      minRate: 0.3,
    });
    expect(pooled?.overallScore).toBe(1.4);
    expect(pooled?.responseCount).toBe(10);
  });
  it("FR-64 không gộp khác phiên bản mẫu hoặc khác cấu trúc", () => {
    expect(
      poolSurveyScores([details(), details({ templateId: "template-v2" })], {
        minResponses: 1,
        minRate: 0,
      }),
    ).toBeNull();
    expect(
      poolSurveyScores(
        [details(), details({ template: { groups: [template.groups[1]] } })],
        { minResponses: 1, minRate: 0 },
      ),
    ).toBeNull();
  });
  it("BR-57 chỉ tính nhóm có cờ kiểm tra đánh giá khi chiếu Khảo thí", () => {
    const pooled = poolSurveyScores(
      [details()],
      { minResponses: 1, minRate: 0 },
      true,
    );
    expect(pooled?.groups.map((group) => group.groupId)).toEqual(["B"]);
    expect(pooled?.overallScore).toBe(4);
    expect(
      poolSurveyScores(
        [details({ template: { groups: [template.groups[0]] } })],
        { minResponses: 1, minRate: 0 },
        true,
      ),
    ).toBeNull();
  });
  it("BR-11 đọc chi tiết version2 đã kiểm đếm, fail closed dữ liệu cũ/hỏng", () => {
    expect(parseSurveyAggregateDetails(details())).not.toBeNull();
    expect(parseSurveyAggregateDetails({ version: 1 })).toBeNull();
    const corrupt = structuredClone(details());
    corrupt.score.groups[0].questions[0].sum = 999;
    expect(parseSurveyAggregateDetails(corrupt)).toBeNull();
    expect(
      parseSurveyAggregateDetails({ ...details(), teacherIds: [null] }),
    ).toBeNull();
  });
});
