/* ============================================
   DOMINGO DATA STORE — NEW, independent store
   Exclusively for Domingo. Backed by
   domingo-data.json in the NEW domingo-admin
   repository (or a local file in dev mode).
   Nothing about the old business system.
   ============================================ */

import {
  DEFAULT_DESSERT,
  DEFAULT_SETTINGS,
  type DomingoSettings,
  type DessertSettings,
  sanitizeDessert,
  sanitizeSettings,
} from "../domingo-settings";

/* The hero record is also the dessert record. name/image were always
   here; description/price/quantity/releaseDay extend it in place so
   there is exactly one dessert record and the hero editor keeps
   working unchanged. */
export type DomingoHero = {
  name: string;
  image: string;
  updatedAt: string;
  description: string;
  price: number;
  quantity: number;
  releaseDay: string;
};

export type DomingoReservation = {
  id: string;
  name: string;
  phone: string;
  quantity: number;
  note?: string;
  createdAt: string;
};

export type DomingoReview = {
  id: string;
  name: string;
  product?: string;
  text: string;
  createdAt: string;
  featured?: boolean;
};

export type DomingoData = {
  hero: DomingoHero;
  reservations: DomingoReservation[];
  reviews: DomingoReview[];
  settings: DomingoSettings;
  updatedAt: string;
};

export const DEFAULT_DATA: DomingoData = {
  hero: {
    name: DEFAULT_DESSERT.name,
    image: "",
    updatedAt: "",
    description: DEFAULT_DESSERT.description,
    price: DEFAULT_DESSERT.price,
    quantity: DEFAULT_DESSERT.quantity,
    releaseDay: DEFAULT_DESSERT.releaseDay,
  },
  reservations: [],
  reviews: [],
  settings: DEFAULT_SETTINGS,
  updatedAt: "",
};

