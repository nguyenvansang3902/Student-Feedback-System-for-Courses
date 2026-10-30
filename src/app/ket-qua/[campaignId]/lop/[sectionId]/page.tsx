import { notFound } from "next/navigation";
import { z } from "zod";
import { ResultsClassPanel } from "@/components/survey-results/results-detail";
export default async function ResultsSectionPage({
  params,
}: {
  params: Promise<{ campaignId: string; sectionId: string }>;
}) {
  const { campaignId, sectionId } = await params;
  if (![campaignId, sectionId].every((id) => z.uuid().safeParse(id).success))
    notFound();
  return <ResultsClassPanel campaignId={campaignId} sectionId={sectionId} />;
}
