import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  test,
  expect,
  request as requestFactory,
  type APIRequestContext,
} from "@playwright/test";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import type { TemplateDetail } from "../../src/server/services/templates";
import type {
  CampaignDetail,
  CampaignReadiness,
} from "../../src/server/services/campaign-types";
import type { StudentSurveyList } from "../../src/server/services/student-survey-types";
import type { FeedbackDetail } from "../../src/server/services/feedback-types";
import type { InspectionWorkflowDetail } from "../../src/server/services/inspection-workflow-types";
import type {
  ImprovementDetail,
  ImprovementList,
} from "../../src/server/services/improvement-types";
import type { ReportsDashboard } from "../../src/server/services/reports-types";
import type {
  SurveyAnomalyItem,
  SurveyAnomalyDetail,
} from "../../src/server/survey-anomaly-contract";
import {
  createGoldFixture,
  finishGoldFixture,
  goldItem,
  goldJson,
  rawGoldRequest,
  openGoldPage,
  assertNoGoldIdentity,
  type GoldFixture,
  type GoldClient,
} from "./fixtures";

test.describe.configure({ mode: "serial" });
let fixture: GoldFixture,
  campaign: CampaignDetail,
  template: TemplateDetail,
  seriousFeedback: FeedbackDetail,
  inspectionId: string;
let goldComplete = false;
let api: APIRequestContext | undefined;
const runSteps: string[] = [];
test.beforeAll(async () => {
  api = await requestFactory.newContext({ timeout: 60000 });
  fixture = await createGoldFixture(api);
});
test.afterAll(async () => {
  try {
    if (fixture) await finishGoldFixture(fixture, goldComplete);
  } finally {
    await api?.dispose();
  }
});
async function campaignAction(
  client: GoldClient,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const current = await goldItem<CampaignDetail>(
    fixture,
    client,
    `/api/campaigns/${campaign.id}`,
  );
  return goldItem<CampaignDetail>(
    fixture,
    client,
    `/api/campaigns/${campaign.id}/${action}`,
    { expectedRevision: current.revision, requestId: randomUUID(), ...extra },
  );
}
async function feedbackAction(
  client: GoldClient,
  id: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const current = await goldItem<FeedbackDetail>(
    fixture,
    client,
    `/api/feedback/${id}`,
  );
  return goldItem<FeedbackDetail>(
    fixture,
    client,
    `/api/feedback/${id}/transition`,
    { revision: current.revision, requestId: randomUUID(), action, ...extra },
  );
}
async function inspectionAction(
  id: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const current = await goldItem<InspectionWorkflowDetail>(
    fixture,
    fixture.inspector,
    `/api/inspection-cases/${id}`,
  );
  return goldItem<InspectionWorkflowDetail>(
    fixture,
    fixture.inspector,
    `/api/inspection-cases/${id}/transition`,
    { revision: current.revision, requestId: randomUUID(), action, ...extra },
  );
}
async function finishInspection(id: string, conclusion = "CO_CAN_CU") {
  await inspectionAction(id, "accept");
  let current = await goldItem<InspectionWorkflowDetail>(
    fixture,
    fixture.inspector,
    `/api/inspection-cases/${id}`,
  );
  await goldItem<InspectionWorkflowDetail>(
    fixture,
    fixture.inspector,
    `/api/inspection-cases/${id}/notes`,
    {
      revision: current.revision,
      requestId: randomUUID(),
      body: "Đã đối chiếu các thông tin giả và ghi nhận kết quả xác minh cho kiểm thử.",
    },
    201,
  );
  current = await inspectionAction(id, "conclude", {
    conclusion,
    reason:
      "Kết luận giả chỉ dùng để kiểm quy trình, không liên quan sự việc hoặc cá nhân thật.",
  });
  expect(current.status).toBe("KET_LUAN");
  await inspectionAction(
    id,
    "notify",
    current.feedbackId
      ? {
          studentSummary:
            "Đã hoàn tất xác minh thông tin giả và gửi kết quả trong phạm vi được phép.",
        }
      : {},
  );
  expect((await inspectionAction(id, "close")).status).toBe("DONG");
}
async function createFeedback(
  client: GoldClient,
  category = "GIANG_DAY",
  extra: Record<string, unknown> = {},
) {
  return goldItem<FeedbackDetail>(
    fixture,
    client,
    "/api/feedback",
    {
      sectionId: fixture.sectionIds[0],
      category,
      severity: category === "KHIEU_NAI_NGHIEM_TRONG" ? "KHIEU_NAI" : "GOP_Y",
      title: `${fixture.prefix} Phản hồi ${category}`,
      body: "Nội dung giả phục vụ kiểm thử quy trình khảo sát và phản hồi môn học.",
      isAnonymous: true,
      requestId: randomUUID(),
      ...extra,
    },
    201,
  );
}

