import type { ReactNode } from "react";
import { ReportsShell } from "@/components/reports/reports-shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Báo cáo khảo sát và phản hồi",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <ReportsShell>{children}</ReportsShell>;
}
