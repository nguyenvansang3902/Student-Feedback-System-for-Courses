"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { authRequest, restoreSession } from "./auth-client";
import { authDestination } from "./destination";
import { focusRing } from "./auth-shell";

type Mode =
  "login" | "forgot" | "request-activation" | "reset" | "activate" | "change";
type Errors = Record<string, string>;

function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = input.type === "password";
  const hintId = hint ? `${input.name}-hint` : "";
  const errorId = error ? `${input.name}-error` : "";
  return (
    <div>
      <label
        htmlFor={input.name}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={input.name}
          type={password && visible ? "text" : input.type}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:bg-slate-50 disabled:text-slate-500 ${password ? "pr-20" : ""} ${error ? "border-red-500" : "border-slate-300"}`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={
              visible
                ? `Ẩn ${label.toLowerCase()}`
                : `Hiện ${label.toLowerCase()}`
            }
            aria-pressed={visible}
            className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 ${focusRing}`}
          >
            {visible ? "Ẩn" : "Hiện"}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-2 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const buttonLabels: Record<Mode, string> = {
  login: "Đăng nhập",
  forgot: "Gửi liên kết đặt lại mật khẩu",
  "request-activation": "Gửi liên kết kích hoạt",
  reset: "Đặt lại mật khẩu",
  activate: "Kích hoạt tài khoản",
  change: "Lưu mật khẩu mới",
};
const endpoints: Record<Mode, string> = {
  login: "/api/auth/login",
  forgot: "/api/auth/forgot-password",
  "request-activation": "/api/auth/request-activation",
  reset: "/api/auth/reset-password",
  activate: "/api/auth/activate",
  change: "/api/auth/change-password",
};

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(mode === "login");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const submitting = useRef(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const emailRequest = mode === "forgot" || mode === "request-activation";
  const newPassword =
    mode === "reset" || mode === "activate" || mode === "change";

  useEffect(() => {
    if (mode !== "login") return;
    let active = true;
    void restoreSession().then((user) => {
      if (!active) return;
      if (user) window.location.replace(authDestination(user));
      else setRestoring(false);
    });
    return () => {
      active = false;
    };
  }, [mode]);

  function clearFieldError(event: FormEvent<HTMLFormElement>) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const name = event.target.name;
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || restoring) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const get = (name: string) => String(values.get(name) ?? "");
    const nextErrors: Errors = {};
    const body: Record<string, string> = {};
    if (mode === "login") {
      body.identifier = get("identifier").trim();
      body.password = get("password");
      if (!body.identifier)
        nextErrors.identifier = "Nhập tài khoản hoặc email.";
      if (!body.password) nextErrors.password = "Nhập mật khẩu.";
      else if (new TextEncoder().encode(body.password).length > 72)
        nextErrors.password =
          "Mật khẩu vượt quá giới hạn 72 byte. Ký tự có dấu có thể chiếm nhiều byte.";
    }
    if (emailRequest) {
      body.email = get("email").trim();
      if (!body.email)
        nextErrors.email = "Nhập email đã được cấp cho tài khoản.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
        nextErrors.email = "Email chưa đúng định dạng.";
    }
    if (mode === "change") {
      body.currentPassword = get("currentPassword");
      if (!body.currentPassword)
        nextErrors.currentPassword = "Nhập mật khẩu hiện tại.";
      else if (new TextEncoder().encode(body.currentPassword).length > 72)
        nextErrors.currentPassword = "Mật khẩu vượt quá giới hạn 72 byte.";
    }
    if (newPassword) {
      body.newPassword = get("newPassword");
      if (body.newPassword.length < 10)
        nextErrors.newPassword = "Mật khẩu mới cần có ít nhất 10 ký tự.";
      else if (new TextEncoder().encode(body.newPassword).length > 72)
        nextErrors.newPassword =
          "Mật khẩu vượt quá giới hạn 72 byte. Hãy dùng mật khẩu ngắn hơn.";
      if (get("confirmation") !== body.newPassword)
        nextErrors.confirmation = "Mật khẩu xác nhận chưa trùng khớp.";
    }
    if (mode === "activate" || mode === "reset") {
      if (!token) {
        setMessage("Liên kết chưa hợp lệ. Hãy yêu cầu một liên kết mới.");
        return;
      }
      body.token = token;
    }
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) {
      form
        .querySelector<HTMLInputElement>(
          `[name="${Object.keys(nextErrors)[0]}"]`,
        )
        ?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const { response, result } = await authRequest(
        endpoints[mode],
        body,
        mode === "change",
      );
      if (!response.ok) {
        setMessage(
          result.message || "Yêu cầu chưa thực hiện được. Vui lòng thử lại.",
        );
        requestAnimationFrame(() => messageRef.current?.focus());
        return;
      }
      if (mode === "login") {
        form.reset();
        window.location.replace(authDestination(result));
        return;
      }
      form.reset();
      setComplete(true);
      setMessage(
        emailRequest
          ? "Nếu email phù hợp với một tài khoản đủ điều kiện, liên kết hướng dẫn sẽ được gửi. Vui lòng kiểm tra hộp thư và thư rác."
          : mode === "activate"
            ? "Tài khoản đã được kích hoạt. Vui lòng đăng nhập bằng mật khẩu vừa tạo."
            : "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại bằng mật khẩu mới.",
      );
      requestAnimationFrame(() => messageRef.current?.focus());
    } catch {
      setMessage(
        "Chưa kết nối được với máy chủ. Hãy kiểm tra kết nối và thử lại.",
      );
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        {mode === "login"
          ? "Thông tin đăng nhập"
          : emailRequest
            ? "Nhận liên kết qua email"
            : "Mật khẩu mới"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {mode === "login"
          ? "Nhập tài khoản hoặc email và mật khẩu."
          : emailRequest
            ? "Nhập email được gắn với tài khoản."
            : "Dùng mật khẩu riêng cho tài khoản và tránh mật khẩu phổ biến."}
      </p>
      {restoring && (
        <p role="status" className="mt-5 text-sm text-slate-500">
          Đang kiểm tra phiên đăng nhập…
        </p>
      )}
      {message && (
        <div
          ref={messageRef}
          tabIndex={-1}
          role={complete ? "status" : "alert"}
          className={`mt-5 rounded-xl border p-4 text-sm leading-7 outline-none ${complete ? "border-teal-200 bg-teal-50 text-teal-900" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {message}
        </div>
      )}
      {!complete && (
        <form
          onSubmit={submit}
          onChange={clearFieldError}
          noValidate
          aria-busy={busy || restoring}
          className="mt-6 space-y-5"
        >
          {mode === "login" && (
            <>
              <Field
                name="identifier"
                label="Tài khoản hoặc email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={busy || restoring}
                error={errors.identifier}
              />
              <Field
                name="password"
                label="Mật khẩu"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy || restoring}
                error={errors.password}
              />
            </>
          )}
          {emailRequest && (
            <Field
              name="email"
              label="Email tài khoản"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={busy}
              error={errors.email}
            />
          )}
          {mode === "change" && (
            <Field
              name="currentPassword"
              label="Mật khẩu hiện tại"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
              error={errors.currentPassword}
            />
          )}
          {newPassword && (
            <>
              <Field
                name="newPassword"
                label="Mật khẩu mới"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                disabled={busy}
                error={errors.newPassword}
                hint="Ít nhất 10 ký tự, tối đa 72 byte. Ký tự có dấu có thể chiếm nhiều byte."
              />
              <Field
                name="confirmation"
                label="Nhập lại mật khẩu mới"
                type="password"
                autoComplete="new-password"
                required
                disabled={busy}
                error={errors.confirmation}
              />
            </>
          )}
          {mode === "login" && (
            <div className="text-right">
              <Link
                href="/quen-mat-khau"
                className={`rounded text-sm font-semibold text-teal-800 hover:underline ${focusRing}`}
              >
                Quên mật khẩu?
              </Link>
            </div>
          )}
          <button
            type="submit"
            disabled={busy || restoring}
            className={`w-full rounded-xl bg-teal-800 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-700 ${focusRing}`}
          >
            {busy ? "Đang xử lý…" : buttonLabels[mode]}
          </button>
        </form>
      )}
      <div className="mt-6 border-t border-slate-100 pt-5 text-sm leading-7 text-slate-500">
        {mode === "login" ? (
          <>
            Lần đầu sử dụng?{" "}
            <Link
              href="/kich-hoat"
              className={`rounded font-semibold text-teal-800 hover:underline ${focusRing}`}
            >
              Kích hoạt tài khoản
            </Link>
          </>
        ) : (
          <Link
            href="/dang-nhap"
            className={`rounded font-semibold text-teal-800 hover:underline ${focusRing}`}
          >
            ← Trở về đăng nhập
          </Link>
        )}
        {(mode === "reset" || mode === "activate") && !complete && (
          <p className="mt-2">
            <Link
              href={mode === "reset" ? "/quen-mat-khau" : "/kich-hoat"}
              className={`rounded text-teal-800 underline underline-offset-4 ${focusRing}`}
            >
              Yêu cầu liên kết mới
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export function TokenForm({ purpose }: { purpose: "activate" | "reset" }) {
  const [token, setToken] = useState<string | null>(null);
  const read = useRef(false);
  const fragmentToken = useRef("");
  useEffect(() => {
    if (!read.current) {
      const raw = new URLSearchParams(window.location.hash.slice(1)).get(
        "token",
      );
      fragmentToken.current = raw && raw.length <= 1024 ? raw : "";
      read.current = true;
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname,
      );
    }
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setToken(fragmentToken.current);
    });
    return () => {
      active = false;
    };
  }, []);
  if (token === null)
    return (
      <p role="status" className="py-6 text-sm text-slate-500">
        Đang kiểm tra liên kết…
      </p>
    );
  if (token) return <AuthForm mode={purpose} token={token} />;
  if (purpose === "activate") return <AuthForm mode="request-activation" />;
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        Liên kết đặt lại mật khẩu
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Hãy mở liên kết nhận qua email. Nếu liên kết bị thiếu hoặc hết hạn, sinh
        viên có thể yêu cầu gửi lại.
      </p>
      <Link
        href="/quen-mat-khau"
        className={`mt-6 inline-flex rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
      >
        Yêu cầu liên kết mới
      </Link>
    </div>
  );
}