test("UC-GOLD — quy trình từ lập đợt tới báo cáo và các nhánh bổ sung", async ({
  page,
}, testInfo) => {
  await test.step("ĐBCL tạo mẫu, lập đợt; PĐT xác nhận và lãnh đạo phê duyệt", async () => {
    template = await goldItem<TemplateDetail>(
      fixture,
      fixture.quality,
      "/api/templates",
      {
        name: `${fixture.prefix} Mẫu UC-GOLD`,
        groups: [
          {
            title: "Giảng dạy và kiểm tra, đánh giá",
            position: 1,
            weight: 1,
            isAssessmentGroup: true,
            questions: [
              {
                label: "Nội dung học phần",
                type: "LIKERT",
                position: 1,
                required: true,
                allowNA: false,
                weight: 1,
                scaleMin: 1,
                scaleMax: 5,
                options: [],
              },
              {
                label: "Hình thức kiểm tra, đánh giá",
                type: "LIKERT",
                position: 2,
                required: true,
                allowNA: false,
                weight: 1,
                scaleMin: 1,
                scaleMax: 5,
                options: [],
              },
              {
                label: "Góp ý tự luận",
                type: "TEXT",
                position: 3,
                required: false,
                allowNA: false,
                weight: 1,
                options: [],
              },
            ],
          },
        ],
      },
      201,
    );
    const now = Date.now();
    campaign = await goldItem<CampaignDetail>(
      fixture,
      fixture.quality,
      "/api/campaigns",
      {
        title: `${fixture.prefix} Đợt UC-GOLD`,
        semesterId: fixture.semesterId,
        templateId: template.id,
        scope: "SECTIONS",
        sectionIds: fixture.sectionIds,
        startsAt: new Date(now - 60000).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
        minResponses: 5,
        minRate: 0.3,
        warningScore: 3,
        explanationDays: 14,
        mandatory: false,
      },
      201,
    );
    expect((await campaignAction(fixture.quality, "submit")).status).toBe(
      "CHO_XAC_NHAN_DL",
    );
    const readiness = await goldItem<CampaignReadiness>(
      fixture,
      fixture.training,
      `/api/campaigns/${campaign.id}/readiness`,
    );
    expect(readiness.canConfirm).toBe(true);
    expect(readiness.blockers).toHaveLength(0);
    expect(readiness.warnings.some((w) => w.code === "RS-05")).toBe(true);
    expect(
      (
        await campaignAction(fixture.training, "confirm", {
          reason:
            "Đã đối chiếu danh sách giả; lớp nhỏ được giữ để kiểm ngưỡng công bố.",
        })
      ).status,
    ).toBe("CHO_DUYET");
    expect((await campaignAction(fixture.leader, "approve")).status).toBe(
      "DANG_MO",
    );
    expect(
      await fixture.db.surveyTask.count({ where: { campaignId: campaign.id } }),
    ).toBe(21);
    runSteps.push(
      "create-template/campaign/readiness/confirm/approve/open21tasks",
    );
  });
  await test.step("Sinh viên nộp bằng giao diện, các sinh viên còn lại nộp qua API", async () => {
    const list = await goldJson<StudentSurveyList>(
      fixture,
      fixture.students[0],
      "/api/student-surveys?pageSize=50",
    );
    const first = list.items.find(
      (task) =>
        task.campaignId === campaign.id &&
        task.sectionId === fixture.sectionIds[0],
    );
    assert(first);
    await openGoldPage(
      page,
      fixture,
      fixture.students[0],
      `/khao-sat/${first.id}`,
    );
    const [q1, q2, text] = template.groups[0].questions;
    await page
      .locator(`#survey-question-${q1.id}`)
      .getByRole("radio", { name: "2", exact: true })
      .check();
    await page
      .locator(`#survey-question-${q2.id}`)
      .getByRole("radio", { name: "2", exact: true })
      .check();
    await page
      .locator(`#survey-question-${text.id}-text`)
      .fill("Góp ý giả đề nghị bổ sung tài liệu và thời gian trao đổi.");
    await page
      .getByRole("button", { name: "Nộp phiếu khảo sát", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Đã nộp khảo sát", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("sv-da-nop-desktop.png"),
      fullPage: true,
    });
    for (let section = 0; section < 2; section++)
      for (let index = 0; index < fixture.students.length; index++) {
        if (section === 0 && index === 0) continue;
        const student = fixture.students[index];
        const task = await fixture.db.surveyTask.findUniqueOrThrow({
          where: {
            campaignId_sectionId_studentId: {
              campaignId: campaign.id,
              sectionId: fixture.sectionIds[section],
              studentId: student.id,
            },
          },
        });
        await goldItem(
          fixture,
          student,
          `/api/student-surveys/${task.id}/submit`,
          {
            answers: [
              { questionId: q1.id, valueNumber: 2 },
              { questionId: q2.id, valueNumber: 2 },
            ],
          },
        );
      }
    expect(
      await fixture.db.surveyResponse.count({
        where: { campaignId: campaign.id },
      }),
    ).toBe(20);
    expect(
      (
        await rawGoldRequest(
          fixture,
          fixture.students[0],
          `/api/student-surveys/${first.id}/submit`,
          {
            answers: [
              { questionId: q1.id, valueNumber: 2 },
              { questionId: q2.id, valueNumber: 2 },
            ],
          },
        )
      ).status(),
    ).toBe(409);
    runSteps.push(
      "student-browser-submit/19-api-submit/anonymous-count20/no-resubmit",
    );
  });
  await test.step("Đóng, tổng hợp, kiểm duyệt và công bố; giảng viên thấy đúng kết quả", async () => {
    expect(
      (
        await campaignAction(fixture.quality, "close", {
          reason: "Đóng sớm đợt giả sau khi đủ dữ liệu kiểm thử.",
        })
      ).status,
    ).toBe("DA_DONG");
    for (const action of ["aggregate", "publish"]) {
      if (action === "publish") {
        const moderation = await goldJson<{ items: { id: string }[] }>(
          fixture,
          fixture.quality,
          `/api/survey-results/${campaign.id}/moderation?status=CHO_KIEM_DUYET&pageSize=50`,
        );
        expect(moderation.items.length).toBeGreaterThan(0);
        for (const row of moderation.items)
          await goldItem(
            fixture,
            fixture.quality,
            `/api/survey-results/${campaign.id}/moderation`,
            {
              answerId: row.id,
              status: "HIEN_THI",
              reason: "Góp ý giả không chứa định danh, được phép hiển thị.",
            },
          );
      }
      const current = await goldItem<CampaignDetail>(
        fixture,
        fixture.quality,
        `/api/campaigns/${campaign.id}`,
      );
      await goldItem(
        fixture,
        fixture.quality,
        `/api/survey-results/${campaign.id}/${action}`,
        { expectedRevision: current.revision, requestId: randomUUID() },
      );
    }
    expect(
      (
        await goldItem<CampaignDetail>(
          fixture,
          fixture.quality,
          `/api/campaigns/${campaign.id}`,
        )
      ).status,
    ).toBe("DA_CONG_BO");
    const result = await goldItem<{
      result: { overallScore: number; available: boolean };
    }>(
      fixture,
      fixture.teacher,
      `/api/survey-results/${campaign.id}/classes/${fixture.sectionIds[0]}`,
    );
    expect(result.result.available).toBe(true);
    expect(result.result.overallScore).toBe(2);
    await openGoldPage(
      page,
      fixture,
      fixture.teacher,
      `/ket-qua/${campaign.id}/lop/${fixture.sectionIds[0]}`,
    );
    runSteps.push("close/aggregate/moderate/publish/teacher-score2");
  });
  await test.step("Giảng viên gửi giải trình và trưởng bộ môn xác nhận trên giao diện", async () => {
    const plans = await goldJson<ImprovementList>(
      fixture,
      fixture.teacher,
      "/api/improvements?pageSize=50",
    );
    const plan = plans.items.find((row) => row.campaignId === campaign.id);
    assert(plan);
    await openGoldPage(
      page,
      fixture,
      fixture.teacher,
      `/giai-trinh/${plan.id}`,
    );
    await page
      .getByLabel("Nguyên nhân và giải trình", { exact: true })
      .fill(
        "Nguyên nhân giả đã được đối chiếu trong hoạt động giảng dạy và kiểm tra.",
      );
    await page
      .getByLabel("Kế hoạch cải tiến", { exact: true })
      .fill(
        "Bổ sung tài liệu giả, tăng thời gian trao đổi và theo dõi kết quả trong học kỳ sau.",
      );
    await page
      .getByRole("button", { name: "Gửi giải trình", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await goldItem<ImprovementDetail>(
              fixture,
              fixture.teacher,
              `/api/improvements/${plan.id}`,
            )
          ).status,
      )
      .toBe("DA_GUI");
    await openGoldPage(page, fixture, fixture.head, `/giai-trinh/${plan.id}`);
    await page
      .getByLabel("Hình thức xử lý", { exact: true })
      .selectOption("confirm");
    await page
      .getByLabel("Nhận xét", { exact: true })
      .fill(
        "Đã xem xét nội dung giả và xác nhận kế hoạch có thời hạn theo dõi rõ ràng.",
      );
    await page
      .getByRole("button", { name: "Lưu kết quả xem xét", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await goldItem<ImprovementDetail>(
              fixture,
              fixture.head,
              `/api/improvements/${plan.id}`,
            )
          ).status,
      )
      .toBe("DA_XAC_NHAN");
    await expect(
      page.locator("header p").filter({ hasText: /^Đã xác nhận · Hạn gửi:/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Đang tải giải trình…", { exact: true }),
    ).not.toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("tbm-xac-nhan-giai-trinh.png"),
      fullPage: true,
    });
    runSteps.push("teacher-browser-submit-improvement/head-browser-confirm");
  });
  await test.step("Phản hồi ẩn danh → giảng viên trả lời → sinh viên đánh giá đóng", async () => {
    let feedback = await createFeedback(fixture.students[0]);
    const id = feedback.id;
    feedback = await goldItem<FeedbackDetail>(
      fixture,
      fixture.teacher,
      `/api/feedback/${id}`,
    );
    expect(feedback.author).toBeNull();
    expect(feedback.authorLabel).toBe("Sinh viên ẩn danh");
    assertNoGoldIdentity(fixture, feedback);
    await feedbackAction(fixture.teacher, id, "accept");
    await feedbackAction(fixture.teacher, id, "start");
    await feedbackAction(fixture.teacher, id, "answer", {
      body: "Đã ghi nhận góp ý giả và bổ sung tài liệu phục vụ học phần.",
    });
    await openGoldPage(page, fixture, fixture.students[0], `/phan-hoi/${id}`);
    await page.getByLabel("Mức hài lòng", { exact: true }).selectOption("5");
    await page
      .getByLabel("Nhận xét (không bắt buộc)", { exact: true })
      .fill("Đã nhận được câu trả lời phù hợp cho nội dung giả.");
    await page
      .getByRole("button", { name: "Gửi đánh giá", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await goldItem<FeedbackDetail>(
              fixture,
              fixture.students[0],
              `/api/feedback/${id}`,
            )
          ).status,
      )
      .toBe("DA_DONG");
    const overdue = await createFeedback(fixture.students[1]);
    await fixture.db.feedback.update({
      where: { id: overdue.id },
      data: {
        acceptDueAt: new Date(Date.now() - 3 * 86400000),
        replyDueAt: new Date(Date.now() - 86400000),
      },
    });
    await expect
      .poll(async () => {
        await goldJson(
          fixture,
          fixture.head,
          "/api/feedback?view=queue&pageSize=50",
        );
        return fixture.db.slaEscalation.count({
          where: { feedbackId: overdue.id },
        });
      })
      .toBe(1);
    const escalated = await fixture.db.feedback.findUniqueOrThrow({
      where: { id: overdue.id },
    });
    expect(escalated.escalationLevel).toBe(1);
    expect(escalated.isOverdue).toBe(true);
    runSteps.push(
      "anonymous-feedback/answer/student-browser-rating-close/overdue-escalation",
    );
  });
  await test.step("Phản hồi thi đến Khảo thí, hồ sơ nghiêm trọng qua đủ bước Thanh tra", async () => {
    const examFeedback = await createFeedback(
      fixture.students[2],
      "THI_KET_THUC_HOC_PHAN",
    );
    const examView = await goldItem<FeedbackDetail>(
      fixture,
      fixture.exam,
      `/api/feedback/${examFeedback.id}`,
    );
    expect(examView.examNotice).toBeTruthy();
    expect(examView.author).toBeNull();
    await feedbackAction(fixture.exam, examFeedback.id, "accept");
    await feedbackAction(fixture.exam, examFeedback.id, "start");
    await feedbackAction(fixture.exam, examFeedback.id, "answer", {
      body: "Đã ghi nhận phản hồi thi giả; việc này không thay thế thủ tục phúc khảo.",
    });
    seriousFeedback = await createFeedback(
      fixture.students[3],
      "KHIEU_NAI_NGHIEM_TRONG",
      {
        identityLevel: "AN_DANH_HOAN_TOAN",
        violation: "GAY_AP_LUC_KHI_KHAO_SAT",
        acknowledgedSerious: true,
      },
    );
    assert(seriousFeedback.inspectionId);
    inspectionId = seriousFeedback.inspectionId;
    expect(
      (
        await rawGoldRequest(
          fixture,
          fixture.teacher,
          `/api/inspection-cases/${inspectionId}`,
        )
      ).status(),
    ).toBe(404);
    const full = await goldItem<InspectionWorkflowDetail>(
      fixture,
      fixture.inspector,
      `/api/inspection-cases/${inspectionId}`,
    );
    expect(full.feedback?.author).toBeNull();
    expect(full.feedback?.authorLabel).toBe("Sinh viên ẩn danh");
    await finishInspection(inspectionId);
    const studentResult = await goldJson<{
      item: { status: string; summary: string };
    }>(
      fixture,
      fixture.students[3],
      `/api/feedback/${seriousFeedback.id}/inspection-result`,
    );
    expect(studentResult.item.status).toBe("DONG");
    expect(studentResult.item.summary).toBeTruthy();
    const summary = await goldItem<Record<string, unknown>>(
      fixture,
      fixture.leader,
      `/api/inspection-cases/${inspectionId}`,
    );
    expect(summary.level).toBe("summary");
    for (const field of [
      "feedback",
      "notes",
      "events",
      "studentSummary",
      "reason",
      "conclusionReason",
    ])
      expect(summary).not.toHaveProperty(field);
    runSteps.push(
      "exam-routing/inspector-conflict404/verification/conclusion/notify/close/leader-summary",
    );
  });
  await test.step("Cảnh báo chỉ chứa chỉ số, không cản công bố; mở hồ sơ xác minh từ cảnh báo", async () => {
    const flags = await goldJson<{ items: SurveyAnomalyItem[] }>(
      fixture,
      fixture.inspector,
      `/api/survey-anomalies?campaignId=${campaign.id}&pageSize=50`,
    );
    expect(flags.items.length).toBeGreaterThanOrEqual(2);
    for (const flag of flags.items) {
      for (const key of [
        "overallScore",
        "previousScore",
        "answers",
        "comments",
        "teacherIds",
      ])
        expect(flag.metrics).not.toHaveProperty(key);
      assertNoGoldIdentity(fixture, flag);
    }
    const first = flags.items[0];
    await goldItem<SurveyAnomalyDetail>(
      fixture,
      fixture.inspector,
      `/api/survey-anomalies/${first.id}/review`,
      {
        revision: first.revision,
        requestId: randomUUID(),
        decision: "CAN_LUU_Y",
        note: "Chỉ số giả cần được theo dõi; cảnh báo chưa phải kết luận vi phạm.",
      },
    );
    const second = flags.items[1];
    const referred = await goldItem<SurveyAnomalyDetail>(
      fixture,
      fixture.inspector,
      `/api/survey-anomalies/${second.id}/review`,
      {
        revision: second.revision,
        requestId: randomUUID(),
        decision: "CHUYEN_XAC_MINH",
        note: "Mở hồ sơ giả để đối chiếu chỉ số, không tự kết luận từ cảnh báo.",
      },
    );
    assert(referred.caseId);
    await finishInspection(referred.caseId, "KHONG_DU_THONG_TIN");
    expect(
      (
        await goldItem<CampaignDetail>(
          fixture,
          fixture.quality,
          `/api/campaigns/${campaign.id}`,
        )
      ).status,
    ).toBe("DA_CONG_BO");
    runSteps.push("anomaly-safe-metrics/attention/refer-case/no-publish-block");
  });
  await test.step("Lãnh đạo xem dashboard và tải ba định dạng bằng giao diện", async () => {
    await openGoldPage(page, fixture, fixture.leader, "/bao-cao");
    await page
      .getByLabel("Học kỳ", { exact: true })
      .selectOption(fixture.semesterId);
    await expect(
      page.getByRole("button", { name: "Xem báo cáo", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Xem báo cáo", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Tải PDF", exact: true }),
    ).toBeEnabled();
    for (const [format, label] of [
      ["csv", "Tải CSV"],
      ["xlsx", "Tải Excel"],
      ["pdf", "Tải PDF"],
    ] as const) {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: label, exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
      const path = await file.path();
      assert(path);
      const bytes = await readFile(path);
      expect(bytes.length).toBeGreaterThan(0);
      if (format === "csv")
        assertNoGoldIdentity(fixture, bytes.toString("utf8"));
      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(bytes as never);
        const cells: unknown[] = [];
        workbook.eachSheet((sheet) =>
          sheet.eachRow((row) => cells.push(row.values)),
        );
        assertNoGoldIdentity(fixture, cells);
      }
      if (format === "pdf") {
        expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
        expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(
          0,
        );
      }
      await testInfo.attach(`uc-gold-report.${format}`, {
        body: bytes,
        contentType:
          format === "csv"
            ? "text/csv"
            : format === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
      });
    }
    runSteps.push("leader-browser-dashboard/csv-xlsx-pdf-download");
  });
  await testInfo.attach("uc-gold-steps.json", {
    body: Buffer.from(JSON.stringify({ completedSteps: runSteps }, null, 2)),
    contentType: "application/json",
  });
});

