/* ============================================
   DOMINGO ADMIN AUTH API — /api/auth/me
   ============================================ */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": CACHE } });
  }
  return NextResponse.json({ email: session.email }, { headers: { "Cache-Control": CACHE } });
}