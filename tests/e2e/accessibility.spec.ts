import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  request as requestFactory,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import type { TemplateDetail } from "../../src/server/services/templates";
import type { CampaignDetail } from "../../src/server/services/campaign-types";
import {
  createGoldFixture,
  finishGoldFixture,
  goldItem,
  openGoldPage,
  type GoldFixture,
  type GoldClient,
} from "./fixtures";

test.describe.configure({ mode: "serial" });
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile360", width: 360, height: 800 },
] as const;
let fixture: GoldFixture;
let api: APIRequestContext | undefined;
let template: TemplateDetail;
let taskId = "";
let failed = false;

test.beforeAll(async () => {
  api = await requestFactory.newContext({ timeout: 60000 });
  fixture = await createGoldFixture(api);
  template = await goldItem<TemplateDetail>(
    fixture,
    fixture.quality,
    "/api/templates",
    {
      name: `${fixture.prefix} Mẫu kiểm bàn phím`,
      groups: [
        {
          title: "Nội dung khảo sát",
          position: 1,
          weight: 1,
          isAssessmentGroup: true,
          questions: [
            {
              label: "Mức độ rõ ràng của nội dung",
              type: "LIKERT",
              position: 1,
              required: true,
              allowNA: true,
              weight: 1,
              scaleMin: 1,
              scaleMax: 5,
              options: [],
            },
            {
              label: "Hình thức học phù hợp",
              type: "SINGLE_CHOICE",
              position: 2,
              required: false,
              allowNA: false,
              weight: 1,
              options: [
                { label: "Trực tiếp", position: 1 },
                { label: "Kết hợp", position: 2 },
              ],
            },
            {
              label: "Tài liệu cần bổ sung",
              type: "MULTIPLE_CHOICE",
              position: 3,
              required: false,
              allowNA: false,
              weight: 1,
              options: [
                { label: "Bài tập", position: 1 },
                { label: "Ví dụ", position: 2 },
              ],
            },
            {
              label: "Có đủ thời gian trao đổi",
              type: "BOOLEAN",
              position: 4,
              required: false,
              allowNA: false,
              weight: 1,
              options: [],
            },
            {
              label: "Góp ý về học phần",
              type: "TEXT",
              position: 5,
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
  let campaign = await goldItem<CampaignDetail>(
    fixture,
    fixture.quality,
    "/api/campaigns",
    {
      title: `${fixture.prefix} Đợt kiểm bàn phím`,
      semesterId: fixture.semesterId,
      templateId: template.id,
      scope: "SECTIONS",
      sectionIds: [fixture.sectionIds[0]],
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
  for (const [client, action] of [
    [fixture.quality, "submit"],
    [fixture.training, "confirm"],
    [fixture.leader, "approve"],
  ] as const) {
    campaign = await goldItem<CampaignDetail>(
      fixture,
      client,
      `/api/campaigns/${campaign.id}/${action}`,
      {
        expectedRevision: campaign.revision,
        requestId: randomUUID(),
        ...(action === "confirm"
          ? {
              reason:
                "Đã đối chiếu dữ liệu giả phục vụ kiểm bàn phím và nhãn biểu mẫu.",
            }
          : {}),
      },
    );
  }
  expect(campaign.status).toBe("DANG_MO");
  const task = await fixture.db.surveyTask.findUniqueOrThrow({
    where: {
      campaignId_sectionId_studentId: {
        campaignId: campaign.id,
        sectionId: fixture.sectionIds[0],
        studentId: fixture.students[0].id,
      },
    },
    select: { id: true },
  });
  taskId = task.id;
});

test.afterEach(({ page }, info) => {
  void page;
  if (info.status !== info.expectedStatus) failed = true;
});
test.afterAll(async () => {
  try {
    if (fixture) await finishGoldFixture(fixture, !failed);
  } finally {
    await api?.dispose();
  }
});

async function noOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(
    size.content,
    "Không được tràn ngang toàn trang; bảng có vùng cuộn riêng vẫn được phép",
  ).toBeLessThanOrEqual(size.viewport + 1);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.locator("input[placeholder], textarea[placeholder]"),
  ).toHaveCount(0);
}

async function visibleKeyboardFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  const style = await locator.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      outline: css.outlineStyle,
      outlineWidth: parseFloat(css.outlineWidth),
      shadow: css.boxShadow,
    };
  });
  expect(
    (style.outline !== "none" && style.outlineWidth > 0) ||
      style.shadow !== "none",
    "Điều khiển đang focus cần có outline hoặc ring hiển thị",
  ).toBe(true);
}

async function scan(page: Page, info: TestInfo, name: string) {
  await noOverflow(page);
  // Chờ trạng thái giao diện ổn định sau hydration/enable; không đo màu trung gian
  // của transition đang chạy thành màu cuối của điều khiển. Không chờ spinner vô hạn.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const transitions = document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return timing && Number.isFinite(timing.endTime);
    });
    await Promise.all(transitions.map((animation) => animation.finished.catch(() => undefined)));
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await info.attach(`${name}-axe.json`, {
    body: JSON.stringify(
      {
        tool: results.testEngine,
        environment: results.testEnvironment,
        url: results.url,
        timestamp: results.timestamp,
        viewport: await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
        })),
        tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        passedRules: results.passes.length,
        violations: results.violations,
        incomplete: results.incomplete,
        note: "Mẫu kiểm tự động; incomplete cần rà tay. Không phải chứng nhận WCAG hoặc kiểm mọi trạng thái.",
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  if (results.violations.length)
    await page.screenshot({
      path: info.outputPath(`${name}-violation.png`),
      fullPage: true,
    });
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    })),
    name,
  ).toEqual([]);
}

