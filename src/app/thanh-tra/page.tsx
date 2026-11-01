import { InspectionListPanel } from "@/components/feedback/inspection-list";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function InspectionPage() {
  await requireFeedbackPageActor("inspection:list");
  return <InspectionListPanel />;
}
