import { notFound } from "next/navigation";
import { z } from "zod";
import { ResultsDetailPanel } from "@/components/survey-results/results-detail";
export default async function ResultsCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  if (!z.uuid().safeParse(campaignId).success) notFound();
  return <ResultsDetailPanel campaignId={campaignId} />;
}
