"use client";

import { useRef, useState } from "react";
import { authRequest } from "./auth-client";
import { focusRing } from "./auth-shell";
import { clearAllSurveyDrafts } from "../student-surveys/survey-draft";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { response, result } = await authRequest(
        "/api/auth/logout",
        {},
        true,
      );
      if (response.ok || response.status === 401) {
        clearAllSurveyDrafts();
        window.location.replace("/dang-nhap");
      } else
        setError(result.message || "Chưa đăng xuất được. Vui lòng thử lại.");
    } catch {
      setError("Chưa kết nối được với máy chủ. Hãy thử đăng xuất lại.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={busy}
        className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
      >
        {busy ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
