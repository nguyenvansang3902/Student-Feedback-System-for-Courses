import { describe, expect, it } from "vitest";
import {
  scoreShift,
  uniformLikertCount,
  uniformThresholdExceeded,
} from "../src/server/services/survey-anomaly-metrics";
import {
  anomalyMetricsSchema,
  anomalyReviewSchema,
  anomalySettingsValueSchema,
} from "../src/server/services/survey-anomaly-types";
import type { SurveyScoreResult } from "../src/server/services/survey-score";
import { randomUUID } from "node:crypto";
const score = (n: string, d = "1") =>
  ({
    precision: { overall: { numerator: n, denominator: d } },
  }) as SurveyScoreResult;
describe("W12 BR-65 — chỉ số bất thường trước khi làm tròn", () => {
  it("đúng 7/10 đạt70%,6/10 khôngđạt; khônglàmtròn69.999%thành70%", () => {
    expect(uniformThresholdExceeded(7, 10, 0.7)).toBe(true);
    expect(uniformThresholdExceeded(6, 10, 0.7)).toBe(false);
    expect(uniformThresholdExceeded(69999, 100000, 0.7)).toBe(false);
  });
  it("bỏ NA/trống và cần hai câu LIKERT hợp lệ; không dùng câu tự luận", () => {
    const rows = [
      {
        responseId: "a",
        questionId: "q1",
        valueNumber: "3",
        isNotApplicable: false,
      },
      {
        responseId: "a",
        questionId: "q2",
        valueNumber: "3.0000",
        isNotApplicable: false,
      },
      {
        responseId: "a",
        questionId: "q3",
        valueNumber: null,
        isNotApplicable: true,
      },
      {
        responseId: "b",
        questionId: "q1",
        valueNumber: "4",
        isNotApplicable: false,
      },
      {
        responseId: "b",
        questionId: "q2",
        valueNumber: null,
        isNotApplicable: false,
      },
      {
        responseId: "c",
        questionId: "q1",
        valueNumber: "4",
        isNotApplicable: false,
      },
      {
        responseId: "c",
        questionId: "q2",
        valueNumber: "5",
        isNotApplicable: false,
      },
    ];
    expect(uniformLikertCount(rows, ["q1", "q2", "q3"])).toBe(1);
    expect(uniformLikertCount(rows, ["q1"])).toBe(0);
    expect(uniformLikertCount(rows, [])).toBe(0);
  });
  it("chênh tuyệt đối đúng1.5đượcgắncờ cho cả tăng và giảm", () => {
    expect(scoreShift(score("4"), score("5", "2"), 1.5)).toEqual({
      value: 1.5,
      exceeded: true,
    });
    expect(scoreShift(score("5", "2"), score("4"), 1.5)).toEqual({
      value: 1.5,
      exceeded: true,
    });
  });
  it("1.49996 khônggắncờ dù hiển thị hai số có thể là1.50", () => {
    expect(
      scoreShift(score("399996", "100000"), score("5", "2"), 1.5)?.exceeded,
    ).toBe(false);
  });
  it("không có điểm hoặc denominator lỗi thì không có chỉ số chênh", () => {
    expect(
      scoreShift(
        { precision: { overall: null } } as SurveyScoreResult,
        score("4"),
        1.5,
      ),
    ).toBeNull();
    expect(scoreShift(score("1", "0"), score("4"), 1.5)).toBeNull();
  });
  it("ngưỡng cấu hình có sàn10phiếu vàphạmvilệ/điểm hợp lệ", () => {
    expect(anomalySettingsValueSchema.parse({})).toMatchObject({
      minResponses: 10,
      uniformRate: 0.7,
      scoreDelta: 1.5,
    });
    expect(
      anomalySettingsValueSchema.safeParse({ minResponses: 9 }).success,
    ).toBe(false);
    expect(
      anomalySettingsValueSchema.safeParse({ uniformRate: 1.1 }).success,
    ).toBe(false);
  });
  it("metrics strictkhôngnhận điểm tuyệtđối,rawanswershoặcthêmstudentID", () => {
    const metrics = {
      version: 1,
      responseCount: 10,
      participationRate: 0.5,
      uniformCount: 7,
      uniformRate: 0.7,
      scoreDeltaAbs: null,
      priorSemesterName: null,
      thresholds: { minResponses: 10, uniformRate: 0.7, scoreDelta: 1.5 },
    };
    expect(anomalyMetricsSchema.safeParse(metrics).success).toBe(true);
    for (const field of [
      "overallScore",
      "teacherIds",
      "studentId",
      "answers",
      "comments",
    ])
      expect(
        anomalyMetricsSchema.safeParse({ ...metrics, [field]: "private" })
          .success,
      ).toBe(false);
  });
  it("quyết định phải cóghi chú vàkhôngnhận trạngtháitựchế hoặc quyềnclient", () => {
    const value = {
      revision: 1,
      requestId: randomUUID(),
      decision: "CAN_LUU_Y",
      note: "Cần đối chiếu cách tổ chức khảo sát.",
    };
    expect(anomalyReviewSchema.safeParse(value).success).toBe(true);
    expect(anomalyReviewSchema.safeParse({ ...value, note: "" }).success).toBe(
      false,
    );
    expect(
      anomalyReviewSchema.safeParse({ ...value, decision: "CONG_BO" }).success,
    ).toBe(false);
    expect(
      anomalyReviewSchema.safeParse({ ...value, actorId: randomUUID() })
        .success,
    ).toBe(false);
  });
});
