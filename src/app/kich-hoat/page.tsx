import type { Metadata } from "next";
import { TokenForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Kích hoạt tài khoản | Khảo sát & phản hồi",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ActivationPage() {
  return (
    <AuthShell
      title="Bắt đầu với tài khoản của sinh viên"
      description="Mở liên kết kích hoạt trong email để tạo mật khẩu lần đầu. Nếu chưa nhận được liên kết, sinh viên có thể yêu cầu gửi lại."
    >
      <TokenForm purpose="activate" />
    </AuthShell>
  );
}
