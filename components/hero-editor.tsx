"use client";

import { useRef, useState } from "react";

type Hero = { name: string; image: string; updatedAt: string };

const MAX_IMG = 15 * 1024 * 1024;

export default function HeroEditor({
  initialHero,
  initialError,
}: {
  initialHero: Hero;
  initialError?: string;
}) {
  const [server, setServer] = useState<Hero>(initialHero);
  const [name, setName] = useState(initialHero.name);
  const [pendingImg, setPendingImg] = useState<string>(""); // base64 chosen but not yet saved
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function fmt(iso: string) {
    if (!iso) return "Not published yet";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  function toast(msg: string) {
    const el = document.getElementById("domingo-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 4500);
  }

  function toastError(msg: string) {
    const el = document.getElementById("domingo-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("toast--error", "show");
    setTimeout(() => el.classList.remove("show", "toast--error"), 6000);
  }

  function readFile(file: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_IMG) {
      setError("Image must be under 15MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file.");
    reader.onload = () => {
      setPendingImg(String(reader.result || ""));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function publish() {
    setError("");
    setSuccess("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a dessert name.");
      return;
    }

    setBusy(true);
    try {
      // 1. If a new image was chosen, upload it to the NEW Domingo Google Drive first.
      let imageUrl = server.image;
      if (pendingImg) {
        const up = await fetch("/api/domingo/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: pendingImg }),
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || !upData.url) {
          throw new Error(upData.error || "Image upload failed.");
        }
        imageUrl = upData.url;
      }

      // 2. Save name + final image URL together in the NEW data store.
      const res = await fetch("/api/domingo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero: { name: trimmed, image: imageUrl } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.hero) {
        throw new Error(data.error || "Publish failed.");
      }

      // 3. Update the UI from the SERVER response.
      setServer(data.hero);
      setName(data.hero.name);
      setPendingImg("");
      setSuccess("Published: " + data.hero.name + " is live.");
      toast("Published: " + data.hero.name);
    } catch (e: any) {
      setError(e.message || "Publish failed. Try again.");
      toastError(e.message || "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = pendingImg || server.image;

  return (
    <div className="two-col">
      <div className="col">
        <div className="card">
          <span className="card__label">Dessert name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Burnt Basque Cheesecake"
            maxLength={80}
          />
        </div>

        <div className="card">
          <span className="card__label">Dessert image</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => readFile(e.target.files?.[0] as File)}
          />
          <div
            className={"dropzone" + (previewSrc ? " dropzone--has-img" : "")}
            onClick={() => fileRef.current?.click()}
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="Hero preview" />
            ) : (
              <div className="placeholder">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span>Choose a photo</span>
              </div>
            )}
            <span className="dropzone__hint">JPG / PNG / WEBP</span>
          </div>
          <div className="img-actions">
            {pendingImg ? (
              <button className="btn btn--ghost" type="button" onClick={() => setPendingImg("")}>
                Use published image instead
              </button>
            ) : (
              <span className="card__note" style={{ margin: 0 }}>
                {server.image ? "Published image shown — a new upload replaces it on save." : "No published image yet."}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <span className="card__label">Current status</span>
          <div className="pub">
            <div className="pub__thumb">
              {server.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={server.image} alt="Published hero" />
              ) : (
                <div className="placeholder">No image</div>
              )}
            </div>
            <div>
              <p className="pub__name">{server.name || "—"}</p>
              <p className="pub__time">Last updated {fmt(server.updatedAt)}</p>
            </div>
          </div>

          {success && <p className="success-note">{success}</p>}
          {error && <p className="form-error show">{error}</p>}

          <button className="btn btn--solid btn--block" type="button" disabled={busy} onClick={publish}>
            {busy ? "Working…" : "Save & Publish"}
          </button>
          <p className="btn-hint">
            Validates the name and image, then saves through the new Domingo API into the new Domingo data
            store. The public site picks it up from the same store.
          </p>
        </div>
      </div>
    </div>
  );
}