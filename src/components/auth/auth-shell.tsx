import Link from "next/link";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="Khảo sát và phản hồi — Trang chủ"
      className={`flex min-w-0 items-center gap-3 rounded-lg ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-800 text-sm font-bold text-white"
      >
        KS
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight text-slate-900">
          Khảo sát &amp; phản hồi
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Cùng cải tiến từng môn học
        </span>
      </span>
    </Link>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <Link
            href="/"
            className={`rounded text-sm font-medium text-slate-600 hover:text-teal-800 ${focusRing}`}
          >
            ← Trang chủ
          </Link>
        </header>
        <div className="mx-auto grid max-w-5xl gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20 lg:py-20">
          <aside className="lg:pt-10">
            <p className="text-xs font-bold tracking-[0.15em] text-teal-800 uppercase">
              Cổng tài khoản
            </p>
            <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-md text-base leading-8 text-slate-600">
              {description}
            </p>
            <div className="mt-8 hidden rounded-2xl border border-teal-100 bg-teal-50/70 p-5 lg:block">
              <p className="text-sm font-semibold text-teal-900">
                Tiếng nói của bạn tạo nên thay đổi.
              </p>
              <p className="mt-2 text-sm leading-7 text-teal-900/75">
                Sử dụng tài khoản do nhà trường hoặc người quản lý cấp. Nếu chưa
                có tài khoản, hãy liên hệ đơn vị phụ trách.
              </p>
            </div>
          </aside>
          <section
            aria-label={title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-35px_rgba(15,118,110,0.35)] sm:p-8"
          >
            {children}
          </section>
        </div>
        <footer className="border-t border-slate-200 py-6 text-center text-xs leading-6 text-slate-500">
          Khảo sát &amp; phản hồi môn học · Tôn trọng mọi đóng góp xây dựng
        </footer>
      </div>
    </main>
  );
}
