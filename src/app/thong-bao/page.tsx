import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { authDestination } from "@/components/auth/destination";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationListPanel } from "@/components/notifications/notification-list";
import { getPageActor } from "@/server/auth/http";
import { requireCan } from "@/server/policies/can";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Thông báo | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};
export default async function NotificationsPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || actor.purpose !== "FULL")
    redirect(authDestination(actor));
  requireCan(actor, "notifications:list");
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <LogoutButton />
        </header>
        <nav
          aria-label="Điều hướng tài khoản"
          className="border-b border-slate-200 py-4"
        >
          <Link
            href="/tai-khoan"
            className={`rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
          >
            Tài khoản của tôi
          </Link>
        </nav>
        <div className="py-8">
          <NotificationListPanel />
        </div>
      </div>
    </main>
  );
}
