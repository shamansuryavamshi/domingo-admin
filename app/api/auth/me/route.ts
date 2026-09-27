/* ============================================
   DOMINGO ADMIN AUTH API — /api/auth/me
   ============================================ */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: securityHeaders() });
  }
  return NextResponse.json({ email: session.email }, { headers: securityHeaders() });
}