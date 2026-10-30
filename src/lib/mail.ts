import nodemailer from "nodemailer";
import { getAuthConfig } from "@/lib/env";
import { getAuthLimits } from "@/server/auth/limits";

/** Email vận hành đợt; chỉ worker outbox nội bộ gọi, không gửi nội dung phiếu. */
export async function sendCampaignMail(input: {
  to: string;
  title: string;
  body: string;
}): Promise<void> {
  const config = getAuthConfig();
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    ...(config.smtpUser && config.smtpPassword
      ? { auth: { user: config.smtpUser, pass: config.smtpPassword } }
      : {}),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    logger: false,
    debug: false,
  });
  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: input.to,
      subject: input.title,
      text: input.body,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transporter.close();
  }
}

type AccountMail = {
  to: string;
  kind: "ACTIVATION" | "PASSWORD_RESET";
  token: string;
};

/** Chỉ người nhận lấy từ User và APP_URL phía máy chủ được gọi helper này. */
export async function sendAccountTokenMail(input: AccountMail): Promise<void> {
  const config = getAuthConfig();
  const isActivation = input.kind === "ACTIVATION";
  const limits = getAuthLimits();
  const ttlMinutes = Math.ceil(
    (isActivation
      ? limits.ACTIVATION_TTL_SECONDS
      : limits.PASSWORD_RESET_TTL_SECONDS) / 60,
  );
  const link = new URL(
    isActivation ? "/kich-hoat" : "/dat-lai-mat-khau",
    config.appUrl,
  );
  // Fragment không đi vào HTTP request/access log hoặc Referer của trang mở đầu.
  link.hash = new URLSearchParams({ token: input.token }).toString();
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    ...(config.smtpUser && config.smtpPassword
      ? { auth: { user: config.smtpUser, pass: config.smtpPassword } }
      : {}),
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 5_000,
    logger: false,
    debug: false,
  });
  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: input.to,
      subject: isActivation
        ? "Kích hoạt tài khoản khảo sát và phản hồi sinh viên"
        : "Đặt lại mật khẩu hệ thống khảo sát và phản hồi sinh viên",
      text: [
        isActivation
          ? "Sinh viên nhận được liên kết để kích hoạt tài khoản."
          : "Có yêu cầu đặt lại mật khẩu cho tài khoản của sinh viên.",
        "",
        link.toString(),
        "",
        `Liên kết chỉ dùng một lần và hết hạn sau ${ttlMinutes} phút.`,
        "Nếu sinh viên không yêu cầu, hãy bỏ qua thư này. Không chuyển liên kết cho người khác.",
      ].join("\n"),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transporter.close();
  }
}

/** BR-51: người nhận chỉ lấy từ tài khoản ĐBCL đang hoạt động phía máy chủ. */
export async function sendSemesterUnlockedMail(input: {
  to: string;
  semesterCode: string;
  semesterName: string;
  reason: string;
}): Promise<void> {
  const config = getAuthConfig();
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    ...(config.smtpUser && config.smtpPassword
      ? { auth: { user: config.smtpUser, pass: config.smtpPassword } }
      : {}),
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 5_000,
    logger: false,
    debug: false,
  });
  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: input.to,
      subject: "Thông báo mở khóa học kỳ — hệ thống khảo sát sinh viên",
      text: [
        "Phòng Đào tạo đã mở khóa học kỳ để cập nhật dữ liệu đào tạo.",
        `Học kỳ: ${input.semesterCode} · ${input.semesterName}`,
        `Lý do: ${input.reason}`,
        "Cán bộ Đảm bảo chất lượng cần kiểm tra tác động đến dữ liệu dùng cho khảo sát.",
      ].join("\n"),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transporter.close();
  }
}
