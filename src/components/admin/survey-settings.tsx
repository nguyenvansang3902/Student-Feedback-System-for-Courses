"use client";
import { useState, type FormEvent } from "react";
import type {
  SurveySettings,
  SurveySettingsDTO,
} from "@/server/services/survey-settings";
import { adminRequest, useAdminResource } from "./admin-client";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "./ui";

const fields: {
  key: keyof SurveySettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: string;
}[] = [
  {
    key: "minResponses",
    label: "Số phiếu tối thiểu mặc định",
    hint: "Dùng làm ngưỡng của đợt mới và cảnh báo lớp quá ít sinh viên.",
    min: 1,
    max: 1000,
    step: "1",
  },
  {
    key: "minRate",
    label: "Tỉ lệ tham gia tối thiểu mặc định (%)",
    hint: "Nhập phần trăm từ 0 đến 100.",
    min: 0,
    max: 100,
    step: "0.01",
  },
  {
    key: "warningScore",
    label: "Ngưỡng điểm cảnh báo mặc định",
    hint: "Giá trị từ 1 đến 5; đợt mới có thể chọn ngưỡng riêng.",
    min: 1,
    max: 5,
    step: "0.01",
  },
  {
    key: "explanationDays",
    label: "Hạn giải trình mặc định (ngày)",
    hint: "Giá trị từ 1 đến 365 ngày.",
    min: 1,
    max: 365,
    step: "1",
  },
  {
    key: "multiTeacherWarningThreshold",
    label: "Cảnh báo từ bao nhiêu giảng viên trong một lớp",
    hint: "Áp dụng khi kiểm tra sẵn sàng RS-04; tối thiểu 2 giảng viên.",
    min: 2,
    max: 20,
    step: "1",
  },
];

export function SurveySettingsPanel() {
  const resource = useAdminResource<{ item: SurveySettingsDTO }>(
    "/api/survey-settings",
  );
  const [message, setMessage] = useState("");
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-950">
        Cấu hình ngưỡng khảo sát
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Đợt mới sử dụng các ngưỡng mặc định bên dưới. Ngưỡng riêng của đợt đã
        tạo được giữ nguyên; ngưỡng cảnh báo nhiều giảng viên được áp dụng lúc
        kiểm tra dữ liệu sẵn sàng.
      </p>
      <Notice message={resource.error} error />
      <Notice message={message} />
      {resource.loading && (
        <p role="status" className="py-7 text-sm text-slate-500">
          Đang tải cấu hình…
        </p>
      )}
      {resource.data && (
        <SettingsForm
          initial={resource.data.item}
          reload={resource.reload}
          saved={() => {
            setMessage("Đã lưu cấu hình ngưỡng khảo sát.");
            resource.reload();
          }}
        />
      )}
    </div>
  );
}

function SettingsForm({
  initial,
  saved,
  reload,
}: {
  initial: SurveySettingsDTO;
  saved: () => void;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    const settings = Object.fromEntries(
      fields.map(({ key }) => [
        key,
        Number(data.get(key)) / (key === "minRate" ? 100 : 1),
      ]),
    );
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/survey-settings", {
        ...settings,
        expectedUpdatedAt: initial.updatedAt,
        stepUpCode: String(data.get("stepUpCode") ?? ""),
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chưa lưu được cấu hình.",
      );
    } finally {
      (form.elements.namedItem("stepUpCode") as HTMLInputElement).value = "";
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <p className="text-xs leading-6 text-slate-500">
        {initial.updatedAt
          ? `Cập nhật gần nhất: ${vietnamTime(initial.updatedAt)}`
          : "Chưa có cấu hình riêng; đang dùng giá trị mặc định."}
      </p>
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Các ngưỡng khảo sát</legend>
        {fields.map(({ key, label, hint, min, max, step }) => (
          <Field
            key={key}
            id={`survey-settings-${key}`}
            label={label}
            hint={hint}
          >
            <input
              id={`survey-settings-${key}`}
              name={key}
              type="number"
              required
              min={min}
              max={max}
              step={step}
              defaultValue={initial[key] * (key === "minRate" ? 100 : 1)}
              className={inputStyle}
            />
          </Field>
        ))}
      </fieldset>
      <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
        Không thể tắt các kiểm tra chặn: lớp chưa có giảng viên, lớp chưa có
        sinh viên đăng ký và học kỳ đã khóa sổ.
      </p>
      <Field
        id="survey-settings-step-up"
        label="Mã TOTP hiện tại"
        hint="Nếu mã vừa được dùng, đợi chu kỳ mới trước khi lưu."
      >
        <input
          id="survey-settings-step-up"
          name="stepUpCode"
          required
          pattern="[0-9]{6}"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={busy}
          className={inputStyle}
        />
      </Field>
      <Notice message={error} error />
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className={buttonStyle}>
          {busy ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={reload}
          className={secondaryStyle}
        >
          Tải lại cấu hình
        </button>
      </div>
    </form>
  );
}
