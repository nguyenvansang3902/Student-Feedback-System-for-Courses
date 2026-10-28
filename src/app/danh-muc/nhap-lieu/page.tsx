import { ImportPanel } from "@/components/catalog/import-panel";
import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export default async function ImportPage() {
  if (!can(await getPageActor(), "imports:manage")) redirect("/tai-khoan");
  return <ImportPanel />;
}
