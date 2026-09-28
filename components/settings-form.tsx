"use client";

import { useState } from "react";
import type {
  BusinessStatus,
  DomingoSettings,
  DessertSettings,
  PublicSiteStatus,
} from "@/lib/domingo-settings";

type SaveState = "idle" | "saving" | "saved" | "error";

type Option<T extends string> = { value: T; label: string };

const BUSINESS_STATUS: Option<BusinessStatus>[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "paused", label: "Paused" },
];

const RESERVATION_STATUS: Option<"enabled" | "disabled">[] = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const REVIEW_DISPLAY: Option<"show" | "hide">[] = [
  { value: "show", label: "Show reviews" },
  { value: "hide", label: "Hide reviews" },
];

const REVIEW_SUBMISSION: Option<"enabled" | "disabled">[] = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const ANNOUNCEMENT_STATUS: Option<"enabled" | "disabled">[] = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const SITE_STATUS: Option<PublicSiteStatus>[] = [
  { value: "live", label: "Live" },
  { value: "unavailable", label: "Temporarily unavailable" },
];

/* ---------- Small building blocks, all native controls ---------- */

function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <fieldset className="set">
      <legend className="set__label">{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label className={"seg__opt" + (o.value === value ? " is-on" : "")} key={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="set__hint">{hint}</p>}
    </fieldset>
  );
}

function Text({
  legend,
  value,
  onChange,
  max,
  placeholder,
  hint,
  type = "text",
  inputMode,
  min,
  step,
}: {
  legend: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  hint?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
  min?: number;
  step?: number;
}) {
  const id = "f-" + legend.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="set">
      <label className="set__label" htmlFor={id}>
        {legend}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        inputMode={inputMode}
        min={min}
        step={step}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="set__hint">{hint}</p>}
    </div>
  );
}

function Area({
  legend,
  value,
  onChange,
  max,
  placeholder,
  hint,
  rows = 3,
}: {
  legend: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  const id = "f-" + legend.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="set">
      <label className="set__label" htmlFor={id}>
        {legend}
      </label>
      <textarea
        id={id}
        className="input set__area"
        rows={rows}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="set__hint">{hint}</p>}
    </div>
  );
}

/* ---------- Settings form ---------- */

