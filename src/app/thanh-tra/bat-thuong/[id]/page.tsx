import { SurveyAnomalyDetailPanel } from "@/components/anomalies/anomaly-panels";
import { requireAnomalyPageActor } from "@/components/anomalies/page-guard";
export default async function AnomalyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnomalyPageActor("anomalies:read");
  return <SurveyAnomalyDetailPanel id={(await params).id} />;
}
