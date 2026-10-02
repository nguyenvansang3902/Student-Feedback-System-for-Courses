import Link from "next/link";

const foundations = [
  {
    number: "01",
    title: "Quy trình rõ ràng",
    description:
      "Đặc tả theo vai trò, trạng thái và quy tắc nghiệp vụ trước khi xây chức năng.",
  },
  {
    number: "02",
    title: "Ẩn danh có kiểm soát",
    description:
      "Thiết kế tách nhiệm vụ đã hoàn thành khỏi nội dung phiếu trả lời trong các tuần sau.",
  },
  {
    number: "03",
    title: "Tiến độ kiểm chứng được",
    description:
      "Mỗi tuần có phạm vi, bước nghiệm thu, kiểm tra tự động và báo cáo trung thực.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white"
            >
              KS
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">
                Khảo sát &amp; phản hồi
              </p>
              <p className="text-xs text-slate-500">
                Tiểu luận chuyên ngành · HK1 2026–2027
              </p>
            </div>
          </div>
          <Link
            href="/suc-khoe"
            className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Kiểm tra hệ thống <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.6fr)] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-2 text-sm font-semibold text-teal-900">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-teal-600"
              />
              Tuần 1 · Khởi động dự án
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight text-slate-950 sm:text-5xl">
              Lắng nghe sinh viên, theo dõi cải tiến môn học.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Website hướng tới một quy trình khảo sát và xử lý phản hồi minh
              bạch cho nhà trường. Đây là khung kỹ thuật ban đầu; các chức năng
              nghiệp vụ sẽ được xây theo kế hoạch 15 tuần.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/suc-khoe"
                className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Xem trạng thái kỹ thuật
              </Link>
              <a
                href="#nen-tang"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
              >
                Tìm hiểu định hướng
              </a>
            </div>
          </div>
          <aside className="rounded-3xl border border-teal-100 bg-white p-7 shadow-[0_24px_60px_-36px_rgba(15,118,110,0.45)]">
            <p className="text-xs font-bold tracking-[0.18em] text-teal-700 uppercase">
              Phạm vi hiện tại
            </p>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Nền tảng tuần 1
            </h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-700">
                  ✓
                </span>
                Khung Next.js, TypeScript, Tailwind và Prisma
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-700">
                  ✓
                </span>
                Trang kiểm tra ứng dụng đang phản hồi
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-700">
                  ✓
                </span>
                Kiểm tra mã nguồn bằng lint, typecheck và test
              </li>
            </ul>
            <p className="mt-7 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
              Chưa có đăng nhập, dữ liệu sinh viên hoặc bảng nghiệp vụ ở tuần
              này.
            </p>
          </aside>
        </section>

        <section
          id="nen-tang"
          aria-labelledby="nen-tang-title"
          className="border-t border-slate-200 py-12"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-teal-700">
                Định hướng sản phẩm
              </p>
              <h2
                id="nen-tang-title"
                className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Ba nguyên tắc từ đầu
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500">
              Các nguyên tắc này được đặc tả trước, rồi hiện thực và kiểm thử
              đúng tuần đã lên kế hoạch.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {foundations.map((item) => (
              <article
                key={item.number}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <p className="text-sm font-bold text-teal-700">{item.number}</p>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 py-7 text-sm text-slate-500">
          Theo kế hoạch: 30/09/2026 · Khởi động thực tế: 02/10/2026
        </footer>
      </div>
    </main>
  );
}
