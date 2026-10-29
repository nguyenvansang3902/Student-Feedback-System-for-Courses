import { redirect } from "next/navigation";
import { NewCampaign } from "@/components/campaigns/campaign-detail";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export default async function NewCampaignPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (!can(actor, "campaigns:write")) redirect("/dot-khao-sat");
  return <NewCampaign />;
}
