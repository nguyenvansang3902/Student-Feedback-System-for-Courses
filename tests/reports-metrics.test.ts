import { describe, expect, it } from "vitest";
import {
  feedbackMetricRow,
  inspectionMetricRow,
  sparseCounts,
  suppressComplementaryTotals,
  type FeedbackMetricInput,
  type InspectionMetricInput,
} from "../src/server/services/reports-metrics";
const now = new Date("2026-11-03T10:00:00Z"),
  start = new Date("2026-11-01T10:00:00Z"),
  future = new Date("2026-11-08T10:00:00Z");
const feedback = (
  extra: Partial<FeedbackMetricInput> = {},
): FeedbackMetricInput => ({
  status: "DA_DONG",
  createdAt: start,
  acceptDueAt: future,
  replyDueAt: future,
  acceptedAt: start,
  answeredAt: now,
  closedAt: now,
  rating: { score: 4 },
  ...extra,
});
const inspection = (
  extra: Partial<InspectionMetricInput> = {},
): InspectionMetricInput => ({
  status: "DONG",
  createdAt: start,
  acceptDueAt: future,
  completeDueAt: future,
  acceptedAt: start,
  closedAt: now,
  conclusion: "CO_CAN_CU",
  ...extra,
});
describe("W12 FR-94/151/159 BR-59/66/67 — công thức và ô nhỏ", () => {
  it("tỷ lệ phản hồi dùng mẫu số đang mở và đã có mốc trả lời, không dùng tổng mọi trạng thái", () => {
    const values = [
      ...Array.from({ length: 5 }, () =>
        feedback({
          status: "MOI",
          answeredAt: null,
          closedAt: null,
          rating: null,
          acceptDueAt: start,
        }),
      ),
      ...Array.from({ length: 5 }, () =>
        feedback({
          status: "MOI",
          answeredAt: null,
          closedAt: null,
          rating: null,
        }),
      ),
      ...Array.from({ length: 5 }, () => feedback({ replyDueAt: start })),
      ...Array.from({ length: 5 }, () => feedback()),
    ];
    const row = feedbackMetricRow("k", "Môn học", values, 5, now);
    expect(row.suppressed).toBe(false);
    expect(row.cells.overdueRate).toBe(0.5);
    expect(row.cells.lateReplyRate).toBe(0.5);
  });
  it("tỷ lệ hồ sơ hiện tại và hoàn tất trễ có hai mẫu số độc lập", () => {
    const values = [
      ...Array.from({ length: 5 }, () =>
        inspection({
          status: "XAC_MINH",
          closedAt: null,
          conclusion: null,
          completeDueAt: start,
        }),
      ),
      ...Array.from({ length: 5 }, () =>
        inspection({ status: "XAC_MINH", closedAt: null, conclusion: null }),
      ),
      ...Array.from({ length: 5 }, () => inspection({ completeDueAt: start })),
      ...Array.from({ length: 5 }, () => inspection()),
    ];
    const row = inspectionMetricRow("k", "Hồ sơ", values, 5, now);
    expect(row.suppressed).toBe(false);
    expect(row.cells.overdueRate).toBe(0.5);
    expect(row.cells.completedLateRate).toBe(0.5);
  });
  it("mẫu số bằng 0 trả null, không bịa tỷ lệ 0% hoặc chia cho 0", () => {
    expect(
      feedbackMetricRow(
        "k",
        "Môn học",
        Array.from({ length: 5 }, () => feedback()),
        5,
        now,
      ).cells.overdueRate,
    ).toBeNull();
    expect(
      inspectionMetricRow(
        "k",
        "Hồ sơ",
        Array.from({ length: 5 }, () =>
          inspection({ status: "XAC_MINH", closedAt: null, conclusion: null }),
        ),
        5,
        now,
      ).cells.completedLateRate,
    ).toBeNull();
  });
  it("bốn phản hồi không trả số lượng, thời gian hoặc hài lòng", () => {
    const row = feedbackMetricRow(
      "k",
      "Môn học",
      Array.from({ length: 4 }, () => feedback()),
      5,
      now,
    );
    expect(row.suppressed).toBe(true);
    expect(Object.values(row.cells).every((v) => v === null)).toBe(true);
  });
  it("đủ năm mẫu cho số lượng, trung bình số ngày lịch và hài lòng đúng", () => {
    const row = feedbackMetricRow(
      "k",
      "Môn học",
      Array.from({ length: 5 }, () => feedback()),
      5,
      now,
    );
    expect(row.suppressed).toBe(false);
    expect(row.cells).toMatchObject({
      count: 5,
      closed: 5,
      open: 0,
      averageCloseDays: 2,
      averageSatisfaction: 4,
      overdue: 0,
      lateReplies: 0,
    });
  });
  it("một ô trạng thái nhỏ khiến tổng cùng hàng cũng bị ẩn", () => {
    const values = [
      ...Array.from({ length: 5 }, () => feedback()),
      feedback({
        status: "MOI",
        closedAt: null,
        answeredAt: null,
        rating: null,
      }),
    ];
    const row = feedbackMetricRow("k", "Môn học", values, 5, now);
    expect(row.suppressed).toBe(true);
    expect(row.cells.count).toBeNull();
  });
  it("mẫu hài lòng ít phải ẩn riêng trung bình dù đủ phản hồi", () => {
    const values = Array.from({ length: 5 }, (_, i) =>
      feedback({ rating: i === 0 ? { score: 1 } : null }),
    );
    const row = feedbackMetricRow("k", "Môn học", values, 5, now);
    expect(row.suppressed).toBe(false);
    expect(row.cells.count).toBe(5);
    expect(row.cells.averageSatisfaction).toBeNull();
  });
  it("lịch sử trả lời muộn dựa vào mốc lưu, không dựa cờ quá hạn hiện tại", () => {
    const values = Array.from({ length: 5 }, () => ({
      ...feedback({ replyDueAt: start }),
      isOverdue: false,
    }));
    const row = feedbackMetricRow("k", "Môn học", values, 5, now);
    expect(row.cells.lateReplies).toBe(5);
    expect(row.cells.overdue).toBe(0);
  });
  it("tại đúng giờ đến hạn chưa quá hạn", () => {
    const values = Array.from({ length: 5 }, () =>
      feedback({
        status: "MOI",
        acceptDueAt: now,
        replyDueAt: future,
        answeredAt: null,
        closedAt: null,
        rating: null,
      }),
    );
    expect(
      feedbackMetricRow("k", "Môn học", values, 5, now).cells.overdue,
    ).toBe(0);
  });
  it("thời gian âm hoặc thiếu không được đưa vào trung bình", () => {
    const values = Array.from({ length: 5 }, () =>
      feedback({ closedAt: new Date("2026-10-01") }),
    );
    expect(
      feedbackMetricRow("k", "Môn học", values, 5, now).cells.averageCloseDays,
    ).toBeNull();
  });
  it("hồ sơ ít mẫu hoặc có một kết luận nhỏ không lộ count/subcells", () => {
    expect(
      inspectionMetricRow(
        "k",
        "Hồ sơ",
        Array.from({ length: 4 }, () => inspection()),
        5,
        now,
      ).suppressed,
    ).toBe(true);
    const values = [
      ...Array.from({ length: 5 }, () => inspection()),
      inspection({ conclusion: "KHONG_CAN_CU" }),
    ];
    const row = inspectionMetricRow("k", "Hồ sơ", values, 5, now);
    expect(Object.values(row.cells).every((v) => v === null)).toBe(true);
  });
  it("năm hồ sơ đủ điều kiện hiển thị đúng thời gian và kết luận gộp", () => {
    const row = inspectionMetricRow(
      "k",
      "Hồ sơ",
      Array.from({ length: 5 }, () => inspection()),
      5,
      now,
    );
    expect(row.cells).toMatchObject({
      count: 5,
      DONG: 5,
      CO_CAN_CU: 5,
      averageCloseDays: 2,
      overdue: 0,
    });
  });
  it("tổng học kỳ bị ẩn khi nhóm lá chưa đủ mẫu, không suy ra ô nhỏ bằng phép trừ", () => {
    const enough = feedbackMetricRow(
        "a",
        "A",
        Array.from({ length: 5 }, () => feedback()),
        5,
        now,
      ),
      tiny = feedbackMetricRow("b", "B", [feedback()], 5, now),
      total = feedbackMetricRow(
        "all",
        "Tổng",
        Array.from({ length: 6 }, () => feedback()),
        5,
        now,
      );
    expect(
      suppressComplementaryTotals(total, [enough, tiny]).cells.count,
    ).toBeNull();
  });
  it("trung bình tổng cũng ẩn nếu trung bình của một nhóm lá bị ẩn", () => {
    const leaf = feedbackMetricRow(
        "a",
        "A",
        Array.from({ length: 5 }, () => feedback({ rating: null })),
        5,
        now,
      ),
      total = feedbackMetricRow(
        "all",
        "Tổng",
        Array.from({ length: 10 }, () => feedback()),
        5,
        now,
      );
    const row = suppressComplementaryTotals(total, [leaf]);
    expect(row.suppressed).toBe(false);
    expect(row.cells.count).toBe(10);
    expect(row.cells.averageSatisfaction).toBeNull();
  });
  it("số 0 không tự tạo ô nhỏ, ngưỡng chỉ áp dụng trên ô có dữ liệu", () => {
    expect(sparseCounts([0, 5, 10], 5)).toBe(false);
    expect(sparseCounts([0, 4, 10], 5)).toBe(true);
  });
  it("không chiếu thuộc tính định danh hay nội dung từ dữ liệu đầu vào", () => {
    const value = {
      ...feedback(),
      authorId: "CANARY_ID",
      author: { displayName: "CANARY_NAME", email: "CANARY_EMAIL" },
      body: "CANARY_PRIVATE",
    };
    const result = feedbackMetricRow(
      "k",
      "Môn học",
      Array.from({ length: 5 }, () => value),
      5,
      now,
    );
    expect(JSON.stringify(result)).not.toMatch(/CANARY/);
  });
});
