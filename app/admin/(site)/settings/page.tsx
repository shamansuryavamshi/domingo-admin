import { getData, dessertOf } from "@/lib/domingo-data/store";
import { DEFAULT_SETTINGS, DEFAULT_DESSERT, sanitizeSettings, sanitizeDessert } from "@/lib/domingo-settings";
import { driveConfigStatus } from "@/lib/google-drive/drive";
import SettingsForm from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Status only — the Drive credentials themselves are never read into the UI.
  const drive = driveConfigStatus();

  let settings = sanitizeSettings(DEFAULT_SETTINGS);
  let dessert = sanitizeDessert(DEFAULT_DESSERT);
  let dataErr = "";

  try {
    const data = await getData();
    settings = data.settings;
    dessert = dessertOf(data);
  } catch (e: any) {
    dataErr = "Could not reach the data store. Showing defaults — saving will fail until it is available.";
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Business settings for the Domingo admin. Infrastructure is configured server side.</p>
      </header>

      {dataErr && <p className="form-error show">{dataErr}</p>}

      <SettingsForm
        initialSettings={settings}
        initialDessert={dessert}
        driveConnected={drive.configured}
      />
    </>
  );
}
