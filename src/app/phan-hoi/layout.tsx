import type { ReactNode } from "react";
import { FeedbackShell } from "@/components/feedback/feedback-shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Phản hồi môn học",
  robots: { index: false, follow: false },
};
export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return <FeedbackShell>{children}</FeedbackShell>;
}
