import Link from "next/link";
import type { ReactNode } from "react";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireStudentSurveyPageActor } from "@/components/student-surveys/page-guard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Khảo sát của tôi",
  robots: { index: false, follow: false },
};
export default async function StudentSurveysLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireStudentSurveyPageActor();
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-6xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <LogoutButton />
        </header>
        <nav
          aria-label="Chức năng khảo sát sinh viên"
          className="flex flex-wrap gap-2 border-b border-slate-200 py-4"
        >
          {[
            ["/khao-sat", "Khảo sát của tôi"],
            ["/tai-khoan", "Tài khoản của tôi"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 py-8">{children}</div>
      </div>
    </main>
  );
}
