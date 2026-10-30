import Link from "next/link";
import { Brand, focusRing } from "@/components/auth/auth-shell";

const features = [
  {
    number: "01",
    title: "Khảo sát môn học",
    description:
      "Xem và hoàn thành các khảo sát của lớp học phần trong thời hạn.",
    icon: "▤",
    href: "/khao-sat",
  },
  {
    number: "02",
    title: "Phản hồi môn học",
    description: "Gửi ý kiến và theo dõi việc xử lý phản hồi.",
    icon: "↗",
    href: null,
  },
  {
    number: "03",
    title: "Tài khoản",
    description: "Xem thông tin, đổi mật khẩu và thiết lập xác thực hai bước.",
    icon: "◎",
    href: "/tai-khoan",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 py-6">
          <Brand />
          <Link
            href="/dang-nhap"
            className={`rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 ${focusRing}`}
          >
            Đăng nhập{" "}
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </Link>
        </header>
        <section className="grid gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-24">
          <div>
            <h1 className="max-w-xl text-4xl leading-[1.15] font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Khảo sát và phản hồi về môn học
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              Đăng nhập để xem các khảo sát được giao và quản lý tài khoản.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dang-nhap"
                className={`rounded-xl bg-teal-800 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 ${focusRing}`}
              >
                Đăng nhập tài khoản{" "}
                <span className="ml-3" aria-hidden="true">
                  →
                </span>
              </Link>
              <a
                href="#tim-hieu"
                className={`rounded-lg px-2 py-3 text-sm font-semibold text-slate-700 hover:text-teal-800 ${focusRing}`}
              >
                Tìm hiểu hệ thống <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-500">
              Lần đầu sử dụng?{" "}
              <Link
                href="/kich-hoat"
                className={`rounded font-semibold text-teal-800 underline underline-offset-4 ${focusRing}`}
              >
                Kích hoạt tài khoản
              </Link>
            </p>
          </div>
          <div className="relative rounded-[2rem] bg-teal-900 p-7 text-white sm:p-10">
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 h-40 w-40 rounded-bl-[8rem] rounded-tr-[2rem] bg-teal-800/60"
            />
            <div className="relative">
              <h2 className="text-2xl font-semibold">Làm khảo sát</h2>
              <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm leading-7 text-teal-50">
                <li>Đăng nhập bằng tài khoản được cấp.</li>
                <li>Mở Khảo sát của tôi để xem danh sách khảo sát.</li>
                <li>Chọn khảo sát đang mở và hoàn thành trước hạn.</li>
              </ol>
            </div>
          </div>
        </section>
        <section
          id="tim-hieu"
          aria-labelledby="features-title"
          className="border-t border-slate-200 py-12 sm:py-16"
        >
          <h2
            id="features-title"
            className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            Chức năng hệ thống
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-xl bg-teal-50 text-2xl text-teal-800"
                  >
                    {feature.icon}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {feature.number}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
                {feature.href ? (
                  <Link
                    href={feature.href}
                    className={`mt-5 inline-flex rounded text-sm font-semibold text-teal-800 hover:underline ${focusRing}`}
                  >
                    Truy cập{" "}
                    <span className="ml-2" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ) : (
                  <p className="mt-5 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Chưa mở
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 py-7 text-xs leading-6 text-slate-500">
          <p>Hệ thống khảo sát và phản hồi về môn học</p>
        </footer>
      </div>
    </main>
  );
}
