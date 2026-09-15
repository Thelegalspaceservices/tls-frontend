// app/Components/WaitlistPlaceholder.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, User } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Cloudflare Turnstile is loaded from its CDN and driven through the
// `window.turnstile` global it installs. Declared here (same pattern the
// signup flow uses for `grecaptcha`) so the calls below are typed.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export type WaitlistVariant = "lawyer" | "user";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";
// NEXT_PUBLIC_* so Next.js inlines it into the browser bundle. The matching
// secret is server-only and read in app/api/waitlist/route.ts.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const COPY: Record<
  WaitlistVariant,
  { heading: string; subheading: string; success: string; social: string }
> = {
  lawyer: {
    heading: "Join the lawyer waitlist",
    subheading:
      "TLS launches soon. Join now and we'll email you the moment verified lawyer registration opens.",
    success: "We'll shoot you an email when TLS is open for lawyers!",
    social: "Over 2,000 lawyers are already on board!",
  },
  user: {
    heading: "Join the user waitlist",
    subheading:
      "TLS launches soon. Join now and we'll email you the moment user registration opens.",
    success: "We'll shoot you an email when TLS is open for clients!",
    social: "Over 2,000 users are already on board!",
  },
};

interface WaitlistPlaceholderProps {
  variant?: WaitlistVariant;
}

/**
 * Reusable waitlist form shown while the redesigned landing page is in flight.
 *
 * It accepts an optional `variant` ("lawyer" | "user") or reads from URL/localStorage
 * and renders the matching waitlist form.
 *
 * Bot protection: a real Cloudflare Turnstile widget issues a single-use token
 * that is sent to /api/waitlist and verified server-side before anything is
 * written. There is no longer a client-only checkbox — the server is the
 * authority on whether a submission is human.
 */
export default function WaitlistPlaceholder({
  variant: initialVariant,
}: WaitlistPlaceholderProps = {}) {
  const [variant, setVariant] = useState<WaitlistVariant>(
    initialVariant ?? "lawyer",
  );
  const searchParams = useSearchParams();

  // Pick the form content from the provided prop, search param, or stored audience preference.
  useEffect(() => {
    if (initialVariant) {
      setVariant(initialVariant);
      return;
    }
    const paramType = searchParams?.get("type");
    if (paramType === "lawyer" || paramType === "user") {
      setVariant(paramType);
      return;
    }
    const stored = localStorage.getItem("loginType");
    if (stored === "lawyer" || stored === "user") {
      setVariant(stored);
    }
  }, [initialVariant, searchParams]);

  const copy = COPY[variant];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY) return;
    if (typeof window === "undefined") return;
    if (!window.turnstile || !turnstileContainerRef.current) return;
    if (turnstileWidgetIdRef.current) return; // already rendered, avoid duplicates
    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      },
    );
  };

  const resetTurnstile = () => {
    setTurnstileToken(null);
    if (
      typeof window !== "undefined" &&
      window.turnstile &&
      turnstileWidgetIdRef.current
    ) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  };

  // Draw the widget once Turnstile's loader has fired onLoad. The render call is
  // guarded by the widget id ref, so a re-run can't produce a duplicate widget.
  useEffect(() => {
    if (turnstileReady) renderTurnstile();
  }, [turnstileReady]);

  // Turnstile owns the DOM it injects; tear it down when the form unmounts.
  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        window.turnstile &&
        turnstileWidgetIdRef.current
      ) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Widget already gone — nothing to remove.
        }
      }
      turnstileWidgetIdRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim()) {
      setError("Please fill in your name and email.");
      return;
    }
    // The widget issues a token only once the challenge is solved.
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);
    try {
      // Persist the signup server-side (frontend /api/waitlist route) into the
      // waitlist spreadsheet, then show the success state. The Turnstile token
      // is single-use and verified on the server via Cloudflare's siteverify.
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, variant, turnstileToken }),
      });
      const data = await res.json().catch(() => null);
      // The API returns HTTP 200 with a `duplicate: true` flag when this email
      // is already on the list, so surface it as an error instead of success.
      if (data?.duplicate) {
        throw new Error(data.message ?? "You're already on the waitlist.");
      }
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to join the waitlist.");
      }
      setSubmitted(true);
    } catch (err) {
      // Turnstile tokens are single-use: if the server rejected the request for
      // any reason the widget must be reset, otherwise a retry would silently
      // fail token verification.
      resetTurnstile();
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full flex flex-col justify-center py-8 lg:py-0 max-w-160 mx-auto mt-30 lg:px-10 lg:mt-0 lg:mx-0 font-dmSans">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight font-dmSans text-gray-900">
          Thanks, {fullName.split(" ")[0] || "there"} 😊.
        </h1>
        <p className="text-[15px] sm:text-base text-gray-500 mb-8 leading-relaxed font-dmSans">
          {copy.success}
        </p>
        <Link
          href="/"
          className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648b8] text-white text-[14px] font-medium rounded-xl transition-colors flex items-center justify-center font-dmSans shadow-sm"
        >
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col justify-center py-8 lg:py-0 max-w-160 mx-auto mt-30 lg:px-10 lg:mt-0 lg:mx-0 font-dmSans">
      <span className="inline-block w-fit mb-6 px-3 py-1.5 bg-blue-50 text-[#1A56DB] text-[12px] font-medium rounded-full font-dmSans">
        THE LEGAL SPACE IS LAUNCHING SOON!!! 🎉
      </span>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight font-dmSans text-gray-900">
        {copy.heading}
      </h1>
      <p className="text-[15px] sm:text-base text-gray-500 mb-8 leading-relaxed font-dmSans">
        {copy.subheading}
      </p>

      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-[12px] text-red-600 font-dmSans">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        {/* Full name */}
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="name"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {["/avatar01.webp", "/avatar02.webp", "/avatar03.webp"].map((src, i) => (
              <Image
                key={i}
                src={src}
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          <p className="text-[13px] text-gray-500">{copy.social}</p>
        </div>

        {/* Real Cloudflare Turnstile widget — the server rejects any submission
            whose token it can't verify. */}
        <Script
          src={TURNSTILE_SCRIPT_SRC}
          async
          defer
          onLoad={() => setTurnstileReady(true)}
        />
        <div ref={turnstileContainerRef} className="flex justify-center" />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648b8] text-white text-[14px] font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Please wait..." : "Join waitlist"}
        </button>
      </form>
    </div>
  );
}
