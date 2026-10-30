import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";
import { resultSectionScopeWhere } from "../src/server/policies/can";
import {
  getSurveyClassResults,
  getSurveyResults,
  listSurveyResults,
  resultsCapabilities,
} from "../src/server/services/survey-results";
import {
  calculateSurveyScore,
  DEFAULT_SURVEY_RATING_BANDS,
  type SurveyAggregateDetails,
  type SurveyScoreTemplate,
} from "../src/server/services/survey-score";

const mocks = vi.hoisted(() => {
  const delegate = () => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  });
  return {
    fresh: vi.fn(),
    lock: vi.fn(),
    db: {
      surveyCampaign: delegate(),
      campaignSection: delegate(),
      surveyResponse: delegate(),
      surveyTask: delegate(),
      surveyAnswer: delegate(),
      semester: delegate(),
      $transaction: vi.fn(),
    },
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/services/access")>()),
  assertFreshActor: mocks.fresh,
  lockAdminMutations: mocks.lock,
}));
const { db } = mocks;
const ids = Array.from({ length: 12 }, () => randomUUID());
function actor(...roles: Role[]): AuthActor {
  return {
    userId: ids[0],
    sessionId: ids[1],
    familyId: ids[2],
    loginCode: "GIA",
    email: "gia@fixture.invalid",
    displayName: "Người dùng giả",
    purpose: "FULL",
    mustChangePassword: false,
    mfa: roles.includes("ADMIN"),
    mfaRequired: roles.includes("ADMIN"),
    roles,
    assignments: roles.map((role) => ({
      role,
      scopeType:
        role === "TRUONG_BO_MON"
          ? "DEPARTMENT"
          : role === "TRUONG_KHOA"
            ? "FACULTY"
            : "GLOBAL",
      facultyId: role === "TRUONG_KHOA" ? ids[4] : null,
      departmentId: role === "TRUONG_BO_MON" ? ids[3] : null,
    })),
  };
}
const template: SurveyScoreTemplate = {
  groups: [
    {
      id: ids[8],
      title: "Kiểm tra, đánh giá",
      position: 1,
      weight: 1,
      isAssessmentGroup: true,
      questions: [
        {
          id: ids[9],
          label: "Điểm đánh giá",
          type: "LIKERT",
          position: 1,
          weight: 1,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
        {
          id: ids[10],
          label: "Tự luận",
          type: "TEXT",
          position: 2,
          weight: 1,
          scaleMin: null,
          scaleMax: null,
          options: [],
        },
      ],
    },
    {
      id: ids[11],
      title: "Giảng dạy",
      position: 2,
      weight: 1,
      isAssessmentGroup: false,
      questions: [
        {
          id: randomUUID(),
          label: "Điểm giảng dạy",
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
function details(
  responseCount = 5,
  teacherIds = [randomUUID()],
): SurveyAggregateDetails {
  return {
    version: 2,
    templateId: ids[5],
    template,
    teacherIds,
    bands: [...DEFAULT_SURVEY_RATING_BANDS],
    score: calculateSurveyScore(
      template,
      [
        { questionId: ids[9], valueNumber: 5, count: responseCount },
        { questionId: ids[10], hasText: true, count: responseCount },
        {
          questionId: template.groups[1].questions[0].id,
          valueNumber: 3,
          count: responseCount,
        },
      ],
      {
        responseCount,
        taskCount: responseCount + 2,
        doneTaskCount: responseCount,
        minResponses: 5,
        minRate: 0.3,
      },
    ),
  };
}
function fixture(stored = details()) {
  const campaign = {
    id: ids[6],
    title: "Khảo sát giả",
    status: "DA_CONG_BO",
    revision: 4,
    semesterId: ids[7],
    templateId: ids[5],
    minResponses: 5,
    minRate: "0.3",
    semester: {
      name: "Học kỳ giả",
      startsOn: new Date("2026-09-01"),
      lockedAt: null as Date | null,
    },
    template: { name: "Mẫu giả", ...template },
  };
  const cohort = {
    campaignId: campaign.id,
    sectionId: randomUUID(),
    result: { details: stored },
    section: {
      id: randomUUID(),
      code: "LHP_GIA",
      courseId: randomUUID(),
      course: {
        id: randomUUID(),
        code: "MH_GIA",
        name: "Môn giả",
        departmentId: ids[3],
        department: {
          id: ids[3],
          code: "BM_GIA",
          name: "Bộ môn giả",
          facultyId: ids[4],
          faculty: { id: ids[4], code: "K_GIA", name: "Khoa giả" },
        },
      },
    },
  };
  cohort.section.id = cohort.sectionId;
  cohort.section.courseId = cohort.section.course.id;
  return { campaign, cohort };
}
let sample: ReturnType<typeof fixture>;
beforeEach(() => {
  vi.resetAllMocks();
  sample = fixture();
  mocks.fresh.mockImplementation(async (_tx, value) => value);
  mocks.lock.mockResolvedValue(undefined);
  db.$transaction.mockImplementation(
    async (operation: (tx: typeof db) => unknown) => operation(db),
  );
  db.surveyCampaign.findFirst.mockImplementation(async () => sample.campaign);
  db.surveyCampaign.findMany.mockImplementation(async () => [sample.campaign]);
  db.surveyCampaign.count.mockResolvedValue(1);
  db.campaignSection.findMany.mockImplementation(async () => [sample.cohort]);
  db.campaignSection.findFirst.mockImplementation(async () => sample.cohort);
  db.semester.findFirst.mockResolvedValue(null);
  db.surveyAnswer.findMany.mockResolvedValue([]);
  db.surveyAnswer.count.mockResolvedValue(0);
});

describe("BR-08/18/34/57 — kết quả theo năng lực và phạm vi riêng", () => {
  it.each<Role>(["ADMIN", "PHONG_DAO_TAO", "SINH_VIEN", "THANH_TRA"])(
    "%s bị từ chối trước DB",
    async (role) => {
      const value = actor(role);
      for (const operation of [
        () => listSurveyResults(value),
        () => getSurveyResults(value, ids[6]),
        () => getSurveyClassResults(value, ids[6], sample.cohort.sectionId),
      ])
        await expect(operation()).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("quyền/phiên hạn chế hoặc gán sai loại phạm vi không được đọc DB", async () => {
    const value = actor("GIANG_VIEN");
    for (const denied of [
      { ...value, purpose: "MFA_VERIFY" as const },
      { ...value, mustChangePassword: true },
      {
        ...value,
        assignments: [
          {
            role: "GIANG_VIEN" as const,
            scopeType: "FACULTY" as const,
            facultyId: ids[4],
            departmentId: null,
          },
        ],
      },
    ])
      await expect(listSurveyResults(denied)).rejects.toMatchObject({
        status: 403,
      });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("đọc lại quyền sau mutex; quyền bị thu hồi không chạy truy vấn nghiệp vụ", async () => {
    mocks.fresh.mockResolvedValue(actor("SINH_VIEN"));
    await expect(listSurveyResults(actor("GIANG_VIEN"))).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fresh.mock.invocationCallOrder[0],
    );
    expect(db.surveyCampaign.findMany).not.toHaveBeenCalled();
  });
  it("GV+Khảo thí không mở rộng điều kiện xem lớp; ADMIN+GV cũng giữ đúng phạm vi GV", () => {
    for (const value of [
      actor("GIANG_VIEN", "PHONG_KHAO_THI"),
      actor("GIANG_VIEN", "ADMIN"),
    ])
      expect(resultSectionScopeWhere(value)).toEqual({
        OR: [{ teaching: { some: { teacherId: ids[0] } } }],
      });
    const capabilities = resultsCapabilities(
      actor("GIANG_VIEN", "PHONG_KHAO_THI"),
    );
    expect(capabilities).toMatchObject({
      standard: true,
      assessment: true,
      aggregate: false,
      moderate: false,
    });
  });
  it("list/count chia sẻ cùng điều kiện scope và chỉ công bố cho GV", async () => {
    const value = actor("GIANG_VIEN");
    await listSurveyResults(value, { page: 2, pageSize: 7, search: " giả " });
    const where = db.surveyCampaign.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      title: { contains: "giả" },
      OR: [
        {
          status: { in: ["DA_CONG_BO", "LUU_TRU"] },
          sections: { some: { section: resultSectionScopeWhere(value) } },
        },
      ],
    });
    expect(db.surveyCampaign.count).toHaveBeenCalledWith({ where });
    expect(db.surveyCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 7, take: 7 }),
    );
  });
  it("DBCL/LD đọc đợt đóng để tổng hợp, GV chỉ sau công bố hoặc lưu trữ", async () => {
    for (const role of ["CAN_BO_DBCL", "LANH_DAO", "GIANG_VIEN"] as const) {
      await listSurveyResults(actor(role));
      const statuses =
        db.surveyCampaign.findMany.mock.calls.at(-1)![0].where.OR[0].status.in;
      expect(statuses).toEqual(
        role === "GIANG_VIEN"
          ? ["DA_CONG_BO", "LUU_TRU"]
          : role === "CAN_BO_DBCL"
            ? ["DANG_MO", "DA_DONG", "DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"]
            : ["DA_DONG", "DA_TONG_HOP", "DA_CONG_BO", "LUU_TRU"],
      );
    }
  });
  it("ID khác phạm vi và không tồn tại cùng404; điều kiện lớp nằm tại truy vấn", async () => {
    const value = actor("TRUONG_BO_MON");
    db.campaignSection.findFirst.mockResolvedValue(null);
    await expect(
      getSurveyClassResults(value, ids[6], sample.cohort.sectionId),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.campaignSection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          campaignId: ids[6],
          sectionId: sample.cohort.sectionId,
          section: resultSectionScopeWhere(value),
        },
      }),
    );
    expect(db.surveyAnswer.findMany).not.toHaveBeenCalled();
    db.surveyCampaign.findFirst.mockResolvedValue(null);
    await expect(getSurveyResults(value, randomUUID())).rejects.toMatchObject({
      status: 404,
    });
  });
  it("Khảo thí không gọi được class route dù có UUID hợp lệ", async () => {
    await expect(
      getSurveyClassResults(
        actor("PHONG_KHAO_THI"),
        ids[6],
        sample.cohort.sectionId,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("BR-13 trưởng đơn vị thấy metadata đợt mở/chưa công bố để nhắc; không nhận điểm trước công bố", async () => {
    sample.campaign.status = "DA_TONG_HOP";
    const value = actor("TRUONG_BO_MON");
    await listSurveyResults(value);
    expect(db.surveyCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              status: {
                in: [
                  "DANG_MO",
                  "DA_DONG",
                  "DA_TONG_HOP",
                  "DA_CONG_BO",
                  "LUU_TRU",
                ],
              },
              sections: { some: { section: resultSectionScopeWhere(value) } },
            },
          ],
        },
      }),
    );
    const result = await getSurveyResults(value, ids[6]);
    expect(result.campaign.capabilities.incomplete).toBe(true);
    expect(result.buckets).toEqual([]);
    expect(db.surveyResponse.findMany).not.toHaveBeenCalled();
    db.surveyCampaign.findFirst.mockResolvedValue(null);
    await expect(
      getSurveyClassResults(value, ids[6], sample.cohort.sectionId),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.surveyCampaign.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          id: ids[6],
          status: { in: ["DA_CONG_BO", "LUU_TRU"] },
          sections: { some: { section: resultSectionScopeWhere(value) } },
        },
      }),
    );
  });
  it("TC-KT-01 đủ hai GV: chỉ môn/bộ môn/khoa và điểm nhóm đánh giá, không tự luận hay snapshot", async () => {
    sample.cohort.result.details = details(5, [randomUUID(), randomUUID()]);
    const result = await getSurveyResults(actor("PHONG_KHAO_THI"), ids[6]);
    expect(result.audience).toBe("ASSESSMENT");
    expect(result.buckets).toHaveLength(3);
    expect(result.pendingModeration).toBeNull();
    for (const bucket of result.buckets) {
      expect(bucket.level).not.toBe("CLASS");
      expect(bucket.available).toBe(true);
      expect(bucket.overallScore).toBe(5);
      expect(bucket.groups).toHaveLength(1);
      expect(bucket.groups[0].questions).toEqual([]);
    }
    const text = JSON.stringify(result);
    for (const forbidden of [
      sample.cohort.sectionId,
      "teacherIds",
      "responseId",
      "answerId",
      "Tự luận",
      "Điểm giảng dạy",
    ])
      expect(text).not.toContain(forbidden);
  });
  it("TC-KT-01 một GV hoặc thiếu mẫu ẩn cả số đếm và điểm; hai lớp cùng GV vẫn là một người", async () => {
    for (const stored of [details(5, [ids[0]]), details(4, [ids[0], ids[1]])]) {
      sample.cohort.result.details = stored;
      const result = await getSurveyResults(actor("PHONG_KHAO_THI"), ids[6]);
      for (const bucket of result.buckets)
        expect(bucket).toMatchObject({
          available: false,
          message: "Chưa đủ dữ liệu gộp",
          responseCount: null,
          taskCount: null,
          participationRate: null,
          overallScore: null,
          rating: null,
          groups: [],
        });
    }
    const duplicate = structuredClone(sample.cohort);
    duplicate.sectionId = randomUUID();
    duplicate.result.details = details(5, [ids[0]]);
    sample.cohort.result.details = details(5, [ids[0]]);
    db.campaignSection.findMany.mockResolvedValue([sample.cohort, duplicate]);
    const result = await getSurveyResults(actor("PHONG_KHAO_THI"), ids[6]);
    expect(result.buckets.every((bucket) => !bucket.available)).toBe(true);
  });
  it("Khảo thí đổi audience sang STANDARD bị403; vai trò kết hợp chọn audience không nới scope", async () => {
    await expect(
      getSurveyResults(actor("PHONG_KHAO_THI"), ids[6], "STANDARD"),
    ).rejects.toMatchObject({ status: 403 });
    const value = actor("PHONG_KHAO_THI", "GIANG_VIEN");
    await getSurveyResults(value, ids[6], "STANDARD");
    expect(db.campaignSection.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          campaignId: ids[6],
          section: resultSectionScopeWhere(value),
        },
      }),
    );
  });
  it("KT+GV ở đợt ngoài lớp mình: metadata gắn đúng capability và mặc định mở dữ liệu KT", async () => {
    const value = actor("PHONG_KHAO_THI", "GIANG_VIEN");
    db.campaignSection.findMany.mockImplementation(
      async ({
        select,
      }: {
        select: { campaignId?: boolean; sectionId?: boolean };
      }) => (select.campaignId && !select.sectionId ? [] : [sample.cohort]),
    );
    const list = await listSurveyResults(value);
    expect(list.items[0].capabilities).toMatchObject({
      standard: false,
      assessment: true,
      incomplete: false,
    });
    const result = await getSurveyResults(value, ids[6]);
    expect(result.audience).toBe("ASSESSMENT");
    expect(result.buckets.every((bucket) => bucket.level !== "CLASS")).toBe(
      true,
    );
    await expect(
      getSurveyResults(value, ids[6], "STANDARD"),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("BR-03/07/09/11/12/17 — DTO, ngưỡng và so sánh", () => {
  it("lớp thiếu mẫu ẩn điểm/câu hỏi/góp ý kể cả DBCL; chỉ DBCL/LD giữ số đếm", async () => {
    sample.cohort.result.details = details(4);
    for (const role of ["CAN_BO_DBCL", "GIANG_VIEN"] as const) {
      const result = await getSurveyClassResults(
        actor(role),
        ids[6],
        sample.cohort.sectionId,
      );
      expect(result.result).toMatchObject({
        available: false,
        message: "Chưa đủ mẫu để công bố",
        overallScore: null,
        rating: null,
        groups: [],
      });
      expect(result.result.responseCount).toBe(
        role === "CAN_BO_DBCL" ? 4 : null,
      );
      expect(result.comments).toEqual([]);
    }
    expect(db.surveyAnswer.findMany).not.toHaveBeenCalled();
  });
  it("góp ý được duyệt chỉ còn nhãn câu/văn bản, không nối nhóm phiếu/định danh/ngày nộp", async () => {
    db.surveyAnswer.findMany.mockResolvedValue([
      { questionId: ids[10], valueText: "Góp ý giả" },
    ]);
    const result = await getSurveyClassResults(
      actor("GIANG_VIEN"),
      ids[6],
      sample.cohort.sectionId,
    );
    expect(result.comments).toEqual([
      { questionLabel: "Tự luận", text: "Góp ý giả" },
    ]);
    expect(db.surveyAnswer.findMany).toHaveBeenCalledWith({
      where: {
        response: { campaignId: ids[6], sectionId: sample.cohort.sectionId },
        questionId: { in: [ids[10]] },
        isNotApplicable: false,
        moderationStatus: "HIEN_THI",
        valueText: { not: null },
      },
      select: { questionId: true, valueText: true },
    });
  });
  it("FR-64 gộp bộ môn/khoa toàn bộ phiếu cùng mẫu; trước công bố không lộ số liệu đợt khác cho GV", async () => {
    const result = await getSurveyClassResults(
      actor("GIANG_VIEN"),
      ids[6],
      sample.cohort.sectionId,
    );
    expect(result.comparisons).toHaveLength(3);
    const queries = db.surveyCampaign.findMany.mock.calls.map(
      ([query]) => query.where,
    );
    expect(queries).toEqual([
      {
        semesterId: ids[7],
        templateId: ids[5],
        status: { in: ["DA_CONG_BO", "LUU_TRU"] },
        sections: { some: { section: { course: { departmentId: ids[3] } } } },
      },
      {
        semesterId: ids[7],
        templateId: ids[5],
        status: { in: ["DA_CONG_BO", "LUU_TRU"] },
        sections: {
          some: { section: { course: { department: { facultyId: ids[4] } } } },
        },
      },
    ]);
    expect(result.comparisons[2]).toEqual({
      label: "Học kỳ trước",
      result: null,
      message: "Không có dữ liệu tương thích",
    });
  });
  it("FR-64 học kỳ trước cùng môn/cùng templateId; không tự đổi phiên bản hoặc thang", async () => {
    const prior = { id: randomUUID(), name: "Kỳ trước giả" };
    db.semester.findFirst.mockResolvedValue(prior);
    db.surveyCampaign.findMany.mockResolvedValue([]);
    const result = await getSurveyClassResults(
      actor("GIANG_VIEN"),
      ids[6],
      sample.cohort.sectionId,
    );
    expect(db.surveyCampaign.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          semesterId: prior.id,
          templateId: ids[5],
          status: { in: ["DA_CONG_BO", "LUU_TRU"] },
          sections: {
            some: { section: { courseId: sample.cohort.section.course.id } },
          },
        },
      }),
    );
    expect(result.comparisons[2].message).toBe("Không có dữ liệu tương thích");
  });
  it("FR-64 điểm so sánh vẫn gộp khi các đợt khác cấu hình mức; không chọn mức theo thứ tự UUID", async () => {
    const otherCampaign = { ...sample.campaign, id: randomUUID() };
    const otherCohort = structuredClone(sample.cohort);
    otherCohort.campaignId = otherCampaign.id;
    otherCohort.result.details.bands[0].label = "Mức tùy chỉnh giả";
    db.campaignSection.findMany.mockResolvedValue([sample.cohort, otherCohort]);
    for (const campaigns of [
      [sample.campaign, otherCampaign],
      [otherCampaign, sample.campaign],
    ]) {
      db.surveyCampaign.findMany.mockResolvedValue(campaigns);
      const result = await getSurveyClassResults(
        actor("GIANG_VIEN"),
        ids[6],
        sample.cohort.sectionId,
      );
      expect(result.result.rating).toBe("Tốt");
      expect(result.comparisons[0].result).toMatchObject({
        available: true,
        overallScore: 4,
        rating: null,
      });
      expect(result.comparisons[1].result?.rating).toBeNull();
    }
  });
  it("BR-17 đã công bố rồi lưu trữ vẫn đọc; không có mutation trên đường đọc", async () => {
    sample.campaign.status = "LUU_TRU";
    sample.campaign.semester.lockedAt = new Date();
    const result = await getSurveyResults(actor("GIANG_VIEN"), ids[6]);
    expect(result.campaign).toMatchObject({
      status: "LUU_TRU",
      semesterLocked: true,
    });
    expect(result.buckets[0].available).toBe(true);
  });
  it("đợt đóng chưa tổng hợp hiển thị trạng thái rỗng, không đọc phiếu để tự tổng hợp", async () => {
    sample.campaign.status = "DA_DONG";
    const result = await getSurveyResults(actor("CAN_BO_DBCL"), ids[6]);
    expect(result.buckets[0]).toMatchObject({
      available: false,
      message: "Chưa tổng hợp kết quả",
      overallScore: null,
      groups: [],
    });
    expect(db.surveyResponse.findMany).not.toHaveBeenCalled();
  });
  it("legacy JSON được tính tạm, không ghi và không bịa snapshot giảng viên cho Khảo thí", async () => {
    sample.cohort.result.details = {
      legacy: true,
    } as unknown as SurveyAggregateDetails;
    db.surveyResponse.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => ({
        answers: [
          {
            questionId: ids[9],
            valueNumber: "4",
            valueBoolean: null,
            valueOptionIds: null,
            valueText: null,
            isNotApplicable: false,
          },
        ],
      })),
    );
    db.surveyTask.count.mockResolvedValue(5);
    const standard = await getSurveyResults(actor("CAN_BO_DBCL"), ids[6]);
    expect(standard.buckets[0].overallScore).toBe(4);
    const assessment = await getSurveyResults(actor("PHONG_KHAO_THI"), ids[6]);
    expect(
      assessment.buckets.every(
        (bucket) => bucket.message === "Chưa đủ dữ liệu gộp",
      ),
    ).toBe(true);
  });
  it("JSON version2 sai bị từ chối, không tính đè hoặc trả giá trị cũ", async () => {
    sample.cohort.result.details = {
      version: 2,
      corrupt: true,
    } as unknown as SurveyAggregateDetails;
    await expect(
      getSurveyResults(actor("CAN_BO_DBCL"), ids[6]),
    ).rejects.toMatchObject({ status: 503, code: "INVALID_SURVEY_AGGREGATE" });
    expect(db.surveyResponse.findMany).not.toHaveBeenCalled();
  });
});
