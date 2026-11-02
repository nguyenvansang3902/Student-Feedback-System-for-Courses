import { describe, it, expect } from "vitest";
import {
  addBusinessDays,
  feedbackOverdue,
  ratingAllowed,
  reopenAllowed,
} from "../src/server/services/feedback-deadlines";
import { escalationChain } from "../src/server/services/feedback-sla";
import {
  workflowSettingsSchema,
  workflowValueSchema,
} from "../src/server/services/workflow-settings";
import {
  feedbackRatingSchema,
  feedbackReopenSchema,
} from "../src/server/services/feedback-satisfaction";
const now = new Date("2026-11-02T03:00:00Z");
describe("W11 BR-23/25/26/54/56/60 — thời hạn theo cấu hình và chuỗi leo thang", () => {
  it("BR-23 loại trừ cuối tuần theo Việt Nam, giữ giờ đến hạn", () => {
    expect(
      addBusinessDays(new Date("2026-11-06T10:00:00Z"), 2).toISOString(),
    ).toBe("2026-11-10T10:00:00.000Z");
    expect(
      addBusinessDays(new Date("2026-11-06T18:00:00Z"), 1).toISOString(),
    ).toBe("2026-11-08T18:00:00.000Z");
  });
  it.each(["DA_TRA_LOI", "DA_DONG", "TU_CHOI"])(
    "BR-23 %s không còn quá hạn",
    (status) => {
      expect(
        feedbackOverdue(
          { status, acceptDueAt: new Date(0), replyDueAt: new Date(0) },
          now,
        ),
      ).toBe(false);
    },
  );
  it("BR-23 tiếp nhận và trả lời là hai mốc riêng, tại hạn chưa quá hạn", () => {
    const row = {
      status: "MOI",
      acceptDueAt: now,
      replyDueAt: new Date(now.getTime() + 86400000),
    };
    expect(feedbackOverdue(row, now)).toBe(false);
    expect(feedbackOverdue(row, new Date(now.getTime() + 1))).toBe(true);
    expect(
      feedbackOverdue(
        { ...row, status: "DA_TIEP_NHAN" },
        new Date(now.getTime() + 1),
      ),
    ).toBe(false);
  });
  it.each(["TO_CHUC_LOP_HOC", "THI_KET_THUC_HOC_PHAN"])(
    "BR-54/56 %s leo thang qua ĐBCL tới Lãnh đạo",
    (category) => {
      expect(escalationChain(category).slice(1)).toEqual([
        "CAN_BO_DBCL",
        "LANH_DAO",
      ]);
    },
  );
  it("BR-23 giảng viên→bộ môn→khoa→ĐBCL, không vào Thanh tra", () => {
    expect(escalationChain("GIANG_DAY")).toEqual([
      "GIANG_VIEN",
      "TRUONG_BO_MON",
      "TRUONG_KHOA",
      "CAN_BO_DBCL",
    ]);
  });
  it("BR-25 chỉ đánh giá sau trả lời trong đúng cửa sổ", () => {
    const row = { status: "DA_TRA_LOI", answeredAt: now, reopenCount: 0 };
    expect(ratingAllowed(row, 7, new Date(now.getTime() + 7 * 86400000))).toBe(
      true,
    );
    expect(
      ratingAllowed(row, 7, new Date(now.getTime() + 7 * 86400000 + 1)),
    ).toBe(false);
    expect(ratingAllowed({ ...row, status: "MOI" }, 7, now)).toBe(false);
  });
  it("BR-25 mở lại chỉ từ đóng, điểm≤2, trong7ngày, tối đa1lần", () => {
    const row = {
      status: "DA_DONG",
      closedAt: now,
      reopenCount: 0,
      rating: { score: 2 },
    };
    expect(reopenAllowed(row, 7, now)).toBe(true);
    for (const r of [
      { ...row, reopenCount: 1 },
      { ...row, rating: { score: 3 } },
      { ...row, closedAt: null },
      { ...row, status: "DA_TRA_LOI" },
    ])
      expect(reopenAllowed(r, 7, now)).toBe(false);
    expect(
      reopenAllowed(row, 7, new Date(now.getTime() + 7 * 86400000 + 1)),
    ).toBe(false);
  });
  it("BR-26 mặc định5/ngày, trùng24giờ, hạn3/30 Thanh tra và input giới hạn", () => {
    const data = workflowValueSchema.parse({});
    expect([
      data.dailyFeedbackLimit,
      data.duplicateHours,
      data.inspectionAcceptDays,
      data.inspectionCompleteDays,
    ]).toEqual([5, 24, 3, 30]);
    expect(
      workflowSettingsSchema.safeParse({
        ...data,
        dailyFeedbackLimit: 0,
        requestId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("BR-25 chặn điểm sai, request thiếu, lý do mở lại trống", () => {
    const m = { revision: 1, requestId: crypto.randomUUID() };
    expect(feedbackRatingSchema.safeParse({ ...m, score: 6 }).success).toBe(
      false,
    );
    expect(feedbackReopenSchema.safeParse({ ...m, reason: "" }).success).toBe(
      false,
    );
  });
});
