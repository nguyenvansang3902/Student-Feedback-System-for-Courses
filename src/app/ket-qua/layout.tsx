import type { ReactNode } from "react";
import { ResultsShell } from "@/components/survey-results/results-shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kết quả khảo sát",
  robots: { index: false, follow: false },
};
export default function ResultsLayout({ children }: { children: ReactNode }) {
  return <ResultsShell>{children}</ResultsShell>;
}
