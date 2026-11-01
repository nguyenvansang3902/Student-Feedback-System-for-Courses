import type { ReactNode } from "react";
import { FeedbackShell } from "@/components/feedback/feedback-shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Hồ sơ Thanh tra",
  robots: { index: false, follow: false },
};
export default function InspectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <FeedbackShell inspection>{children}</FeedbackShell>;
}
