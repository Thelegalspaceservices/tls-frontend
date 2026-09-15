// app/Components/Lawyer-Signup/StepIdentity.tsx
"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { profileService } from "@/services/profile.services";
import type { IdentityOutcome } from "@/services/profile.services";

interface Props {
  onComplete: () => void;
}

type LocalState = {
  outcome: IdentityOutcome | null;
  detail?: string;
  attemptsRemaining?: number;
  flaggedForReview?: boolean;
};

const boxCls = "border border-gray-200 rounded-xl overflow-hidden bg-white";
const inputCls =
  "w-full px-3 py-3 text-[14px] outline-none focus:border-[#1A56DB] transition-colors bg-transparent placeholder:text-gray-400 font-dmSans";

export default function StepIdentity({ onComplete }: Props) {
  const [nin, setNin] = useState("");
  const [consent, setConsent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<LocalState>({ outcome: null });
  const [loadingResume, setLoadingResume] = useState(true);

  // Resume support — if the user already has an identity verdict on the
  // backend (e.g. they closed the tab mid-flow), pick it up here instead of
  // making them re-enter the NIN and burn another attempt.
  useEffect(() => {
    (async () => {
      try {
        const res = await profileService.getVerification();
        const identity = res.data.data.identity;
        if (identity && identity.status !== "no_match" && identity.status && identity.status !== "pending") {
          setState({
            outcome: identity.status as IdentityOutcome,
            attemptsRemaining: identity.attemptsRemaining,
            flaggedForReview: identity.flaggedForReview,
          });
        }
      } catch {
        // No verification record yet, or request failed — start fresh.
      } finally {
        setLoadingResume(false);
      }
    })();
  }, []);

  const canSubmit = /^\d{11}$/.test(nin) && consent;

  const handleVerify = async () => {
    setError("");
    if (!consent) { setError("Please consent to identity verification to continue."); return; }
    if (!/^\d{11}$/.test(nin)) { setError("Enter a valid 11-digit NIN."); return; }
    setChecking(true);
    try {
      const res = await profileService.verifyIdentity({ nin, consent });
      const data = res.data.data;
      setState({
        outcome: data.outcome,
        detail: data.detail,
        attemptsRemaining: data.attemptsRemaining,
        flaggedForReview: data.flaggedForReview,
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (status === 409
          ? "Support has been notified about this identity check."
          : "Couldn't verify your identity. Please try again.");
      setError(message);
    } finally {
      setChecking(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setError("");
    setSubmitting(true);
    try {
      await profileService.submitApplication();
      onComplete();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't submit your application. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingResume) {
    return (
      <div className="w-full max-w-md flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const readyToSubmit = state.outcome === "matched" || state.outcome === "unchecked";

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Verify your identity
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        We confirm your NIN matches the name on this profile
      </p>

      <div className="flex flex-col gap-3 mb-5">
        <div className={`relative ${boxCls}`}>
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={nin}
            onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="National Identification Number"
            inputMode="numeric"
            disabled={readyToSubmit}
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="px-4 py-3 rounded-xl bg-[#F0F6FF] border border-[#DCE8FE]">
          <p className="text-[12px] font-medium text-gray-800 font-dmSans">How we use this</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed font-dmSans">
            Your NIN is sent to our verification partner to confirm your name
            and photo match. It is not stored on TLS servers and is used
            only for this check, in line with NDPR.
          </p>
        </div>

        {!readyToSubmit && (
          <label className="flex items-start gap-2 text-[13px] text-gray-600 font-dmSans cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            I consent to identity verification for the purpose of bar
            registration.
          </label>
        )}

        {/* matched / unchecked — success panel */}
        {readyToSubmit && (
          <div
            className={`px-4 py-3 rounded-xl border ${
              state.outcome === "matched" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${state.outcome === "matched" ? "text-green-500" : "text-gray-400"}`}
              />
              <p className="text-[13px] font-medium text-gray-800 font-dmSans">
                {state.outcome === "matched" ? "NIN record matched" : "We'll check this manually"}
              </p>
            </div>
            <p className="text-[12px] text-gray-500 mt-1 pl-6 font-dmSans">
              {state.outcome === "matched"
                ? "Your Name matches with NIN listing."
                : "Your identity will be checked manually during review — you can continue."}
            </p>
          </div>
        )}

        {/* no_match — name mismatch, retry */}
        {state.outcome === "no_match" && !state.flaggedForReview && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50">
            <p className="text-[13px] font-semibold text-gray-900 font-dmSans">Name doesn&apos;t match</p>
            <p className="text-[12px] text-gray-600 mt-1 leading-relaxed font-dmSans">
              {state.detail ??
                "The name on this NIN doesn't match the name on your bar details. The name has to be in this exact order."}
              {typeof state.attemptsRemaining === "number" && (
                <> You have {state.attemptsRemaining} attempt{state.attemptsRemaining === 1 ? "" : "s"} remaining.</>
              )}
            </p>
            <a href="/support" className="text-[12px] text-[#1A56DB] font-medium underline mt-2 inline-block">
              Contact support
            </a>
          </div>
        )}

        {/* attempts exhausted — flagged, not blocked */}
        {state.flaggedForReview && (
          <div className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[13px] font-semibold text-gray-900 font-dmSans">Flagged for manual review</p>
            </div>
            <p className="text-[12px] text-gray-600 mt-1 pl-6 leading-relaxed font-dmSans">
              We couldn&apos;t verify your identity automatically after
              repeated attempts. You can still complete registration below —
              our support team has been notified and will review your case.
            </p>
            <a href="/support" className="text-[12px] text-[#1A56DB] font-medium underline mt-2 ml-6 inline-block">
              Contact support
            </a>
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3 font-dmSans">{error}</p>}

      {readyToSubmit || state.flaggedForReview ? (
        <button
          onClick={handleCompleteRegistration}
          disabled={submitting}
          className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-dmSans"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting…" : "Complete Registration"}
        </button>
      ) : (
        <button
          onClick={handleVerify}
          disabled={checking || !canSubmit}
          className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-dmSans"
        >
          {checking && <Loader2 className="w-4 h-4 animate-spin" />}
          {checking ? "Checking…" : "Verify Identity"}
        </button>
      )}
    </div>
  );
}
