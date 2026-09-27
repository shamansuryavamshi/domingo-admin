/* ============================================
   NEW DOMINGO API — /api/domingo/upload
   Admin uploads a hero image to the NEW Domingo
   Google Drive. Requires admin session.
   Returns the final public URL to store.
   ============================================ */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadHeroImage, driveConfigStatus } from "@/lib/google-drive/drive";
import { securityHeaders, safeError, clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB decoded; keep under Vercel's request-body cap

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: securityHeaders() });
  }

  if (!rateLimit("up:" + clientIp(req), 30, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429, headers: securityHeaders() }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: securityHeaders() });
  }

  const image = String(body.image || "");
  const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(image);
  if (!mimeMatch) {
    return NextResponse.json(
      { error: "Provide an image as a base64 data URL." },
      { status: 400, headers: securityHeaders() }
    );
  }

  const mimeType = mimeMatch[1].toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WEBP images are allowed." },
      { status: 400, headers: securityHeaders() }
    );
  }

  // Reject anything malformed or oversized before it reaches Drive.
  try {
    validateImagePayload(mimeMatch[2], mimeType, MAX_IMAGE_BYTES);
  } catch (e) {
    return NextResponse.json(
      { error: safeError(e, "Image validation failed.") },
      { status: 400, headers: securityHeaders() }
    );
  }

  try {
    const result = await uploadHeroImage(image);
    return NextResponse.json(
      { success: true, url: result.publicUrl, fileId: result.id },
      { headers: securityHeaders() }
    );
  } catch (e) {
    const status = driveConfigStatus().configured ? 500 : 503;
    return NextResponse.json(
      { error: safeError(e, "Unable to upload image.") },
      { status, headers: securityHeaders() }
    );
  }
}

function validateImagePayload(base64: string, mimeType: string, maxBytes: number): void {
  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0) throw new Error("Image data is empty.");
  if (buf.length > maxBytes) throw new Error("Image must be under 3MB.");

  // Verify magic bytes so an attacker cannot disguise non-images.
  const ok =
    (mimeType === "image/jpeg" && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (mimeType === "image/png" &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) ||
    (mimeType === "image/webp" &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46);
  if (!ok) throw new Error("File does not match its declared image type.");
}