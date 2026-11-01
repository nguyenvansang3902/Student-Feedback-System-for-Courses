import { redirect } from "next/navigation";
import { authDestination } from "../auth/destination";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";

export async function requireFeedbackPageActor(
  action:
    | "feedback:list"
    | "feedback:create"
    | "feedback:read"
    | "inspection:list"
    | "inspection:read"
    | "feedback-settings:read",
) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, action)) redirect("/tai-khoan");
  return actor;
}