test("W13 NFR-15 — trang tài khoản công khai, bàn phím và axe ở desktop/360px", async ({
  page,
}, info) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const [path, buttonName] of [
      ["/dang-nhap", "Đăng nhập"],
      ["/kich-hoat", "Gửi liên kết kích hoạt"],
      ["/quen-mat-khau", "Gửi liên kết đặt lại mật khẩu"],
    ] as const) {
      await page.context().clearCookies();
      await page.goto(fixture.origin + path);
      await expect(
        page.getByRole("button", { name: buttonName, exact: true }),
      ).toBeEnabled();
      await scan(page, info, `public-${path.slice(1)}-${viewport.name}`);
      if (path === "/dang-nhap") {
        const identifier = page.getByLabel("Tài khoản hoặc email", {
          exact: true,
        });
        const password = page.getByLabel("Mật khẩu", { exact: true });
        await identifier.focus();
        await page.keyboard.press("Tab");
        await visibleKeyboardFocus(password);
        await page.keyboard.press("Tab");
        const toggle = page.getByRole("button", {
          name: "Hiện mật khẩu",
          exact: true,
        });
        await visibleKeyboardFocus(toggle);
        await page.keyboard.press("Space");
        await expect(password).toHaveAttribute("type", "text");
        await page.keyboard.press("Space");
        await expect(password).toHaveAttribute("type", "password");
        await page
          .getByRole("button", { name: "Đăng nhập", exact: true })
          .focus();
        await page.keyboard.press("Enter");
        await expect(identifier).toBeFocused();
        await expect(identifier).toHaveAttribute("aria-invalid", "true");
        await expect(identifier).toHaveAttribute(
          "aria-describedby",
          "identifier-error",
        );
        await expect(page.locator("#identifier-error")).toHaveText(
          "Nhập tài khoản hoặc email.",
        );
        await scan(page, info, `public-login-error-${viewport.name}`);
        await page.screenshot({
          path: info.outputPath(`login-keyboard-${viewport.name}.png`),
          fullPage: true,
        });
      } else {
        const email = page.getByLabel("Email tài khoản", { exact: true });
        await email.focus();
        await page.keyboard.press("Tab");
        await visibleKeyboardFocus(
          page.getByRole("button", { name: buttonName, exact: true }),
        );
      }
    }
  }
});

