import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "touchline_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_UPLOAD_PASSWORD && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32);
}

export function checkAdminPassword(candidate: string, expected: string): boolean {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash) && candidate.length === expected.length;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ADMIN_SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload, process.env.ADMIN_SESSION_SECRET!)}`;
}

export function hasAdminSession(request: Request): boolean {
  if (!adminAuthConfigured()) return false;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expectedSignature = sign(payload, process.env.ADMIN_SESSION_SECRET!);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
