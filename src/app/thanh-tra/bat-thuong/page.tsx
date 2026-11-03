import { SurveyAnomalyList } from "@/components/anomalies/anomaly-panels";
import { requireAnomalyPageActor } from "@/components/anomalies/page-guard";
export default async function AnomalyPage() {
  await requireAnomalyPageActor("anomalies:list");
  return <SurveyAnomalyList />;
}
