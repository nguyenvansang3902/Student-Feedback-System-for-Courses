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
      description="Tạo mật khẩu mới qua liên kết được gửi đến email của tài khoản."
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
