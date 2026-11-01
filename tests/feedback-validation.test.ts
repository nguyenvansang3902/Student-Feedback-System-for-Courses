import { describe, expect, it } from "vitest";
import {
  createFeedbackSchema,
  feedbackCategories,
  feedbackListSchema,
  feedbackMessageSchema,
  feedbackTransitionSchema,
  inspectionAssignmentSchema,
  inspectionListSchema,
  inspectionViolations,
} from "../src/server/services/feedback-types";
import {
  defaultExamNotice,
  feedbackSettingsSchema,
} from "../src/server/services/feedback-settings";

const sectionId = "55000000-0000-4000-8000-000000000001";
const requestId = "55000000-0000-4000-8000-000000000002";
const targetUserId = "55000000-0000-4000-8000-000000000003";
const base = {
  sectionId,
  requestId,
  category: "GIANG_DAY",
  severity: "GOP_Y",
  title: "Góp ý buổi học",
  body: "Nội dung phản hồi giả dùng để kiểm tra.",
};
const serious = {
  ...base,
  category: "KHIEU_NAI_NGHIEM_TRONG",
  severity: "KHIEU_NAI",
  violation: "VI_PHAM_QUY_CHE_GIANG_DAY",
  acknowledgedSerious: true,
};
const mutation = { revision: 1, requestId };

describe("BR-20/24 / FR-70 — đầu vào gửi phản hồi", () => {
  it("mặc định ẩn danh; không cho client gán người gửi, người nhận hoặc trạng thái", () => {
    expect(createFeedbackSchema.parse(base).isAnonymous).toBe(true);
    for (const extra of [
      { authorId: targetUserId },
      { assigneeId: targetUserId },
      { recipients: [targetUserId] },
      { status: "DA_DONG" },
      { revision: 999 },
      { acceptDueAt: "2099-01-01" },
    ])
      expect(
        createFeedbackSchema.safeParse({ ...base, ...extra }).success,
      ).toBe(false);
  });
  it.each(
    feedbackCategories.filter(
      (category) => category !== "KHIEU_NAI_NGHIEM_TRONG",
    ),
  )("loại thường %s hợp lệ", (category) => {
    expect(
      createFeedbackSchema.safeParse({ ...base, category, isAnonymous: false })
        .success,
    ).toBe(true);
  });
  it("chuẩn hóa khoảng trắng, chặn nội dung rỗng/quá giới hạn và ID không hợp lệ", () => {
    const result = createFeedbackSchema.parse({
      ...base,
      title: `  ${base.title}  `,
      body: `  ${base.body}  `,
    });
    expect(result.title).toBe(base.title);
    expect(result.body).toBe(base.body);
    for (const patch of [
      { title: "    " },
      { title: "a".repeat(201) },
      { body: " ".repeat(20) },
      { body: "a".repeat(10001) },
      { sectionId: "not-a-uuid" },
      { requestId: "not-a-uuid" },
      { category: "CSVC_LICH_HOC" },
      { severity: "URGENT" },
    ])
      expect(
        createFeedbackSchema.safeParse({ ...base, ...patch }).success,
      ).toBe(false);
  });
  it("loại thường không nhận thông tin danh tính/vi phạm dành riêng cho Thanh tra", () => {
    for (const patch of [
      { identityLevel: "AN_DANH_HOAN_TOAN" },
      { violation: "KHAC_NGHIEM_TRONG" },
      { acknowledgedSerious: true },
      { acknowledgedSerious: false },
    ])
      expect(
        createFeedbackSchema.safeParse({ ...base, ...patch }).success,
      ).toBe(false);
  });
});

describe("BR-63 / FR-153 — khiếu nại nghiêm trọng", () => {
  it("cần xác nhận khiếu nại chính thức, loại vi phạm và mức độ cố định", () => {
    expect(createFeedbackSchema.safeParse(serious).success).toBe(true);
    for (const patch of [
      { acknowledgedSerious: false },
      { acknowledgedSerious: undefined },
      { violation: undefined },
      { violation: "OTHER" },
      { severity: "GOP_Y" },
      { severity: "DE_XUAT" },
    ])
      expect(
        createFeedbackSchema.safeParse({ ...serious, ...patch }).success,
      ).toBe(false);
  });
  it.each(inspectionViolations)("nhận loại vi phạm %s", (violation) => {
    expect(
      createFeedbackSchema.safeParse({ ...serious, violation }).success,
    ).toBe(true);
  });
  it("chỉ nhận hai mức danh tính; trường không chọn được để service áp dụng mặc định ẩn danh", () => {
    const defaults = createFeedbackSchema.parse(serious);
    expect(defaults.identityLevel).toBeUndefined();
    expect(defaults.isAnonymous).toBe(true);
    for (const identityLevel of ["AN_DANH_HOAN_TOAN", "CHO_THANH_TRA_BIET"])
      expect(
        createFeedbackSchema.safeParse({ ...serious, identityLevel }).success,
      ).toBe(true);
    for (const identityLevel of ["PUBLIC", "CHO_GIANG_VIEN_BIET", "", null])
      expect(
        createFeedbackSchema.safeParse({ ...serious, identityLevel }).success,
      ).toBe(false);
  });
});

