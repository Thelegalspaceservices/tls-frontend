// app/waitlist/page.tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import WaitlistPlaceholder from "../Components/WaitlistPlaceholder";

export default function WaitlistPage() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black">
      <main className="flex-1 w-full flex items-center justify-center py-16">
        <div className="w-full max-w-lg mx-auto">
          <Suspense fallback={<div className="animate-pulse h-40 bg-gray-100 rounded-xl" />}>
            <WaitlistPlaceholder />
          </Suspense>

          <p className="mt-8 text-center text-sm text-gray-400 font-dmSans">
            Want a copy of everyone on the list?{" "}
            <Link
              href="/api/waitlist"
              className="text-[#1A56DB] hover:underline font-medium"
            >
              Download the spreadsheet
            </Link>
          </p>
        </div>
      </main>
    </div>
    //if need be
  );
}
