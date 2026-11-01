import { InspectionDetailPanel } from "@/components/feedback/inspection-detail";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeedbackPageActor("inspection:read");
  return <InspectionDetailPanel id={(await params).id} />;
}
