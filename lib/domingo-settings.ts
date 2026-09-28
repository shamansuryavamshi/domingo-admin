/* ============================================
   DOMINGO ADMIN SETTINGS — schema + validation
   Server-side only. Single source of truth for the
   business settings an administrator may control.

   Deliberately NOT modelled here: data store, GitHub
   repo/token, Drive service account/folder, auth
   secrets. Those stay server-side infra config and
   are never editable or visible from the admin UI.
   ============================================ */

export type BusinessStatus = "open" | "closed" | "paused";
export type PublicSiteStatus = "live" | "unavailable";

export const BUSINESS_STATUSES = ["open", "closed", "paused"] as const;
export const PUBLIC_SITE_STATUSES = ["live", "unavailable"] as const;

export type DomingoSettings = {
  business: {
    name: string;
    location: string;
    operatingDay: string;
    status: BusinessStatus;
  };
  reservations: {
    enabled: boolean;
    maxReservations: number;
    message: string;
  };
  reviews: {
    showReviews: boolean;
    submissionEnabled: boolean;
  };
  announcement: {
    enabled: boolean;
    text: string;
  };
  publicSite: {
    status: PublicSiteStatus;
  };
};

/** Dessert content. name/image stay on the existing hero record. */
export type DessertSettings = {
  name: string;
  description: string;
  price: number;
  quantity: number;
  releaseDay: string;
};

export const LIMITS = {
  businessName: 60,
  location: 120,
  operatingDay: 40,
  dessertName: 80,
  dessertDescription: 500,
  dessertReleaseDay: 40,
  maxPrice: 100000,
  maxQuantity: 999,
  maxReservations: 1000,
  reservationMessage: 300,
  announcementText: 300,
} as const;

export const DEFAULT_SETTINGS: DomingoSettings = {
  business: { name: "DOMINGO", location: "Bangalore", operatingDay: "Sunday", status: "open" },
  reservations: {
    enabled: true,
    maxReservations: 20,
    message: "Reservations open every Sunday while quantities last.",
  },
  reviews: { showReviews: true, submissionEnabled: true },
  announcement: { enabled: false, text: "" },
  publicSite: { status: "live" },
};

export const DEFAULT_DESSERT: DessertSettings = {
  name: "",
  description: "",
  price: 0,
  quantity: 0,
  releaseDay: "Sunday",
};

/* ---------------- Reading stored data (defensive, never throws) ---------------- */

function txt(v: unknown, max: number): string {
  if (typeof v === "string") return v.slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
  return "";
}

function bool(v: unknown, dflt: boolean): boolean {
  return typeof v === "boolean" ? v : dflt;
}

