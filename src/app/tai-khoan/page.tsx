import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand, focusRing } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { getPageActor } from "@/server/auth/http";
import { authDestination } from "@/components/auth/destination";
import { authorizeAuthAction } from "@/server/policies/auth";
import { can } from "@/server/policies/can";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tài khoản của tôi | Khảo sát & phản hồi",
  robots: { index: false, follow: false },
};

const roleLabels: Record<string, string> = {
  SINH_VIEN: "Sinh viên",
  GIANG_VIEN: "Giảng viên",
  TRUONG_BO_MON: "Trưởng bộ môn",
  TRUONG_KHOA: "Trưởng khoa",
  CAN_BO_DBCL: "Cán bộ đảm bảo chất lượng",
  LANH_DAO: "Lãnh đạo",
  ADMIN: "Quản trị viên",
  PHONG_DAO_TAO: "Phòng Đào tạo",
  PHONG_KHAO_THI: "Phòng Khảo thí",
  THANH_TRA: "Phòng Thanh tra",
};

function workspace(roles: readonly string[]) {
  if (roles.includes("ADMIN"))
    return { title: "Không gian quản trị", sections: [] };
  if (roles.includes("PHONG_DAO_TAO"))
    return { title: "Không gian Phòng Đào tạo", sections: [] };
  if (roles.includes("PHONG_KHAO_THI"))
    return {
      title: "Không gian Phòng Khảo thí",
      sections: ["Xử lý phản ánh khảo thí được chuyển đến"],
    };
  if (roles.includes("THANH_TRA"))
    return {
      title: "Không gian Thanh tra",
      sections: ["Hồ sơ thanh tra được giao"],
    };
  if (roles.includes("CAN_BO_DBCL"))
    return {
      title: "Không gian đảm bảo chất lượng",
      sections: ["Theo dõi cải tiến"],
    };
  if (roles.includes("LANH_DAO"))
    return {
      title: "Không gian lãnh đạo",
      sections: ["Theo dõi cải tiến"],
    };
  if (roles.includes("TRUONG_KHOA") || roles.includes("TRUONG_BO_MON"))
    return {
      title: "Không gian quản lý đơn vị",
      sections: ["Phản hồi môn học", "Kế hoạch cải tiến"],
    };
  if (roles.includes("GIANG_VIEN"))
    return {
      title: "Không gian giảng viên",
      sections: [
        "Lớp học phần phụ trách",
        "Phản hồi môn học",
      ],
    };
  return {
    title: "Không gian sinh viên",
    sections: ["Phản hồi của tôi", "Kết quả đã công bố"],
  };
}

