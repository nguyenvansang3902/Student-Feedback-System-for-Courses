import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { can, type PolicyAction } from "@/server/policies/can";
import { authDestination } from "../auth/destination";
export async function requireAnomalyPageActor(action: PolicyAction) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || actor.purpose !== "FULL")
    redirect(authDestination(actor));
  if (!can(actor, action)) redirect("/tai-khoan");
  return actor;
}