function num(v: unknown, dflt: number, min: number, max: number, int: boolean): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return dflt;
  if (int && !Number.isInteger(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function pick<T extends string>(v: unknown, allowed: readonly T[], dflt: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : dflt;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function sanitizeSettings(raw: unknown): DomingoSettings {
  const d = rec(raw);
  const b = rec(d.business);
  const r = rec(d.reservations);
  const v = rec(d.reviews);
  const a = rec(d.announcement);
  const p = rec(d.publicSite);
  return {
    business: {
      name: txt(b.name, LIMITS.businessName) || DEFAULT_SETTINGS.business.name,
      location: txt(b.location, LIMITS.location),
      // Operating day is required, so a data file that predates settings
      // must still load with a usable default rather than an empty field.
      operatingDay: txt(b.operatingDay, LIMITS.operatingDay) || DEFAULT_SETTINGS.business.operatingDay,
      status: pick(b.status, BUSINESS_STATUSES, DEFAULT_SETTINGS.business.status),
    },
    reservations: {
      enabled: bool(r.enabled, DEFAULT_SETTINGS.reservations.enabled),
      maxReservations: num(
        r.maxReservations,
        DEFAULT_SETTINGS.reservations.maxReservations,
        0,
        LIMITS.maxReservations,
        true
      ),
      message: txt(r.message, LIMITS.reservationMessage),
    },
    reviews: {
      showReviews: bool(v.showReviews, DEFAULT_SETTINGS.reviews.showReviews),
      submissionEnabled: bool(v.submissionEnabled, DEFAULT_SETTINGS.reviews.submissionEnabled),
    },
    announcement: {
      enabled: bool(a.enabled, DEFAULT_SETTINGS.announcement.enabled),
      text: txt(a.text, LIMITS.announcementText),
    },
    publicSite: { status: pick(p.status, PUBLIC_SITE_STATUSES, DEFAULT_SETTINGS.publicSite.status) },
  };
}

export function sanitizeDessert(raw: unknown): DessertSettings {
  const d = rec(raw);
  return {
    name: txt(d.name, LIMITS.dessertName),
    description: txt(d.description, LIMITS.dessertDescription),
    price: Math.round(num(d.price, 0, 0, LIMITS.maxPrice, false) * 100) / 100,
    quantity: num(d.quantity, 0, 0, LIMITS.maxQuantity, true),
    releaseDay: txt(d.releaseDay, LIMITS.dessertReleaseDay) || DEFAULT_DESSERT.releaseDay,
  };
}

/* ---------------- Strict validation of client input ---------------- */

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

function fieldText(v: unknown, field: string, max: number, required: boolean): Validation<string> {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") return { ok: false, error: `${field} must be text.` };
  const t = v.trim();
  if (required && !t) return { ok: false, error: `${field} is required.` };
  if (t.length > max) return { ok: false, error: `${field} must be ${max} characters or fewer.` };
  return { ok: true, value: t };
}

function fieldBool(v: unknown, field: string): Validation<boolean> {
  if (typeof v !== "boolean") return { ok: false, error: `${field} must be true or false.` };
  return { ok: true, value: v };
}

function fieldEnum<T extends string>(v: unknown, field: string, allowed: readonly T[]): Validation<T> {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    return { ok: false, error: `${field} must be one of: ${allowed.join(", ")}.` };
  }
  return { ok: true, value: v as T };
}

function fieldNum(v: unknown, field: string, min: number, max: number, int: boolean): Validation<number> {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return { ok: false, error: `${field} must be a number.` };
  if (int && !Number.isInteger(n)) return { ok: false, error: `${field} must be a whole number.` };
  if (n < min) return { ok: false, error: `${field} must be ${min} or more.` };
  if (n > max) return { ok: false, error: `${field} must be ${max} or less.` };
  return { ok: true, value: n };
}

function isFail(v: unknown): v is { ok: false; error: string } {
  return Boolean(v) && typeof v === "object" && (v as { ok?: unknown }).ok === false;
}

function group(v: unknown, field: string): Record<string, unknown> | { ok: false; error: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return { ok: false, error: `${field} settings are missing or invalid.` };
  }
  return v as Record<string, unknown>;
}

export function validateSettings(raw: unknown): Validation<DomingoSettings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Settings payload is missing or invalid." };
  }
  const d = raw as Record<string, unknown>;

  const b = group(d.business, "Business");
  if (isFail(b)) return b;
  const r = group(d.reservations, "Reservations");
  if (isFail(r)) return r;
  const v = group(d.reviews, "Reviews");
  if (isFail(v)) return v;
  const a = group(d.announcement, "Announcement");
  if (isFail(a)) return a;
  const p = group(d.publicSite, "Public site");
  if (isFail(p)) return p;

  const name = fieldText(b.name, "Business name", LIMITS.businessName, true);
  if (!name.ok) return name;
  const location = fieldText(b.location, "Location", LIMITS.location, false);
  if (!location.ok) return location;
  const operatingDay = fieldText(b.operatingDay, "Operating day", LIMITS.operatingDay, true);
  if (!operatingDay.ok) return operatingDay;
  const status = fieldEnum(b.status, "Business status", BUSINESS_STATUSES);
  if (!status.ok) return status;

  const resEnabled = fieldBool(r.enabled, "Reservations status");
  if (!resEnabled.ok) return resEnabled;
  const maxRes = fieldNum(r.maxReservations, "Maximum reservations", 0, LIMITS.maxReservations, true);
  if (!maxRes.ok) return maxRes;
  const resMsg = fieldText(r.message, "Reservation message", LIMITS.reservationMessage, false);
  if (!resMsg.ok) return resMsg;

  const showReviews = fieldBool(v.showReviews, "Review display");
  if (!showReviews.ok) return showReviews;
  const subEnabled = fieldBool(v.submissionEnabled, "Review submission");
  if (!subEnabled.ok) return subEnabled;

  const annEnabled = fieldBool(a.enabled, "Announcement status");
  if (!annEnabled.ok) return annEnabled;
  const annText = fieldText(a.text, "Announcement text", LIMITS.announcementText, false);
  if (!annText.ok) return annText;

  const siteStatus = fieldEnum(p.status, "Public site status", PUBLIC_SITE_STATUSES);
  if (!siteStatus.ok) return siteStatus;

  return {
    ok: true,
    value: {
      business: { name: name.value, location: location.value, operatingDay: operatingDay.value, status: status.value },
      reservations: {
        enabled: resEnabled.value,
        maxReservations: maxRes.value,
        message: resMsg.value,
      },
      reviews: { showReviews: showReviews.value, submissionEnabled: subEnabled.value },
      announcement: { enabled: annEnabled.value, text: annText.value },
      publicSite: { status: siteStatus.value },
    },
  };
}

export function validateDessert(raw: unknown): Validation<DessertSettings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Dessert settings are missing or invalid." };
  }
  const d = raw as Record<string, unknown>;

  const name = fieldText(d.name, "Dessert name", LIMITS.dessertName, true);
  if (!name.ok) return name;
  const description = fieldText(d.description, "Description", LIMITS.dessertDescription, false);
  if (!description.ok) return description;
  const price = fieldNum(d.price, "Price", 0, LIMITS.maxPrice, false);
  if (!price.ok) return price;
  const quantity = fieldNum(d.quantity, "Available quantity", 0, LIMITS.maxQuantity, true);
  if (!quantity.ok) return quantity;
  const releaseDay = fieldText(d.releaseDay, "Release day", LIMITS.dessertReleaseDay, true);
  if (!releaseDay.ok) return releaseDay;

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value,
      price: Math.round(price.value * 100) / 100,
      quantity: quantity.value,
      releaseDay: releaseDay.value,
    },
  };
}

/* ---------------- Public projection ----------------
   Only what the public Domingo site needs. Never includes
   admin-only values or anything infrastructure related. */

export function publicProjection(settings: DomingoSettings, dessert: DessertSettings) {
  return {
    site: { ...settings.business },
    dessert: { ...dessert },
    announcement:
      settings.announcement.enabled && settings.announcement.text
        ? { text: settings.announcement.text }
        : null,
    reservations: {
      open: settings.reservations.enabled,
      message: settings.reservations.message,
    },
    reviews: { visible: settings.reviews.showReviews },
  };
}
