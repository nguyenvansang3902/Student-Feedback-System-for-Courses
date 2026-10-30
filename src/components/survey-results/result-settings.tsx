"use client";
import { useState, type FormEvent } from "react";
import type { SurveyResultSettingsDTO } from "@/server/services/survey-results-settings";
import { refreshSession } from "../auth/auth-client";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { resultsMessageOf } from "./results-client";
import { useAdminResource } from "../admin/admin-client";

async function saveSettings(body: Record<string, unknown>) {
  const tokenResponse = await fetch("/api/admin/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || typeof tokenData.csrfToken !== "string")
    throw new Error("Chưa lấy được xác nhận bảo mật. Hãy tải lại trang.");
  const response = await fetch("/api/admin/survey-result-settings", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": tokenData.csrfToken,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) await refreshSession();
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Chưa lưu được cấu hình. Hãy tải lại để kiểm tra trước khi thử lại.",
    );
  return data as { item: SurveyResultSettingsDTO };
}
function SettingsForm({
  initial,
  reload,
}: {
  initial: SurveyResultSettingsDTO;
  reload: () => void;
}) {
  const [bands, setBands] = useState(initial.ratingBands),
    [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initial.updatedAt),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await saveSettings({
        ratingBands: bands.map((band) => ({
          minScore: Number(band.minScore),
          label: band.label.trim(),
        })),
        sensitiveKeywords: String(data.get("keywords") ?? "")
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        expectedUpdatedAt,
        stepUpCode: String(data.get("stepUpCode") ?? ""),
      });
      setExpectedUpdatedAt(response.item.updatedAt);
      setNotice(
        "Đã lưu cấu hình. Các mức điểm áp dụng cho lần tổng hợp tiếp theo.",
      );
      const stepUp = form.elements.namedItem("stepUpCode");
      if (stepUp instanceof HTMLInputElement) stepUp.value = "";
    } catch (problem) {
      setError(resultsMessageOf(problem));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <section aria-labelledby="rating-bands-title">
        <h2
          id="rating-bands-title"
          className="text-lg font-bold text-slate-900"
        >
          Mức đánh giá
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Sắp xếp điểm tối thiểu từ cao xuống thấp. Mức cuối bắt đầu từ 0.
        </p>
        <div className="mt-4 space-y-3">
          {bands.map((band, index) => (
            <div
              key={index}
              className="grid items-end gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[160px_minmax(0,1fr)_auto]"
            >
              <Field id={`rating-min-${index}`} label="Điểm tối thiểu">
                <input
                  id={`rating-min-${index}`}
                  type="number"
                  min={0}
                  max={5}
                  step="0.0001"
                  required
                  value={band.minScore}
                  disabled={busy}
                  onChange={(event) =>
                    setBands(
                      bands.map((value, position) =>
                        position === index
                          ? { ...value, minScore: Number(event.target.value) }
                          : value,
                      ),
                    )
                  }
                  className={inputStyle}
                />
              </Field>
              <Field id={`rating-label-${index}`} label="Tên mức">
                <input
                  id={`rating-label-${index}`}
                  type="text"
                  maxLength={100}
                  required
                  value={band.label}
                  disabled={busy}
                  onChange={(event) =>
                    setBands(
                      bands.map((value, position) =>
                        position === index
                          ? { ...value, label: event.target.value }
                          : value,
                      ),
                    )
                  }
                  className={inputStyle}
                />
              </Field>
              <button
                type="button"
                className={secondaryStyle}
                disabled={busy || bands.length <= 1}
                aria-label={`Bỏ mức ${index + 1}`}
                onClick={() =>
                  setBands(bands.filter((_, position) => position !== index))
                }
              >
                Bỏ mức
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${secondaryStyle} mt-3`}
          disabled={busy || bands.length >= 20}
          onClick={() => setBands([...bands, { minScore: 0, label: "" }])}
        >
          Thêm mức
        </button>
      </section>
      <Field
        id="result-keywords"
        label="Từ khóa cần kiểm duyệt"
        hint="Mỗi dòng một từ hoặc cụm từ. Góp ý trùng từ khóa sẽ được gắn cờ để cán bộ xem xét."
      >
        <textarea
          id="result-keywords"
          name="keywords"
          rows={7}
          maxLength={10000}
          defaultValue={initial.sensitiveKeywords.join("\n")}
          disabled={busy}
          className={inputStyle}
        />
      </Field>
      <Field id="result-settings-totp" label="Mã xác thực hai bước mới">
        <input
          id="result-settings-totp"
          name="stepUpCode"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          disabled={busy}
          className={inputStyle}
        />
      </Field>
      <Notice message={notice} />
      <Notice message={error} error />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonStyle} disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        <button
          type="button"
          className={secondaryStyle}
          disabled={busy}
          onClick={reload}
        >
          Tải lại cấu hình
        </button>
      </div>
    </form>
  );
}
export function ResultSettingsPanel() {
  const resource = useAdminResource<{ item: SurveyResultSettingsDTO }>(
    "/api/admin/survey-result-settings",
  );
  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">
        Cấu hình kết quả khảo sát
      </h1>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải cấu hình…
        </p>
      )}
      {resource.data && (
        <SettingsForm
          key={resource.data.item.updatedAt ?? "default"}
          initial={resource.data.item}
          reload={resource.reload}
        />
      )}
    </>
  );
}
