/* ============================================
   NEW DOMINGO API — /api/domingo/reservations
   POST -> public submits a reservation
   GET  -> admin lists reservations (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, addReservation } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";
import {
  corsHeaders,
  securityHeaders,
  safeError,
  clientIp,
  rateLimit,
  MAX_NAME,
  MAX_PHONE,
  MAX_NOTE,
  MAX_QUANTITY,
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
  if (!rateLimit("res:" + clientIp(req), 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many reservation attempts. Please try again later." },
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
  const phone = String(body.phone || "").trim();
  const note = String(body.note || "").trim();
  const quantity = Number(body.quantity);

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required." },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `Name must be ${MAX_NAME} characters or fewer.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (phone.length > MAX_PHONE) {
    return NextResponse.json(
      { error: "Phone number is too long." },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json(
      { error: `Quantity must be a whole number between 1 and ${MAX_QUANTITY}.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
  if (note.length > MAX_NOTE) {
    return NextResponse.json(
      { error: `Note must be ${MAX_NOTE} characters or fewer.` },
      { status: 400, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }

  try {
    await addReservation({ name, phone, quantity, note: note || undefined });
    return NextResponse.json({ success: true }, { headers: { ...corsHeaders(), ...securityHeaders() } });
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to save the reservation.") },
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
    return NextResponse.json({ reservations: data.reservations }, { headers: securityHeaders() });
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to read reservations.") },
      { status: 500, headers: securityHeaders() }
    );
  }
}