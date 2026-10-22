import { AuthError, type AuthActor } from "../auth/types";

type AuthAction =
  | "login"
  | "refresh"
  | "session"
  | "recovery"
  | "logout"
  | "change-password"
  | "workspace"
  | "mfa-status"
  | "mfa-setup"
  | "mfa-confirm"
  | "mfa-verify"
  | "step-up"
  | "admin";

const publicActions: ReadonlySet<AuthAction> = new Set([
  "login",
  "refresh",
  "session",
  "recovery",
]);

/** Kiểm tra mục đích trước mọi truy cập dữ liệu của service xác thực. */
export function authorizeAuthAction(
  actor: AuthActor | null,
  action: AuthAction,
): void {
  if (publicActions.has(action)) {
    if (actor !== null) {
      throw new AuthError("Yêu cầu xác thực không hợp lệ.", 403, "FORBIDDEN");
    }
    return;
  }
  // Đăng xuất được phép dùng refresh còn nhận diện được khi access đã hết hạn.
  // Service kiểm hash/ownership trước khi thu hồi, tuyệt đối không dùng ID từ client.
  if (action === "logout") return;
  if (!actor) {
    throw new AuthError(
      "Bạn cần đăng nhập để tiếp tục.",
      401,
      "UNAUTHENTICATED",
    );
  }
  const purpose =
    actor.purpose ?? (actor.mustChangePassword ? "PASSWORD_CHANGE" : "FULL");
  if (
    action === "change-password" &&
    (purpose === "FULL" || purpose === "PASSWORD_CHANGE")
  )
    return;
  if (actor.mustChangePassword) {
    throw new AuthError(
      "Bạn cần đổi mật khẩu tạm trước khi tiếp tục.",
      403,
      "PASSWORD_CHANGE_REQUIRED",
    );
  }
  if (action === "mfa-status") return;
  if (
    (action === "mfa-setup" || action === "mfa-confirm") &&
    purpose === "MFA_SETUP"
  )
    return;
  if (action === "mfa-verify" && purpose === "MFA_VERIFY") return;
  if (purpose !== "FULL") {
    throw new AuthError(
      "Bạn cần hoàn tất xác thực hai bước trước khi tiếp tục.",
      403,
      "MFA_REQUIRED",
    );
  }
  if (action === "admin" && !actor.roles.includes("ADMIN")) {
    throw new AuthError(
      "Bạn không có quyền thực hiện thao tác này.",
      403,
      "FORBIDDEN",
    );
  }
  if (
    (action === "admin" ||
      action === "step-up" ||
      actor.mfaRequired ||
      actor.roles.includes("ADMIN")) &&
    !actor.mfa
  ) {
    throw new AuthError(
      "Bạn cần xác thực hai bước để tiếp tục.",
      403,
      "MFA_REQUIRED",
    );
  }
  if (action === "admin" || action === "step-up") return;
  if (action === "workspace" && actor.roles.length > 0) return;
  throw new AuthError(
    "Bạn không có quyền thực hiện thao tác này.",
    403,
    "FORBIDDEN",
  );
}
