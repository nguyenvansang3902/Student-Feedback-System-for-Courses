import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export default async function CatalogIndex() {
  const actor = await getPageActor();
  redirect(
    can(actor, "catalog:list", { catalogEntity: "semesters" })
      ? "/danh-muc/hoc-ky"
      : "/danh-muc/khoa",
  );
}