const GITHUB_TOKEN = process.env.DOMINGO_GITHUB_TOKEN || "";
const DATA_PATH = process.env.DOMINGO_DATA_PATH || "domingo-data.json";
const DATA_BRANCH = process.env.DOMINGO_DATA_BRANCH || "main";
const GH_OWNER = process.env.DOMINGO_DATA_OWNER || "shamansuryavamshi";
const GH_REPO = process.env.DOMINGO_DATA_REPO || "domingo-admin";
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${DATA_PATH}`;

function nowIso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function sanitizeData(raw: unknown): DomingoData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<DomingoData>;
  const hero = (d.hero && typeof d.hero === "object" ? d.hero : {}) as Partial<DomingoHero>;
  const dessert = sanitizeDessert(hero);
  return {
    hero: {
      name: String(hero.name == null ? "" : hero.name),
      image: String(hero.image == null ? "" : hero.image),
      updatedAt: String(hero.updatedAt || ""),
      description: dessert.description,
      price: dessert.price,
      quantity: dessert.quantity,
      releaseDay: dessert.releaseDay,
    },
    reservations: Array.isArray(d.reservations) ? d.reservations : [],
    reviews: Array.isArray(d.reviews) ? d.reviews : [],
    settings: sanitizeSettings(d.settings),
    updatedAt: String(d.updatedAt || ""),
  };
}

async function getFromGitHub(): Promise<DomingoData> {
  const res = await fetch(GH_API + "?ref=" + DATA_BRANCH, {
    headers: { Authorization: "token " + GITHUB_TOKEN, Accept: "application/vnd.github.v3+json" },
    cache: "no-store",
  });
  if (res.status === 404) return sanitizeData(DEFAULT_DATA);
  if (!res.ok) throw new Error("Data store read failed (HTTP " + res.status + ")");
  const file = await res.json();
  const decoded = Buffer.from(file.content, "base64").toString("utf-8");
  try {
    return sanitizeData(JSON.parse(decoded));
  } catch {
    return sanitizeData(DEFAULT_DATA);
  }
}

async function writeToGitHub(data: DomingoData): Promise<void> {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  let sha: string | null = null;
  const getRes = await fetch(GH_API + "?ref=" + DATA_BRANCH, {
    headers: { Authorization: "token " + GITHUB_TOKEN, Accept: "application/vnd.github.v3+json" },
    cache: "no-store",
  });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }
  const body: Record<string, unknown> = {
    message: "Update Domingo data [automated]",
    content,
    branch: DATA_BRANCH,
  };
  if (sha) body.sha = sha;
  const putRes = await fetch(GH_API, {
    method: "PUT",
    headers: {
      Authorization: "token " + GITHUB_TOKEN,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error((err && err.message) || "Data store write failed (HTTP " + putRes.status + ")");
  }
}

/* ---------- Local dev store ---------- */
import * as fs from "fs";
import * as path from "path";

const LOCAL_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(LOCAL_DIR, DATA_PATH);

function readLocal(): DomingoData {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return sanitizeData(DEFAULT_DATA);
    const raw = fs.readFileSync(LOCAL_FILE, "utf-8");
    return sanitizeData(JSON.parse(raw));
  } catch {
    return sanitizeData(DEFAULT_DATA);
  }
}

function writeLocal(data: DomingoData): void {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const githubEnabled = () => Boolean(GITHUB_TOKEN && GH_OWNER && GH_REPO);

export async function getData(): Promise<DomingoData> {
  if (process.env.DOMINGO_DATA_STORE === "github" || (githubEnabled() && process.env.DOMINGO_DATA_STORE !== "local")) {
    return getFromGitHub();
  }
  return readLocal();
}

export async function saveData(data: DomingoData, message?: string): Promise<DomingoData> {
  if (process.env.DOMINGO_DATA_STORE === "github" || (githubEnabled() && process.env.DOMINGO_DATA_STORE !== "local")) {
    await writeToGitHub(data);
  } else {
    writeLocal(data);
  }
  return data;
}

/* ---------- Mutations used by the API ---------- */

/** The dessert record is the hero record minus the image. */
export function dessertOf(data: DomingoData): DessertSettings {
  return {
    name: data.hero.name,
    description: data.hero.description,
    price: data.hero.price,
    quantity: data.hero.quantity,
    releaseDay: data.hero.releaseDay,
  };
}

export async function updateHero(hero: Pick<DomingoHero, "name" | "image">): Promise<DomingoData> {
  const data = await getData();
  const updatedAt = nowIso();
  // Preserve the dessert fields the hero editor does not manage.
  data.hero = {
    ...data.hero,
    name: String(hero.name || "").trim(),
    image: String(hero.image || ""),
    updatedAt,
  };
  data.updatedAt = updatedAt;
  return saveData(data, "Update Domingo hero [automated]");
}

/** Single read-modify-write for the whole settings form. */
export async function updateSettings(
  settings: DomingoSettings,
  dessert: DessertSettings
): Promise<DomingoData> {
  const data = await getData();
  const updatedAt = nowIso();
  data.settings = settings;
  data.hero = {
    ...data.hero,
    name: dessert.name,
    description: dessert.description,
    price: dessert.price,
    quantity: dessert.quantity,
    releaseDay: dessert.releaseDay,
    updatedAt,
  };
  data.updatedAt = updatedAt;
  return saveData(data, "Update Domingo settings [automated]");
}

export async function addReservation(r: Omit<DomingoReservation, "id" | "createdAt">): Promise<DomingoData> {
  const data = await getData();
  const item: DomingoReservation = {
    id: "res-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: String(r.name || "").trim(),
    phone: String(r.phone || "").trim(),
    quantity: Math.max(1, Math.min(20, Number(r.quantity) || 1)),
    note: String(r.note || "").trim() || undefined,
    createdAt: nowIso(),
  };
  data.reservations = [item, ...(data.reservations || [])];
  data.updatedAt = nowIso();
  return saveData(data, "Update Domingo reservation [automated]");
}

export async function addReview(r: Omit<DomingoReview, "id" | "createdAt">): Promise<DomingoData> {
  const data = await getData();
  const item: DomingoReview = {
    id: "rev-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: String(r.name || "").trim(),
    product: String(r.product || "").trim() || undefined,
    text: String(r.text || "").trim(),
    createdAt: nowIso(),
    featured: Boolean(r.featured),
  };
  data.reviews = [item, ...(data.reviews || [])];
  data.updatedAt = nowIso();
  return saveData(data, "Update Domingo review [automated]");
}