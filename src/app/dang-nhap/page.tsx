import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đăng nhập | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Đăng nhập tài khoản"
      description="Kết nối với không gian khảo sát và phản hồi dành cho bạn."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
