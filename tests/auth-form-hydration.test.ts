import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthForm } from "../src/components/auth/auth-form";
import { MfaForm } from "../src/components/auth/mfa-form";

function expectSafeServerForm(html: string) {
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [];
  expect(forms).toHaveLength(1);
  const [form] = forms;
  if (!form) throw new Error("Không tìm thấy biểu mẫu trong HTML máy chủ.");
  expect(form).toMatch(/^<form\b[^>]*\bmethod="post"/);
  expect(form).toContain('aria-busy="true"');
  const inputs = form.match(/<input\b[^>]*>/g) ?? [];
  const buttons = form.match(/<button\b[^>]*>/g) ?? [];
  expect(inputs.length).toBeGreaterThan(0);
  expect(buttons.length).toBeGreaterThan(0);
  for (const control of [...inputs, ...buttons])
    expect(control).toMatch(/\sdisabled(?:=|\s|>)/);
}

describe("FR-01/FR-07/BR-30 — không gửi bí mật bằng GET trước hydration", () => {
  it.each(["verify", "period-change"] as const)(
    "MFA %s khóa nhập và xác nhận trong HTML máy chủ, dùng POST dự phòng",
    (mode) => {
      expectSafeServerForm(
        renderToStaticMarkup(
          createElement(MfaForm, { mode, periodSeconds: 60 }),
        ),
      );
    },
  );

  it("thiết lập MFA chưa cho tạo QR trước khi trình xử lý phía máy khách sẵn sàng", () => {
    const html = renderToStaticMarkup(
      createElement(MfaForm, { mode: "setup" }),
    );
    const start = html.match(/<button\b[^>]*>Bắt đầu thiết lập<\/button>/)?.[0];
    expect(start).toBeDefined();
    expect(start).toMatch(/\sdisabled(?:=|\s|>)/);
  });

  it.each([
    "login",
    "forgot",
    "request-activation",
    "reset",
    "activate",
    "change",
  ] satisfies ComponentProps<typeof AuthForm>["mode"][])(
    "biểu mẫu %s khóa toàn bộ trường/submit và không đưa thông tin vào URL khi chưa hydration",
    (mode) => {
      expectSafeServerForm(
        renderToStaticMarkup(
          createElement(AuthForm, { mode, token: "FAKE-NOT-A-CREDENTIAL" }),
        ),
      );
    },
  );
});