test("TC-ALL-01 / BR-67 — dashboard mười vai trò, ngưỡng và IDOR", async () => {
  const clients = [
    fixture.students[0],
    fixture.teacher,
    fixture.head,
    fixture.dean,
    fixture.quality,
    fixture.leader,
    fixture.admin,
    fixture.training,
    fixture.exam,
    fixture.inspector,
  ];
  for (const client of clients) {
    const dashboard = await goldItem<ReportsDashboard>(
      fixture,
      client,
      `/api/reports?role=${client.role}${client.role === "ADMIN" ? "" : `&semesterId=${fixture.semesterId}`}`,
    );
    expect(dashboard.role).toBe(client.role);
    assertNoGoldIdentity(fixture, dashboard);
    if (client.role === "ADMIN")
      expect(dashboard.sections.map((s) => s.key)).toEqual([
        "technical-administration",
      ]);
    if (client.role === "SINH_VIEN")
      expect(dashboard.sections.map((s) => s.key)).toEqual([
        "student-overview",
      ]);
    if (client.role === "PHONG_KHAO_THI") {
      expect(dashboard.sections.every((s) => !s.key.includes("class"))).toBe(
        true,
      );
      expect(JSON.stringify(dashboard)).not.toContain("teacherId");
    }
    if (client.role === "THANH_TRA")
      for (const section of dashboard.sections)
        expect(section.columns.every((c) => c.format !== "score")).toBe(true);
  }
  const teacherDashboard = await goldItem<ReportsDashboard>(
    fixture,
    fixture.teacher,
    `/api/reports?role=GIANG_VIEN&semesterId=${fixture.semesterId}`,
  );
  expect(
    teacherDashboard.sections.some((s) =>
      s.rows.some(
        (r) => r.suppressed && Object.values(r.cells).every((v) => v === null),
      ),
    ),
  ).toBe(true);
  const examSmall = await goldItem<ReportsDashboard>(
    fixture,
    fixture.exam,
    `/api/reports?role=PHONG_KHAO_THI&semesterId=${fixture.semesterId}&courseId=${fixture.smallCourseId}`,
  );
  expect(
    examSmall.sections
      .filter((s) => s.key.startsWith("assessment"))
      .some((s) => s.rows.length > 0),
  ).toBe(true);
  expect(
    examSmall.sections
      .filter((s) => s.key.startsWith("assessment"))
      .every((s) => s.rows.every((r) => r.suppressed)),
  ).toBe(true);
  expect(
    (
      await rawGoldRequest(
        fixture,
        fixture.otherHead,
        `/api/reports?role=TRUONG_BO_MON&departmentId=${fixture.departmentId}`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await rawGoldRequest(
        fixture,
        fixture.students[0],
        "/api/reports?role=CAN_BO_DBCL",
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await rawGoldRequest(
        fixture,
        fixture.admin,
        `/api/survey-results/${campaign.id}/classes/${fixture.sectionIds[0]}`,
      )
    ).status(),
  ).toBe(403);
  for (const client of [
    fixture.quality,
    fixture.admin,
    fixture.training,
    fixture.exam,
  ])
    expect(
      (
        await rawGoldRequest(
          fixture,
          client,
          `/api/inspection-cases/${inspectionId}`,
        )
      ).status(),
    ).toBe(403);
});

test("FR-90/91 — dashboard desktop/mobile và không tràn trang", async ({
  page,
}, testInfo) => {
  for (const client of [
    fixture.quality,
    fixture.teacher,
    fixture.training,
    fixture.exam,
    fixture.inspector,
  ])
    for (const [size, viewport] of [
      ["desktop", { width: 1440, height: 1000 }],
      ["mobile", { width: 375, height: 812 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await openGoldPage(page, fixture, client, `/bao-cao`);
      await expect(
        page.getByRole("button", { name: "Xem báo cáo", exact: true }),
      ).toBeEnabled();
      await page
        .getByLabel("Góc nhìn theo vai trò", { exact: true })
        .selectOption(client.role);
      await expect(
        page.getByRole("button", { name: "Xem báo cáo", exact: true }),
      ).toBeEnabled();
      if (await page.getByLabel("Học kỳ", { exact: true }).count()) {
        await page
          .getByLabel("Học kỳ", { exact: true })
          .selectOption(fixture.semesterId);
        await expect(
          page.getByRole("button", { name: "Xem báo cáo", exact: true }),
        ).toBeEnabled();
        await page
          .getByRole("button", { name: "Xem báo cáo", exact: true })
          .click();
      } else
        await page
          .getByRole("button", { name: "Xem báo cáo", exact: true })
          .click();
      await expect(
        page.getByText("Đang tổng hợp báo cáo…", { exact: true }),
      ).not.toBeVisible();
      await expect(page.locator("main h2").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      if (client.role === "CAN_BO_DBCL" && size === "desktop") {
        const download = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Tải CSV", exact: true })
          .click();
        const file = await download,
          path = await file.path();
        assert(path);
        const bytes = await readFile(path);
        assertNoGoldIdentity(fixture, bytes.toString("utf8"));
        await testInfo.attach("dbcl-report.csv", {
          body: bytes,
          contentType: "text/csv",
        });
      }
      await page.screenshot({
        path: testInfo.outputPath(`${client.role.toLowerCase()}-${size}.png`),
        fullPage: true,
      });
    }
  goldComplete = true;
});
