"use client";

import { useRef, useState, type FormEvent } from "react";
import { authDestination } from "./destination";
import { focusRing } from "./auth-shell";
import { LogoutButton } from "./logout-button";

const primary = `rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focusRing}`;

export function MfaForm({
  mode,
  destination = "/tai-khoan",
}: {
  mode: "setup" | "verify";
  destination?: string;
}) {
  const [setup, setSetup] = useState<{
    secret: string;
    qrDataUrl: string;
  } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  async function send(action: string, body: Record<string, string>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Phiên xác thực đã hết hạn. Hãy đăng nhập lại.");
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Chưa xác thực được. Hãy kiểm tra mã và thử lại.",
        );
      }
      if (action === "mfa-setup") {
        if (
          typeof result.secret !== "string" ||
          typeof result.qrDataUrl !== "string" ||
          !result.qrDataUrl.startsWith("data:image/png;base64,")
        )
          throw new Error("Chưa nhận được mã thiết lập. Hãy thử lại.");
        setSetup({ secret: result.secret, qrDataUrl: result.qrDataUrl });
      } else if (action === "mfa-confirm") {
        if (
          !Array.isArray(result.recoveryCodes) ||
          result.recoveryCodes.length !== 10 ||
          !result.recoveryCodes.every(
            (code: unknown) => typeof code === "string",
          )
        )
          throw new Error(
            "Không nhận đủ mã khôi phục. Liên hệ quản trị viên để kiểm tra.",
          );
        setSetup(null);
        setCodes(result.recoveryCodes);
      } else {
        window.location.replace(
          result.purpose && result.purpose !== "FULL"
            ? authDestination(result)
            : destination,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Chưa kết nối được máy chủ. Hãy thử lại.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("code") as HTMLInputElement;
    const code = input.value.trim();
    if (!code || (!recovery && !/^\d{6}$/.test(code))) {
      setError(
        recovery
          ? "Nhập một mã khôi phục chưa sử dụng."
          : "Nhập đủ 6 chữ số từ ứng dụng xác thực.",
      );
      input.focus();
      return;
    }
    void send(mode === "setup" ? "mfa-confirm" : "mfa-verify", { code });
    input.value = "";
  }
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        {codes.length
          ? "Lưu mã khôi phục của bạn"
          : mode === "setup"
            ? "Kết nối ứng dụng xác thực"
            : "Xác minh bước thứ hai"}
      </h2>
      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800"
        >
          {error}{" "}
          <a href="/dang-nhap" className="underline">
            Đăng nhập lại
          </a>
        </div>
      )}
      {codes.length > 0 ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-7 text-slate-600">
            10 mã dưới đây chỉ xuất hiện lần này. Mỗi mã dùng một lần khi bạn
            không sử dụng được ứng dụng xác thực. Lưu ở nơi riêng tư và không
            chia sẻ.
          </p>
          <ul
            aria-label="Mười mã khôi phục"
            className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm sm:grid-cols-2"
          >
            {codes.map((code) => (
              <li
                key={code}
                className="break-all rounded border border-slate-200 bg-white p-2"
              >
                {code}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
              className="mt-1 size-4 accent-teal-800"
            />
            Tôi đã lưu an toàn các mã khôi phục.
          </label>
          <button
            className={primary}
            disabled={!saved}
            onClick={() => {
              setCodes([]);
              window.location.replace(destination);
            }}
          >
            Tiếp tục vào tài khoản
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {mode === "setup"
              ? "Dùng Google Authenticator, Authy hoặc ứng dụng TOTP tương thích. Không chia sẻ mã QR hay khóa thiết lập."
              : "Mở ứng dụng xác thực, lấy mã gồm 6 chữ số. Mã đổi mỗi 30 giây và chỉ được dùng một lần."}
          </p>
          {mode === "setup" && !setup && (
            <button
              className={`${primary} mt-6`}
              disabled={busy}
              onClick={() => void send("mfa-setup", {})}
            >
              {busy ? "Đang tạo thiết lập…" : "Bắt đầu thiết lập"}
            </button>
          )}
          {setup && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              {/* QR được tạo ở máy chủ, chỉ hiển thị trong phiên thiết lập này. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrDataUrl}
                alt="Mã QR kết nối tài khoản với ứng dụng xác thực"
                width={240}
                height={240}
                className="mx-auto max-w-full"
              />
              <p className="mt-4 text-xs font-semibold text-slate-600">
                Hoặc nhập khóa này vào ứng dụng:
              </p>
              <p className="mt-2 break-all rounded bg-slate-50 p-3 font-mono text-sm text-slate-900">
                {setup.secret}
              </p>
            </div>
          )}
          {(mode === "verify" || setup) && (
            <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={busy}>
              <label
                className="block text-sm font-semibold text-slate-800"
                htmlFor="mfa-code"
              >
                {recovery ? "Mã khôi phục chưa dùng" : "Mã xác thực 6 chữ số"}
              </label>
              <input
                id="mfa-code"
                name="code"
                type="text"
                inputMode={recovery ? "text" : "numeric"}
                autoComplete={recovery ? "off" : "one-time-code"}
                maxLength={recovery ? 64 : 6}
                disabled={busy}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-teal-700"
                aria-invalid={error ? true : undefined}
              />
              <p className="text-xs leading-6 text-slate-500">
                Nếu mã vừa được dùng, đợi mã mới ở chu kỳ 30 giây tiếp theo. Sai
                nhiều lần sẽ bị khóa tạm.
              </p>
              <button className={`${primary} w-full`} disabled={busy}>
                {busy ? "Đang xác thực…" : "Xác nhận"}
              </button>
            </form>
          )}
          {mode === "verify" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRecovery(!recovery);
                setError("");
              }}
              className={`mt-5 rounded text-sm font-semibold text-teal-800 underline ${focusRing}`}
            >
              {recovery
                ? "Dùng mã từ ứng dụng xác thực"
                : "Tôi cần dùng mã khôi phục"}
            </button>
          )}
        </>
      )}
      <div className="mt-7 border-t border-slate-100 pt-5">
        <LogoutButton />
      </div>
    </div>
  );
}
