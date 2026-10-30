import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ResultsShell } from "@/components/survey-results/results-shell";
import { ModerationPanel } from "@/components/survey-results/moderation-panel";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kiểm duyệt góp ý",
  robots: { index: false, follow: false },
};
export default async function ModerationPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (!can(actor, "results:moderate")) redirect("/tai-khoan");
  const { campaignId } = await params;
  if (!z.uuid().safeParse(campaignId).success) notFound();
  return (
    <ResultsShell>
      <ModerationPanel campaignId={campaignId} />
    </ResultsShell>
  );
}
