import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
import { authDestination } from "../auth/destination";

export async function requireStudentSurveyPageActor() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, "student-surveys:read")) redirect("/tai-khoan");
  return actor;
}
