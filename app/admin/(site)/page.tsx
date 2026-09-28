/* Dashboard — fetched server-side from the NEW Domingo data store. */

import Link from "next/link";
import { getData } from "@/lib/domingo-data/store";
import { driveConfigStatus } from "@/lib/google-drive/drive";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let data;
  let error = "";
  try {
    data = await getData();
  } catch (e: any) {
    error = e.message || "Could not load data.";
  }

  const drive = driveConfigStatus();
  const hero = data?.hero || {
    name: "",
    image: "",
    updatedAt: "",
    description: "",
    price: 0,
    quantity: 0,
    releaseDay: "",
  };

  function fmt(iso: string) {
    if (!iso) return "Not published yet";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Current state of the public Domingo website.</p>
      </header>

      {error && <p className="form-error show">{error}</p>}

      <div className="grid grid--3">
        <div className="card">
          <span className="card__label">Current dessert</span>
          <p className="card__value">{hero.name || "—"}</p>
          <p className="card__note">Last updated {fmt(hero.updatedAt)}</p>
        </div>
        <div className="card">
          <span className="card__label">Hero image</span>
          <div className="card__thumb">
            {hero.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.image} alt="Current hero" />
            ) : (
              <div className="placeholder">No hero image</div>
            )}
          </div>
        </div>
        <div className="card">
          <span className="card__label">Data store</span>
          <p className="card__value">{data?.reservations?.length || 0} reservations</p>
          <p className="card__note">{data?.reviews?.length || 0} reviews</p>
        </div>
      </div>

      <div className="card">
        <span className="card__label">Storage status</span>
        <p className={"badge" + (drive.configured ? " badge--ok" : "")}>
          Google Drive — {drive.configured ? "Connected" : "Not connected"}
        </p>
        <p className="btn-hint">
          {drive.configured
            ? "Hero images upload to the connected Drive folder."
            : "Set the Drive service account on the server to enable image uploads."}
        </p>
      </div>

      <div className="card">
        <span className="card__label">Next step</span>
        <Link href="/admin/hero" className="btn btn--solid">
          Edit hero
        </Link>
      </div>
    </>
  );
}