import Link from "next/link";
import { getHealthReport } from "../../lib/health";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  const report = getHealthReport();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
      <Link
        href="/"
        className="w-fit text-sm font-semibold text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        ← Trở về trang chủ
      </Link>

      <section className="my-auto py-14">
        <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
          Kiểm tra sức khỏe · Tuần 1
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Ứng dụng đang phản hồi.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Trang này xác nhận máy chủ web trả lời được yêu cầu. Kiểm tra này chưa
          xác nhận kết nối cơ sở dữ liệu.
        </p>

        <dl className="mt-9 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-5">
            <dt className="font-medium text-slate-700">Ứng dụng</dt>
            <dd className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              {report.application === "available"
                ? "Đang hoạt động"
                : "Chưa sẵn sàng"}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5">
            <dt className="font-medium text-slate-700">Cơ sở dữ liệu</dt>
            <dd className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {report.database === "not_checked"
                ? "Chưa kiểm tra"
                : "Đã kiểm tra"}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          Dành cho kiểm tra tự động:{" "}
          <a
            className="font-semibold text-teal-700 underline"
            href="/api/health"
          >
            /api/health
          </a>{" "}
          trả về JSON và mã HTTP 200 khi ứng dụng phản hồi.
        </p>
      </section>

      <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
        Theo kế hoạch: 30/09/2026 · Khởi động thực tế: 02/10/2026
      </footer>
    </main>
  );
}
