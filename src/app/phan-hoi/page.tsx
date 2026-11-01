import { FeedbackListPanel } from "@/components/feedback/feedback-list";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
import { can } from "@/server/policies/can";
export default async function FeedbackPage() {
  const actor = await requireFeedbackPageActor("feedback:list");
  return (
    <FeedbackListPanel
      canCreate={can(actor, "feedback:create")}
      canProcess={can(actor, "feedback:process")}
    />
  );
}
