// app/membership/callback/MembershipCallbackClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { membershipService } from "@/services/membership.services";
import { profileService } from "@/services/profile.services";

export default function MembershipCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirming your payment…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const reference = searchParams.get("reference");

    (async () => {
      // Verify the payment — safe even if it failed or was abandoned.
      if (reference) {
        try {
          await membershipService.verifyPayment(reference);
        } catch {
          // Payment failed/abandoned — account stays Community. Not fatal.
        }
      }

      // Figure out where this user was in onboarding. Route on
      // onboarding.nextStep — not on lawyerProfile/firmProfile being null —
      // and deliberately ignore any ?context= query param, per the
      // integration guide (it exists but is unused).
      try {
        const { data } = await profileService.getMe();
        const account = data.data;
        const nextStep = account.onboarding?.nextStep;

        if (nextStep && nextStep !== "complete") {
          setMessage("Redirecting you back to profile setup…");
          router.replace("/register/lawyer-setup");
          return;
        }
        if (!nextStep) {
          // No onboarding field (older backend) — fall back to the old
          // profile-presence heuristic.
          if (account.role === "LAWYER" && !account.lawyerProfile) {
            setMessage("Redirecting you back to profile setup…");
            router.replace("/register/lawyer-setup");
            return;
          }
          if (account.role === "FIRM" && !account.firmProfile) {
            setMessage("Redirecting you back to profile setup…");
            router.replace("/register/firm-setup");
            return;
          }
        }
      } catch {
        // fall through to dashboard
      }

      // Fully onboarded — this was a plan upgrade from the dashboard, not
      // onboarding. Send them back to see their updated membership status.
      router.replace("/dashboard/membership");
    })();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      <p className="text-[14px] text-gray-500">{message}</p>
    </div>
  );
}
