// app/Components/register/StepEmail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";
import Image from "next/image";
import WaitlistPlaceholder from "../WaitlistPlaceholder";

import signupHeroImage from "@/public/signup-hero.png";
import { AuthError, useAuth } from "@/app/context/AuthContext";

/**
 * Whether the registration form shows the waitlist variant.
 *
 * The `NEXT_PUBLIC_` prefix is required: Next.js only inlines env vars with
 * that prefix into the client bundle, so the previous `WAILTLIST` check was
 * always `undefined` in this component and the waitlist form never rendered.
 */
const WAITLIST_ENABLED = ["true", "1"].includes(
  process.env.NEXT_PUBLIC_WAITLIST?.trim().toLowerCase() ?? "",
);

interface Props {
  onNext: (payload: {
    email: string;
    password: string;
    role: "USER" | "PENDING_PROFESSIONAL";
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}
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
export default function StepEmail({
  onNext,
  isLoading = false,
  error = "",
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();

  const displayError = localError || error;

  const hasMinLength = password.length >= 8;
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

  const validate = () => {
    if (!email || !password || !confirmPassword) {
      setLocalError("Please fill in all fields.");
      return false;
    }
    // if (!email.toLowerCase().endsWith(NIGERIAN_BAR_DOMAIN)) {
    //   setLocalError(
    //     "Legal professionals must register with a valid Nigerian Bar email address (username@nigerianbar.ng).",
    //   );
    //   return false;
    // }
    if (!hasMinLength) {
      setLocalError("Password must be at least 8 characters.");
      return false;
    }
    if (!hasSpecialChar) {
      setLocalError("Password must contain at least one special character.");
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (role: "PENDING_PROFESSIONAL") => {
    setLocalError("");
    if (!validate()) return;
    await onNext({ email, password, role });
  };

  useEffect(() => {
    const initGoogle = () => {
      if (typeof google === "undefined") return;

      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (resp: { credential: string }) => {
          setLocalError("");
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
            setLocalError(
              authErr?.message ?? "Google sign in failed. Please try again.",
            );
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black">
      <Navbar />

      <main className="flex-1 w-full">
        <div className="w-full   ">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-stretch">
            {/* Illustration */}
            <div className="hidden lg:block  overflow-hidden">
              <Image
                src={signupHeroImage}
                alt="Scales of justice on a desk"
                className="w-full h-full object-cover "
                priority
              />
            </div>

            {/* Form */}
            {/* Waitlist variant is a reusable form driven by loginType. */}
            {WAITLIST_ENABLED ? <WaitlistPlaceholder /> : renderEmailForm()}
          </div>
        </div>
      </main>

      <Footer visible={false} />
    </div>
  );

  function renderEmailForm() {
    return (
      <div className="w-full flex flex-col justify-center py-8 lg:py-0 max-w-160 mx-auto mt-30 lg:pr-10 lg:mt-0 lg:mx-0">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight">
          Join as a legal professional
        </h1>
        <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">
          Create your verified profile and start building your professional
          presence.
        </p>

        {displayError && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[12px] text-red-600">{displayError}</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPw ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Password hints */}
          <div className="flex flex-col gap-1">
            <p
              className={`text-[12px] flex items-center gap-2 transition-colors ${hasMinLength ? "text-green-600" : "text-gray-400"}`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded border text-[10px] leading-none ${
                  hasMinLength
                    ? "bg-green-50 border-green-400 text-green-600"
                    : "border-gray-300 text-transparent"
                }`}
              >
                ✓
              </span>
              Must be at least 8 characters
            </p>
            <p
              className={`text-[12px] flex items-center gap-2 transition-colors ${hasSpecialChar ? "text-green-600" : "text-gray-400"}`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded border text-[10px] leading-none ${
                  hasSpecialChar
                    ? "bg-green-50 border-green-400 text-green-600"
                    : "border-gray-300 text-transparent"
                }`}
              >
                ✓
              </span>
              Must contain one special character
            </p>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit("PENDING_PROFESSIONAL");
              }}
              className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 disabled:opacity-50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmit("PENDING_PROFESSIONAL")}
            disabled={isLoading}
            className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648b8] text-white text-[14px] font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Please wait..." : "Create Account"}
          </button>

          {/* Divider */}
          {/* <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[12px] text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div> */}

          {/* Google sign in */}
          {/* <div className="relative">
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
        </div> */}

          {/* Already have an account */}
          <div className="text-center mt-2">
            <p className="text-[13px] text-gray-400">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-[#1A56DB] hover:text-[#1648b8] transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }
}