describe("BR-22/30 / FR-72/73/76 — trao đổi, CAS và lý do", () => {
  it("trao đổi yêu cầu nội dung không rỗng, revision dương và requestIdUUID", () => {
    expect(
      feedbackMessageSchema.parse({ ...mutation, body: "  Trao đổi tiếp  " })
        .body,
    ).toBe("Trao đổi tiếp");
    for (const patch of [
      { body: "  " },
      { body: "a".repeat(10001) },
      { revision: 0 },
      { revision: -1 },
      { revision: 1.5 },
      { revision: "1" },
      { requestId: undefined },
      { requestId: "same" },
      { authorId: targetUserId },
      { isHidden: false },
    ])
      expect(
        feedbackMessageSchema.safeParse({
          ...mutation,
          body: "Nội dung trao đổi",
          ...patch,
        }).success,
      ).toBe(false);
  });
  it("chuyển tiếp phải có người nhận và lý do; từ chối cũng bắt buộc lý do", () => {
    const reason = "Phản hồi thuộc phạm vi của đơn vị khác.";
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "forward",
        targetUserId,
        reason,
      }).success,
    ).toBe(true);
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "reject",
        reason,
      }).success,
    ).toBe(true);
    for (const action of ["forward", "reject"])
      for (const invalidReason of [
        undefined,
        "",
        "   ",
        "a".repeat(9),
        "a".repeat(1001),
      ])
        expect(
          feedbackTransitionSchema.safeParse({
            ...mutation,
            action,
            targetUserId,
            reason: invalidReason,
          }).success,
        ).toBe(false);
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "forward",
        reason,
      }).success,
    ).toBe(false);
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "forward",
        targetUserId: "invalid",
        reason,
      }).success,
    ).toBe(false);
  });
  it("trả lời phải có nội dung; action tuần sau và trường vượt quyền không được nhận", () => {
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "answer",
        body: "Nội dung trả lời",
      }).success,
    ).toBe(true);
    for (const body of [undefined, "", "  "])
      expect(
        feedbackTransitionSchema.safeParse({
          ...mutation,
          action: "answer",
          body,
        }).success,
      ).toBe(false);
    for (const action of ["reopen", "escalate", "rate", "XAC_MINH", "KET_LUAN"])
      expect(
        feedbackTransitionSchema.safeParse({ ...mutation, action }).success,
      ).toBe(false);
    expect(
      feedbackTransitionSchema.safeParse({
        ...mutation,
        action: "accept",
        status: "DA_DONG",
      }).success,
    ).toBe(false);
  });
  it("phân công hồ sơ yêu cầu người xử lý, lý do và CAS; không cho gán trạng thái tương lai", () => {
    const input = {
      ...mutation,
      assigneeId: targetUserId,
      reason: "Phân công tiếp nhận hồ sơ theo chức trách.",
    };
    expect(inspectionAssignmentSchema.safeParse(input).success).toBe(true);
    for (const patch of [
      { assigneeId: undefined },
      { assigneeId: "not-a-uuid" },
      { reason: undefined },
      { reason: "  " },
      { revision: 0 },
      { requestId: undefined },
      { status: "XAC_MINH" },
      { conclusion: "CO_CAN_CU" },
    ])
      expect(
        inspectionAssignmentSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
  });
});

describe("FR-71/149 — lọc hàng đợi và lời nhắc phúc khảo", () => {
  it("phân trang có giới hạn và không nhận ID người gửi để đọc hộ", () => {
    expect(feedbackListSchema.parse({})).toEqual({
      view: "mine",
      page: 1,
      pageSize: 20,
    });
    expect(
      feedbackListSchema.parse({
        view: "queue",
        page: "2",
        pageSize: "50",
        category: "TO_CHUC_LOP_HOC",
      }),
    ).toMatchObject({ view: "queue", page: 2, pageSize: 50 });
    for (const patch of [
      { page: 0 },
      { pageSize: 51 },
      { view: "all" },
      { authorId: targetUserId },
      { category: "CSVC_LICH_HOC" },
      { status: "MO_LAI" },
    ])
      expect(feedbackListSchema.safeParse(patch).success).toBe(false);
    expect(
      inspectionListSchema.safeParse({ status: "TIEP_NHAN" }).success,
    ).toBe(true);
    for (const status of ["XAC_MINH", "KET_LUAN", "THONG_BAO", "DONG"])
      expect(inspectionListSchema.safeParse({ status }).success).toBe(false);
  });
  it("lời nhắc phúc khảo có cấu hình và điều kiện học kỳ trước chỉ nhậnboolean thật", () => {
    expect(defaultExamNotice).toContain("không thay thế đơn phúc khảo");
    const input = {
      examNotice: defaultExamNotice,
      allowPreviousSemester: true,
      revision: 1,
      requestId,
    };
    expect(feedbackSettingsSchema.safeParse(input).success).toBe(true);
    expect(
      feedbackSettingsSchema.safeParse({
        ...input,
        allowPreviousSemester: false,
      }).success,
    ).toBe(true);
    for (const patch of [
      { examNotice: " " },
      { examNotice: "a".repeat(1001) },
      { allowPreviousSemester: "false" },
      { revision: 0 },
      { requestId: undefined },
      { allowLockedSemester: true },
    ])
      expect(
        feedbackSettingsSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
  });
});
