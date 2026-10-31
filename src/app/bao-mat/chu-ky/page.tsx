import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PeriodChangeForm } from "@/components/auth/period-change-form";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { authorizeAuthAction } from "@/server/policies/auth";
import { getMfaStatus } from "@/server/services/mfa";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Đổi chu kỳ mã xác minh",
  robots: { index: false, follow: false },
};

export default async function MfaPeriodPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.purpose && actor.purpose !== "FULL")
    redirect(authDestination(actor));
  if (!actor.mfa) redirect("/tai-khoan");
  authorizeAuthAction(actor, "mfa-period-change");
  const status = await getMfaStatus(actor);
  if (!status.enabled || status.periodSeconds !== 30) redirect("/tai-khoan");
  return (
    <AuthShell
      title="Đổi chu kỳ mã xác minh"
      description="Giữ cấu hình đang dùng cho đến khi xác nhận mã từ mục 60 giây mới."
    >
      <PeriodChangeForm />
    </AuthShell>
  );
}
