import { RecommendationCreatePanel } from "@/components/workflows/recommendation-create";
import { requireWorkflowPageActor } from "@/components/workflows/workflow-shell";
export default async function Page() {
  await requireWorkflowPageActor("exam-recommendations:create");
  return <RecommendationCreatePanel />;
}
