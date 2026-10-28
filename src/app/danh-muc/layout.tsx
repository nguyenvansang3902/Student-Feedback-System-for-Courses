import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { authDestination } from "@/components/auth/destination";
import { catalogLabels, catalogPaths } from "@/components/catalog/types";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Danh mục và nhập dữ liệu",
  robots: { index: false, follow: false },
};
export default async function CatalogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, "catalog:list")) redirect("/tai-khoan");
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-teal-800">
              Danh mục theo quyền được cấp
            </span>
            <LogoutButton />
          </div>
        </header>
        <div className="grid gap-7 py-8 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside>
            <p className="px-3 text-xs font-bold tracking-wider text-teal-800 uppercase">
              Dữ liệu đào tạo
            </p>
            <nav
              aria-label="Chức năng danh mục"
              className="mt-4 flex flex-wrap gap-2 lg:flex-col"
            >
              {Object.entries(catalogPaths)
                .filter(([entity]) =>
                  can(actor, "catalog:list", {
                    catalogEntity: entity as keyof typeof catalogPaths,
                  }),
                )
                .map(([entity, path]) => (
                  <Link
                    key={entity}
                    href={`/danh-muc/${path}`}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
                  >
                    {catalogLabels[entity as keyof typeof catalogLabels]}
                  </Link>
                ))}
              {can(actor, "imports:manage") && (
                <Link
                  href="/danh-muc/nhap-lieu"
                  className={`rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
                >
                  Nhập từ Excel / CSV
                </Link>
              )}
              <Link
                href="/tai-khoan"
                className={`rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
              >
                Tài khoản của tôi
              </Link>
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
