// app/api/waitlist/route.ts
//
// Server-side waitlist collection for the /frontend project (no backend
// dependency). Signups are appended to a Google Spreadsheet via a service
// account — the sheet is the ONLY storage backend. There is deliberately no
// file/Blobs fallback: a signup either lands in the sheet or the request fails
// loudly, so waitlist entries are never written to a local file.
// A GET to this route streams the full spreadsheet back as a downloadable file.
//
// Bot protection: a Cloudflare Turnstile token is required on every POST and is
// verified against Cloudflare's siteverify endpoint before any storage is
// touched. The routine fails closed — without a secret the route returns 503
// rather than accepting unverified signups.
import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";

export const runtime = "nodejs";

export type WaitlistVariant = "lawyer" | "user";

interface WaitlistPayload {
  fullName?: string;
  email?: string;
  variant?: WaitlistVariant;
  turnstileToken?: string;
}

interface WaitlistEntry {
  fullName: string;
  email: string;
  type: WaitlistVariant;
  createdAt: string;
}

const CSV_HEADERS: (keyof WaitlistEntry)[] = [
  "fullName",
  "email",
  "type",
  "createdAt",
];

// ── Config ────────────────────────────────────────────────────────────────────
// Set these in the deploy environment (Vercel → Settings → Environment
// Variables) or in .env locally. All three Google values are REQUIRED — the
// waitlist has no file-based fallback:
//   GOOGLE_SHEET_ID              – the id from your spreadsheet URL
//   GOOGLE_SERVICE_ACCOUNT_EMAIL – client_email from the service account JSON
//   GOOGLE_PRIVATE_KEY           – private_key from the service account JSON
//   GOOGLE_SHEET_NAME            – optional, defaults to "Sheet1"
//   TURNSTILE_SECRET_KEY         – Cloudflare Turnstile secret (server-only)
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID ?? "";
const GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n",
);
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

// Server-only. Never prefix with NEXT_PUBLIC_ — that would inline it into the
// browser bundle.
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? "";

// All three must be present. A partial config is treated the same as none: the
// route returns 503 rather than writing signups somewhere nobody is looking.
const GOOGLE_CONFIGURED = Boolean(
  GOOGLE_SHEET_ID && GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY,
);

// ── Google Sheets storage ─────────────────────────────────────────────────────
let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

async function appendGoogleRow(entry: WaitlistEntry): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${GOOGLE_SHEET_NAME}!A:D`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[entry.fullName, entry.email, entry.type, entry.createdAt]],
    },
  });
}

async function googleRows(): Promise<WaitlistEntry[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${GOOGLE_SHEET_NAME}!A:D`,
  });
  const values = res.data.values ?? [];
  // First row is the header – skip it.
  return values
    .slice(1)
    .map(
      (row): WaitlistEntry => ({
        fullName: String(row[0] ?? ""),
        email: String(row[1] ?? "").toLowerCase(),
        type: String(row[2] ?? "") === "user" ? "user" : "lawyer",
        createdAt: String(row[3] ?? ""),
      }),
    )
    .filter((r) => r.email);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Escape a single CSV cell per RFC 4180 (quotes doubled, wrap in quotes when
// the value contains a comma, quote, or newline).
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toCsvRow(entry: WaitlistEntry): string {
  return CSV_HEADERS.map((h) => csvCell(String(entry[h]))).join(",");
}

function entriesToCsv(entries: WaitlistEntry[]): string {
  return [CSV_HEADERS.join(","), ...entries.map(toCsvRow)].join("\n") + "\n";
}

// Returned when the Google Sheets env is missing or partial. There is no file
// fallback by design, so this fails closed rather than writing signups to disk.
function storageNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Waitlist storage isn't configured on this deployment. Add GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to the deploy environment and redeploy.",
    },
    { status: 503 },
  );
}

// Returned when TURNSTILE_SECRET_KEY is absent. Failing closed here means a
// deploy that forgot the secret rejects signups loudly instead of accepting
// unverified ones.
function botProtectionNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Bot protection isn't configured on this deployment. Add TURNSTILE_SECRET_KEY to Vercel and redeploy.",
    },
    { status: 503 },
  );
}

/**
 * Exchange a Turnstile token for a verdict via Cloudflare's siteverify call.
 * A single-use token: Cloudflare rejects a token that has already been consumed,
 * so the client must reset the widget after any failed submit.
 */
async function verifyTurnstileToken(
  token: string,
  remoteip?: string,
): Promise<boolean> {
  const params = new URLSearchParams();
  params.append("secret", TURNSTILE_SECRET_KEY);
  params.append("response", token);
  if (remoteip) params.append("remoteip", remoteip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: params },
  );
  const data = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };
  if (!data.success) {
    console.warn(
      "[waitlist] Turnstile verification failed:",
      data["error-codes"],
    );
  }
  return data.success === true;
}

export async function POST(request: NextRequest) {
  let body: WaitlistPayload;
  try {
    body = (await request.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── Bot protection ─────────────────────────────────────────────────────────
  // Reject bots before validating or touching storage, so a flood of requests
  // can't turn into a flood of Google Sheets reads/writes.
  if (!TURNSTILE_SECRET_KEY) {
    return botProtectionNotConfiguredResponse();
  }

  const turnstileToken = (body.turnstileToken ?? "").trim();
  if (!turnstileToken) {
    return NextResponse.json(
      { error: "Please complete the verification challenge." },
      { status: 400 },
    );
  }

  const remoteip = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const isHuman = await verifyTurnstileToken(turnstileToken, remoteip);
  if (!isHuman) {
    return NextResponse.json(
      { error: "We couldn't verify you're human. Please retry the challenge." },
      { status: 403 },
    );
  }

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const type: WaitlistVariant = body.variant === "user" ? "user" : "lawyer";

  if (!fullName || !emailValid(email)) {
    return NextResponse.json(
      { error: "Please provide a valid full name and email." },
      { status: 400 },
    );
  }

  // ── Storage: Google Sheets only ────────────────────────────────────────────
  if (!GOOGLE_CONFIGURED) {
    return storageNotConfiguredResponse();
  }

  try {
    const existing = await googleRows();
    if (existing.some((r) => r.email === email)) {
      return NextResponse.json(
        { message: "You're already on the waitlist.", duplicate: true },
        { status: 200 },
      );
    }
    await appendGoogleRow({
      fullName,
      email,
      type,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "You're on the waitlist!", success: true },
      { status: 201 },
    );
  } catch (err) {
    console.error("[waitlist] failed to save signup:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your signup. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!GOOGLE_CONFIGURED) {
    return storageNotConfiguredResponse();
  }

  try {
    const csv = entriesToCsv(await googleRows());

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waitlist-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("[waitlist] failed to read spreadsheet:", err);
    return NextResponse.json(
      { error: "Failed to load the waitlist spreadsheet." },
      { status: 500 },
    );
  }
}
