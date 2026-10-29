import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../src/generated/prisma/enums";
import type { AuthActor } from "../src/server/auth/types";

const mocks = vi.hoisted(() => {
  const delegate = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    groupBy: vi.fn(),
  });
  return {
    db: {
      surveyCampaign: delegate(),
      campaignSection: delegate(),
      campaignHistory: delegate(),
      campaignDataConfirmation: delegate(),
      surveyTemplate: delegate(),
      surveyTask: delegate(),
      semester: delegate(),
      courseSection: delegate(),
      faculty: delegate(),
      department: delegate(),
      userSession: delegate(),
      systemSetting: delegate(),
      auditLog: delegate(),
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    },
    advance: vi.fn(),
    advanceDue: vi.fn(),
    readiness: vi.fn(),
    enqueue: vi.fn(),
  };
});
vi.mock("../src/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../src/server/services/campaign-lifecycle", () => ({
  advanceCampaignState: mocks.advance,
  advanceDueCampaignsInTransaction: mocks.advanceDue,
  ensureCampaignState: vi.fn(),
  ensureDueCampaigns: vi.fn(),
}));
vi.mock("../src/server/services/campaign-notifications", () => ({
  enqueueCampaignNotice: mocks.enqueue,
}));
vi.mock(
  "../src/server/services/campaign-readiness",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../src/server/services/campaign-readiness")
    >()),
    readCampaignReadiness: mocks.readiness,
  }),
);
import {
  createCampaign,
  getCampaign,
  getCampaignOptions,
  getCampaignProgress,
  getCampaignReadiness,
  listCampaigns,
  performCampaignAction,
  updateCampaign,
} from "../src/server/services/campaigns";

