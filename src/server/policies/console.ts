import { AuthError } from "../auth/types";

/** Danh tính của người vận hành có quyền chạy script trên máy chủ, không nhận từ HTTP. */
export interface ServerConsoleActor {
  kind: "SERVER_CONSOLE";
  reason: string;
}
export function authorizeConsole(
  actor: ServerConsoleActor | null,
): asserts actor is ServerConsoleActor {
  if (
    !actor ||
    actor.kind !== "SERVER_CONSOLE" ||
    actor.reason.trim().length < 10 ||
    actor.reason.length > 500
  )
    throw new AuthError(
      "Thao tác máy chủ cần lý do từ 10 đến 500 ký tự.",
      403,
      "FORBIDDEN",
    );
}
