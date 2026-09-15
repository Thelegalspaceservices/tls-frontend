// app/Components/Lawyer-Signup/StepUnderReview.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { profileService } from "@/services/profile.services";

interface Props {
  /** Called once the account flips to select_plan — moves to the verified screen. */
  onVerified: () => void;
}

const POLL_INTERVAL_MS = 20000;

export default function StepUnderReview({ onVerified }: Props) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const firedRef = useRef(false);
  // No design exists yet for a distinct "rejected" screen — this checks
  // the same GET /profile/me/verification the doc backs step 8 with, and
  // swaps in different copy rather than showing a misleading "under
  // review" message to someone who's actually been rejected.
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    profileService
      .getVerification()
      .then((res) => setRejected(res.data.data.status === "rejected"))
      .catch(() => {});
  }, []);

  // Approval is manual and nobody is on the queue yet — this can take a
  // while. Poll GET /profile/me in the background rather than making the
  // user refresh the page themselves once they're notified.
  useEffect(() => {
    if (rejected) return;
    const interval = setInterval(async () => {
      if (firedRef.current) return;
      const account = await refreshUser();
      if (account?.onboarding?.nextStep === "select_plan") {
        firedRef.current = true;
        onVerified();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejected]);

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        {rejected ? "Your application wasn't approved" : "Your application is under review"}
      </h2>
      <p className="text-[14px] text-gray-500 mb-8 font-dmSans leading-relaxed">
        {rejected
          ? "Our team reviewed your submission and couldn't verify it. Please reach out to support to find out what to correct."
          : "Your profile has been submitted successfully and is currently under review. We'll notify you once verification is complete and your account has been approved."}
      </p>
      {rejected && (
        <a
          href="/support"
          className="block w-full text-center py-3.5 border border-gray-200 text-gray-700 text-[14px] font-medium rounded-xl hover:bg-gray-50 transition-colors font-dmSans mb-3"
        >
          Contact support
        </a>
      )}
      <button
        onClick={() => router.replace("/dashboard/feeds")}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans"
      >
        See you soon!
      </button>
    </div>
  );
}
