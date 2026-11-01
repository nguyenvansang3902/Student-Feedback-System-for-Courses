import { FeedbackCreate } from "@/components/feedback/feedback-create";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function CreateFeedbackPage() {
  await requireFeedbackPageActor("feedback:create");
  return <FeedbackCreate />;
}