const { db } = mocks;
const ids = Array.from({ length: 9 }, () => randomUUID());
const allRoles: Role[] = [
  "SINH_VIEN",
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "ADMIN",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
  "THANH_TRA",
];
function actor(role: Role = "CAN_BO_DBCL"): AuthActor {
  const scope =
    role === "TRUONG_BO_MON"
      ? {
          scopeType: "DEPARTMENT" as const,
          departmentId: ids[7],
          facultyId: null,
        }
      : role === "TRUONG_KHOA"
        ? {
            scopeType: "FACULTY" as const,
            facultyId: ids[8],
            departmentId: null,
          }
        : { scopeType: "GLOBAL" as const, facultyId: null, departmentId: null };
  return {
    userId: ids[1],
    sessionId: ids[2],
    familyId: ids[3],
    loginCode: "W7_FAKE",
    email: "fake@fixture.invalid",
    displayName: "Giả",
    roles: [role],
    assignments: [{ role, ...scope }],
    purpose: "FULL",
    mustChangePassword: false,
    mfa: role === "ADMIN",
    mfaRequired: role === "ADMIN",
  };
}
function session(value: AuthActor) {
  return {
    id: value.sessionId,
    userId: value.userId,
    familyId: value.familyId,
    purpose: "FULL",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    mfaVerifiedAt: value.mfa ? new Date() : null,
    user: {
      id: value.userId,
      loginCode: value.loginCode,
      email: value.email,
      displayName: value.displayName,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: value.assignments,
    },
  };
}
const campaignInput = (extra: Record<string, unknown> = {}) => ({
  title: "Khảo sát giả",
  semesterId: ids[4],
  templateId: ids[5],
  scope: "GLOBAL",
  startsAt: "2035-01-01T00:00:00Z",
  endsAt: "2035-02-01T00:00:00Z",
  ...extra,
});
function fixture(overrides: Record<string, unknown> = {}) {
  const row = {
    id: ids[0],
    title: "Khảo sát giả",
    semesterId: ids[4],
    templateId: ids[5],
    scope: "GLOBAL",
    facultyId: null,
    departmentId: null,
    revision: 1,
    status: "NHAP",
    minResponses: 5,
    minRate: 0.3,
    warningScore: 3,
    explanationDays: 14,
    mandatory: false,
    startsAt: new Date("2035-01-01T00:00:00Z"),
    endsAt: new Date("2035-02-01T00:00:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    approvedById: null,
    openedAt: null,
    openedSnapshotHash: null,
    dataDriftDetected: false,
    semester: { code: "FAKE_S", name: "Kỳ giả", lockedAt: null },
    template: { name: "Mẫu giả", version: 1 },
    faculty: null,
    department: null,
    _count: { sections: 0 },
    sections: [],
    history: [],
    dataConfirmations: [],
    ...overrides,
  };
  db.surveyCampaign.findUnique.mockImplementation(async () =>
    structuredClone(row),
  );
  db.surveyCampaign.findMany.mockImplementation(async () => [
    structuredClone(row),
  ]);
  db.surveyCampaign.count.mockResolvedValue(1);
  db.surveyCampaign.create.mockImplementation(async ({ data }) => {
    const { sections, ...columns } = data;
    Object.assign(row, columns);
    if (sections)
      Object.assign(row, {
        sections: sections.create.map((item: { sectionId: string }) => ({
          ...item,
          section: { code: "FAKE", course: { name: "Môn giả" } },
        })),
        _count: { sections: sections.create.length },
      });
    return structuredClone(row);
  });
  db.surveyCampaign.updateMany.mockImplementation(async ({ where, data }) => {
    if (
      (where.revision !== undefined && where.revision !== row.revision) ||
      (where.status !== undefined && where.status !== row.status)
    )
      return { count: 0 };
    Object.assign(row, {
      ...data,
      revision: data.revision?.increment
        ? row.revision + data.revision.increment
        : (data.revision ?? row.revision),
    });
    return { count: 1 };
  });
  return row;
}
function useActor(current: AuthActor) {
  db.userSession.findUnique.mockResolvedValue(session(current));
  return current;
}
const command = (extra: Record<string, unknown> = {}) => ({
  expectedRevision: 1,
  requestId: randomUUID(),
  ...extra,
});
const validTemplate = () => ({
  id: ids[5],
  name: "Mẫu giả",
  status: "NHAP",
  revision: 1,
  lockedAt: null,
  groups: [
    {
      title: "Tiêu chí",
      position: 1,
      weight: 1,
      isAssessmentGroup: false,
      _count: { questions: 1 },
      questions: [
        {
          label: "Bạn đánh giá thế nào?",
          type: "LIKERT",
          position: 1,
          weight: 1,
          required: true,
          allowNA: false,
          scaleMin: 1,
          scaleMax: 5,
          options: [],
        },
      ],
    },
  ],
});
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.$executeRaw.mockResolvedValue(1);
  db.$queryRaw.mockResolvedValue([]);
  db.systemSetting.findUnique.mockResolvedValue(null);
  db.semester.findUnique.mockResolvedValue({ lockedAt: null });
  db.surveyTemplate.findUnique.mockResolvedValue(validTemplate());
  db.surveyTemplate.updateMany.mockResolvedValue({ count: 1 });
  db.courseSection.findMany.mockResolvedValue([]);
  db.courseSection.count.mockResolvedValue(2);
  db.faculty.findFirst.mockResolvedValue({ id: ids[8] });
  db.department.findFirst.mockResolvedValue({ id: ids[7] });
  db.campaignHistory.findUnique.mockResolvedValue(null);
  db.campaignHistory.create.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
  db.campaignDataConfirmation.create.mockResolvedValue({});
  db.campaignDataConfirmation.findFirst.mockResolvedValue({
    status: "DA_XAC_NHAN",
    campaignRevision: 1,
  });
  db.campaignSection.findMany.mockResolvedValue([]);
  db.campaignSection.count.mockResolvedValue(0);
  db.campaignSection.deleteMany.mockResolvedValue({ count: 0 });
  db.campaignSection.createMany.mockResolvedValue({ count: 2 });
  db.surveyTask.findMany.mockResolvedValue([{ studentId: ids[6] }]);
  db.surveyTask.groupBy.mockResolvedValue([]);
  mocks.advance.mockResolvedValue({
    opened: false,
    closed: false,
    blocked: null,
  });
  mocks.advanceDue.mockResolvedValue([]);
  mocks.enqueue.mockResolvedValue({ queued: 1 });
  mocks.readiness.mockResolvedValue({
    readiness: {
      campaignId: ids[0],
      revision: 1,
      checkedAt: new Date().toISOString(),
      snapshotHash: "a".repeat(64),
      sectionCount: 2,
      pairCount: 7,
      canConfirm: true,
      blockers: [],
      warnings: [],
    },
    cohort: {},
  });
  useActor(actor());
  fixture();
});

