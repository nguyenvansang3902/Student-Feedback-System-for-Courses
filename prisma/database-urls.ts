/** Shadow phải là database riêng: Prisma có thể xóa bảng trong shadow khi kiểm tra. */
export function assertSeparateShadowDatabase(main: string, shadow?: string) {
  if (!shadow) return;
  const primary = new URL(main);
  const temporary = new URL(shadow);
  const database = (url: URL) => decodeURIComponent(url.pathname).toLowerCase();
  // So sánh cả tên DB để chặn alias localhost/127.0.0.1 và hai tài khoản khác nhau.
  if (database(primary) === database(temporary)) {
    throw new Error("SHADOW_DATABASE_URL phải trỏ tới database riêng, khác database phát triển.");
  }
}
