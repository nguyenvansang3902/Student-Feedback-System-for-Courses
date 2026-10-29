import { redirect } from "next/navigation";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export default async function CampaignsPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (!can(actor, "campaigns:list")) redirect("/tai-khoan");
  return <CampaignList canCreate={can(actor, "campaigns:write")} />;
}
