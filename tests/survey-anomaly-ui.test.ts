import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SurveyAnomalyDetail } from "../src/server/survey-anomaly-contract";
const mocks = vi.hoisted(() => ({ resource: vi.fn() }));
vi.mock("../src/components/feedback/feedback-client", () => ({
  useFeedbackResource: mocks.resource,
  feedbackRequest: vi.fn(),
  feedbackError: () => "Lỗi giả",
}));
import { SurveyAnomalyDetailPanel } from "../src/components/anomalies/anomaly-panels";
const item: SurveyAnomalyDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  revision: 1,
  campaignId: "00000000-0000-4000-8000-000000000002",
  campaignTitle: "Đợt <script>alert(1)</script>",
  sectionCode: "LHP-GIA",
  courseName: "Môn giả",
  semesterName: "Kỳ giả",
  ruleCode: "UNIFORM_LIKERT",
  status: "CHO_XEM_XET",
  createdAt: "2026-11-03T00:00:00Z",
  metrics: {
    version: 1,
    responseCount: 10,
    participationRate: 0.5,
    uniformCount: 7,
    uniformRate: 0.7,
    scoreDeltaAbs: 1.5,
    priorSemesterName: "Kỳ giả",
    thresholds: { minResponses: 10, uniformRate: 0.7, scoreDelta: 1.5 },
  },
  caseId: null,
  canReview: true,
  note: null,
  events: [
    {
      id: "evt",
      decision: "CAN_LUU_Y",
      note: "Ghi chú <img src=x onerror=alert(1)>",
      actorLabel: "Cán bộ giả",
      occurredAt: "2026-11-03T00:00:00Z",
    },
  ],
};
describe("W12 BR-65 — xemxét chỉsố khôngđổidạngluồngUI", () => {
  it("escape chữnhập vàchỉhiểnthịchỉsố,khôngplaceholder", () => {
    mocks.resource.mockReturnValue({
      data: { item },
      loading: false,
      reload: vi.fn(),
    });
    const html = renderToStaticMarkup(
      createElement(SurveyAnomalyDetailPanel, { id: item.id }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("placeholder=");
    expect(html).toContain("70.00%");
    expect(html).toContain("1.50 điểm");
    expect(html).not.toContain("Điểm tổng");
  });
  it("reviewdùngPOST,khóa mọiôtrướchydration đểghi chúkhôngvàotrangGET", () => {
    mocks.resource.mockReturnValue({
      data: { item },
      loading: false,
      reload: vi.fn(),
    });
    const html = renderToStaticMarkup(
      createElement(SurveyAnomalyDetailPanel, { id: item.id }),
    );
    const form = (html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [])[0] ?? "";
    expect(form).toMatch(/^<form\b[^>]*method="post"/);
    for (const control of form.match(
      /<(?:input|textarea|select|button)\b[^>]*>/g,
    ) ?? [])
      expect(control).toMatch(/\sdisabled(?:=|\s|>)/);
  });
});
