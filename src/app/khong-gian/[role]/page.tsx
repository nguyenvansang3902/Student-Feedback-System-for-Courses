import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { authDestination, roleLabels } from "@/components/auth/destination";
import { WorkspaceSections } from "@/components/admin/workspace-sections";
import { getPageActor } from "@/server/auth/http";
import { authorizeAuthAction } from "@/server/policies/auth";
import { can } from "@/server/policies/can";
import type { Role } from "@/generated/prisma/enums";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Không gian theo vai trò",
  robots: { index: false, follow: false },
};
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  const { role } = await params;
  if (!Object.hasOwn(roleLabels, role)) notFound();
  if (!can(actor, "workspace:view", { role: role as Role }))
    redirect("/tai-khoan");
  if (role === "ADMIN") redirect("/quan-tri");
  authorizeAuthAction(actor, "workspace");
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <LogoutButton />
        </header>
        <div className="py-10">
          <Link
            href="/tai-khoan"
            className={`rounded text-sm font-semibold text-teal-800 ${focusRing}`}
          >
            ← Tài khoản của tôi
          </Link>
          <p className="mt-7 text-xs font-bold tracking-wider text-teal-800 uppercase">
            Không gian của bạn
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {roleLabels[role]}
          </h1>
          {role === "CAN_BO_DBCL" && can(actor, "catalog:list") && (
            <Link
              href="/danh-muc"
              className={`mt-6 inline-flex rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
            >
              Quản lý danh mục và nhập dữ liệu →
            </Link>
          )}
          <WorkspaceSections />
        </div>
      </div>
    </main>
  );
}
