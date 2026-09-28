/* ============================================
   NEW DOMINGO API — /api/domingo
   Owned by the new domingo-admin project.
   GET  -> public data (no auth, no secrets)
   PUT  -> admin updates the hero (session required)
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, updateHero, dessertOf } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";
import { publicProjection } from "@/lib/domingo-settings";
import {
  corsHeaders,
  securityHeaders,
  safeError,
  MAX_HERO_NAME,
  MAX_IMAGE_URL,
} from "@/lib/security";

export const runtime = "nodejs";

// Answer the browser CORS preflight.
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

export async function GET() {
  try {
    const data = await getData();

    // Admin setting: public site status. When it is not "live" the
    // public site is taken down deliberately.
    if (data.settings.publicSite.status !== "live") {
      return NextResponse.json(
        { error: "The Domingo site is temporarily unavailable." },
        { status: 503, headers: { ...corsHeaders(), ...securityHeaders() } }
      );
    }

    return NextResponse.json(
      { hero: data.hero, ...publicProjection(data.settings, dessertOf(data)) },
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