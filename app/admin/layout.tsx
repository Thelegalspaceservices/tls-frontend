// app/admin/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../Components/Admin/AdminSidebar";
import { getPostAuthRoute, useAuth } from "../context/AuthContext";

export const dynamic = "force-dynamic";

function hasSession() {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!hasSession()) {
      router.replace("/");
      return;
    }
    if (user && user.role !== "ADMIN") {
      // Route through getPostAuthRoute so a PENDING_PROFESSIONAL lands on the
      // setup wizard rather than being bounced to /dashboard/feeds and then
      // rejected again by the dashboard guard.
      router.replace(getPostAuthRoute(user));
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const redirectIfUnauthenticated = () => {
      if (!hasSession()) {
        router.replace("/");
      }
    };

    window.addEventListener("pageshow", redirectIfUnauthenticated);
    window.addEventListener("popstate", redirectIfUnauthenticated);

    return () => {
      window.removeEventListener("pageshow", redirectIfUnauthenticated);
      window.removeEventListener("popstate", redirectIfUnauthenticated);
    };
  }, [router]);

  if (isLoading || !user || !hasSession() || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
