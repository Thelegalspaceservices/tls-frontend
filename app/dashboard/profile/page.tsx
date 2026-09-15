// app/(dashboard)/profile/page.tsx
"use client";

import ProfileCard, { ProfileData } from "@/app/Components/ProfileCard";
import EventsPanel from "@/app/Components/EventPanel";
import { useMe } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-sm text-gray-400">Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div>
        {/* Page title */}
        <div className="fixed top-0 left-55 right-0 z-10 bg-white border-b border-[#E6EAED]">
          <h1 className="text-[22px] font-regular text-gray-900 font-[Instrument_Serif] px-6 pt-5 pb-5.25">
            Profile
          </h1>
        </div>

        {/* Spacer for fixed header */}
        <div className="h-18.75" />

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
          {/* Left */}
          <div className="min-w-0 px-4 pt-4">
            <ProfileCard
              profile={{
                ...(profile?.data as ProfileData),
                // ✅ Map objects to name strings before passing
                practiceAreas:
                  profile.data.practiceAreas?.map((area: any) =>
                    typeof area === "string" ? area : area.name,
                  ) ?? [],
              }}
              isOwnProfile={true}
            />
          </div>

          {/* Right column spacer — keeps grid space on xl, renders EventsPanel on mobile */}
          <div className="min-w-0 border-l border-[#ECECEC] min-h-screen xl:invisible">
            <EventsPanel />
          </div>
        </div>

        {/* Fixed EventsPanel on desktop — immune to ancestor overflow changes */}
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
      </div>
    </div>
  );
}
