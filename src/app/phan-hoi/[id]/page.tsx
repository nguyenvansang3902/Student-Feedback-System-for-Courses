import { FeedbackDetailPanel } from "@/components/feedback/feedback-detail";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeedbackPageActor("feedback:read");
  return <FeedbackDetailPanel id={(await params).id} />;
}
