import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ResultsShell } from "@/components/survey-results/results-shell";
import { IncompletePanel } from "@/components/survey-results/incomplete-panel";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sinh viên chưa hoàn thành",
  robots: { index: false, follow: false },
};
export default async function IncompletePage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (!can(actor, "results:incomplete")) redirect("/tai-khoan");
  const { campaignId } = await params;
  if (!z.uuid().safeParse(campaignId).success) notFound();
  return (
    <ResultsShell>
      <IncompletePanel campaignId={campaignId} />
    </ResultsShell>
  );
}
