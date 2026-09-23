"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("Could not reach the login service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card card" style={{ padding: "34px" }}>
        <Link href="/admin" className="brand">
          <span className="brand__mark">D</span>
          <span>
            <span className="brand__name">Domingo</span>
            <span className="brand__sub" style={{ display: "block" }}>Admin</span>
          </span>
        </Link>

        <div className="login-head">
          <h1>Sign in</h1>
          <p>Manage the Domingo website.</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="card__label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domingo.in"
              required
            />
          </div>
          <div>
            <label className="card__label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="form-error show" style={{ marginTop: 0 }}>
              {error}
            </p>
          )}

          <button className="btn btn--solid btn--block" type="submit" disabled={busy} style={{ marginTop: "6px" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-hint">
          Default credentials come from your environment variables:
          <br />
          <strong>
            DOMINGO_ADMIN_EMAIL / DOMINGO_ADMIN_PASSWORD
          </strong>
        </p>
      </div>
    </div>
  );
}