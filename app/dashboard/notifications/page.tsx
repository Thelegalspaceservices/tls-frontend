"use client";

import { useAuth } from "@/app/context/AuthContext";
import EventsPanel from "@/app/Components/EventPanel";
import NotificationsPage from "@/app/Components/Notifications/NotificationsPage";

export default function Page() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-55 right-0 z-10 bg-white border-b border-[#E6EAED]">
        <h1 className="text-[22px] font-regular text-gray-900 font-[Instrument_Serif] px-6 pt-5 pb-5.25">
          Notifications
        </h1>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-18.75" />

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-0 items-start">
        <div className="min-w-0 px-4 pt-4">
          <NotificationsPage />
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
  );
}
