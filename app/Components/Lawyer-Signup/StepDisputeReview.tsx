// app/Components/Lawyer-Signup/StepDisputeReview.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileService } from "@/services/profile.services";
import type { DisputeRecord } from "@/services/profile.services";

export default function StepDisputeReview() {
  const router = useRouter();
  const [dispute, setDispute] = useState<DisputeRecord | null>(null);

  // GET /profile/me/bar-details/dispute backs this screen: the latest dispute,
  // or { dispute: null } when there is nothing on file.
  useEffect(() => {
    profileService
      .getBarDetailsDispute()
      .then((res) => setDispute(res.data.data.dispute))
      .catch(() => {
        /* no dispute record yet — keep the generic copy */
      });
  }, []);

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Your dispute is under review
      </h2>
      <p className="text-[14px] text-gray-500 mb-6 font-dmSans leading-relaxed">
        Your dispute has been submitted successfully and is currently under
        review. We will notify you once verification is complete and your
        dispute has been resolved.
      </p>

      {dispute && (
        <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 mb-8">
          <p className="text-[12px] text-gray-500 font-dmSans">
            Case reference
          </p>
          <p className="text-[14px] font-medium text-gray-800 font-dmSans">
            {dispute.caseReference}
          </p>
          {dispute.scn && (
            <p className="text-[12px] text-gray-500 mt-1 font-dmSans">
              SCN: {dispute.scn}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => router.replace("/dashboard/feeds")}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans"
      >
        Continue
      </button>
    </div>
  );
}
