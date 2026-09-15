// app/signin/SignInClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoginPayload } from "@/services/auth.services";
import { AuthError, useAuth } from "../context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import loginHeroImage from "../../public/signup-illustration.png";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import WaitlistPlaceholder from "../Components/WaitlistPlaceholder";

/**
 * Whether the sign-in page shows the waitlist variant.
 *
 * The `NEXT_PUBLIC_` prefix is required: Next.js only inlines env vars with
 * that prefix into the client bundle, so a bare `WAILTLIST` check would always
 * be `undefined` here and the waitlist branch would never render.
 */
const WAITLIST_ENABLED = ["true", "1"].includes(
  process.env.NEXT_PUBLIC_WAITLIST?.trim().toLowerCase() ?? "",
);

declare const google: {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: string;
          size?: string;
          width?: string;
          text?: string;
        },
      ) => void;
    };
  };
};

export default function SignInClient() {
  const { login, loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const callbackError = searchParams.get("error");

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const payload: LoginPayload = { authProvider: "email", email, password };
      await login(payload);
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setError(authErr?.message ?? "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (typeof google === "undefined") return;

      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (resp: { credential: string }) => {
          setGoogleLoading(true);
          setError("");
          try {
            const base64 = resp.credential
              .split(".")[1]
              .replace(/-/g, "+")
              .replace(/_/g, "/");
            const payload = JSON.parse(atob(base64));
            const fullName =
              payload.name ??
              `${payload.given_name ?? ""} ${payload.family_name ?? ""}`.trim();
            const avatarUrl = payload.picture ?? undefined;
            await loginWithGoogle(resp.credential, fullName, avatarUrl);
          } catch (err: unknown) {
            const authErr = err as AuthError;
            setError(
              authErr?.message ?? "Google sign in failed. Please try again.",
            );
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      if (googleButtonRef.current) {
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "continue_with",
        });
      }
    };

    const interval = setInterval(() => {
      if (typeof google !== "undefined") {
        clearInterval(interval);
        initGoogle();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loginWithGoogle]);

  const anyLoading = isLoading || googleLoading;

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black">
      <Navbar />

      {/* Main content area — vertically centered */}
      <main className="flex-1 w-full flex items-center pb-0">
        {/*
          mt-30 lg:mt-0 keeps content clear of the fixed Navbar on small
          viewports (main is vertically centered within the full-height
          flex column, and the fixed nav takes up no flex space, so short
          mobile screens were centering the "Welcome Back" heading partly
          underneath it). Mirrors the same offset already used in
          StepEmail.tsx for consistency.
        */}
        <div className="w-full mx-auto mt-30 lg:mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2  items-center gap-2">
            {/* Illustration — desktop only */}
            <div className="hidden lg:block">
              <Image
                src={loginHeroImage}
                alt="Lawyer reviewing documents at her desk"
                className="w-full h-auto object-cover"
                priority
              />
            </div>

            {/* Sign-in content */}
            {/* Waitlist variant is a placeholder and will be redesigned. */}
            {WAITLIST_ENABLED ? (
              <WaitlistPlaceholder variant="lawyer" />
            ) : (
              <div className="w-full px-8 md:px-20 text-left">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight font-dmSans">
                  Welcome Back
                </h1>
                <p className="text-base sm:text-lg text-gray-500 mb-8 leading-relaxed font-dmSans">
                  Sign in to access your profile, opportunities, research tools,
                  and everything The Legal Space has to offer.
                </p>

                {/* Callback error */}
                {callbackError && (
                  <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-[13px] text-red-600 font-dmSans">
                      {callbackError === "google_failed"
                        ? "Google sign in failed. Please try again."
                        : "Something went wrong. Please try again."}
                    </p>
                  </div>
                )}

                {/* Email / password form */}
                <form
                  onSubmit={handleEmailSubmit}
                  className="flex flex-col gap-4 font-dmSans"
                >
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={anyLoading}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-600">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={anyLoading}
                        className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-[13px] text-red-600 -mt-1">{error}</p>
                  )}

                  {/* Forgot password */}
                  <div className="flex justify-end -mt-1">
                    <Link
                      href="/forgot-password"
                      className="text-[13px] text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={anyLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-3.5 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#1648b8] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Signing
                        in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>
                </form>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[12px] text-gray-400 font-dmSans">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Google button (hidden real button overlaid by custom one) */}
                <div className="relative">
                  <div
                    ref={googleButtonRef}
                    className="w-full overflow-hidden"
                    style={{ minHeight: "48px" }}
                  />
                  {googleLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Register link */}
                <p className="mt-6 text-center text-sm text-gray-600 font-dmSans">
                  New to TheLegalSpace?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Create a free account
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer visible={false} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
