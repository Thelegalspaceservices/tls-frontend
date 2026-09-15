// components/settings/SettingsPage.tsx
"use client";

import { useMe } from "@/hooks/useProfile";
import { usePracticeAreas } from "@/hooks/usePracticeAreas";

import { Loader2 } from "lucide-react";
import PersonalInfoSection from "./PersonalInfoSection";
import PracticeAreasSection from "./PracticeAreasSection";
import ServicesPricingSection from "./ServicesPricingSection";
import NotificationsSection from "./NotificationsSection";
import DeleteAccountSection from "./DeleteAccountSection";
import { useAuth } from "@/app/context/AuthContext";
import { USER_ROLES } from "@/app/types/types";
import AnonymousSection from "./AnonymousSection";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMe();
  const { data: allPracticeAreas = [] } = usePracticeAreas();

  const isLawyer = user?.role === USER_ROLES.LAWYER;
  const isFirm = user?.role === USER_ROLES.FIRM;
  const isLawyerOrFirm = isLawyer || isFirm;

  const isUser = user?.role === USER_ROLES.USER;
  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const account = profile.data;

  const practiceAreas = account.practiceAreas ?? [];
  const practiceAreaNames: string[] = practiceAreas.map(
    (a: string | { name: string; id: string }) =>
      typeof a === "string" ? a : a.name,
  );
  const practiceAreaIds: string[] = practiceAreas.map(
    (a: string | { name: string; id: string }) =>
      typeof a === "string"
        ? (allPracticeAreas.find((p) => p.name === a)?.id ?? "")
        : a.id,
  );

  // ✅ Per-area fee ranges (kobo) for lawyers/firms — fees now live on each
  // practice area (the backend returns minFee/maxFee per area).
  const areasWithFees: {
    id: string;
    name: string;
    minFee: number;
    maxFee: number;
  }[] = isLawyerOrFirm
    ? practiceAreas.map(
        (
          a:
            | string
            | { id: string; name: string; minFee?: number; maxFee?: number },
          i: number,
        ) => {
          const obj = typeof a === "string" ? null : a;
          return {
            id: practiceAreaIds[i] ?? obj?.id ?? "",
            name: practiceAreaNames[i] ?? "",
            minFee: obj?.minFee ?? 0,
            maxFee: obj?.maxFee ?? 0,
          };
        },
      )
    : [];

  const existingFees = areasWithFees.map((a) => ({
    id: a.id,
    minFee: a.minFee,
    maxFee: a.maxFee,
  }));

  // Split full name
  const nameParts = (account.fullName ?? "").split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Sticky header */}
      <div className="z-10 bg-white ">
        <h1 className="fixed w-full top-0 bg-white border-b border-[#E5E7EB]  font-[Instrument_Serif] text-[20px] leading-none font-light text-[#1F2937] pb-6 pt-7.5 ps-4">
          Settings
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-4 divide-y divide-gray-100 py-3 w-[70%] border-r border-[#E5E7EB] mt-18">
        <PersonalInfoSection
          fullName={account.fullName ?? ""}
          email={account.email ?? ""}
          phone={account.phone ?? ""}
          role={account.role ?? "USER"}
        />
        {isUser && (
          <AnonymousSection isAnonymous={account.isAnonymous ?? false} />
        )}
        {isLawyerOrFirm && (
          <PracticeAreasSection
            practiceAreas={allPracticeAreas}
            currentAreaNames={practiceAreaNames}
            currentIds={practiceAreaIds}
            primaryId={practiceAreaIds[0] ?? ""}
            secondaryId={practiceAreaIds[1] ?? ""}
            role={account.role ?? "LAWYER"}
            existingFees={existingFees}
          />
        )}
        {isLawyerOrFirm && <ServicesPricingSection areas={areasWithFees} />}
        {isLawyerOrFirm && <NotificationsSection />}
        <DeleteAccountSection />
      </div>
    </div>
  );
}
