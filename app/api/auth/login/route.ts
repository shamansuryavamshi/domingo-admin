/* ============================================
   DOMINGO ADMIN AUTH API — /api/auth/login
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createSession, AUTH_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = String(body.email || "");
  const password = String(body.password || "");

  if (!checkCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers: { "Cache-Control": CACHE } });
  }

  const res = NextResponse.json({ success: true }, { headers: { "Cache-Control": CACHE } });
  res.cookies.set(AUTH_COOKIE, createSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}