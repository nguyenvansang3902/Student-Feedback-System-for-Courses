import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Quên mật khẩu | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Quên mật khẩu?"
      description="Bạn có thể tạo mật khẩu mới qua liên kết gửi đến email của tài khoản."
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
