/* ============================================
   DOMINGO ADMIN AUTH API — /api/auth/logout
   ============================================ */

import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}