export default function SettingsForm({
  initialSettings,
  initialDessert,
  driveConnected,
}: {
  initialSettings: DomingoSettings;
  initialDessert: DessertSettings;
  driveConnected: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [dessert, setDessert] = useState({
    ...initialDessert,
    // Kept as text while typing so the field can be cleared freely.
    price: String(initialDessert.price),
    quantity: String(initialDessert.quantity),
  });
  const [maxReservations, setMaxReservations] = useState(
    String(initialSettings.reservations.maxReservations)
  );
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  async function save() {
    setState("saving");
    setError("");

    const payload = {
      settings: {
        ...settings,
        reservations: { ...settings.reservations, maxReservations },
      },
      dessert: { ...dessert },
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not save settings.");
      }

      // Do not claim success on the write alone — read the settings back
      // from the server and show what it actually stored.
      const check = await fetch("/api/admin/settings", { cache: "no-store" });
      const stored = await check.json().catch(() => ({}));
      if (!check.ok || !stored.settings || !stored.dessert) {
        throw new Error("Saved, but the server did not confirm the values. Please reload and check.");
      }

      setSettings(stored.settings);
      setDessert({
        ...stored.dessert,
        price: String(stored.dessert.price),
        quantity: String(stored.dessert.quantity),
      });
      setMaxReservations(String(stored.settings.reservations.maxReservations));
      setState("saved");
    } catch (e: any) {
      setError(e?.message || "Could not save settings.");
      setState("error");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="two-col">
        <div className="col">
          <div className="card">
            <span className="card__label">Domingo business</span>
            <Text
              legend="Business name"
              value={settings.business.name}
              onChange={(v) =>
                setSettings({ ...settings, business: { ...settings.business, name: v } })
              }
              max={60}
            />
            <Text
              legend="Location"
              value={settings.business.location}
              onChange={(v) =>
                setSettings({ ...settings, business: { ...settings.business, location: v } })
              }
              max={120}
            />
            <Text
              legend="Operating day"
              value={settings.business.operatingDay}
              onChange={(v) =>
                setSettings({ ...settings, business: { ...settings.business, operatingDay: v } })
              }
              max={40}
            />
            <Segmented
              legend="Business status"
              name="business-status"
              value={settings.business.status}
              options={BUSINESS_STATUS}
              onChange={(v) =>
                setSettings({ ...settings, business: { ...settings.business, status: v } })
              }
            />
          </div>

          <div className="card">
            <span className="card__label">This week&apos;s dessert</span>
            <Text
              legend="Dessert name"
              value={dessert.name}
              onChange={(v) => setDessert({ ...dessert, name: v })}
              max={80}
              hint="The same dessert shown on the hero. The hero editor still manages the photo."
            />
            <Area
              legend="Description"
              value={dessert.description}
              onChange={(v) => setDessert({ ...dessert, description: v })}
              max={500}
              placeholder="Optional"
            />
            <div className="set-pair">
              <Text
                legend="Price"
                value={dessert.price}
                onChange={(v) => setDessert({ ...dessert, price: v })}
                max={10}
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                hint="0 or more"
              />
              <Text
                legend="Available quantity"
                value={dessert.quantity}
                onChange={(v) => setDessert({ ...dessert, quantity: v })}
                max={4}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                hint="Whole number"
              />
            </div>
            <Text
              legend="Release day"
              value={dessert.releaseDay}
              onChange={(v) => setDessert({ ...dessert, releaseDay: v })}
              max={40}
              placeholder="Sunday"
            />
          </div>
        </div>

        <div className="col">
          <div className="card">
            <span className="card__label">Reservations</span>
            <Segmented
              legend="Reservation status"
              name="reservations-status"
              value={settings.reservations.enabled ? "enabled" : "disabled"}
              options={RESERVATION_STATUS}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  reservations: { ...settings.reservations, enabled: v === "enabled" },
                })
              }
              hint="When disabled, the public reservation form is rejected."
            />
            <Text
              legend="Maximum reservations"
              value={maxReservations}
              onChange={setMaxReservations}
              max={5}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              hint="0 for no limit. Once this many are accepted, new reservations are rejected."
            />
            <Area
              legend="Reservation message"
              value={settings.reservations.message}
              onChange={(v) =>
                setSettings({ ...settings, reservations: { ...settings.reservations, message: v } })
              }
              max={300}
              placeholder="Reservations open every Sunday while quantities last."
            />
          </div>

          <div className="card">
            <span className="card__label">Reviews</span>
            <Segmented
              legend="Review display"
              name="reviews-display"
              value={settings.reviews.showReviews ? "show" : "hide"}
              options={REVIEW_DISPLAY}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  reviews: { ...settings.reviews, showReviews: v === "show" },
                })
              }
            />
            <Segmented
              legend="Review submission"
              name="reviews-submission"
              value={settings.reviews.submissionEnabled ? "enabled" : "disabled"}
              options={REVIEW_SUBMISSION}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  reviews: { ...settings.reviews, submissionEnabled: v === "enabled" },
                })
              }
              hint="When disabled, new reviews from the public site are rejected."
            />
          </div>

          <div className="card">
            <span className="card__label">Announcement</span>
            <Segmented
              legend="Announcement status"
              name="announcement-status"
              value={settings.announcement.enabled ? "enabled" : "disabled"}
              options={ANNOUNCEMENT_STATUS}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  announcement: { ...settings.announcement, enabled: v === "enabled" },
                })
              }
            />
            <Area
              legend="Announcement text"
              value={settings.announcement.text}
              onChange={(v) => setSettings({ ...settings, announcement: { ...settings.announcement, text: v } })}
              max={300}
              placeholder="Only shown when the announcement is enabled."
            />
          </div>

          <div className="card">
            <span className="card__label">Public site</span>
            <Segmented
              legend="Public site status"
              name="public-site-status"
              value={settings.publicSite.status}
              options={SITE_STATUS}
              onChange={(v) =>
                setSettings({ ...settings, publicSite: { ...settings.publicSite, status: v } })
              }
              hint="Temporarily unavailable returns a 503 from the public Domingo API."
            />
            <div className="set">
              <span className="set__label">Image storage</span>
              <p className={"badge" + (driveConnected ? " badge--ok" : "")}>
                Google Drive — {driveConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {error && <p className="form-error show">{error}</p>}
        {state === "saved" && !error && (
          <p className="success-note">Saved and confirmed by the server.</p>
        )}

        <button className="btn btn--solid" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save Changes"}
        </button>
        <p className="btn-hint" aria-live="polite">
          {state === "saving"
            ? "Saving settings…"
            : state === "error"
              ? "Error saving changes. Nothing was changed."
              : "Saving re-reads the values from the server so you always see what was actually stored."}
        </p>
      </div>
    </form>
  );
}
