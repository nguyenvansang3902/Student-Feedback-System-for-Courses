import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
import type { FeedbackDetail } from "../src/server/services/feedback-types";
import { FeedbackContent } from "../src/components/feedback/feedback-detail";
import {
  categoryLabels,
  validateFeedbackFiles,
  violationLabels,
} from "../src/components/feedback/labels";

const feedback: FeedbackDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  category: "GIANG_DAY",
  severity: "GOP_Y",
  title: "Góp ý <script>alert(1)</script>",
  status: "DANG_XU_LY",
  revision: 2,
  isAnonymous: true,
  section: {
    id: "00000000-0000-4000-8000-000000000002",
    code: "LHP-DEMO",
    courseName: "Môn học giả",
    semesterName: "Học kỳ giả",
    semesterLocked: false,
  },
  authorLabel: "Sinh viên ẩn danh",
  assignee: null,
  createdAt: "2026-11-01T00:00:00Z",
  inspectionId: null,
  body: "Nội dung <img src=x onerror=alert(1)>",
  identityLevel: null,
  author: null,
  isAuthor: false,
  canAttach: true,
  allowedActions: ["message", "answer", "reject", "forward"],
  forwardTargets: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      displayName: "Cán bộ giả",
      roleLabel: "Trưởng bộ môn",
    },
  ],
  examNotice: null,
  attachments: [],
  messages: [],
  history: [],
};

describe("W10 FR-70/73/76 BR-24/28 — biểu mẫu phản hồi", () => {
  it("có đúng tám loại và năm loại vi phạm để hiển thị", () => {
    expect(Object.keys(categoryLabels)).toHaveLength(8);
    expect(Object.keys(violationLabels)).toHaveLength(5);
    expect(categoryLabels.KHIEU_NAI_NGHIEM_TRONG).toBe(
      "Khiếu nại nghiêm trọng",
    );
  });
  it("giới hạn tổng số tệp, kích thước và phần mở rộng ngay trước upload", () => {
    const file = { name: "ho-so.PDF", size: 5 * 1024 * 1024 };
    expect(validateFeedbackFiles([file], 2)).toBeUndefined();
    expect(validateFeedbackFiles([file, file], 2)).toContain("3 tệp");
    expect(validateFeedbackFiles([{ ...file, size: file.size + 1 }])).toContain(
      "5 MB",
    );
    expect(validateFeedbackFiles([{ name: "anh.exe", size: 10 }])).toContain(
      "PNG, JPG hoặc PDF",
    );
    expect(validateFeedbackFiles([{ name: "anh.jpg", size: 0 }])).toContain(
      "có nội dung",
    );
  });
  it("escape nội dung phản hồi và giữ các biểu mẫu có nội dung ở POST/khóa trước hydration", () => {
    const html = renderToStaticMarkup(
      createElement(FeedbackContent, { item: feedback, reload: () => {} }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Sinh viên ẩn danh");
    const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms.length).toBeGreaterThanOrEqual(3);
    for (const form of forms) {
      expect(form).toMatch(/^<form\b[^>]*\bmethod="post"/);
      for (const input of form.match(
        /<(?:input|textarea|select|button)\b[^>]*>/g,
      ) ?? [])
        expect(input).toMatch(/\sdisabled(?:=|\s|>)/);
    }
  });
});
