/* ============================================
   NEW DOMINGO API — /api/domingo
   Owned by the new domingo-admin project.
   GET  -> public hero data (no auth, no store)
   PUT  -> admin updates the hero (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, updateHero } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function GET() {
  try {
    const data = await getData();
    return NextResponse.json({ hero: data.hero }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to read Domingo data." },
      { status: 500, headers: { "Cache-Control": CACHE } }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": CACHE } });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: { "Cache-Control": CACHE } });
  }

  const hero = (body && body.hero) || body || {};
  const name = String(hero.name == null ? "" : hero.name).trim();
  if (!name) {
    return NextResponse.json(
      { error: "Please enter a dessert name." },
      { status: 400, headers: { "Cache-Control": CACHE } }
    );
  }

  try {
    const data = await updateHero({ name, image: String(hero.image == null ? "" : hero.image) });
    return NextResponse.json({ success: true, hero: data.hero }, { headers: { "Cache-Control": CACHE } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to publish the dessert." },
      { status: 500, headers: { "Cache-Control": CACHE } }
    );
  }
}