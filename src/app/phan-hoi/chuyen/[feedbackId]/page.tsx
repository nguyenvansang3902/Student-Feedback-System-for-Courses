import { TransferredInspectionSummaryPanel } from "@/components/feedback/inspection-transfer";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function TransferredCasePage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  await requireFeedbackPageActor("feedback:read");
  return (
    <TransferredInspectionSummaryPanel feedbackId={(await params).feedbackId} />
  );
}
