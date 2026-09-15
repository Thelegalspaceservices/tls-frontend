# Waitlist → Google Spreadsheet

The waitlist form (used on sign-in, sign-up, and `/waitlist`) writes every signup
to a **Google Spreadsheet** instead of a local/Blobs file. This doc walks through
the one-time Google Cloud setup and how to wire the values into the app.

## How it works

- `POST /api/waitlist` → appends a row to your Google Sheet via a **service account**.
- `GET /api/waitlist` → reads all rows from the sheet and streams them back as a
  downloadable CSV (used by the admin "Download Waitlist" button).
- Google Sheets is the **only** storage backend — there is no file/Blobs
  fallback. If the Google env vars are missing or partial, the route fails closed
  with an HTTP 503 and writes nothing, rather than dropping signups into a local
  file.

## 1. Create the Google Sheet

1. Go to [sheets.new](https://sheets.new) (or Google Drive → New → Google Sheets).
2. In **row 1**, add these headers (matching the CSV columns):
   `fullName | email | type | createdAt`
3. Copy the **spreadsheet ID** from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit`
   - ID: `1AbCdEfGhIjKlMnOpQrStUvWxYz`

> Make sure the first tab is named `Sheet1` (the default) — or set `GOOGLE_SHEET_NAME`
> to whatever the tab is called.

## 2. Create a service account (Google Cloud)

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project (e.g. `tls-waitlist`).
3. **Enable the Google Sheets API**:
   - APIs & Services → Library → search **"Google Sheets API"** → **Enable**.
4. **Create a service account**:
   - APIs & Services → Credentials → **Create Credentials** → **Service Account**.
   - Give it a name (e.g. `waitlist-writer`) → Create.
   - You can skip the "optional" grants → Done.
5. **Create a key** for the service account:
   - Credentials → click the service account email → **Keys** → **Add Key** →
     **Create New Key** → **JSON** → Create.
   - A JSON file downloads (e.g. `tls-waitlist-xxxx.json`). **Keep it safe** — it
     contains the private key.

## 3. Share the sheet with the service account

1. Open your Google Sheet → **Share** (top-right).
2. Add the service account email as a collaborator:
   - It looks like `waitlist-writer@<project-id>.iam.gserviceaccount.com`.
   - Find it in the downloaded JSON under `client_email`, or in Cloud Console under
     the service account.
3. Grant **Editor** permission.
4. Send/share. (You can also do this from Cloud Console if preferred.)

## 4. What to paste back into the app

Open the downloaded service-account JSON and grab three values, then fill them into
the frontend env:

| Env var                        | From the JSON                                                                      | Example                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GOOGLE_SHEET_ID`              | The sheet URL (step 1)                                                             | `1AbCdEfGhIjKlMnOpQrStUvWxYz`                                     |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email`                                                                     | `waitlist-writer@tls-waitlist.iam.gserviceaccount.com`            |
| `GOOGLE_PRIVATE_KEY`           | `private_key` (a long `-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----`) | `-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n` |
| `GOOGLE_SHEET_NAME` (optional) | —                                                                                  | `Sheet1`                                                          |

### Important — private key newlines

The `private_key` value in the JSON contains literal `\n` escape sequences. When you
paste it into an env file or Netlify, keep the `\n` characters exactly as-is. The
route already converts `\n` to real newlines internally, so **do not** replace them
with actual line breaks in the env value.

### Local (`.env`)

```dotenv
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SERVICE_ACCOUNT_EMAIL=waitlist-writer@tls-waitlist.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
```

### Deployed host (Vercel or Netlify)

Add the same three variables to the deploy environment — **Vercel** → Project
Settings → Environment Variables (Production, Preview and Development), or
**Netlify** → Site settings → Environment variables:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (the value with `\n` kept intact)

Then redeploy. No build-time secrets — these are read at runtime by the
`/api/waitlist` route.

## 5. Verify

- Submit the waitlist form → it should return **201 "You're on the waitlist!"**.
- Open the Google Sheet → the new row should appear.
- Click **Download Waitlist** in the admin sidebar → downloads `waitlist-YYYY-MM-DD.csv`
  with all rows from the sheet.
- Submitting the same email twice → returns `duplicate: true` and doesn't add a row.

## Notes

- Duplicate detection reads the existing sheet rows, so re-submitting an email is
  ignored.
- The Google Sheets API is only called server-side (in the `/api/waitlist` route),
  never from the browser — the service account key is never exposed to clients.
- If the Google env vars are removed, the route stops accepting signups (HTTP 503)
  instead of falling back to a file — waitlist entries are never written to disk.

## Troubleshooting

### Deployed site returns `"Waitlist storage isn't configured on this deployment..."` (HTTP 503)

The deployed host is missing — or has only some of — the Google env vars. Since
`.env` is gitignored, the values in your local `.env` are **not** deployed, and
the waitlist no longer falls back to a file: it fails closed instead.

Fix — add the three vars to the deploy environment (Vercel → Project Settings →
Environment Variables, or Netlify → Site settings → Environment variables),
matching `.env`, then redeploy:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (keep the literal `\n` escapes intact)

### Deployed site returns `"Something went wrong saving your signup. Please try again."` (HTTP 500)

The Google env vars are present, but the write failed — almost always because the
service account hasn't been shared on the sheet as **Editor** (step 3 above), or
the Sheets API isn't enabled for the project. Re-check steps 2–3.

### Duplicate email still shows the success screen

Make sure the waitlist form is using the updated `WaitlistPlaceholder` component,
which checks the `duplicate: true` flag in the response and shows the error banner
("You're already on the waitlist.") instead of the success state.
