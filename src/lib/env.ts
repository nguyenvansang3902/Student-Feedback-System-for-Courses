import { z } from "zod";
import { getAuthLimits } from "../server/auth/limits";

const authEnvironment = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z
    .string()
    .regex(
      /^[a-f0-9]{64,}$/i,
      "JWT_SECRET cần ít nhất 32 byte ngẫu nhiên dạng hex.",
    ),
  JWT_ISSUER: z.string().min(1).default("student-feedback-system"),
  JWT_AUDIENCE: z.string().min(1).default("student-feedback-web"),
  ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  BCRYPT_COST: z.coerce.number().int().min(12).max(15).default(12),
  AUTH_TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  SMTP_HOST: z.string().min(1).default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.email().default("no-reply@localhost.invalid"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export function getAuthConfig() {
  getAuthLimits();
  const parsed = authEnvironment.safeParse(process.env);
  if (!parsed.success) {
    // Chỉ in tên trường, không đưa giá trị môi trường/bí mật vào lỗi.
    throw new Error(
      `Cấu hình xác thực chưa hợp lệ: ${[...new Set(parsed.error.issues.map((issue) => issue.path[0]))].join(", ")}.`,
    );
  }
  const value = parsed.data;
  const app = new URL(value.APP_URL);
  if (
    !["http:", "https:"].includes(app.protocol) ||
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== "/"
  )
    throw new Error("APP_URL phải là origin HTTP/HTTPS của ứng dụng.");
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    app.protocol !== "https:"
  )
    throw new Error("APP_URL production phải dùng HTTPS.");
  return {
    appUrl: app.origin,
    databaseUrl: value.DATABASE_URL,
    jwtSecret: value.JWT_SECRET,
    jwtIssuer: value.JWT_ISSUER,
    jwtAudience: value.JWT_AUDIENCE,
    accessTtlSeconds: value.ACCESS_TTL_SECONDS,
    refreshTtlDays: value.REFRESH_TTL_DAYS,
    bcryptCost: value.BCRYPT_COST,
    trustProxy: value.AUTH_TRUST_PROXY === "true",
    smtpHost: value.SMTP_HOST,
    smtpPort: value.SMTP_PORT,
    smtpFrom: value.SMTP_FROM,
    smtpUser: value.SMTP_USER,
    smtpPassword: value.SMTP_PASSWORD,
  };
}
