/* ============================================
   NEW DOMINGO API — /api/domingo/upload
   Admin uploads a hero image to the NEW Domingo
   Google Drive. Requires admin session.
   Returns the final public URL to store.
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadHeroImage, driveConfigStatus } from "@/lib/google-drive/drive";

export const runtime = "nodejs";

const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function POST(req: NextRequest) {
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

  const image = String(body.image || "");
  if (!image || !image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Provide an image as a base64 data URL." },
      { status: 400, headers: { "Cache-Control": CACHE } }
    );
  }

  try {
    const result = await uploadHeroImage(image);
    return NextResponse.json(
      { success: true, url: result.publicUrl, fileId: result.id },
      { headers: { "Cache-Control": CACHE } }
    );
  } catch (e: any) {
    const status = driveConfigStatus().configured ? 500 : 503;
    return NextResponse.json(
      { error: e.message || "Image upload failed." },
      { status, headers: { "Cache-Control": CACHE } }
    );
  }
}