import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Chỉ đọc các trang công khai trên loopback; không đăng nhập hoặc tăng bộ đếm sai.
const args = process.argv.slice(2);
const argument = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const production = args.includes("--production");
const base = new URL(argument("--base-url", "http://127.0.0.1:3007"));
assert(
  ["http:", "https:"].includes(base.protocol) &&
    /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/.test(base.hostname) &&
    !base.username &&
    !base.password &&
    base.pathname === "/" &&
    !base.search &&
    !base.hash,
  "Chỉ kiểm HTTP tại origin loopback cục bộ, không dùng tài khoản/dữ liệu thật.",
);
const proof = {
  checkedAt: new Date().toISOString(),
  origin: base.origin,
  expectedEnvironment: production ? "production" : "development",
  method:
    "Read-only HTTP; HTML script nonce checked from server response bytes, not browser execution.",
  checks: [],
};
const previous = new Set();
for (const path of [
  "/",
  "/dang-nhap",
  "/kich-hoat",
  "/duong-dan-khong-ton-tai-tuan13",
  "/api/health",
  "/api/auth/me",
  "/api/reports",
]) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
    headers: {
      "x-nonce": "nonce-do-client-chon",
      "Content-Security-Policy": "script-src * 'unsafe-inline'",
    },
  });
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
  assert.equal(response.headers.get("x-frame-options"), "DENY", path);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer", path);
  assert.match(
    response.headers.get("permissions-policy") ?? "",
    /camera=\(\)/,
    path,
  );
  const hsts = response.headers.get("strict-transport-security");
  assert.equal(hsts, production ? "max-age=31536000" : null, path);
  const document = !path.startsWith("/api/");
  const csp = response.headers.get("content-security-policy");
  let scriptCount = 0;
  if (document) {
    assert(csp, `${path}: thiếu CSP`);
    const nonce = csp.match(/'nonce-([A-Za-z0-9+/]{32})'/)?.[1];
    assert(
      nonce && !previous.has(nonce),
      `${path}: nonce phải ngẫu nhiên theo request`,
    );
    previous.add(nonce);
    assert(!csp.includes("nonce-do-client-chon"), path);
    assert(
      csp.includes("frame-ancestors 'none'") &&
        csp.includes("object-src 'none'"),
      path,
    );
    const scripts = csp
      .split("; ")
      .find((item) => item.startsWith("script-src"));
    assert(scripts && !scripts.includes("'unsafe-inline'"), path);
    assert.equal(scripts.includes("'unsafe-eval'"), !production, path);
    assert.equal(csp.includes("upgrade-insecure-requests"), production, path);
    const html = await response.text();
    const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(
      (match) => match[0],
    );
    assert(tags.length > 0, `${path}: không có script để đối chiếu SSR`);
    assert(
      tags.every((tag) => tag.includes(`nonce="${nonce}"`)),
      `${path}: script SSR không khớp nonce`,
    );
    scriptCount = tags.length;
  } else {
    assert.equal(csp, null, `${path}: API giữ CSP riêng của route, nếu có`);
    await response.body?.cancel();
  }
  proof.checks.push({
    path,
    status: response.status,
    document,
    scriptCount,
    matchingNonce: document ? true : null,
    csp:
      csp?.replace(/'nonce-[^']+'/g, "'nonce-[per-request]' ").trim() ?? null,
    hsts,
    securityHeaders: "passed",
  });
}
const output = resolve(
  argument(
    "--output",
    `.local/week13-security-http-${production ? "production" : "development"}.json`,
  ),
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(proof, null, 2) + "\n");
console.log(
  `Header HTTP và nonce SSR: ${proof.checks.length}/${proof.checks.length} đường dẫn qua; bằng chứng ${output}.`,
);
