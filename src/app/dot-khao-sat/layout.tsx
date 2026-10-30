import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { authDestination } from "@/components/auth/destination";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Đợt khảo sát môn học",
  robots: { index: false, follow: false },
};
export default async function CampaignsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, "campaigns:read")) redirect("/tai-khoan");
  const links = [
    ["/dot-khao-sat", "Đợt khảo sát"],
    ...(can(actor, "results:read") || can(actor, "results:assessment")
      ? [["/ket-qua", "Kết quả khảo sát"]] : []),
    ...(can(actor, "templates:list") ? [["/mau-phieu", "Mẫu phiếu"]] : []),
    ...(can(actor, "catalog:list") ? [["/danh-muc", "Danh mục đào tạo"]] : []),
    ["/tai-khoan", "Tài khoản của tôi"],
  ];
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-teal-800">
              Khảo sát môn học
            </span>
            <LogoutButton />
          </div>
        </header>
        <nav
          aria-label="Chức năng đợt khảo sát"
          className="flex flex-wrap gap-2 border-b border-slate-200 py-4"
        >
          {links.map(([href, label]) => (
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
