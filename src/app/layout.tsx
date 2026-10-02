import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khảo sát và phản hồi môn học",
  description: "Dự án quản lý khảo sát và phản hồi của sinh viên về môn học.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
