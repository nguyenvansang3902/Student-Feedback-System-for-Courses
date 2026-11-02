import { TransferredInspectionList } from "@/components/feedback/inspection-transfer";
import { FeedbackListPanel } from "@/components/feedback/feedback-list";
import { requireFeedbackPageActor } from "@/components/feedback/page-guard";
import { can } from "@/server/policies/can";
export default async function FeedbackPage() {
  const actor = await requireFeedbackPageActor("feedback:list");
  return (
    <>
      <FeedbackListPanel
        canCreate={can(actor, "feedback:create")}
        canProcess={can(actor, "feedback:process")}
      />
      {actor.roles.some((role) =>
        [
          "TRUONG_BO_MON",
          "TRUONG_KHOA",
          "CAN_BO_DBCL",
          "PHONG_DAO_TAO",
          "PHONG_KHAO_THI",
        ].includes(role),
      ) && <TransferredInspectionList />}
    </>
  );
}
