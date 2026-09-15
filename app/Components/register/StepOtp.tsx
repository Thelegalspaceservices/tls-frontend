// app/Components/register/StepOtp.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
// Uses the same updated illustration as StepEmail — the two are consecutive
// steps in the /signup flow and must stay visually consistent.
import signupIllustration from "@/public/signup-hero.png";
import Image from "next/image";

interface Props {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  initialError?: string;
  isLoading?: boolean;
}

//otp_length has been changed from 8 to 6
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 50;

export default function StepOtp({
  email,
  onVerify,
  onResend,
  initialError = "",
  isLoading = false,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState(initialError);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto focus first input
  useEffect(() => {
    if (!isSuccess) {
      inputRefs.current[0]?.focus();
    }
  }, [isSuccess]);

  const handleChange = (index: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const next = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < OTP_LENGTH) next[index + i] = pasted[i];
      }
      setDigits(next);
      const focusIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerify();
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit verification code.`);
      return;
    }
    setError("");
    setIsVerifying(true);
    try {
      await onVerify(otp);
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Invalid code. Please try again.",
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    try {
      await onResend();
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      setIsSuccess(false);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      if (
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("too many") ||
        err?.response?.status === 429
      ) {
        setError(
          "Too many attempts. Please wait a few minutes before requesting a new code.",
        );
        setCountdown(120);
      } else {
        setError(msg || "Failed to resend code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Mask email for display
  const maskedEmail = email
    ? email.replace(
        /(.{2})(.*)(@.*)/,
        (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c,
      )
    : "";

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black">
      <Navbar />

      <main className="flex-1 w-full">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-stretch">
            {/* Illustration — fills full height just like StepEmail */}
            <div className="hidden lg:block overflow-hidden">
              <Image
                src={signupIllustration}
                alt="Scales of justice on a desk"
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Form */}
            <div className="w-full flex flex-col justify-center py-8 lg:py-0 max-w-160 mx-auto mt-30 lg:pr-10 lg:mt-0 lg:mx-0 font-dmSans">
              {isSuccess ? (
                // Success State
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight font-dmSans text-gray-900">
                    Email Verified 🎉
                  </h1>
                  <p className="text-[15px] text-gray-500 mb-8 leading-relaxed font-dmSans max-w-md">
                    Your email has been successfully verified. Let&apos;s continue
                    setting up your professional account.
                  </p>
                  <button
                    onClick={handleVerify}
                    className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648b8] text-white text-[14px] font-medium rounded-xl transition-colors flex items-center justify-center gap-2 font-dmSans shadow-sm"
                  >
                    Continue to Profile Setup
                  </button>
                </div>
              ) : (
                // OTP Form
                <>
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 leading-tight font-dmSans text-gray-900">
                    Verify Your Email
                  </h1>
                  <p className="text-[15px] text-gray-500 mb-8 leading-relaxed font-dmSans">
                    We&apos;ve sent a verification code to{" "}
                    <span className="text-gray-900 font-medium">
                      {maskedEmail}
                    </span>
                    . Enter the code below to continue your registration.
                  </p>

                  {error && (
                    <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-[12px] text-red-600 font-dmSans">{error}</p>
                    </div>
                  )}

                  {/* OTP inputs */}
                  <div className="flex gap-2 sm:gap-2.5 mb-6 justify-start">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={OTP_LENGTH}
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        disabled={isVerifying || isLoading}
                        className={`w-9 sm:w-11 md:w-12 h-12 sm:h-14 text-center text-[18px] font-semibold rounded-xl text-black outline-none transition-all border ${
                          digit
                            ? "border-[#1A56DB] bg-[#1A56DB]/5"
                            : "border-gray-200 focus:border-gray-400"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                    ))}
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerify}
                    disabled={
                      isVerifying ||
                      isLoading ||
                      digits.join("").length < OTP_LENGTH
                    }
                    className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648b8] text-white text-[14px] font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4 font-dmSans shadow-sm"
                  >
                    {isVerifying && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isVerifying ? "Verifying..." : "Verify & Continue"}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[12px] text-gray-400 font-dmSans">
                      Didn&apos;t receive the code?
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Resend Button */}
                  <button
                    onClick={handleResend}
                    disabled={countdown > 0 || isResending}
                    className="w-full py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-dmSans"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        Resend code
                        {countdown > 0 && (
                          <span className="text-gray-400 font-dmSans">
                            ({formatTime(countdown)})
                          </span>
                        )}
                      </>
                    )}
                  </button>

                  {/* Back to Login */}
                  <div className="mt-6 text-center">
                    <p className="text-[13px] text-gray-400 font-dmSans">
                      Changed your mind?{" "}
                      <Link
                        href="/signin"
                        className="text-[#1A56DB] hover:text-[#1648b8] transition-colors font-medium font-dmSans"
                      >
                        Back to Sign In
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer visible={false} />
    </div>
  );
}
