import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { InspectionWorkflowPanel } from "../src/components/feedback/inspection-workflow-panel";
import type { InspectionWorkflowDetail } from "../src/server/services/inspection-workflow-types";
const item: InspectionWorkflowDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  source: "PHAN_HOI_NGHIEM_TRONG",
  violation: "HANH_VI_KHONG_PHU_HOP",
  status: "XAC_MINH",
  conclusion: null,
  revision: 3,
  level: "full",
  createdAt: "2026-11-01T00:00:00Z",
  feedbackId: null,
  canAssign: false,
  assignTargets: [],
  isOverdue: false,
  allowedActions: ["conclude"],
  canNote: true,
  acceptDueAt: "2026-11-04T00:00:00Z",
  completeDueAt: "2026-12-15T00:00:00Z",
  notes: [
    {
      id: "n",
      body: "Chứng cứ <script>alert(1)</script>",
      authorLabel: "Cán bộ giả",
      createdAt: "2026-11-02T00:00:00Z",
      attachments: [],
    },
  ],
};
describe("W11 FR-154 BR-28/62 — giao diện Thanh tra", () => {
  it("nội dung được escape, biểu mẫu POST và khóa trước hydration, không placeholder", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionWorkflowPanel, { item, reload: () => {} }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("placeholder=");
    const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms).toHaveLength(2);
    for (const form of forms) {
      expect(form).toMatch(/^<form\b[^>]*\bmethod="post"/);
      for (const control of form.match(
        /<(?:input|textarea|select|button)\b[^>]*>/g,
      ) ?? [])
        expect(control).toMatch(/\sdisabled(?:=|\s|>)/);
    }
    expect(html).toContain("Tệp nội bộ");
  });
  it("BR-62 chiếu summary không dựng panel xác minh hoặc tệp nội bộ", () => {
    expect(
      renderToStaticMarkup(
        createElement(InspectionWorkflowPanel, {
          item: { ...item, level: "summary" },
          reload: () => {},
        }),
      ),
    ).toBe("");
  });
});
