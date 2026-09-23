/* ============================================
   NEW DOMINGO API — /api/domingo/reservations
   POST -> public submits a reservation
   GET  -> admin lists reservations (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, addReservation } from "@/lib/domingo-data/store";
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
  const phone = String(body.phone || "").trim();
  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required." },
      { status: 400, headers: { "Cache-Control": CACHE } }
    );
  }
  try {
    const data = await addReservation({
      name,
      phone,
      quantity: Number(body.quantity) || 1,
      note: String(body.note || ""),
    });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Could not save the reservation." },
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
    return NextResponse.json({ reservations: data.reservations }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Could not read reservations." },
      { status: 500, headers: { "Cache-Control": CACHE } }
    );
  }
}