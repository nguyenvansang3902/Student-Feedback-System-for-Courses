"use client";
import { useState, type FormEvent } from "react";
import { roleLabels } from "../auth/destination";
import { adminRequest, useAdminResource } from "./admin-client";
import { buttonStyle, Field, inputStyle, Notice } from "./ui";
export function MfaPolicy() {
  const resource = useAdminResource<{ requiredRoles: string[] }>(
    "/api/admin/mfa-policy",
  );
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-950">
        Chính sách xác thực hai bước
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Quản trị viên luôn phải xác thực hai bước. Có thể bật yêu cầu này cho
        các vai trò khác.
      </p>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-7 text-sm text-slate-500">
          Đang tải chính sách…
        </p>
      )}
      {resource.data && <PolicyForm initial={resource.data.requiredRoles} />}
    </div>
  );
}
function PolicyForm({ initial }: { initial: string[] }) {
  const [roles, setRoles] = useState([...new Set(["ADMIN", ...initial])]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const stepUpCode = String(new FormData(form).get("stepUpCode") ?? "");
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await adminRequest("/api/admin/mfa-policy", {
        requiredRoles: roles,
        stepUpCode,
      });
      setMessage(
        "Đã cập nhật chính sách. Những người dùng bị ảnh hưởng cần xác thực lại theo chính sách mới.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chưa lưu được chính sách.",
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
      className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <fieldset disabled={busy}>
        <legend className="text-sm font-bold text-slate-800">
          Vai trò bắt buộc TOTP
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(roleLabels).map(([role, label]) => (
            <label
              key={role}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6"
            >
              <input
                type="checkbox"
                checked={roles.includes(role)}
                disabled={busy || role === "ADMIN"}
                onChange={(event) =>
                  setRoles(
                    event.target.checked
                      ? [...roles, role]
                      : roles.filter((value) => value !== role),
                  )
                }
                className="mt-1 size-4 accent-teal-800"
              />
              <span>
                {label}
                {role === "ADMIN" && (
                  <span className="block text-xs text-slate-500">Luôn bật</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id="policy-step-up"
        label="Mã TOTP hiện tại"
        hint="Nếu mã vừa được sử dụng, đợi chu kỳ mã mới trước khi lưu."
      >
        <input
          id="policy-step-up"
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
      <Notice message={message} />
      <Notice message={error} error />
      <button disabled={busy} className={buttonStyle}>
        {busy ? "Đang lưu…" : "Lưu chính sách"}
      </button>
    </form>
  );
}
