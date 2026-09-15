// app/Components/LawyerProfileView.tsx
"use client";

import { ChevronRight } from "lucide-react";
import ProfileCard, { ProfileData } from "./ProfileCard";
import EventsPanel from "./EventPanel";
import { useProfileById } from "@/hooks/useProfile";

interface Props {
  accountId: string;
  /** Return to the previous view. */
  onBack: () => void;
  /** Label for back navigation button/breadcrumb. Defaults to "Search Results". */
  backLabel?: string;
}

export default function LawyerProfileView({
  accountId,
  onBack,
  backLabel = "Search Results",
}: Props) {
  const { data: profile, isLoading, error } = useProfileById(accountId);

  const account = profile?.data;
  const role = account?.role;
  const profileLabel =
    role === "FIRM" ? "Firm Profile" : role === "LAWYER" ? "Lawyer Profile" : "Profile";

  return (
    <div className="w-full bg-white min-h-screen">
      {/* Breadcrumb header */}
      <div className="fixed top-0 left-55 right-0 z-10 bg-white border-b border-[#E6EAED] h-18.75 flex items-center px-6">
        <nav className="flex items-center gap-1.5 text-[14px]">
          <button
            type="button"
            onClick={onBack}
            className="text-[#6B7280] hover:text-[#1F2937] hover:underline transition-colors"
          >
            {backLabel}
          </button>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
          <span className="font-[Instrument_Serif] text-[20px] font-light text-[#1F2937]">
            {profileLabel}
          </span>
        </nav>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-18.75" />

      {isLoading ? (
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
        </div>
      ) : error || !account ? (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
          <p className="text-sm text-gray-400">Failed to load this profile.</p>
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] font-medium text-[#2563EB] hover:underline"
          >
            Back to {backLabel}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start px-4 py-5">
            <div className="min-w-0">
              <ProfileCard
                profile={{
                  ...(account as ProfileData),
                  practiceAreas:
                    account.practiceAreas?.map((area: unknown) =>
                      typeof area === "string"
                        ? area
                        : (area as { name: string }).name,
                    ) ?? [],
                }}
                isOwnProfile={false}
              />
            </div>
            {/* Right column spacer */}
            <div className="min-w-0 border-l border-[#ECECEC] min-h-screen xl:invisible">
              <EventsPanel />
            </div>
          </div>

          {/* Fixed EventsPanel on desktop */}
          <div
            className="hidden xl:block fixed top-18.75 border-l border-[#ECECEC] bg-white"
            style={{
              right: 0,
              width: "calc((100vw - 220px) * 0.4)",
              height: "calc(100vh - 75px)",
              overflowY: "auto",
            }}
          >
            <EventsPanel />
          </div>
        </>
      )}
    </div>
  );
}
