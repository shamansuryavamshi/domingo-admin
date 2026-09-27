/* ============================================
   DOMINGO ADMIN AUTH API — /api/auth/login
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createSession, AUTH_COOKIE } from "@/lib/auth/session";
import { securityHeaders, clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!rateLimit("login:" + clientIp(req), 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a few minutes." },
      { status: 429, headers: securityHeaders() }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: securityHeaders() });
  }

  const email = String(body.email || "");
  const password = String(body.password || "");

  if (!checkCredentials(email, password)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: securityHeaders() }
    );
  }

  const res = NextResponse.json({ success: true }, { headers: securityHeaders() });
  res.cookies.set(AUTH_COOKIE, createSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}