import Link from "next/link";
import type { ReactNode } from "react";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdminPageActor } from "@/components/admin/page-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quản trị hệ thống",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPageActor();
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-teal-800">
              Quản trị · Đã xác thực hai bước
            </span>
            <LogoutButton />
          </div>
        </header>
        <div className="grid gap-7 py-8 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside>
            <p className="px-3 text-xs font-bold tracking-wider text-teal-800 uppercase">
              Quản trị hệ thống
            </p>
            <nav
              aria-label="Chức năng quản trị"
              className="mt-4 flex flex-wrap gap-2 lg:flex-col"
            >
              {[
                ["/quan-tri/nguoi-dung", "Người dùng"],
                ["/danh-muc/khoa", "Khoa và bộ môn"],
                ["/quan-tri/nhat-ky", "Nhật ký kiểm toán"],
                ["/quan-tri/chinh-sach-mfa", "Chính sách hai bước"],
                ["/quan-tri/cau-hinh-khao-sat", "Ngưỡng khảo sát"],
                [
                  "/quan-tri/cau-hinh-ket-qua",
                  "Cấu hình kết quả và kiểm duyệt",
                ],
                ["/tai-khoan", "Tài khoản của tôi"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-100 ${focusRing}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
