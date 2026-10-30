import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResultBucket } from "../src/server/services/survey-results-types";
import {
  ResultGroups,
  ResultSummary,
} from "../src/components/survey-results/result-view";
const bucket: ResultBucket = {
  id: "aggregate",
  level: "COURSE",
  code: "DEMO",
  name: "Môn học giả",
  available: true,
  message: null,
  responseCount: 5,
  taskCount: 10,
  participationRate: 0.5,
  overallScore: 4.5,
  rating: "Tốt",
  groups: [
    {
      groupId: "g",
      title: "Nhóm giả",
      position: 0,
      weight: 1,
      isAssessmentGroup: true,
      score: 4.5,
      questions: [
        {
          questionId: "q",
          label: "Câu hỏi giả",
          type: "LIKERT",
          position: 0,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          validCount: 5,
          naCount: 0,
          blankCount: 0,
          sum: 22,
          mean: 4.4,
          distribution: [{ value: "4", label: "4", count: 3 }],
        },
      ],
    },
  ],
};
describe("W9 BR-07/11/57 — hiển thị số liệu có điều kiện", () => {
  it("không dựng điểm/nhóm ở lớp chưa đủ mẫu dù đầu vào có thừa số liệu", () => {
    const hidden = {
      ...bucket,
      available: false,
      message: "Chưa đủ mẫu để công bố",
    };
    expect(
      renderToStaticMarkup(createElement(ResultGroups, { result: hidden })),
    ).toBe("");
    const summary = renderToStaticMarkup(
      createElement(ResultSummary, { result: hidden }),
    );
    expect(summary).toContain("Chưa đủ mẫu để công bố");
    expect(summary).not.toContain("4,50");
    expect(summary).not.toContain("Tốt");
  });
  it("điểm null hiển thị thiếu dữ liệu và không thành 0", () => {
    const html = renderToStaticMarkup(
      createElement(ResultSummary, {
        result: { ...bucket, overallScore: null, rating: null },
      }),
    );
    expect(html).toContain("Chưa có câu trả lời tính điểm");
    expect(html).not.toContain("0,00");
  });
  it("nội dung nhãn được escape khi dựng HTML", () => {
    const result = {
      ...bucket,
      groups: [{ ...bucket.groups[0], title: '<script>alert("x")</script>' }],
    };
    const html = renderToStaticMarkup(createElement(ResultGroups, { result }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
