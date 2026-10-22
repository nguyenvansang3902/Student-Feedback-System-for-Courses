import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";

export function getMfaKeyVersion(): string {
  const version = process.env.MFA_KEY_VERSION ?? "v1";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(version))
    throw new Error("Phiên bản khóa MFA không hợp lệ.");
  return version;
}

function key(version: string): Buffer {
  const value = process.env.MFA_ENCRYPTION_KEY;
  if (
    !value ||
    !/^[a-fA-F0-9]{64}$/.test(value) ||
    version !== getMfaKeyVersion()
  ) {
    throw new Error("Không thể sử dụng khóa mã hóa MFA.");
  }
  return Buffer.from(value, "hex");
}

/** GCM xác thực cả userId và phiên bản; không thể chép ciphertext sang tài khoản khác. */
export function encryptMfaSecret(
  secret: string,
  userId: string,
  version = getMfaKeyVersion(),
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(version), iv);
  cipher.setAAD(Buffer.from(`${version}:${userId}`));
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((value) => value.toString("base64url"))
    .join(".");
}

export function decryptMfaSecret(
  encrypted: string,
  userId: string,
  version: string,
): string {
  const parts = encrypted.split(".");
  if (
    parts.length !== 3 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  )
    throw new Error("Dữ liệu MFA không hợp lệ.");
  const [iv, tag, ciphertext] = parts.map((part) =>
    Buffer.from(part, "base64url"),
  );
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Dữ liệu MFA không hợp lệ.");
  const decipher = createDecipheriv("aes-256-gcm", key(version), iv);
  decipher.setAAD(Buffer.from(`${version}:${userId}`));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function newMfaSecret(): string {
  return generateSecret({ length: 20 });
}
export function mfaUri(secret: string, loginCode: string): string {
  return generateURI({
    secret,
    issuer: "Student Feedback System",
    label: loginCode,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
}

/** RFC 6238: giới hạn chính xác ±1 bước, không phụ thuộc làm tròn cửa sổ thư viện. */
export async function matchTotpStep(
  secret: string,
  code: string,
  lastUsedStep: bigint | null,
  epoch = Math.floor(Date.now() / 1000),
): Promise<bigint | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const currentStep = Math.floor(epoch / 30);
  const result = await verify({
    secret,
    token: code,
    algorithm: "sha1",
    digits: 6,
    period: 30,
    epoch,
    epochTolerance: 30,
  });
  if (
    !result.valid ||
    !("timeStep" in result) ||
    Math.abs(result.timeStep - currentStep) > 1
  )
    return null;
  const step = BigInt(result.timeStep);
  return lastUsedStep !== null && step <= lastUsedStep ? null : step;
}

export function newRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () =>
    randomBytes(16).toString("hex").toUpperCase().match(/.{8}/g)!.join("-"),
  );
}
export function normalizeRecoveryCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return /^[0-9A-F]{8}(?:-[0-9A-F]{8}){3}$/.test(normalized)
    ? normalized
    : null;
}
export function hashRecoveryCode(userId: string, code: string): string {
  return createHash("sha256")
    .update(`mfa-recovery\0${userId}\0${code}`)
    .digest("hex");
}
