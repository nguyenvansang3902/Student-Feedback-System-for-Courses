"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { authDestination } from "./destination";
import { focusRing } from "./auth-shell";
import { LogoutButton } from "./logout-button";
import {
  formatMfaSessionTime,
  mfaSetupClock,
  MfaSetupClockError,
  readMfaSetupTicket,
  type MfaSetupTicket,
} from "./mfa-setup-clock";

const primary = `rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focusRing}`;

class MfaRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

async function requestMfa(
  action: string,
  body: Record<string, string>,
  signal: AbortSignal,
) {
  const response = await fetch(`/api/auth/${action}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const value: unknown = await response.json().catch(() => ({}));
  const result =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  if (!response.ok) {
    throw new MfaRequestError(
      response.status === 401
        ? "Phiên xác thực đã hết hạn. Hãy đăng nhập lại."
        : typeof result.message === "string"
          ? result.message
          : "Chưa xác thực được. Hãy kiểm tra mã và thử lại.",
      response.status,
      typeof result.code === "string" ? result.code : "MFA_REQUEST_FAILED",
    );
  }
  return result;
}

export function MfaForm({
  mode,
  destination = "/tai-khoan",
}: {
  mode: "setup" | "verify";
  destination?: string;
}) {
  const [setup, setSetup] = useState<MfaSetupTicket | null>(null);
  const [now, setNow] = useState(0);
  const [started, setStarted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [setupNotice, setSetupNotice] = useState("");
  const [canRetrySetup, setCanRetrySetup] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const pendingAction = useRef("");
  const alertRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const currentSetup = useRef<MfaSetupTicket | null>(null);
  const mounted = useRef(true);
  const stopped = useRef(false);
  const renewalBlocked = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const clock = setup ? mfaSetupClock(setup, now) : null;
  const usableSetup =
    !!setup &&
    !!clock &&
    !clock.qrExpired &&
    !clock.sessionExpired &&
    !sessionExpired;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  const expireSession = useCallback(() => {
    stopped.current = true;
    currentSetup.current = null;
    setSetup(null);
    setSessionExpired(true);
    setSetupNotice("");
    setError("Phiên thiết lập đã hết hạn. Đăng nhập lại để tiếp tục.");
    if (codeRef.current) codeRef.current.value = "";
  }, []);

  const requestSetup = useCallback(async () => {
    if (pending.current || stopped.current || !mounted.current) return;
    const previous = currentSetup.current;
    if (previous && mfaSetupClock(previous).sessionExpired) {
      expireSession();
      return;
    }
    if (previous && !mfaSetupClock(previous).renewDue) return;
    const renewing = !!previous;
    pending.current = true;
    pendingAction.current = "mfa-setup";
    renewalBlocked.current = false;
    setCanRetrySetup(false);
    setStarted(true);
    setBusy(true);
    setError("");
    if (codeRef.current) codeRef.current.value = "";
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const requestedAt = Date.now();
    try {
      const result = await requestMfa("mfa-setup", {}, controller.signal);
      if (!mounted.current || stopped.current) return;
      const ticket = readMfaSetupTicket(result, requestedAt);
      currentSetup.current = ticket;
      setSetup(ticket);
      setNow(Date.now());
      setSetupNotice(
        renewing
          ? "QR đã đổi. Quét lại QR mới trong ứng dụng trước khi nhập mã xác thực."
          : "QR tự cấp lại sau 60 giây. Khi QR đổi, cần quét lại trong ứng dụng.",
      );
    } catch (caught) {
      if (!mounted.current || stopped.current) return;
      renewalBlocked.current = true;
      setCanRetrySetup(true);
      if (
        (caught instanceof MfaRequestError && caught.status === 401) ||
        (caught instanceof MfaSetupClockError &&
          caught.code === "MFA_SESSION_EXPIRED")
      ) {
        expireSession();
      } else {
        setError(
          caught instanceof Error && caught.name !== "AbortError"
            ? caught.message
            : "Chưa tải được QR mới. Kiểm tra kết nối rồi bấm thử lại.",
        );
      }
    } finally {
      clearTimeout(timeout);
      pending.current = false;
      pendingAction.current = "";
      activeRequest.current = null;
      if (mounted.current) setBusy(false);
    }
  }, [expireSession]);

  useEffect(() => {
    if (mode !== "setup") return;
    const tick = () => {
      const ticket = currentSetup.current;
      if (!mounted.current || stopped.current || !ticket) return;
      const time = Date.now();
      setNow(time);
      const remaining = mfaSetupClock(ticket, time);
      if (remaining.qrExpired && codeRef.current) codeRef.current.value = "";
      // Để phản hồi xác nhận đang gửi hoàn tất, tránh làm mất mã khôi phục nếu server vừa bật MFA.
      if (remaining.sessionExpired && pendingAction.current !== "mfa-confirm") {
        expireSession();
      } else if (
        remaining.renewDue &&
        !pending.current &&
        !renewalBlocked.current
      ) {
        void requestSetup();
      }
    };
    const timer = setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, expireSession, requestSetup]);

  async function send(
    action: "mfa-confirm" | "mfa-verify",
    body: Record<string, string>,
  ) {
    if (pending.current || stopped.current || !mounted.current) return;
    pending.current = true;
    pendingAction.current = action;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const result = await requestMfa(action, body, controller.signal);
      if (!mounted.current) return;
      if (action === "mfa-confirm") {
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
        stopped.current = true;
        currentSetup.current = null;
        setSetup(null);
        setError("");
        setCodes(result.recoveryCodes);
      } else {
        window.location.replace(
          typeof result.purpose === "string" && result.purpose !== "FULL"
            ? authDestination({ purpose: result.purpose })
            : destination,
        );
      }
    } catch (caught) {
      if (!mounted.current) return;
      if (
        mode === "setup" &&
        caught instanceof MfaRequestError &&
        caught.status === 401
      ) {
        expireSession();
        return;
      }
      if (
        mode === "setup" &&
        caught instanceof MfaRequestError &&
        caught.code === "MFA_SETUP_EXPIRED"
      ) {
        const previous = currentSetup.current;
        if (previous) {
          const time = Date.now();
          const expired = { ...previous, qrDeadline: time, qrRenewAt: time };
          currentSetup.current = expired;
          renewalBlocked.current = false;
          setSetup(expired);
          setNow(time);
        }
        setError(
          "QR vừa hết hạn. Đang cấp QR mới; cần quét lại trước khi nhập mã.",
        );
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Chưa kết nối được máy chủ. Hãy thử lại.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      pending.current = false;
      pendingAction.current = "";
      activeRequest.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("code") as HTMLInputElement;
    const code = input.value.trim();
    if (
      mode === "setup" &&
      (!currentSetup.current ||
        mfaSetupClock(currentSetup.current).qrExpired ||
        sessionExpired)
    ) {
      input.value = "";
      if (!sessionExpired) void requestSetup();
      return;
    }
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
          ? "Lưu mã khôi phục"
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
            10 mã dưới đây chỉ xuất hiện lần này. Mỗi mã dùng một lần khi không
            sử dụng được ứng dụng xác thực. Lưu ở nơi riêng tư và không chia sẻ.
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
          {mode === "setup" && !setup && !sessionExpired && (
            <button
              className={`${primary} mt-6`}
              disabled={busy}
              onClick={() => void requestSetup()}
            >
              {busy
                ? "Đang tạo thiết lập…"
                : started
                  ? "Thử cấp QR mới"
                  : "Bắt đầu thiết lập"}
            </button>
          )}
          {setup && !sessionExpired && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex flex-wrap justify-between gap-x-5 gap-y-2 text-sm text-slate-700">
                <p role="timer" aria-label="Thời gian còn lại của mã QR">
                  QR còn hiệu lực: <strong>{clock?.qrSeconds ?? 0} giây</strong>
                </p>
                <p
                  role="timer"
                  aria-label="Thời gian còn lại của phiên thiết lập"
                >
                  Phiên thiết lập:{" "}
                  <strong>
                    {formatMfaSessionTime(clock?.sessionSeconds ?? 0)}
                  </strong>
                </p>
              </div>
              {usableSetup ? (
                <>
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
                </>
              ) : (
                <div
                  className="flex min-h-60 items-center justify-center rounded bg-slate-50 px-4 text-center text-sm leading-7 text-slate-600"
                  role="status"
                >
                  {busy
                    ? "QR đã hết hạn. Đang cấp QR mới…"
                    : "QR đã hết hạn và không còn dùng được."}
                </div>
              )}
              <p
                className="mt-4 text-sm leading-7 text-slate-600"
                role="status"
              >
                {setupNotice}
              </p>
              {!usableSetup && !busy && canRetrySetup && (
                <button
                  type="button"
                  className={`${primary} mt-4`}
                  onClick={() => void requestSetup()}
                >
                  Thử cấp QR mới
                </button>
              )}
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
                ref={codeRef}
                disabled={busy || (mode === "setup" && !usableSetup)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-teal-700"
                aria-invalid={error ? true : undefined}
              />
              <p className="text-xs leading-6 text-slate-500">
                Nếu mã vừa được dùng, đợi mã mới ở chu kỳ 30 giây tiếp theo. Sai
                nhiều lần sẽ bị khóa tạm.
              </p>
              <button
                className={`${primary} w-full`}
                disabled={busy || (mode === "setup" && !usableSetup)}
              >
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
