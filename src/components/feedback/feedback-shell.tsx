import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { Brand, focusRing } from "../auth/auth-shell";
import { LogoutButton } from "../auth/logout-button";
import { authDestination } from "../auth/destination";
import { getPageActor } from "@/server/auth/http";
import { can } from "@/server/policies/can";

export async function FeedbackShell({
  children,
  inspection = false,
}: {
  children: ReactNode;
  inspection?: boolean;
}) {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  if (!can(actor, inspection ? "inspection:list" : "feedback:list"))
    redirect("/tai-khoan");
  const links = [
    ...(can(actor, "feedback:list")
      ? [
          [
            "/phan-hoi",
            actor.roles.includes("SINH_VIEN")
              ? "Phản hồi của tôi"
              : "Hàng đợi phản hồi",
          ],
        ]
      : []),
    ...(can(actor, "feedback:create")
      ? [["/phan-hoi/gui", "Gửi phản hồi"]]
      : []),
    ...(can(actor, "inspection:list")
      ? [["/thanh-tra", "Hồ sơ Thanh tra"]]
      : []),
    ...(can(actor, "feedback-settings:read")
      ? [["/phan-hoi/cau-hinh", "Cấu hình phản hồi"]]
      : []),
    ...(can(actor, "improvements:list")
      ? [["/giai-trinh", "Giải trình cải tiến"]]
      : []),
    ...(can(actor, "exam-recommendations:list")
      ? [["/kien-nghi", "Kiến nghị rà soát"]]
      : []),
    ["/thong-bao", "Thông báo"],
    ["/tai-khoan", "Tài khoản của tôi"],
  ];
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <LogoutButton />
        </header>
        <nav
          aria-label="Chức năng phản hồi môn học"
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
