# Domingo Admin

A completely independent administration system for the public Domingo website.

The public website lives at `shamansuryavamshi.github.io/domingo` (GitHub Pages) and is **not** touched by this system except to read data from the new Domingo API.

```
PUBLIC DOMINGO SITE (GitHub Pages)
        │  GET current Domingo data (no-store)
        ▼
NEW DOMINGO API  (this project, e.g. Vercel)
        │
        ├──────────────► NEW DOMINGO DATA STORE (domingo-data.json in domingo-admin repo)
        │
        └──────────────► NEW DOMINGO GOOGLE DRIVE  ──► public image URL ──► stored with hero
NEW DOMINGO ADMIN    (this project, e.g. https://<this-project>/admin)
```

The old business website, its admin, its API, its data, and its Google Drive are **never** used.

---

## 1. Run the admin locally

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev
# open http://localhost:3000/admin
```

## 2. Required environment variables

See `.env.example`. All variables are namespaced `DOMINGO_*` so nothing collides with any other system.

| Variable | Purpose |
| --- | --- |
| `DOMINGO_ADMIN_EMAIL` / `DOMINGO_ADMIN_PASSWORD` | Admin login credentials |
| `DOMINGO_AUTH_SECRET` | Secret used to sign the admin session cookie |
| `NEXTAUTH_URL` | Canonical URL (used for redirects) |
| `DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON` | **New** Google service-account JSON for Domingo |
| `DOMINGO_GOOGLE_DRIVE_FOLDER_ID` | Folder (or Shared Drive folder) for hero images |
| `DOMINGO_DATA_STORE` | `github` (persistent) or `local` (dev) |
| `DOMINGO_DATA_PATH` / `OWNER` / `REPO` / `BRANCH` | Where the data file lives |
| `DOMINGO_GITHUB_TOKEN` | Token used to commit data to the **new** repo |

## 3. Configure the NEW Google Drive

1. In Google Cloud, create a **new** service account named e.g. `domingo-storage` (do not reuse the old business one).
2. Enable the **Google Drive API** for that project.
3. Create a folder in Drive (or a Shared Drive) to hold hero images, e.g. `Domingo`.
4. Share that folder/Shared Drive with the service account email as **Manager/Contributor**.
5. Copy the folder id from the URL and put it in `DOMINGO_GOOGLE_DRIVE_FOLDER_ID`.
6. Paste the full service-account JSON into `DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON`.

> If your Drive is enforced-private, files are still readable via the returned `drive.google.com/uc?export=view&id=...` link because the permission set grants anyone-read server-side. If your org blocks public links, enable "link sharing" on the folder in Google Admin.

## 4. Configure the Google service account

- Project: a fresh GCP project for Domingo.
- Scopes are requested server-side only (`drive.file`). No credentials ever reach the browser.

## 5. Set the Domingo Drive folder ID

After step 3, open the folder in Drive. The folder id is the long string in the URL:

```
https://drive.google.com/drive/folders/<THIS_IS_THE_FOLDER_ID>
```

## 6. Deploy the admin

Any host that supports Next.js server routes works (Vercel, Netlify, Render…). Example with Vercel:

```bash
vercel      # first time: log in and link the domingo-admin repo
vercel env add DOMINGO_ADMIN_EMAIL production
vercel env add DOMINGO_ADMIN_PASSWORD production
vercel env add DOMINGO_AUTH_SECRET production
vercel env add DOMINGO_GOOGLE_SERVICE_ACCOUNT_JSON production
vercel env add DOMINGO_GOOGLE_DRIVE_FOLDER_ID production
vercel env add DOMINGO_DATA_STORE production   # github
vercel env add DOMINGO_DATA_REPO production    # domingo-admin
vercel env add DOMINGO_DATA_OWNER production   # shamansuryavamshi
vercel env add DOMINGO_DATA_BRANCH production  # main
vercel env add DOMINGO_GITHUB_TOKEN production # token for the new repo
vercel --prod
```

The admin will be at `https://<project>.vercel.app/admin` and the API at `https://<project>.vercel.app/api/domingo`.

## 7. How the public GitHub Pages site connects to the API

In the **public Domingo repo** (`shamansuryavamshi/domingo`), `lib/domingo.ts` reads `NEXT_PUBLIC_DOMINGO_DATA_URL` with a default. Point it at this project's API:

```
NEXT_PUBLIC_DOMINGO_DATA_URL=https://<project>.vercel.app/api/domingo
```

The public site fetches with `cache: "no-store"`, and this API also returns `Cache-Control: no-store`, so the hero always reflects the latest published dessert.

## 8. Update the API URL if the deployment domain changes

Change `NEXT_PUBLIC_DOMINGO_DATA_URL` (public repo build) and `NEXTAUTH_URL` (this repo). No code changes needed — everything is env-driven.

---

## Independence guarantee

- No import/URL/logic references the old `MyBusiness` repo, its API, its data files (`published-data.json`), or its Drive.
- Delete the old system and this project still works.
- Google credentials for this project are separate env vars; nothing is committed to Git.
- Auth is a fresh cookie session scoped to `/admin`; public API reads stay public. Browser never has secrets.