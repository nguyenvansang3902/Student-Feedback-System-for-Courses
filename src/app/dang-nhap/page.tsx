import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { authDestination } from "@/components/auth/destination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const actor = await getPageActor();
  if (actor) redirect(authDestination(actor));
  return (
    <AuthShell
      title="Đăng nhập tài khoản"
      description="Sử dụng tài khoản được cấp để đăng nhập. Nếu chưa có tài khoản, hãy liên hệ đơn vị quản lý."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
