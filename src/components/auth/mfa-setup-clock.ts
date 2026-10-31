export type MfaSetupTicket = {
  secret: string;
  qrDataUrl: string;
  qrDeadline: number;
  qrRenewAt: number;
  sessionDeadline: number;
};

export class MfaSetupClockError extends Error {
  constructor(
    message: string,
    public readonly code:
      "MFA_SESSION_EXPIRED" | "MFA_SETUP_EXPIRED" | "MFA_SETUP_INVALID",
  ) {
    super(message);
    this.name = "MfaSetupClockError";
  }
}

/** Dùng thời gian máy chủ và trừ cả thời gian tải để không kéo dài QR ở phía trình duyệt. */
export function readMfaSetupTicket(
  value: unknown,
  requestedAt: number,
  receivedAt = Date.now(),
): MfaSetupTicket {
  if (!value || typeof value !== "object")
    throw new MfaSetupClockError(
      "Chưa nhận được mã thiết lập. Hãy thử lại.",
      "MFA_SETUP_INVALID",
    );
  const source = value as Record<string, unknown>;
  const serverNow = Date.parse(String(source.serverNow ?? ""));
  const expiresAt = Date.parse(String(source.expiresAt ?? ""));
  const sessionExpiresAt = Date.parse(String(source.sessionExpiresAt ?? ""));
  if (
    typeof source.secret !== "string" ||
    !source.secret ||
    typeof source.qrDataUrl !== "string" ||
    !source.qrDataUrl.startsWith("data:image/png;base64,") ||
    !Number.isFinite(serverNow) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(sessionExpiresAt) ||
    expiresAt <= serverNow ||
    expiresAt - serverNow > 60_000 ||
    sessionExpiresAt <= serverNow
  )
    throw new MfaSetupClockError(
      "Chưa nhận được thời hạn thiết lập hợp lệ. Hãy thử lại.",
      "MFA_SETUP_INVALID",
    );
  const sessionDeadline = requestedAt + sessionExpiresAt - serverNow;
  const qrDeadline = Math.min(
    requestedAt + expiresAt - serverNow,
    sessionDeadline,
  );
  if (receivedAt >= sessionDeadline)
    throw new MfaSetupClockError(
      "Phiên xác thực đã hết hạn. Hãy đăng nhập lại.",
      "MFA_SESSION_EXPIRED",
    );
  if (receivedAt >= qrDeadline)
    throw new MfaSetupClockError(
      "QR đã hết hạn trước khi tải xong. Hãy thử cấp QR mới.",
      "MFA_SETUP_EXPIRED",
    );
  return {
    secret: source.secret,
    qrDataUrl: source.qrDataUrl,
    qrDeadline,
    // Chờ qua hạn máy chủ trước khi xin QR mới; nếu xin sớm, server sẽ trả lại cùng khóa.
    qrRenewAt: receivedAt + expiresAt - serverNow,
    sessionDeadline,
  };
}

/** Tính lại từ mốc tuyệt đối, không trừ từng giây để tab nền vẫn đúng hạn. */
export function mfaSetupClock(ticket: MfaSetupTicket, now = Date.now()) {
  const qrSeconds = Math.max(0, Math.ceil((ticket.qrDeadline - now) / 1000));
  const sessionSeconds = Math.max(
    0,
    Math.ceil((ticket.sessionDeadline - now) / 1000),
  );
  return {
    qrSeconds,
    sessionSeconds,
    qrExpired: now >= ticket.qrDeadline,
    renewDue: now >= ticket.qrRenewAt,
    sessionExpired: now >= ticket.sessionDeadline,
  };
}

export function formatMfaSessionTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
