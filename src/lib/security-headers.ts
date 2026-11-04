/** Chính sách dùng chung; môi trường phát triển chỉ nới phần cần cho webpack/HMR. */
export function securityHeaders(production: boolean): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    ...(production ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
  };
}

/** Nonce phải do proxy tạo; không chèn nonce/nguồn do client cung cấp vào CSP. */
export function documentContentSecurityPolicy(
  nonce: string,
  production: boolean,
): string {
  if (!/^[A-Za-z0-9+/]{32}$/.test(nonce))
    throw new Error("Nonce chính sách nội dung không hợp lệ.");
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    // Thanh tiến trình/biểu đồ hiện có dùng thuộc tính style, không phải script.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${production ? "" : " ws: wss:"}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}
