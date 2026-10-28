import { notFound, redirect } from "next/navigation";
import { CatalogPanel } from "@/components/catalog/catalog-panel";
import { catalogPaths, type CatalogEntity } from "@/components/catalog/types";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export default async function CatalogPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const entry = Object.entries(catalogPaths).find(
    ([, path]) => path === entity,
  );
  if (!entry) notFound();
  const actor = await getPageActor();
  const kind = entry[0] as CatalogEntity;
  if (!can(actor, "catalog:read", { catalogEntity: kind }))
    redirect("/tai-khoan");
  return (
    <CatalogPanel
      entity={kind}
      key={kind}
      writable={can(actor, "catalog:write", { catalogEntity: kind })}
    />
  );
}
