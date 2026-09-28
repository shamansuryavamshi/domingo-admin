/* ============================================
   ADMIN SETTINGS API — /api/admin/settings
   GET -> current settings (session required)
   PUT -> save settings   (session required)

   Admin-only. Every field is validated server-side.
   Infra config (tokens, secrets, Drive, GitHub) is
   neither accepted nor returned.
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getData, updateSettings, dessertOf } from "@/lib/domingo-data/store";
import { getSession } from "@/lib/auth/session";
import { validateSettings, validateDessert } from "@/lib/domingo-settings";
import { securityHeaders, safeError, clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: securityHeaders() });
  }
  try {
    const data = await getData();
    return NextResponse.json(
      { settings: data.settings, dessert: dessertOf(data) },
      { headers: securityHeaders() }
    );
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to load settings.") },
      { status: 500, headers: securityHeaders() }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: securityHeaders() });
  }

  if (!rateLimit("settings:" + clientIp(req), 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many save attempts. Please wait a moment and try again." },
      { status: 429, headers: securityHeaders() }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: securityHeaders() });
  }

  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const settings = validateSettings(payload.settings);
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400, headers: securityHeaders() });
  }

  const dessert = validateDessert(payload.dessert);
  if (!dessert.ok) {
    return NextResponse.json({ error: dessert.error }, { status: 400, headers: securityHeaders() });
  }

  try {
    const data = await updateSettings(settings.value, dessert.value);
    return NextResponse.json(
      { success: true, settings: data.settings, dessert: dessertOf(data) },
      { headers: securityHeaders() }
    );
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Unable to save settings.") },
      { status: 500, headers: securityHeaders() }
    );
  }
}
