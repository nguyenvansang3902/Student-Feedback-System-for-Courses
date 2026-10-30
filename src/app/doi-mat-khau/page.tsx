import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPageActor } from "@/server/auth/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đổi mật khẩu | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const actor = await getPageActor({ allowPasswordChange: true });
  if (!actor) redirect("/dang-nhap");
  return (
    <AuthShell
      title="Đổi mật khẩu"
      description={
        actor.mustChangePassword
          ? "Tài khoản đang sử dụng mật khẩu tạm. Hãy tạo mật khẩu riêng trước khi tiếp tục sử dụng tài khoản."
          : "Cập nhật mật khẩu để bảo vệ tài khoản. Các phiên đăng nhập hiện có sẽ kết thúc sau khi đổi thành công."
      }
    >
      <AuthForm mode="change" />
    </AuthShell>
  );
}
