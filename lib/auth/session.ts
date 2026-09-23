/* ============================================
   DOMINGO ADMIN AUTH — NEW, independent auth
   Only the /admin area is protected. Public API
   reads (/api/domingo) stay open. No old auth
   state, no localStorage, no old credentials.
   ============================================ */

import crypto from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "domingo_admin_session";

const ADMIN_EMAIL = process.env.DOMINGO_ADMIN_EMAIL || "admin@domingo.in";
const ADMIN_PASSWORD = process.env.DOMINGO_ADMIN_PASSWORD || "domingo123";
const AUTH_SECRET = process.env.DOMINGO_AUTH_SECRET || "domingo-dev-secret-change-me";

export type AdminSession = {
  email: string;
  exp: number;
};

function sign(data: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(data).digest("base64url");
}

export function createSession(email: string): string {
  const payload: AdminSession = {
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12, // 12 hours
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + sign(body);
}

export function verifySession(token: string | undefined | null): AdminSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: String(payload.email || ""), exp: payload.exp };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySession(store.get(AUTH_COOKIE)?.value);
}

export function checkCredentials(email: string, password: string): boolean {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  const a = Buffer.from(e + "\u0000" + p);
  const b = Buffer.from(ADMIN_EMAIL.toLowerCase() + "\u0000" + ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}