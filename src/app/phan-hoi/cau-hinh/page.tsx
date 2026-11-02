import { WorkflowSettingsPanel } from "@/components/feedback/workflow-settings-panel";
import { FeedbackSettingsPanel } from "@/components/feedback/feedback-settings-panel";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
export default async function FeedbackSettingsPage() {
  await requireFeedbackPageActor("feedback-settings:read");
  return (
    <>
      <FeedbackSettingsPanel />
      <WorkflowSettingsPanel />
    </>
  );
}
