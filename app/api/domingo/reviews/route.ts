/* ============================================
   NEW DOMINGO API — /api/domingo/reviews
   POST -> public submits a review
   GET  -> admin lists reviews (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, addReview } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: { "Cache-Control": CACHE } });
  }
  const name = String(body.name || "").trim();
  const text = String(body.text || "").trim();
  if (!name || !text) {
    return NextResponse.json(
      { error: "Name and review text are required." },
      { status: 400, headers: { "Cache-Control": CACHE } }
    );
  }
  try {
    const data = await addReview({
      name,
      product: String(body.product || ""),
      text,
      featured: Boolean(body.featured),
    });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Could not save the review." },
      { status: 500, headers: { "Cache-Control": CACHE } }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": CACHE } });
  }
  try {
    const data = await getData();
    return NextResponse.json({ reviews: data.reviews }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Could not read reviews." },
      { status: 500, headers: { "Cache-Control": CACHE } }
    );
  }
}