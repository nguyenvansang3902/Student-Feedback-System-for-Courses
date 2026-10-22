import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { authorizeAuthAction } from "@/server/policies/auth";
import { authDestination } from "../auth/destination";
export async function requireAdminPageActor() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!actor.roles.includes("ADMIN")) redirect("/tai-khoan");
  authorizeAuthAction(actor, "admin");
  return actor;
}