test("W13 FR-90/160 NFR-15 — dashboard mười vai trò với axe, bàn phím và 360px", async ({
  page,
}, info) => {
  const clients: GoldClient[] = [
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
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await openGoldPage(page, fixture, client, "/bao-cao");
      const apply = page.getByRole("button", {
        name: "Xem báo cáo",
        exact: true,
      });
      await expect(apply).toBeEnabled();
      const role = page.getByLabel("Góc nhìn theo vai trò", { exact: true });
      await role.selectOption(client.role);
      await expect(apply).toBeEnabled();
      await apply.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByText("Đang tổng hợp báo cáo…", { exact: true }),
      ).not.toBeVisible();
      await expect(page.locator("main h2").first()).toBeVisible();
      await apply.focus();
      await visibleKeyboardFocus(apply);
      if (viewport.name === "mobile360") {
        const table = page
          .getByRole("region", { name: /^Bảng số liệu / })
          .first();
        if (await table.count()) {
          await table.focus();
          await visibleKeyboardFocus(table);
          await page.keyboard.press("ArrowRight");
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(0);
          await page.keyboard.press("ArrowLeft");
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBe(0);
        }
      }
      await scan(page, info, `${client.role.toLowerCase()}-${viewport.name}`);
      if (
        viewport.name === "mobile360" &&
        ["ADMIN", "THANH_TRA"].includes(client.role)
      )
        await page.screenshot({
          path: info.outputPath(
            `${client.role.toLowerCase()}-${viewport.name}.png`,
          ),
          fullPage: true,
        });
    }
  }
});

test("W13 FR-50/70/153 NFR-15 — khảo sát và phản hồi sinh viên, đủ nhãn và thao tác bàn phím", async ({
  page,
}, info) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openGoldPage(
      page,
      fixture,
      fixture.students[0],
      `/khao-sat/${taskId}`,
    );
    const submit = page.getByRole("button", {
      name: "Nộp phiếu khảo sát",
      exact: true,
    });
    await expect(submit).toBeEnabled();
    const [likert, single, multiple, boolean, text] =
      template.groups[0].questions;
    const likertField = page.locator(`#survey-question-${likert.id}`);
    await likertField.getByRole("radio", { name: "2", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      likertField.getByRole("radio", { name: "3", exact: true }),
    ).toBeChecked();
    await visibleKeyboardFocus(
      likertField.getByRole("radio", { name: "3", exact: true }),
    );
    await page
      .locator(`#survey-question-${single.id}`)
      .getByRole("radio", { name: "Trực tiếp", exact: true })
      .check();
    const choice = page
      .locator(`#survey-question-${multiple.id}`)
      .getByRole("checkbox", { name: "Bài tập", exact: true });
    const wasChecked = await choice.isChecked();
    await choice.focus();
    await page.keyboard.press("Space");
    expect(await choice.isChecked()).toBe(!wasChecked);
    await page
      .locator(`#survey-question-${boolean.id}`)
      .getByRole("radio", { name: "Có", exact: true })
      .check();
    await expect(
      page.getByLabel(`Câu trả lời cho ${text.label}`, { exact: true }),
    ).toBeEditable();
    await scan(page, info, `student-survey-${viewport.name}`);
    if (viewport.name === "mobile360")
      await page.screenshot({
        path: info.outputPath("student-survey-mobile360.png"),
        fullPage: true,
      });

    await openGoldPage(page, fixture, fixture.students[0], "/phan-hoi/gui");
    const category = page.getByLabel("Loại phản hồi", { exact: true });
    await expect(category).toBeEnabled();
    await expect(page.getByLabel("Tiêu đề", { exact: true })).toBeEditable();
    await expect(
      page.getByLabel("Nội dung phản hồi", { exact: true }),
    ).toBeEditable();
    await scan(page, info, `student-feedback-${viewport.name}`);
    await category.selectOption("KHIEU_NAI_NGHIEM_TRONG");
    await expect(
      page.getByLabel("Loại vi phạm", { exact: true }),
    ).toBeEnabled();
    const identity = page.getByRole("radio", {
      name: "Chỉ cho Phòng Thanh tra biết danh tính",
      exact: true,
    });
    await identity.focus();
    await page.keyboard.press("Space");
    await expect(identity).toBeChecked();
    await visibleKeyboardFocus(identity);
    await scan(page, info, `student-serious-feedback-${viewport.name}`);
  }
});
