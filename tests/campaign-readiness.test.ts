import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  campaignActionSchema,
  campaignInputSchema,
  campaignListSchema,
  campaignUpdateSchema,
  requireCampaignReason,
} from "../src/server/services/campaign-input";
import {
  assertReadinessConfirmable,
  evaluateCampaignReadiness,
  hashCampaignCohort,
  type CampaignCohort,
  type CohortSection,
} from "../src/server/services/campaign-readiness";

const ids = Array.from({ length: 10 }, () => randomUUID());
function input() {
  return {
    title: "Đợt khảo sát giả",
    semesterId: ids[0],
    templateId: ids[1],
    scope: "GLOBAL",
    startsAt: "2030-01-01T01:00:00Z",
    endsAt: "2030-01-02T01:00:00Z",
    minResponses: 5,
    minRate: 0.3,
    warningScore: 3,
    explanationDays: 14,
  };
}
const student = (
  studentId: string,
  status = "ACTIVE",
  email: string | null = "fake@example.invalid",
) => ({ studentId, status, email });
function cohort(sections: CohortSection[]): CampaignCohort {
  const pairs = sections.flatMap((section) =>
    section.students.map((item) => ({
      sectionId: section.id,
      studentId: item.studentId,
    })),
  );
  return {
    sections,
    pairs,
    snapshotHash: hashCampaignCohort(
      sections.map((section) => section.id),
      pairs,
    ),
  };
}
const campaign = {
  id: ids[0],
  revision: 3,
  minResponses: 5,
  semester: { lockedAt: null as Date | null },
};

describe("Tuần7 FR-40/41/100 — đầu vào đợt theo phạm vi, giờ UTC và ngưỡng", () => {
  it.each([
    { scope: "GLOBAL" },
    { scope: "FACULTY", facultyId: ids[2] },
    { scope: "DEPARTMENT", departmentId: ids[3] },
    { scope: "SECTIONS", sectionIds: [ids[4], ids[5]] },
  ])("chấp nhận đúng quan hệ phạm vi $scope", (scope) => {
    expect(
      campaignInputSchema.safeParse({ ...input(), ...scope }).success,
    ).toBe(true);
  });
  it.each([
    { scope: "GLOBAL", facultyId: ids[2] },
    { scope: "GLOBAL", sectionIds: [ids[4]] },
    { scope: "FACULTY" },
    { scope: "FACULTY", facultyId: ids[2], departmentId: ids[3] },
    { scope: "DEPARTMENT", facultyId: ids[2] },
    { scope: "SECTIONS", sectionIds: [] },
    { scope: "SECTIONS", sectionIds: [ids[4], ids[4]] },
    { scope: "SECTIONS", sectionIds: [ids[4]], departmentId: ids[3] },
  ])("từ chối phạm vi FK lẫn lộn hoặc danh sách lớp sai %#", (scope) => {
    expect(
      campaignInputSchema.safeParse({ ...input(), ...scope }).success,
    ).toBe(false);
  });
  it.each([
    { minResponses: 0 },
    { minResponses: 1.2 },
    { minRate: -0.1 },
    { minRate: 1.01 },
    { minRate: "0.3" },
    { warningScore: 5.1 },
    { explanationDays: 0 },
    { mandatory: "true" },
    { status: "DA_DUYET" },
    { approvedById: ids[6] },
    { revision: 999 },
    { startsAt: "2030-01-03T00:00:00Z" },
    { startsAt: "2030-01-01T01:00" },
    { endsAt: "2030-01-01T01:00:00Z" },
  ])("chặn ngưỡng/loại/time/field cấp quyền không hợp lệ %#", (invalid) => {
    expect(
      campaignInputSchema.safeParse({ ...input(), ...invalid }).success,
    ).toBe(false);
  });
  it("thời gian có offset được quy về UTC nhất quán, không so chuỗi ISO", () => {
    expect(
      campaignInputSchema.safeParse({
        ...input(),
        startsAt: "2030-01-01T09:00:00+07:00",
        endsAt: "2030-01-01T03:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      campaignInputSchema.safeParse({
        ...input(),
        startsAt: "2030-01-01T09:00:00+07:00",
        endsAt: "2030-01-01T01:59:59Z",
      }).success,
    ).toBe(false);
  });
  it("update và action cần revision hợp lệ; action cần UUID requestId", () => {
    expect(
      campaignUpdateSchema.safeParse({ ...input(), expectedRevision: 1 })
        .success,
    ).toBe(true);
    expect(
      campaignUpdateSchema.safeParse({ ...input(), expectedRevision: 0 })
        .success,
    ).toBe(false);
    expect(
      campaignActionSchema.safeParse({ expectedRevision: 1, requestId: ids[7] })
        .success,
    ).toBe(true);
    expect(
      campaignActionSchema.safeParse({ expectedRevision: 1 }).success,
    ).toBe(false);
    expect(
      campaignActionSchema.safeParse({
        expectedRevision: 1,
        requestId: "unsafe",
        now: "2030-01-01",
      }).success,
    ).toBe(false);
    expect(() => requireCampaignReason("ngắn")).toThrow();
    expect(requireCampaignReason("  Lý do hợp lệ cho thao tác  ")).toBe(
      "Lý do hợp lệ cho thao tác",
    );
  });
  it("giới hạn trang và từ khóa; không cho dùng input client để bật trạng thái giả", () => {
    expect(
      campaignListSchema.safeParse({
        page: "2",
        pageSize: "50",
        status: "CHO_XAC_NHAN_DL",
      }).success,
    ).toBe(true);
    for (const data of [
      { page: 0 },
      { pageSize: 51 },
      { status: "APPROVED" },
      { search: "x".repeat(101) },
      { actorId: ids[8] },
    ])
      expect(campaignListSchema.safeParse(data).success).toBe(false);
  });
});

