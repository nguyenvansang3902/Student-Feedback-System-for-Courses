import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatMfaSessionTime,
  mfaSetupClock,
  readMfaSetupTicket,
} from "../src/components/auth/mfa-setup-clock";

const serverNow = Date.parse("2026-10-31T00:00:00Z");
const response = (qrMs = 60_000, sessionMs = 300_000) => ({
  secret: "FAKE-SETUP-ONLY",
  qrDataUrl: "data:image/png;base64,fixture",
  serverNow: new Date(serverNow).toISOString(),
  expiresAt: new Date(serverNow + qrMs).toISOString(),
  sessionExpiresAt: new Date(serverNow + sessionMs).toISOString(),
});

describe("FR-07/BR-32 — thời hạn QR thiết lập 60 giây", () => {
  afterEach(() => vi.useRealTimers());

  it("không phụ thuộc chênh đồng hồ máy khách và trừ thời gian tải", () => {
    const started = serverNow - 3600_000;
    const ticket = readMfaSetupTicket(response(), started, started + 1500);
    expect(mfaSetupClock(ticket, started + 1500)).toMatchObject({
      qrSeconds: 59,
      sessionSeconds: 299,
      qrExpired: false,
    });
    expect(ticket.qrDeadline).toBe(started + 60_000);
  });

  it("đúng mốc 60 giây phải ngừng dùng QR, không đợi hết lần đếm kế tiếp", () => {
    const ticket = readMfaSetupTicket(response(), serverNow, serverNow);
    expect(mfaSetupClock(ticket, serverNow + 59_999)).toMatchObject({
      qrSeconds: 1,
      qrExpired: false,
    });
    expect(mfaSetupClock(ticket, serverNow + 60_000)).toMatchObject({
      qrSeconds: 0,
      qrExpired: true,
      sessionExpired: false,
    });
  });

  it("RTT một giây: ẩn QR sớm an toàn nhưng không xin đổi trước hạn server", () => {
    const ticket = readMfaSetupTicket(response(), serverNow, serverNow + 1000);
    expect(mfaSetupClock(ticket, serverNow + 60_000)).toMatchObject({
      qrExpired: true,
      renewDue: false,
    });
    expect(mfaSetupClock(ticket, serverNow + 60_999).renewDue).toBe(false);
    expect(mfaSetupClock(ticket, serverNow + 61_000)).toMatchObject({
      qrExpired: true,
      renewDue: true,
    });
  });

  it("tab nền quay lại quá hạn dùng thời gian thực, không bắt đầu lại 60 giây", () => {
    vi.useFakeTimers();
    vi.setSystemTime(serverNow);
    const ticket = readMfaSetupTicket(response(), Date.now());
    vi.setSystemTime(serverNow + 171_000);
    expect(mfaSetupClock(ticket)).toMatchObject({
      qrExpired: true,
      qrSeconds: 0,
      sessionSeconds: 129,
    });
    vi.setSystemTime(serverNow + 301_000);
    expect(mfaSetupClock(ticket)).toMatchObject({
      qrExpired: true,
      sessionExpired: true,
      sessionSeconds: 0,
    });
  });

  it("QR không sống lâu hơn phiên còn lại, kể cả phản hồi gửi thời hạn QR dài hơn", () => {
    const ticket = readMfaSetupTicket(
      response(60_000, 12_000),
      serverNow,
      serverNow,
    );
    expect(ticket.qrDeadline).toBe(serverNow + 12_000);
    expect(mfaSetupClock(ticket, serverNow + 12_000)).toMatchObject({
      qrExpired: true,
      sessionExpired: true,
    });
  });

  it("không hiển thị QR tải xong sau hạn hoặc phiên đã hết", () => {
    expect(() =>
      readMfaSetupTicket(response(), serverNow, serverNow + 60_000),
    ).toThrow("QR đã hết hạn");
    expect(() =>
      readMfaSetupTicket(response(), serverNow, serverNow + 300_000),
    ).toThrow("Phiên xác thực đã hết hạn");
  });

  it.each([
    { expiresAt: "invalid" },
    { sessionExpiresAt: "invalid" },
    { serverNow: "invalid" },
    { qrDataUrl: "https://external.invalid/qr.png" },
    { expiresAt: new Date(serverNow + 61_000).toISOString() },
  ])("từ chối metadata sai để không gia hạn ngầm: %j", (change) => {
    expect(() =>
      readMfaSetupTicket({ ...response(), ...change }, serverNow, serverNow),
    ).toThrow();
  });

  it("định dạng cả phút cuối và số 0", () => {
    expect(formatMfaSessionTime(299)).toBe("4:59");
    expect(formatMfaSessionTime(9)).toBe("0:09");
    expect(formatMfaSessionTime(0)).toBe("0:00");
  });
});
