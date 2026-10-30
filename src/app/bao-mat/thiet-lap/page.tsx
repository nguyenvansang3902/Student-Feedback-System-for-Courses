import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { MfaForm } from "@/components/auth/mfa-form";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { authorizeAuthAction } from "@/server/policies/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Thiết lập xác thực hai bước",
  robots: { index: false, follow: false },
};
export default async function MfaSetupPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.purpose !== "MFA_SETUP") redirect(authDestination(actor));
  authorizeAuthAction(actor, "mfa-setup");
  return (
    <AuthShell
      title="Thiết lập xác thực hai bước"
      description="Thiết lập ứng dụng xác thực để nhận mã đăng nhập."
    >
      <MfaForm
        mode="setup"
        destination={actor.roles.includes("ADMIN") ? "/quan-tri" : "/tai-khoan"}
      />
    </AuthShell>
  );
}
