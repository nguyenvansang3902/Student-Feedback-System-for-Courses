import { z } from "zod";

const schema = z.object({
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(20).default(5),
  LOGIN_WINDOW_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  PASSWORD_RESET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86400)
    .default(1800),
  ACTIVATION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(604800)
    .default(86400),
  RECOVERY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86400)
    .default(900),
  RECOVERY_LOCK_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86400)
    .default(900),
  RECOVERY_REQUEST_IP_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  RECOVERY_REQUEST_ACCOUNT_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(3),
  RECOVERY_COMPLETE_IP_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  RECOVERY_COMPLETE_TOKEN_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),
});

/** Các giá trị nghiệp vụ là mặc định cấu hình được theo đặc tả. */
export function getAuthLimits() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error("Cấu hình thời hạn hoặc giới hạn xác thực không hợp lệ.");
  return result.data;
}
