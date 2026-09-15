"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Feed from "../../Components/Feed/Feed";
import EventsPanel from "@/app/Components/EventPanel";
import LawyerProfileView from "@/app/Components/LawyerProfileView";
import { useAuth } from "../../context/AuthContext";
import { type FeedTab } from "@/hooks/useFeed";

const TABS: FeedTab[] = ["All", "Top Firms", "Top Lawyers", "Articles"];

export default function FeedPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeedTab>("All");

  const selectedAccountId = searchParams.get("accountId");

  if (isLoading) return null;
  if (!user) return null;

  if (selectedAccountId) {
    return (
      <main className="bg-white">
        <LawyerProfileView
          accountId={selectedAccountId}
          onBack={() => router.push("/dashboard/feeds")}
          backLabel="Feeds"
        />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      {/* Tabs */}
      <div className="fixed top-0 left-55 right-0 z-10 bg-white border-b border-[#E6EAED]">
        <div className="flex gap-2 px-6 pt-4 pb-3.25 bg-white w-full h-18.75 items-center">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-18.75" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] items-start">
        <Feed activeTab={activeTab} />
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
    </main>
  );
}
