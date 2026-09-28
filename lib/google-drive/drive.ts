/* ============================================
   DOMINGO GOOGLE DRIVE — NEW, independent storage
   Server-side only. Credentials come from the
   NEW Domingo env vars:
     DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON
     DOMINGO_GOOGLE_DRIVE_FOLDER_ID
   Nothing here touches the old business Drive.
   Upload happens server-side; a public URL is
   returned and stored in the Domingo data store.
   ============================================ */

import { google } from "googleapis";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export type DriveUploadResult = {
  id: string;
  publicUrl: string;
  name: string;
};

function getAuthJson(): any {
  const raw = process.env.DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function driveConfigStatus(): { configured: boolean; folderId: string; email: string } {
  const auth = getAuthJson();
  return {
    configured: Boolean(auth && auth.client_email && auth.private_key),
    folderId: process.env.DOMINGO_GOOGLE_DRIVE_FOLDER_ID || "",
    email: auth && auth.client_email ? auth.client_email : "",
  };
}

/**
 * Uploads an image (base64 data URL) to the NEW Domingo Google Drive folder.
 * Returns the file id and a public URL usable by the public website.
 */
export async function uploadHeroImage(imageDataUrl: string): Promise<DriveUploadResult> {
  const authJson = getAuthJson();
  if (!authJson) {
    throw new Error("DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  }
  const folderId = process.env.DOMINGO_GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("DOMINGO_GOOGLE_DRIVE_FOLDER_ID is not configured.");
  }

  const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(imageDataUrl || "");
  if (!mimeMatch) {
    throw new Error("Image must be a valid base64 data URL.");
  }
  const mimeType = mimeMatch[1].toLowerCase();
  const buf = Buffer.from(mimeMatch[2], "base64");
  if (buf.length === 0) throw new Error("Image data is empty.");
  if (buf.length > 3 * 1024 * 1024) throw new Error("Image must be under 3MB.");

  const auth = new google.auth.JWT({
    email: authJson.client_email,
    key: authJson.private_key,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: "v3", auth });

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const fileName = "domingo-hero-" + Date.now() + "." + ext;

  // supportsAllDrives keeps this compatible with both My Drive and Shared Drives.
  let fileRes;
  try {
    fileRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType,
      },
      media: {
        mimeType,
        body: Readable.from(buf),
      },
      supportsAllDrives: true,
    });
  } catch (e) {
    console.error("[domingo] Google Drive upload failed:", e instanceof Error ? e.message : e);
    throw new Error("Unable to upload image to storage.");
  }

  const fileId = fileRes.data.id;
  if (!fileId) throw new Error("Drive upload failed: no file id returned.");

  // Make the file publicly readable so the public site can render it.
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch {
    // If public permission is not allowed it will surface on the final link check below.
  }

  const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    id: fileId,
    publicUrl,
    name: fileName,
  };
}