export default async function AccountPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/dang-nhap");
  if (actor.mustChangePassword || (actor.purpose && actor.purpose !== "FULL"))
    redirect(authDestination(actor));
  authorizeAuthAction(actor, "workspace");
  const view = workspace(actor.roles);
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-6">
          <Brand />
          <LogoutButton />
        </header>
        <div className="grid gap-8 py-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-12">
          <aside>
            <p className="text-xs font-bold tracking-[0.12em] text-teal-800 uppercase">
              {view.title}
            </p>
            <nav aria-label="Không gian tài khoản" className="mt-5">
              <a
                href="#tai-khoan"
                aria-current="page"
                className={`flex items-center gap-3 rounded-xl bg-teal-100/70 px-4 py-3 text-sm font-semibold text-teal-900 ${focusRing}`}
              >
                <span aria-hidden="true">◎</span> Tài khoản của tôi
              </a>
            </nav>
            <div className="mt-6 hidden border-t border-slate-200 pt-5 lg:block">
              <p className="px-4 text-xs font-medium text-slate-500">
                Các khu vực sắp mở
              </p>
              <ul className="mt-2 space-y-2">
                {view.sections.map((name) => (
                  <li
                    key={name}
                    className="px-4 py-2 text-sm leading-6 text-slate-400"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div id="tai-khoan">
            <div className="mb-7">
              <p className="text-sm text-slate-500">Tài khoản của tôi</p>
              <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-slate-950 sm:text-4xl">
                Xin chào, {actor.displayName}.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Bạn đã đăng nhập. Thông tin và bảo mật tài khoản của bạn ở bên
                dưới.
              </p>
            </div>
            <section
              aria-labelledby="account-title"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-100 px-6 py-5">
                <h2
                  id="account-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Thông tin tài khoản
                </h2>
              </div>
              <dl className="grid gap-6 p-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Họ và tên
                  </dt>
                  <dd className="mt-2 break-words text-sm font-semibold text-slate-900">
                    {actor.displayName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Mã định danh
                  </dt>
                  <dd className="mt-2 break-words text-sm font-semibold text-slate-900">
                    {actor.loginCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Email</dt>
                  <dd className="mt-2 break-all text-sm font-semibold text-slate-900">
                    {actor.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Vai trò được cấp
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {actor.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900"
                      >
                        {roleLabels[role] ?? "Vai trò chưa xác định"}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Bảo mật tài khoản
                  </h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Không chia sẻ mật khẩu cho người khác.
                  </p>
                </div>
                <Link
                  href="/doi-mat-khau"
                  className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
                >
                  Đổi mật khẩu <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </section>
            <section aria-labelledby="spaces-title" className="mt-8">
              <h2
                id="spaces-title"
                className="text-lg font-bold text-slate-900"
              >
                Chức năng của tài khoản
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {can(actor, "student-surveys:list") && (
                  <Link
                    href="/khao-sat"
                    className={`rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
                  >
                    Khảo sát của tôi <span aria-hidden="true">↗</span>
                  </Link>
                )}
                {can(actor, "campaigns:list") && (
                  <Link
                    href="/dot-khao-sat"
                    className={`rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
                  >
                    Đợt khảo sát môn học <span aria-hidden="true">↗</span>
                  </Link>
                )}
                {can(actor, "templates:list") && (
                  <Link
                    href="/mau-phieu"
                    className={`rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
                  >
                    Mẫu phiếu khảo sát <span aria-hidden="true">↗</span>
                  </Link>
                )}
                {(can(actor, "results:read") || can(actor, "results:assessment") || can(actor, "results:incomplete")) && (
                  <Link href="/ket-qua" className={`rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}>
                    Kết quả khảo sát <span aria-hidden="true">↗</span>
                  </Link>
                )}
                {can(actor, "catalog:list") && (
                  <Link
                    href="/danh-muc"
                    className={`rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 ${focusRing}`}
                  >
                    Danh mục
                    {can(actor, "imports:manage")
                      ? " và nhập dữ liệu"
                      : " theo quyền được cấp"}{" "}
                    <span aria-hidden="true">↗</span>
                  </Link>
                )}
                {actor.roles.map((role) => (
                  <Link
                    key={role}
                    href={
                      role === "ADMIN" ? "/quan-tri" : `/khong-gian/${role}`
                    }
                    className={`rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focusRing}`}
                  >
                    {roleLabels[role] ?? role} <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
              {view.sections.length > 0 && (
                <>
                  <h2
                    id="upcoming-title"
                    className="mt-8 text-lg font-bold text-slate-900"
                  >
                    Chức năng chưa mở
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Các chức năng dưới đây chưa mở. Bạn có thể quay lại khi hệ
                    thống cập nhật.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {view.sections.map((name, index) => (
                      <article
                        key={name}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <p
                          aria-hidden="true"
                          className="text-xs font-bold text-teal-700"
                        >
                          0{index + 1}
                        </p>
                        <h3 className="mt-4 text-sm leading-6 font-semibold text-slate-800">
                          {name}
                        </h3>
                        <p className="mt-4 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                          Chưa mở
                        </p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
        <footer className="border-t border-slate-200 py-6 text-xs text-slate-500">
          Hệ thống khảo sát và phản hồi về môn học
        </footer>
      </div>
    </main>
  );
}
