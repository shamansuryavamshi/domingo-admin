/* ============================================
   NEW DOMINGO API — /api/domingo/reviews
   POST -> public submits a review
   GET  -> admin lists reviews (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, addReview } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";
import {
  corsHeaders,
  securityHeaders,
  safeError,
  clientIp,
  rateLimit,
  MAX_NAME,
  MAX_PRODUCT,
  MAX_REVIEW_TEXT,
} from "@/lib/security";

export const runtime = "nodejs";

// Answer the browser CORS preflight for public JSON POSTs.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit("rev:" + clientIp(req), 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many review attempts. Please try again later." },
      { status: 429, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } });
  }

  const name = String(body.name || "").trim();
  const product = String(body.product || "").trim();
  const text = String(body.text || "").trim();

  if (!name || !text) {
    return NextResponse.json(
      { error: "Name and review text are required." },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `Name must be ${MAX_NAME} characters or fewer.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (product.length > MAX_PRODUCT) {
    return NextResponse.json(
      { error: `Dessert name must be ${MAX_PRODUCT} characters or fewer.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (text.length > MAX_REVIEW_TEXT) {
    return NextResponse.json(
      { error: `Review must be ${MAX_REVIEW_TEXT} characters or fewer.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }

  try {
    await addReview({ name, product: product || undefined, text });
    return NextResponse.json({ success: true }, { headers: { ...corsHeaders(), ...securityHeaders() } });
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to save the review.") },
      { status: 500, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: securityHeaders() });
  }
  try {
    const data = await getData();
    return NextResponse.json({ reviews: data.reviews }, { headers: securityHeaders() });
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to read reviews.") },
      { status: 500, headers: securityHeaders() }
    );
  }
}