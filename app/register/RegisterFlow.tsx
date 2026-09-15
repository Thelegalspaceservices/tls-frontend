// app/Components/register/RegisterFlow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerService } from "@/services/auth.register.services";
import { getRecaptchaToken } from "@/app/utils/captcha";
import { useAuth, getPostAuthRoute } from "@/app/context/AuthContext";
import StepEmail from "@/app/Components/register/StepEmail";
import StepOtp from "@/app/Components/register/StepOtp";

type Step = "email" | "otp";

export default function RegisterFlow() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { saveSession } = useAuth();
  const [otpError, setOtpError] = useState("");

  const handleStart = async (payload: {
    email: string;
    password: string;
    role: "USER" | "PENDING_PROFESSIONAL";
  }) => {
    setError("");
    setOtpError("");
    setIsLoading(true);
    try {
      // Only present when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is configured; the
      // backend ignores it unless CAPTCHA_ENABLED=true.
      const captchaToken = await getRecaptchaToken();
      await registerService.start({
        ...payload,
        ...(captchaToken ? { captchaToken } : {}),
      });
      setEmail(payload.email);
      setStep("otp");
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const msg = apiErr?.response?.data?.message ?? "";
      const status = apiErr?.response?.status;

      if (
        status === 429 ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("too many")
      ) {
        setEmail(payload.email);
        setOtpError(
          "A code was already sent to this email. Please check your inbox or wait before requesting a new one.",
        );
        setStep("otp");
      } else if (
        status === 409 ||
        msg.toLowerCase().includes("already exists")
      ) {
        setError(
          "An account with this email already exists. Please sign in instead.",
        );
      } else {
        setError(msg || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (otp: string) => {
    setError("");
    setOtpError("");
    const res = await registerService.verify({ email, otp });
    const { account, session } = res.data.data;
    saveSession({ account, session });
    const route = getPostAuthRoute(account);
    router.replace(route);
  };

  const handleResend = async () => {
    await registerService.resend(email);
  };

  return (
    <>
      {step === "email" && (
        <StepEmail onNext={handleStart} isLoading={isLoading} error={error} />
      )}
      {step === "otp" && (
        <StepOtp
          email={email}
          onVerify={handleVerify}
          onResend={handleResend}
          initialError={otpError}
        />
      )}
    </>
  );
}
