import { z } from "zod";
import { authJson } from "./http";
import { AuthError } from "./types";

export function apiFailure(error: unknown) {
  if (error instanceof z.ZodError)
    return authJson(
      {
        ok: false,
        message: "Vui lòng kiểm tra lại dữ liệu đã nhập.",
        code: "VALIDATION_ERROR",
      },
      400,
    );
  if (error instanceof AuthError)
    return authJson(
      { ok: false, message: error.message, code: error.code },
      error.status,
    );
  // Không ghi exception có thể chứa SQL, mật khẩu hoặc khóa mã hóa.
  return authJson(
    {
      ok: false,
      message:
        "Hệ thống tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau.",
      code: "SERVER_ERROR",
    },
    503,
  );
}
