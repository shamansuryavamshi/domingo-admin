import { getData } from "@/lib/domingo-data/store";
import { driveConfigStatus } from "@/lib/google-drive/drive";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const drive = driveConfigStatus();
  let dataErr = "";
  try {
    await getData();
  } catch (e: any) {
    dataErr = e.message || "Could not reach the data store.";
  }

  const vars = [
    { k: "DOMINGO_DATA_STORE", v: process.env.DOMINGO_DATA_STORE || "local" },
    { k: "DOMINGO_DATA_PATH", v: process.env.DOMINGO_DATA_PATH || "domingo-data.json" },
    { k: "DOMINGO_DATA_REPO", v: process.env.DOMINGO_DATA_REPO || "domingo-admin" },
    { k: "DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON", v: drive.configured ? "set ✓" : "not set" },
    { k: "DOMINGO_GOOGLE_DRIVE_FOLDER_ID", v: drive.folderId || "not set" },
  ];

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Configuration visibility for this Domingo system. Secrets are never shown.</p>
      </header>

      {dataErr && <p className="form-error show">{dataErr}</p>}

      <div className="card">
        <span className="card__label">Environment</span>
        <div className="table-scroll">
          <table className="table">
          <thead>
            <tr>
              <th scope="col">Variable</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v) => (
              <tr key={v.k}>
                <td><code>{v.k}</code></td>
                <td>{v.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="btn-hint" style={{ marginTop: 14 }}>
          These come from this project&apos;s own environment variables — independent of the old business system.
        </p>
      </div>
    </>
  );
}