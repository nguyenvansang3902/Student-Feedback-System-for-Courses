import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { MfaForm } from "@/components/auth/mfa-form";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { authorizeAuthAction } from "@/server/policies/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Xác thực hai bước",
  robots: { index: false, follow: false },
};
export default async function MfaVerifyPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.purpose !== "MFA_VERIFY") redirect(authDestination(actor));
  authorizeAuthAction(actor, "mfa-verify");
  return (
    <AuthShell
      title="Xác thực hai bước"
      description="Nhập mã xác thực để tiếp tục đăng nhập."
    >
      <MfaForm
        mode="verify"
        destination={actor.roles.includes("ADMIN") ? "/quan-tri" : "/tai-khoan"}
      />
    </AuthShell>
  );
}