describe("FR-40–46 / TC-ALL-01 — quyền và phiên ở public campaign services", () => {
  it.each(allRoles)(
    "%s chỉ đọc danh sách nếu được cấp nghiệp vụ",
    async (role) => {
      const current = useActor(actor(role));
      if (["CAN_BO_DBCL", "LANH_DAO", "PHONG_DAO_TAO"].includes(role))
        expect((await listCampaigns(current)).total).toBe(1);
      else {
        await expect(listCampaigns(current)).rejects.toMatchObject({
          status: 403,
        });
        expect(db.$transaction).not.toHaveBeenCalled();
      }
    },
  );
  it.each(allRoles.filter((role) => role !== "CAN_BO_DBCL"))(
    "%s không tạo/sửa đợt",
    async (role) => {
      const current = useActor(actor(role));
      await expect(
        createCampaign(current, campaignInput()),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        updateCampaign(current, ids[0], {
          ...campaignInput(),
          expectedRevision: 1,
        }),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("ADMIN không suy ra quyền từ MFA; role cũ trong actor bị thu hồi cũng không đọc dữ liệu", async () => {
    const current = actor();
    db.userSession.findUnique.mockResolvedValue(session(actor("ADMIN")));
    await expect(getCampaign(current, ids[0])).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.advance).not.toHaveBeenCalled();
    expect(db.surveyCampaign.findUnique).not.toHaveBeenCalled();
  });
  it("mutex được lấy trước khi đọc lại phiên, rồi mới đọc dữ liệu nghiệp vụ", async () => {
    await getCampaign(actor(), ids[0]);
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.userSession.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.userSession.findUnique.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.advance.mock.invocationCallOrder[0],
    );
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
  it.each(["revoked", "expired", "disabled", "restricted"])(
    "phiên %s không được kích hoạt ensure hoặc đọc đợt",
    async (kind) => {
      const current = actor(),
        stored = session(current);
      if (kind === "revoked") stored.revokedAt = new Date() as never;
      if (kind === "expired") stored.expiresAt = new Date(0);
      if (kind === "disabled") stored.user.status = "DISABLED";
      if (kind === "restricted") stored.purpose = "MFA_CHALLENGE";
      db.userSession.findUnique.mockResolvedValue(stored);
      await expect(getCampaign(current, ids[0])).rejects.toMatchObject({
        status: 401,
      });
      expect(mocks.advance).not.toHaveBeenCalled();
      expect(db.surveyCampaign.findUnique).not.toHaveBeenCalled();
    },
  );
  it("chính sách MFA mới có hiệu lực ngay với phiên ĐBCL cũ", async () => {
    db.systemSetting.findUnique.mockResolvedValue({
      value: ["ADMIN", "CAN_BO_DBCL"],
    });
    await expect(getCampaign(actor(), ids[0])).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    });
    expect(mocks.advance).not.toHaveBeenCalled();
  });
  it.each(["confirm", "approve", "return", "reject"] as const)(
    "ĐBCL không gọi trực tiếp %s",
    async (action) => {
      await expect(
        performCampaignAction(actor(), ids[0], action, command()),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("PĐT không xem tiến độ tham gia dù được đọc đợt/readiness", async () => {
    const current = useActor(actor("PHONG_DAO_TAO"));
    await expect(getCampaignProgress(current, ids[0])).rejects.toMatchObject({
      status: 403,
    });
    expect(db.surveyTask.groupBy).not.toHaveBeenCalled();
    expect((await getCampaignReadiness(current, ids[0])).sectionCount).toBe(2);
  });
});

describe("FR-40/41, BR-17 — tạo/sửa đợt và bốn phạm vi", () => {
  it.each([
    { scope: "GLOBAL" },
    { scope: "FACULTY", facultyId: ids[8] },
    { scope: "DEPARTMENT", departmentId: ids[7] },
    { scope: "SECTIONS", sectionIds: [ids[6], ids[7]] },
  ])("tạo %s dùng ngưỡng mặc định và chỉ lưu lớp explicit", async (scope) => {
    const result = await createCampaign(actor(), campaignInput(scope));
    expect(result).toMatchObject({
      status: "NHAP",
      minResponses: 5,
      minRate: 0.3,
      explanationDays: 14,
    });
    const saved = db.surveyCampaign.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      createdById: ids[1],
      status: "NHAP",
      scope: scope.scope,
    });
    expect(!!saved.sections).toBe(scope.scope === "SECTIONS");
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CAMPAIGN_CREATED" }),
      }),
    );
  });
  it.each([
    { scope: "GLOBAL", sectionIds: [ids[6]] },
    { scope: "FACULTY" },
    { scope: "DEPARTMENT", facultyId: ids[8], departmentId: ids[7] },
    { scope: "SECTIONS", sectionIds: [] },
    { scope: "SECTIONS", sectionIds: [ids[6], ids[6]] },
    { startsAt: "2035-02-02T00:00:00Z" },
    { unknownField: true },
  ])("payload không hợp lệ %# không tạo dữ liệu", async (extra) => {
    await expect(
      createCampaign(actor(), campaignInput(extra)),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.surveyCampaign.create).not.toHaveBeenCalled();
  });
  it("lớp khác học kỳ/không tồn tại bị chặn từ kiểm đếm DB", async () => {
    db.courseSection.count.mockResolvedValue(1);
    await expect(
      createCampaign(
        actor(),
        campaignInput({ scope: "SECTIONS", sectionIds: [ids[6], ids[7]] }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_SCOPE" });
    expect(db.surveyCampaign.create).not.toHaveBeenCalled();
  });
  it("học kỳ khóa hoặc end đã qua không được tạo đợt", async () => {
    db.semester.findUnique.mockResolvedValue({ lockedAt: new Date() });
    await expect(
      createCampaign(actor(), campaignInput()),
    ).rejects.toMatchObject({ code: "SEMESTER_LOCKED" });
    db.semester.findUnique.mockResolvedValue({ lockedAt: null });
    await expect(
      createCampaign(
        actor(),
        campaignInput({
          startsAt: "2000-01-01T00:00:00Z",
          endsAt: "2000-02-01T00:00:00Z",
        }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_TIME_EXPIRED" });
    expect(db.surveyCampaign.create).not.toHaveBeenCalled();
  });
  it("chỉ sửa NHAP, kiểm revision trước khi xóa/lưu lớp mới", async () => {
    fixture({ status: "CHO_DUYET" });
    await expect(
      updateCampaign(actor(), ids[0], {
        ...campaignInput(),
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: "CAMPAIGN_INVALID_STATE" });
    fixture();
    await expect(
      updateCampaign(actor(), ids[0], {
        ...campaignInput(),
        expectedRevision: 2,
      }),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    expect(db.campaignSection.deleteMany).not.toHaveBeenCalled();
  });
  it("CAS thua không ghi lại scope hoặc lịch sử", async () => {
    db.surveyCampaign.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      updateCampaign(actor(), ids[0], {
        ...campaignInput(),
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    expect(db.campaignSection.deleteMany).not.toHaveBeenCalled();
    expect(db.campaignHistory.create).not.toHaveBeenCalled();
  });
  it("sửa draft xóa approval và thay đúng tập lớp; trả DTO revision mới", async () => {
    const result = await updateCampaign(actor(), ids[0], {
      ...campaignInput({ scope: "SECTIONS", sectionIds: [ids[6], ids[7]] }),
      expectedRevision: 1,
      requestId: randomUUID(),
    });
    expect(result.revision).toBe(2);
    expect(db.campaignSection.createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: ids[0], sectionId: ids[6] },
        { campaignId: ids[0], sectionId: ids[7] },
      ],
    });
    expect(db.surveyCampaign.updateMany.mock.calls[0][0].data).toMatchObject({
      approvedAt: null,
      approvedById: null,
    });
    expect(db.campaignHistory.create.mock.calls[0][0].data.action).toBe(
      "UPDATE",
    );
  });
});

describe("FR-42/45, BR-05/06/52 — chuyển trạng thái và idempotency", () => {
  it("trình draft đi qua PĐT, có mẫu và scope; không tự mở hay duyệt", async () => {
    expect(
      (await performCampaignAction(actor(), ids[0], "submit", command()))
        .status,
    ).toBe("CHO_XAC_NHAN_DL");
    expect(db.campaignHistory.create.mock.calls[0][0].data).toMatchObject({
      fromStatus: "NHAP",
      toStatus: "CHO_XAC_NHAN_DL",
      action: "SUBMIT",
    });
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it("không trình scope rỗng hoặc mẫu trống", async () => {
    mocks.readiness.mockResolvedValue({ readiness: { sectionCount: 0 } });
    await expect(
      performCampaignAction(actor(), ids[0], "submit", command()),
    ).rejects.toMatchObject({ code: "CAMPAIGN_EMPTY_SCOPE" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
    db.surveyTemplate.findUnique.mockResolvedValue({ groups: [] });
    await expect(
      performCampaignAction(actor(), ids[0], "submit", command()),
    ).rejects.toMatchObject({ code: "INVALID_TEMPLATE" });
  });
  it("TC-PDT-02 xác nhận lưu snapshot/revision/người xác nhận và sang CHO_DUYET", async () => {
    fixture({ status: "CHO_XAC_NHAN_DL" });
    const current = useActor(actor("PHONG_DAO_TAO"));
    expect(
      (await performCampaignAction(current, ids[0], "confirm", command()))
        .status,
    ).toBe("CHO_DUYET");
    expect(db.campaignDataConfirmation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: ids[0],
        campaignRevision: 2,
        confirmedById: current.userId,
        status: "DA_XAC_NHAN",
        snapshotHash: "a".repeat(64),
        sectionCount: 2,
        pairCount: 7,
      }),
    });
  });
  it("TC-PDT-02 có lỗi chặn hoặc cảnh báo thiếu ghi chú không xác nhận", async () => {
    fixture({ status: "CHO_XAC_NHAN_DL" });
    const current = useActor(actor("PHONG_DAO_TAO"));
    const ready = mocks.readiness.getMockImplementation()
      ? (await mocks.readiness()).readiness
      : { sectionCount: 2, blockers: [], warnings: [] };
    mocks.readiness.mockResolvedValue({
      readiness: { ...ready, blockers: [{ code: "RS-01" }], warnings: [] },
    });
    await expect(
      performCampaignAction(current, ids[0], "confirm", command()),
    ).rejects.toMatchObject({ code: "READINESS_BLOCKED" });
    mocks.readiness.mockResolvedValue({
      readiness: { ...ready, blockers: [], warnings: [{ code: "RS-04" }] },
    });
    await expect(
      performCampaignAction(current, ids[0], "confirm", command()),
    ).rejects.toMatchObject({ code: "WARNING_NOTE_REQUIRED" });
    expect(db.campaignDataConfirmation.create).not.toHaveBeenCalled();
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("cảnh báo có ghi chú vẫn xác nhận và lưu ghi chú", async () => {
    fixture({ status: "CHO_XAC_NHAN_DL" });
    const current = useActor(actor("PHONG_DAO_TAO"));
    const ready = (await mocks.readiness()).readiness;
    mocks.readiness.mockResolvedValue({
      readiness: { ...ready, warnings: [{ code: "RS-05" }] },
    });
    expect(
      (
        await performCampaignAction(
          current,
          ids[0],
          "confirm",
          command({ reason: "Đã kiểm tra lớp ít sinh viên" }),
        )
      ).status,
    ).toBe("CHO_DUYET");
    expect(
      db.campaignDataConfirmation.create.mock.calls[0][0].data.reason,
    ).toBe("Đã kiểm tra lớp ít sinh viên");
  });
  it.each([
    "return",
    "reject",
    "withdraw",
    "cancel",
    "close",
    "extend",
  ] as const)("%s bắt buộc lý do, không ghi khi thiếu", async (action) => {
    const from =
      action === "return"
        ? "CHO_XAC_NHAN_DL"
        : action === "reject"
          ? "CHO_DUYET"
          : action === "withdraw"
            ? "DA_DUYET"
            : action === "cancel"
              ? "NHAP"
              : "DANG_MO";
    const current = useActor(
      actor(
        action === "return"
          ? "PHONG_DAO_TAO"
          : action === "reject"
            ? "LANH_DAO"
            : "CAN_BO_DBCL",
      ),
    );
    fixture({ status: from });
    await expect(
      performCampaignAction(current, ids[0], action, command()),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
    expect(db.campaignHistory.create).not.toHaveBeenCalled();
  });
  it("trả về lưu snapshot TRA_VE, không khóa mẫu", async () => {
    fixture({ status: "CHO_XAC_NHAN_DL" });
    const current = useActor(actor("PHONG_DAO_TAO"));
    expect(
      (
        await performCampaignAction(
          current,
          ids[0],
          "return",
          command({ reason: "Cần chỉnh lại đối tượng trước" }),
        )
      ).status,
    ).toBe("NHAP");
    expect(
      db.campaignDataConfirmation.create.mock.calls[0][0].data.status,
    ).toBe("TRA_VE");
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { status: "TRA_VE", campaignRevision: 1 },
    { status: "DA_XAC_NHAN", campaignRevision: 8 },
  ])("duyệt không dùng xác nhận thiếu hoặc vòng cũ %#", async (latest) => {
    fixture({ status: "CHO_DUYET" });
    const current = useActor(actor("LANH_DAO"));
    db.campaignDataConfirmation.findFirst.mockResolvedValue(latest);
    await expect(
      performCampaignAction(current, ids[0], "approve", command()),
    ).rejects.toMatchObject({ code: "MISSING_CONFIRMATION" });
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
  });
  it("duyệt khóa mẫu trong transaction và ghi người duyệt; tài khoản đa vai trò hợp lệ vẫn được duyệt", async () => {
    fixture({ status: "CHO_DUYET" });
    const current = actor("LANH_DAO");
    current.roles.push("CAN_BO_DBCL");
    current.assignments!.push({
      role: "CAN_BO_DBCL",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    });
    useActor(current);
    const result = await performCampaignAction(
      current,
      ids[0],
      "approve",
      command(),
    );
    expect(result.status).toBe("DA_DUYET");
    expect(db.surveyTemplate.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: ids[5], revision: 1 },
      data: { status: "DA_KHOA", revision: { increment: 1 } },
    });
    expect(
      db.surveyCampaign.updateMany.mock.calls[0][0].data.approvedById,
    ).toBe(current.userId);
  });
  it("duyệt trễ gọi ensure sau lịch sử duyệt ngay trong transaction", async () => {
    fixture({ status: "CHO_DUYET", startsAt: new Date(0) });
    const current = useActor(actor("LANH_DAO"));
    await performCampaignAction(current, ids[0], "approve", command());
    expect(mocks.advance).toHaveBeenCalledTimes(2);
    expect(db.campaignHistory.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.advance.mock.invocationCallOrder[1],
    );
    expect(mocks.advance.mock.calls[1][0]).toBe(db);
    expect(mocks.advance.mock.calls[1][1]).toBe(ids[0]);
    expect(mocks.advance.mock.calls[1][2]).toBeInstanceOf(Date);
  });
  it("mẫu không hợp lệ hoặc CAS khóa mẫu thua thì không duyệt đợt", async () => {
    fixture({ status: "CHO_DUYET" });
    const current = useActor(actor("LANH_DAO"));
    db.surveyTemplate.findUnique.mockResolvedValue({
      ...validTemplate(),
      groups: [],
    });
    await expect(
      performCampaignAction(current, ids[0], "approve", command()),
    ).rejects.toMatchObject({ code: "INVALID_TEMPLATE" });
    db.surveyTemplate.findUnique.mockResolvedValue(validTemplate());
    db.surveyTemplate.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      performCampaignAction(current, ids[0], "approve", command()),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("rút lại xóa phê duyệt nhưng không mở khóa mẫu; trình lại phải qua PĐT", async () => {
    fixture({ status: "DA_DUYET", approvedAt: new Date() });
    expect(
      (
        await performCampaignAction(
          actor(),
          ids[0],
          "withdraw",
          command({ reason: "Cần thay đổi nội dung và trình lại" }),
        )
      ).status,
    ).toBe("NHAP");
    expect(db.surveyCampaign.updateMany.mock.calls[0][0].data).toMatchObject({
      approvedAt: null,
      approvedById: null,
    });
    expect(db.surveyTemplate.updateMany).not.toHaveBeenCalled();
    expect(
      (
        await performCampaignAction(
          actor(),
          ids[0],
          "submit",
          command({ expectedRevision: 2 }),
        )
      ).status,
    ).toBe("CHO_XAC_NHAN_DL");
  });
  it("retry cùng request giữ nguyên revision/history/mail; key tái dùng khác payload bị chặn", async () => {
    const current = actor(),
      input = command();
    await performCampaignAction(current, ids[0], "submit", input);
    const prior = db.campaignHistory.create.mock.calls[0][0].data;
    db.campaignHistory.findUnique.mockResolvedValue(prior);
    expect(
      (await performCampaignAction(current, ids[0], "submit", input)).revision,
    ).toBe(2);
    expect(db.campaignHistory.create).toHaveBeenCalledOnce();
    expect(db.surveyCampaign.updateMany).toHaveBeenCalledOnce();
    await expect(
      performCampaignAction(current, ids[0], "submit", {
        ...input,
        reason: "Nội dung bị thay đổi",
      }),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REQUEST_CONFLICT" });
  });
  it("requestId của người khác không được replay kể cả cùng vai trò", async () => {
    db.campaignHistory.findUnique.mockResolvedValue({
      actorId: randomUUID(),
      action: "SUBMIT",
      requestHash: "x",
    });
    await expect(
      performCampaignAction(actor(), ids[0], "submit", command()),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REQUEST_CONFLICT" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("CAS thua hoặc expectedRevision cũ không ghi history/audit thành công", async () => {
    await expect(
      performCampaignAction(
        actor(),
        ids[0],
        "submit",
        command({ expectedRevision: 4 }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    db.surveyCampaign.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      performCampaignAction(actor(), ids[0], "submit", command()),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    expect(db.campaignHistory.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it("đợt đến hạn được ensure bằng transaction riêng trước khi lệnh stale bị từ chối", async () => {
    const row = fixture({ status: "DA_DUYET" });
    mocks.advance.mockImplementation(async () => {
      row.status = "DANG_MO";
      row.revision = 2;
    });
    await expect(
      performCampaignAction(
        actor(),
        ids[0],
        "withdraw",
        command({ reason: "Muốn rút sau thời điểm đã mở" }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_REVISION_CONFLICT" });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(row.status).toBe("DANG_MO");
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("gia hạn phải sau hạn cũ; queue chỉ sinh viên trong cohort đã chốt", async () => {
    fixture({ status: "DANG_MO" });
    await expect(
      performCampaignAction(
        actor(),
        ids[0],
        "extend",
        command({
          reason: "Tăng thời gian sinh viên thực hiện",
          endsAt: "2035-02-01T00:00:00Z",
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_EXTENSION" });
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(
      (
        await performCampaignAction(
          actor(),
          ids[0],
          "extend",
          command({
            reason: "Tăng thời gian sinh viên thực hiện",
            endsAt: "2035-02-02T00:00:00Z",
          }),
        )
      ).endsAt,
    ).toBe("2035-02-02T00:00:00.000Z");
    expect(db.surveyTask.findMany.mock.calls[0][0]).toMatchObject({
      where: { campaignId: ids[0] },
      distinct: ["studentId"],
      select: { studentId: true },
    });
    expect(mocks.enqueue).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ campaignId: ids[0], userIds: [ids[6]] }),
    );
  });
  it.each([
    "DANG_MO",
    "DA_DONG",
    "DA_TONG_HOP",
    "DA_CONG_BO",
    "LUU_TRU",
    "HUY",
  ])("không hủy từ %s", async (status) => {
    fixture({ status });
    await expect(
      performCampaignAction(
        actor(),
        ids[0],
        "cancel",
        command({ reason: "Lý do hủy thử nghiệm hợp lệ" }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_INVALID_STATE" });
    expect(db.surveyCampaign.updateMany).not.toHaveBeenCalled();
  });
  it("đóng sớm không xóa cohort/task và không tổng hợp kết quả", async () => {
    fixture({ status: "DANG_MO" });
    expect(
      (
        await performCampaignAction(
          actor(),
          ids[0],
          "close",
          command({ reason: "Kết thúc trước lịch vì đủ thời gian" }),
        )
      ).status,
    ).toBe("DA_DONG");
    expect(db.campaignSection.deleteMany).not.toHaveBeenCalled();
    expect(db.surveyTask.deleteMany).not.toHaveBeenCalled();
    expect(db.surveyTask.groupBy).not.toHaveBeenCalled();
  });
});

describe("FR-46 — tiến độ từ SurveyTask, không nối phiếu hoặc công bố kết quả", () => {
  it("tính đúng tổng/DONE/tỷ lệ từng lớp và giữ paging ngay trong truy vấn", async () => {
    fixture({ status: "DANG_MO" });
    db.campaignSection.count.mockResolvedValue(2);
    db.campaignSection.findMany.mockResolvedValue([
      {
        sectionId: ids[6],
        section: { code: "FAKE_A", course: { name: "Môn giả A" } },
      },
    ]);
    db.surveyTask.groupBy.mockResolvedValue([
      { sectionId: ids[6], status: "DONE", _count: { _all: 2 } },
      { sectionId: ids[6], status: "PENDING", _count: { _all: 3 } },
      { sectionId: ids[7], status: "DONE", _count: { _all: 1 } },
    ]);
    const result = await getCampaignProgress(actor(), ids[0], {
      page: 2,
      pageSize: 1,
    });
    expect(result).toMatchObject({
      total: 6,
      done: 3,
      pending: 3,
      participationRate: 0.5,
      totalSections: 2,
      page: 2,
      pageSize: 1,
      items: [
        {
          sectionId: ids[6],
          total: 5,
          done: 2,
          pending: 3,
          participationRate: 0.4,
        },
      ],
    });
    expect(db.campaignSection.findMany.mock.calls[0][0]).toMatchObject({
      skip: 1,
      take: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /studentId|answer|responseId|email/,
    );
  });
  it("đợt chưa có task trả0 không NaN, lựa chọn lớp bắt buộc học kỳ", async () => {
    const result = await getCampaignProgress(actor(), ids[0]);
    expect(result.participationRate).toBe(0);
    expect(result.total).toBe(0);
    await expect(
      getCampaignOptions(actor(), { kind: "sections" }),
    ).rejects.toMatchObject({ code: "SEMESTER_REQUIRED" });
  });
});
