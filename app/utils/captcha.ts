// app/utils/captcha.ts
//
// CLIENT-ONLY reCAPTCHA token minting for the professional-signup form. This
// module runs in the browser, so it reads only NEXT_PUBLIC_* values; the matching
// secret, score and action checks live server-side (the backend captcha service,
// backend/src/services/captcha.ts) and must never be referenced here.
//
// NOTE: the waitlist form deliberately does NOT use this module — it is
// protected by Cloudflare Turnstile, whose token is verified in
// app/api/waitlist/route.ts.
//
// reCAPTCHA Enterprise is the default. Keys minted in the Google Cloud reCAPTCHA
// console are served by enterprise.js and driven through grecaptcha.enterprise —
// loading api.js or calling grecaptcha.execute() against one of those yields no
// token at all. Set NEXT_PUBLIC_RECAPTCHA_ENTERPRISE=false only for a legacy
// classic v3 key, which uses api.js and grecaptcha.execute. The executor is
// resolved at call time, so either surface works once the script is loaded.
//
// With no site key the helper resolves to `undefined` (captcha deliberately off);
// once a site key is set, failing to mint throws.

// The action this form mints its token under, declared locally so the module
// owns its own constant instead of importing a shared actions file.
const PROFESSIONAL_SIGNUP_ACTION = "professional_signup";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (cb: () => void) => void;
      execute?: (siteKey: string, opts: { action: string }) => Promise<string>;
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, opts: { action: string }) => Promise<string>;
      };
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
// Enterprise unless explicitly turned off, since that is what the Google Cloud
// console issues today.
const IS_ENTERPRISE = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE !== "false";
const SCRIPT_ID = IS_ENTERPRISE ? "recaptcha-enterprise" : "recaptcha-v3";
const DEFAULT_ACTION = PROFESSIONAL_SIGNUP_ACTION;
const LOAD_TIMEOUT_MS = 10_000;
const MINT_TIMEOUT_MS = 10_000;

interface CaptchaExecutor {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

/**
 * reCAPTCHA Enterprise exposes grecaptcha.enterprise.{ready,execute}; the classic
 * v3 script exposes grecaptcha.{ready,execute}. Prefer Enterprise when present so
 * a key works regardless of which script actually served it.
 */
function getExecutor(): CaptchaExecutor | null {
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) return null;

  if (grecaptcha.enterprise) return grecaptcha.enterprise;

  if (
    typeof grecaptcha.ready === "function" &&
    typeof grecaptcha.execute === "function"
  ) {
    return { ready: grecaptcha.ready, execute: grecaptcha.execute };
  }

  return null;
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("captcha: no window"));
      return;
    }
    if (window.grecaptcha) {
      resolve();
      return;
    }
    // Script already injected (e.g. by a previous attempt) — wait for it.
    if (document.getElementById(SCRIPT_ID)) {
      const startedAt = Date.now();
      const iv = window.setInterval(() => {
        if (window.grecaptcha) {
          window.clearInterval(iv);
          resolve();
        } else if (Date.now() - startedAt > LOAD_TIMEOUT_MS) {
          window.clearInterval(iv);
          reject(new Error("captcha: load timeout"));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = IS_ENTERPRISE
      ? `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`
      : `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("captcha: load failed"));
    document.head.appendChild(script);
  });
}

/**
 * Returns a reCAPTCHA token when captcha is configured, otherwise `undefined`.
 *
 * With no site key set, captcha is deliberately off and this resolves to
 * `undefined` — that is not an error. Once a site key *is* set, failing to mint a
 * token is a real failure: this throws rather than returning `undefined` and
 * letting the server reject with an opaque "missing token".
 *
 * @param action Endpoint-specific action. Defaults to the professional-signup
 *               action for backward compat.
 * @throws Error with a user-safe message when the challenge can't be completed.
 */
export async function getRecaptchaToken(
  action: string = DEFAULT_ACTION,
): Promise<string | undefined> {
  // Captcha disabled (no site key configured) — not an error, just no token.
  if (!SITE_KEY) return undefined;

  try {
    await loadScript();

    const executor = getExecutor();
    if (!executor) throw new Error("grecaptcha unavailable after load");

    const token = await Promise.race([
      new Promise<string>((resolve, reject) => {
        executor.ready(() => {
          executor.execute(SITE_KEY, { action }).then(resolve).catch(reject);
        });
      }),
      // Don't let a hung challenge leave the submit button spinning forever.
      new Promise<never>((_, reject) =>
        window.setTimeout(
          () => reject(new Error("execute timed out")),
          MINT_TIMEOUT_MS,
        ),
      ),
    ]);

    if (!token) throw new Error("empty token returned");
    return token;
  } catch (err) {
    console.error("[captcha] token minting failed:", err);
    throw new Error(
      "We couldn't complete the security check. Please refresh the page and try again.",
    );
  }
}
