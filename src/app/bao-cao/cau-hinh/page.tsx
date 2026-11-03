import { ReportsSettingsPanel } from "@/components/reports/reports-settings";
import { requireReportsPageActor } from "@/components/reports/reports-shell";
import { can } from "@/server/policies/can";
export default async function Page() {
  const actor = await requireReportsPageActor("reports:settings:read");
  return (
    <ReportsSettingsPanel canWrite={can(actor, "reports:settings:write")} />
  );
}
