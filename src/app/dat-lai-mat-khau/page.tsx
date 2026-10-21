import type { Metadata } from "next";
import { TokenForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | Khảo sát & phản hồi",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      description="Liên kết đặt lại mật khẩu dùng một lần và hết hạn sau 30 phút. Sau khi đổi, hãy đăng nhập lại bằng mật khẩu mới."
    >
      <TokenForm purpose="reset" />
    </AuthShell>
  );
}
