// app/Components/Lawyer-Signup/StepBarCollision.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { profileService } from "@/services/profile.services";
import type { BarDetailsResponse } from "@/services/profile.services";

interface Props {
  scn: string;
  existingAccount: BarDetailsResponse["data"]["existingAccount"];
  onEditDetails: () => void;
  onFlagged: (disputeId: string, caseReference: string) => void;
}

export default function StepBarCollision({
  scn,
  existingAccount,
  onEditDetails,
  onFlagged,
}: Props) {
  const router = useRouter();
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState("");

  const handleFlag = async () => {
    setError("");
    setFlagging(true);
    try {
      const res = await profileService.flagBarDetailsDispute({ scn });
      const { dispute } = res.data.data;
      onFlagged(dispute.id, dispute.caseReference);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't submit the flag. Please try again.";
      setError(message);
    } finally {
      setFlagging(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        This SCN is already registered
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        Supreme Court Number is linked to an existing account. Your profile
        has not been created.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <div className="border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 font-dmSans bg-gray-50">
          {existingAccount?.fullName}
        </div>
        <div className="border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 font-dmSans bg-gray-50">
          {existingAccount?.scn}
        </div>
        <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
          <span className="text-[14px] text-gray-700 font-dmSans">
            {existingAccount?.email}
          </span>
          <span className="text-[12px] font-medium text-[#1A56DB]">
            {existingAccount?.statusLabel}
          </span>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3 font-dmSans">{error}</p>}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onEditDetails}
          className="w-full py-3.5 border border-gray-200 text-gray-700 text-[14px] font-medium rounded-xl hover:bg-gray-50 transition-colors font-dmSans"
        >
          I messed up my SCN. Let&apos;s sort that out!
        </button>
        <button
          onClick={() => router.push("/signin")}
          className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans"
        >
          Here&apos;s my SCN! I totally remember having an account.
        </button>
        <button
          onClick={handleFlag}
          disabled={flagging}
          className="w-full py-3.5 bg-red-600 text-white text-[14px] font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-dmSans"
        >
          {flagging && <Loader2 className="w-4 h-4 animate-spin" />}
          Someone is impersonating me. Flag for review.
        </button>
      </div>
    </div>
  );
}