describe("TC-PDT-02 / BR-52 — readiness có đủ RS-01 đến RS-06", () => {
  const sections: CohortSection[] = [
    {
      id: ids[1],
      code: "THIEU-GV",
      courseName: "Giả1",
      teacherIds: [],
      students: [student(ids[4], "PENDING_ACTIVATION")],
    },
    {
      id: ids[2],
      code: "THIEU-SV",
      courseName: "Giả2",
      teacherIds: [ids[7]],
      students: [],
    },
    {
      id: ids[3],
      code: "NHIEU-GV",
      courseName: "Giả3",
      teacherIds: [ids[7], ids[8]],
      students: [student(ids[5], "DISABLED"), student(ids[6], "ACTIVE", "")],
    },
  ];
  it("bộ seed có lớp thiếu GV/SV, nhiều GV/ít SV và tài khoản chưa hoạt động cho đúng mã", () => {
    const result = evaluateCampaignReadiness(
      { ...campaign, semester: { lockedAt: new Date() } },
      cohort(sections),
      2,
    );
    expect(
      [
        ...new Set(
          [...result.blockers, ...result.warnings].map((issue) => issue.code),
        ),
      ].sort(),
    ).toEqual(["RS-01", "RS-02", "RS-03", "RS-04", "RS-05", "RS-06"]);
    expect(result.canConfirm).toBe(false);
    expect(result.sectionCount).toBe(3);
    expect(result.pairCount).toBe(3);
    expect(
      result.blockers
        .filter((issue) => issue.code === "RS-01")
        .map((issue) => issue.sectionCode),
    ).toEqual(["THIEU-GV"]);
    expect(
      result.blockers
        .filter((issue) => issue.code === "RS-02")
        .map((issue) => issue.sectionCode),
    ).toEqual(["THIEU-SV"]);
    expect(
      result.warnings
        .filter((issue) => issue.code === "RS-06")
        .map((issue) => issue.count),
    ).toEqual([1, 2]);
    expect(() =>
      assertReadinessConfirmable(result, "Đã kiểm tra đầy đủ dữ liệu giả"),
    ).toThrow("lỗi chặn");
  });
  it("cảnh báo không loại account pending/disabled/thiếu email khỏi cohort, nhưng buộc ghi chú khi xác nhận", () => {
    const ready = [{ ...sections[2], teacherIds: [ids[7]] }];
    const result = evaluateCampaignReadiness(campaign, cohort(ready), 2);
    expect(result.canConfirm).toBe(true);
    expect(result.pairCount).toBe(2);
    expect(() => assertReadinessConfirmable(result)).toThrow("ghi chú");
    expect(() =>
      assertReadinessConfirmable(result, "Đã đối chiếu các cảnh báo dữ liệu"),
    ).not.toThrow();
    expect(JSON.stringify(result.warnings)).not.toContain(ids[5]);
    expect(JSON.stringify(result.warnings)).not.toContain(
      "fake@example.invalid",
    );
  });
  it("RS04 dùng ngưỡng cấu hình; RS05 dùng minResponses riêng của đợt", () => {
    const result = evaluateCampaignReadiness(
      { ...campaign, minResponses: 2 },
      cohort([sections[2]]),
      3,
    );
    expect(result.warnings.map((issue) => issue.code)).toEqual(["RS-06"]);
  });
  it("dữ liệu đủ, kỳ mở không tạo cảnh báo hoặc yêu cầu ghi chú giả", () => {
    const result = evaluateCampaignReadiness(
      { ...campaign, minResponses: 1 },
      cohort([
        { ...sections[0], teacherIds: [ids[7]], students: [student(ids[4])] },
      ]),
      2,
    );
    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.canConfirm).toBe(true);
    expect(() => assertReadinessConfirmable(result)).not.toThrow();
  });
  it("phạm vi rỗng không được xác nhận kể cả không có RS của lớp nào", () => {
    const result = evaluateCampaignReadiness(campaign, cohort([]), 2);
    expect(result.canConfirm).toBe(false);
    expect(() => assertReadinessConfirmable(result)).toThrow("chưa có lớp");
  });
});

describe("TC-PDT-03 / BR-01/53 — hash snapshot canonical", () => {
  const pairs = [
    { sectionId: ids[1], studentId: ids[4] },
    { sectionId: ids[2], studentId: ids[5] },
  ];
  it("thứ tự query không gây báo lệch giả", () => {
    expect(hashCampaignCohort([ids[1], ids[2]], pairs)).toBe(
      hashCampaignCohort([ids[2], ids[1]], [...pairs].reverse()),
    );
  });
  it("thay một đăng ký hoặc chuyển lớp làm đổi hash", () => {
    expect(hashCampaignCohort([ids[1], ids[2]], pairs)).not.toBe(
      hashCampaignCohort(
        [ids[1], ids[2]],
        [{ ...pairs[0], studentId: ids[6] }, pairs[1]],
      ),
    );
    expect(hashCampaignCohort([ids[1], ids[2]], pairs)).not.toBe(
      hashCampaignCohort(
        [ids[1], ids[2]],
        [{ ...pairs[0], sectionId: ids[2] }, pairs[1]],
      ),
    );
  });
  it("thêm lớp rỗng vẫn đổi hash dù danh sách cặp không đổi", () => {
    expect(hashCampaignCohort([ids[1], ids[2]], pairs)).not.toBe(
      hashCampaignCohort([ids[1], ids[2], ids[3]], pairs),
    );
  });
});
