import { notFound, redirect } from "next/navigation";
import { TemplateEditor } from "@/components/templates/template-editor";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { AuthError } from "@/server/auth/types";
import { can } from "@/server/policies/can";
import { getTemplate } from "@/server/services/templates";
export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, "templates:read")) redirect("/tai-khoan");
  let item;
  try {
    item = await getTemplate(actor, (await params).id);
  } catch (error) {
    if (
      error instanceof AuthError &&
      (error.status === 400 || error.status === 404)
    )
      notFound();
    throw error;
  }
  return <TemplateEditor initial={item} />;
}
