import type { ReactNode } from "react";
import { WorkflowShell } from "@/components/workflows/workflow-shell";
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: ReactNode }) {
  return <WorkflowShell action="improvements:list">{children}</WorkflowShell>;
}
