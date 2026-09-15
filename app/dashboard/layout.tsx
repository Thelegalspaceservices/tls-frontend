// app/(dashboard)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Components/Sidebar";
import {
  isPendingProfessional,
  useAuth,
  PROFESSIONAL_SETUP_PATH,
} from "../context/AuthContext";
import { Providers } from "../providers";

export const dynamic = "force-dynamic";

function hasSession() {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // A PENDING_PROFESSIONAL has signed up but not finished onboarding, so it is
  // refused entry to every dashboard route and sent back to the setup wizard.
  //
  // This is the enforcement point the backend cannot provide: the auth hook
  // only checks `status === "active"`, and the account is created active, so the
  // role has to be blocked here. `getPostAuthRoute` alone was not sufficient —
  // the ?redirect= param used to be able to win.
  const blocked = isPendingProfessional(user);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !hasSession()) {
      router.replace("/");
      return;
    }
    if (blocked) {
      router.replace(PROFESSIONAL_SETUP_PATH);
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, isLoading, router, blocked]);

  // Re-check auth when restored from browser back/forward cache. Without the
  // `blocked` check, a pending professional could restore straight onto a
  // rendered dashboard from the bfcache.
  useEffect(() => {
    const redirectIfUnauthenticated = () => {
      if (!hasSession() || blocked) {
        router.replace(blocked ? PROFESSIONAL_SETUP_PATH : "/");
      }
    };

    window.addEventListener("pageshow", redirectIfUnauthenticated);
    window.addEventListener("popstate", redirectIfUnauthenticated);
    return () => {
      window.removeEventListener("pageshow", redirectIfUnauthenticated);
      window.removeEventListener("popstate", redirectIfUnauthenticated);
    };
  }, [router, blocked]);

  if (isLoading || !user || !hasSession() || blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Providers>
        <Sidebar />
        <main className="flex-1 min-w-0 md:pt-0">{children}</main>
      </Providers>
    </div>
  );
}
