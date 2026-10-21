import Link from "next/link";
import { Brand, focusRing } from "@/components/auth/auth-shell";

const features = [
  {
    number: "01",
    title: "Khảo sát môn học",
    description:
      "Chia sẻ trải nghiệm học tập qua phiếu khảo sát của từng lớp học phần.",
    icon: "▤",
  },
  {
    number: "02",
    title: "Gửi và theo dõi phản hồi",
    description:
      "Đóng góp ý kiến về môn học và theo dõi quá trình tiếp nhận, xử lý.",
    icon: "↗",
  },
  {
    number: "03",
    title: "Cùng cải tiến chất lượng",
    description: "Kết nối tiếng nói sinh viên với giảng viên và nhà trường.",
    icon: "◎",
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
            <p className="mb-6 flex items-center gap-2 text-xs font-bold tracking-[0.15em] text-teal-800 uppercase">
              <span className="h-px w-8 bg-teal-700" aria-hidden="true" />
              Cổng khảo sát &amp; phản hồi môn học
            </p>
            <h1 className="max-w-xl text-4xl leading-[1.15] font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Lắng nghe sinh viên.
              <br />
              <span className="text-teal-800">Cùng cải tiến</span>
              <br className="hidden sm:block" /> từng môn học.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              Mỗi trải nghiệm học tập đều đáng được lắng nghe. Đăng nhập bằng
              tài khoản được cấp để kết nối với hệ thống khảo sát và phản hồi
              của bạn.
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
              <p className="text-xs font-bold tracking-[0.18em] text-teal-200 uppercase">
                Tiếng nói của bạn
              </p>
              <div
                aria-hidden="true"
                className="mt-8 text-6xl leading-none text-teal-300"
              >
                “
              </div>
              <p className="mt-1 max-w-sm text-2xl leading-relaxed font-medium sm:text-3xl">
                Một góp ý hôm nay.
                <br />
                Một trải nghiệm học tập tốt hơn ngày mai.
              </p>
              <div className="mt-10 flex items-center gap-3 border-t border-teal-700 pt-6">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-800 text-lg text-teal-200"
                >
                  ✓
                </span>
                <p className="text-sm leading-6 text-teal-100">
                  Tập trung vào trải nghiệm học tập
                  <br />
                  <span className="text-teal-300">
                    Tôn trọng những đóng góp xây dựng
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="tim-hieu"
          aria-labelledby="features-title"
          className="border-t border-slate-200 py-12 sm:py-16"
        >
          <p className="text-xs font-bold tracking-[0.14em] text-teal-800 uppercase">
            Hệ thống dành cho bạn
          </p>
          <h2
            id="features-title"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            Từ góp ý đến thay đổi tích cực
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Bạn đã có thể đăng nhập và quản lý mật khẩu. Các khu vực khảo sát,
            phản hồi và kết quả sẽ được mở khi sẵn sàng.
          </p>
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
                <p className="mt-5 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Chưa mở
                </p>
              </article>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 py-7 text-xs leading-6 text-slate-500">
          <p>Khảo sát &amp; phản hồi môn học</p>
          <p>Tiếng nói sinh viên · Chất lượng học tập</p>
        </footer>
      </div>
    </main>
  );
}
