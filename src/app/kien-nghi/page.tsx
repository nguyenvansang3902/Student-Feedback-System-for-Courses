import { RecommendationListPanel } from "@/components/workflows/recommendation-list";
import { requireWorkflowPageActor } from "@/components/workflows/workflow-shell";
import { can } from "@/server/policies/can";
export default async function Page() {
  const actor = await requireWorkflowPageActor("exam-recommendations:list");
  return (
    <RecommendationListPanel
      canCreate={can(actor, "exam-recommendations:create")}
    />
  );
}
