import { notFound, redirect } from "next/navigation";
import { CampaignDetail } from "@/components/campaigns/campaign-detail";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { AuthError } from "@/server/auth/types";
import { can } from "@/server/policies/can";
import { getCampaign } from "@/server/services/campaigns";
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, "campaigns:read")) redirect("/tai-khoan");
  let item;
  try {
    item = await getCampaign(actor, (await params).id);
  } catch (error) {
    if (error instanceof AuthError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
  return (
    <CampaignDetail
      initial={item}
      access={{
        write: can(actor, "campaigns:write"),
        submit: can(actor, "campaigns:submit"),
        confirm: can(actor, "campaigns:confirm"),
        approve: can(actor, "campaigns:approve"),
        operate: can(actor, "campaigns:operate"),
        progress: can(actor, "campaigns:progress"),
      }}
    />
  );
}
