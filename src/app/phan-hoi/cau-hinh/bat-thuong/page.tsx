import { SurveyAnomalySettings } from "@/components/anomalies/anomaly-panels";
import { requireAnomalyPageActor } from "@/components/anomalies/page-guard";
export default async function AnomalySettingsPage() {
  await requireAnomalyPageActor("anomalies:settings:read");
  return <SurveyAnomalySettings />;
}
