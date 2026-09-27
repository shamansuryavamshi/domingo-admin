/* ============================================
   NEW DOMINGO API — /api/domingo
   Owned by the new domingo-admin project.
   GET  -> public hero data (no auth, no store)
   PUT  -> admin updates the hero (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, updateHero } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";
import {
  corsHeaders,
  securityHeaders,
  safeError,
  MAX_HERO_NAME,
  MAX_IMAGE_URL,
} from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getData();
    return NextResponse.json(
      { hero: data.hero },
      { headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to load Domingo data.") },
      { status: 500, headers: { ...corsHeaders(), ...securityHeaders() } }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: securityHeaders() }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: securityHeaders() });
  }

  const hero = (body && body.hero) || body || {};
  const name = String(hero.name == null ? "" : hero.name).trim();
  const image = String(hero.image == null ? "" : hero.image).trim();

  if (!name) {
    return NextResponse.json(
      { error: "Please enter a dessert name." },
      { status: 400, headers: securityHeaders() }
    );
  }
  if (name.length > MAX_HERO_NAME) {
    return NextResponse.json(
      { error: `Dessert name must be ${MAX_HERO_NAME} characters or fewer.` },
      { status: 400, headers: securityHeaders() }
    );
  }
  if (image.length > MAX_IMAGE_URL) {
    return NextResponse.json(
      { error: "Image URL is too long." },
      { status: 400, headers: securityHeaders() }
    );
  }
  if (image && !/^https?:\/{2}/i.test(image)) {
    return NextResponse.json(
      { error: "Image must be an absolute http(s) URL." },
      { status: 400, headers: securityHeaders() }
    );
  }

  try {
    const data = await updateHero({ name, image });
    return NextResponse.json({ success: true, hero: data.hero }, { headers: securityHeaders() });
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to publish the dessert.") },
      { status: 500, headers: securityHeaders() }
    );
  }
}