import { notFound } from "next/navigation";
import { CatalogPanel } from "@/components/catalog/catalog-panel";
import { catalogPaths, type CatalogEntity } from "@/components/catalog/types";
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
  return <CatalogPanel entity={entry[0] as CatalogEntity} key={entry[0]} />;
}
