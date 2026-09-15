// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutGrid,
  MessageCircle,
  Briefcase,
  Bell,
  Settings,
  Scale,
  LogOut,
  ArrowRight,
  Star,
  Menu,
  X,
  Users,
  FileText,
  Building2,
  BookOpenText,
  MonitorUp,
  FolderSearch,
  BookText,
  PackageSearch,
  Loader2,
  AlertTriangle,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";

type UserRole = "USER" | "LAWYER" | "FIRM" | "ADMIN";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  USER: [
    { label: "Feeds", href: "/dashboard/feeds", icon: LayoutGrid },
    { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    { label: "Requests", href: "/dashboard/requests", icon: Briefcase },
    {
      label: "TLS Services",
      href: "/dashboard/TLS-Services",
      icon: PackageSearch,
    },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  LAWYER: [
    { label: "Profile", href: "/dashboard/profile", icon: User },
    { label: "Feeds", href: "/dashboard/feeds", icon: LayoutGrid },
    { label: "Leads", href: "/dashboard/leads", icon: Users },
    { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    { label: "Posts", href: "/dashboard/posts", icon: MonitorUp },
    { label: "Legal News", href: "/dashboard/Legal-News", icon: BookOpenText },
    {
      label: "TLS Research",
      href: "/dashboard/TLS-Research",
      icon: FolderSearch,
    },
    // {
    //   label: "TLS Library",
    //   href: "/dashboard/legal-library",
    //   icon: BookText,
    // },
    {
      label: "TLS Services",
      href: "/dashboard/TLS-Services",
      icon: PackageSearch,
    },
    {
      label: "Membership",
      href: "/dashboard/membership",
      icon: ShieldCheck,
    },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  FIRM: [
    { label: "Profile", href: "/dashboard/profile", icon: User },
    { label: "Feeds", href: "/dashboard/feeds", icon: LayoutGrid },
    { label: "Leads", href: "/dashboard/leads", icon: Users },
    { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    { label: "Posts", href: "/dashboard/posts", icon: MonitorUp },
    {
      label: "TLS Research",
      href: "/dashboard/TLS-Research",
      icon: FolderSearch,
    },
    { label: "Legal News", href: "/dashboard/Legal-News", icon: BookOpenText },
    // {
    //   label: "Legal Library",
    //   href: "/dashboard/legal-library",
    //   icon: BookText,
    // },
    {
      label: "TLS Services",
      href: "/dashboard/TLS-Services",
      icon: PackageSearch,
    },
    {
      label: "Membership",
      href: "/dashboard/membership",
      icon: ShieldCheck,
    },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  ADMIN: [
    { label: "Profile", href: "/dashboard/profile", icon: User },
    { label: "Feeds", href: "/dashboard/feeds", icon: LayoutGrid },
    { label: "Leads", href: "/dashboard/leads", icon: Users },
    { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    { label: "Posts", href: "/dashboard/posts", icon: MonitorUp },
    {
      label: "TLS Research",
      href: "/dashboard/TLS-Research",
      icon: FolderSearch,
    },
    { label: "Legal News", href: "/dashboard/Legal-News", icon: BookOpenText },
    // {
    //   label: "Legal Library",
    //   href: "/dashboard/legal-library",
    //   icon: BookText,
    // },
    {
      label: "TLS Services",
      href: "/dashboard/TLS-Services",
      icon: PackageSearch,
    },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
};

const FOOTER_CTA: Record<
  UserRole,
  { label: string; href: string; icon: React.ElementType } | null
> = {
  USER: { label: "Find a Lawyer", href: "/dashboard/find-lawyer", icon: Scale },
  LAWYER: null,
  FIRM: null,
  ADMIN: null,
};

// ─── Logout Modal ─────────────────────────────────────────────────────────────
function LogoutModal({
  onConfirm,
  onCancel,
  isLoggingOut,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <div className="fixed inset-0 z-1000000001 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-1000000000"
        onClick={!isLoggingOut ? onCancel : undefined}
      />

      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl p-6  z-1000000000">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <h3 className="text-[16px] font-semibold text-gray-900 text-center mb-1">
          Sign out?
        </h3>
        <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">
          You'll need to sign in again to access your account.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" /> Yes, sign out
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoggingOut}
            className="w-full py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Logout Overlay ───────────────────────────────────────────────────────────
function LogoutOverlay() {
  return (
    <div className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-white">
      {/* <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white text-xl mb-6"> */}
      <Image src="/logo.png" width={130} height={130} alt="Logo" />
      {/* </div> */}
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-3" />
      <p className="text-[14px] font-medium text-gray-700">
        Signing you out...
      </p>
      <p className="text-[12px] text-gray-400 mt-1">Please wait a moment</p>
      <div className="w-48 h-1 bg-gray-100 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-gray-900 rounded-full animate-logout-progress" />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SidebarSkeleton() {
  return (
    <aside className="w-55 h-screen fixed top-0 left-0 border-r border-[#E5E7EB] flex flex-col bg-white">
      <div className="px-5 py-5 border-b border-[#E5E7EB] flex items-center gap-2">
        <Image src="/logo.png" width={130} height={130} alt="Logo" />

        {/* <span className="text-sm font-medium text-gray-900">
          The Legal Space
        </span> */}
      </div>
      <div className="px-5 py-4 border-b border-[#E5E7EB] animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-100 mb-2.5" />
        <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="h-5 bg-gray-100 rounded-full w-16 mb-3" />
        <div className="flex flex-col gap-2 mb-3">
          <div className="h-2.5 bg-gray-100 rounded w-full" />
          <div className="h-2.5 bg-gray-100 rounded w-full" />
        </div>
        <div className="h-7 bg-gray-100 rounded-lg w-full" />
      </div>
      <nav className="flex-1 px-3 pt-3 flex flex-col gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-white rounded-lg animate-pulse" />
        ))}
      </nav>
      <div className="p-3 border-t border-[#E5E7EB]">
        <div className="h-8 bg-white rounded-lg animate-pulse" />
      </div>
    </aside>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [researchThreadActive, setResearchThreadActive] = useState(false);

  const role: UserRole = (user?.role as UserRole) ?? "USER";
  const unreadMessageCount = user?.unreadMessageCount as number;
  const pendingLeadCount = user?.pendingLeadCount as number;
  const unreadNotificationCount = user?.unreadNotificationCount as number;
  // console.log(unreadMessageCount);
  const navItems = NAV_ITEMS[role] ?? NAV_ITEMS.USER;
  const footerCta = FOOTER_CTA[role];

  const initials =
    user?.fullName
      ?.split(/\s+/)
      .filter((part: string) => /[A-Za-z]/.test(part))
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  // ── Research thread state ─────────────────────────────────────────────────
  useEffect(() => {
    function handleResearchState(e: CustomEvent) {
      setResearchThreadActive(e.detail.active);
    }
    window.addEventListener(
      "research:thread",
      handleResearchState as EventListener,
    );
    return () =>
      window.removeEventListener(
        "research:thread",
        handleResearchState as EventListener,
      );
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/TLS-Research")) {
      setResearchThreadActive(false);
    }
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow =
      mobileOpen || showLogoutModal ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, showLogoutModal]);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    setTimeout(() => setShowOverlay(true), 300);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
      setShowOverlay(false);
      setShowLogoutModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="hidden md:flex md:shrink-0">
        <div className="w-55 min-h-screen sticky top-0">
          <SidebarSkeleton />
        </div>
      </div>
    );
  }

  // ── Hide when research thread is active ───────────────────────────────────
  if (researchThreadActive) return null;

  const sidebarContent = (
    <aside className="w-55 h-screen fixed top-0 left-0 border-r border-[#E5E7EB] flex flex-col bg-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="logo" className="w-full h-[34px]" />
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile card — USER only */}
      {role === "USER" && (
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 mb-2.5 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <p className="text-[13px] font-medium text-gray-900 mb-3">
            {user?.fullName}
          </p>
          <div className="flex flex-col gap-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Reviews</span>
              <span className="font-medium text-gray-900 flex items-center gap-0.5">
                {Array.from(
                  { length: Math.round(parseFloat(user?.avgRating ?? "0")) },
                  (_, i) => (
                    <Star
                      key={`filled-${i}`}
                      className="w-3 h-3 text-amber-400 fill-amber-400"
                    />
                  ),
                )}
                {Array.from(
                  {
                    length: 5 - Math.round(parseFloat(user?.avgRating ?? "0")),
                  },
                  (_, i) => (
                    <Star
                      key={`empty-${i}`}
                      className="w-3 h-3 text-gray-200"
                    />
                  ),
                )}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Connections</span>
              <span className="font-medium text-gray-900">
                {user?.connectionCount ?? 0}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/profile"
            className="w-full py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 flex items-center justify-center gap-1.5 hover:bg-white transition-colors"
          >
            Visit Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-[12px]  text-[14px] mb-[14px]  transition-colors ${isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-white hover:text-gray-900"
                }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`}
              />
              {label}
              {label === "Messages" && unreadMessageCount > 0 && (
                <span
                  className={`ml-auto  text-white text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-red-500" : "bg-gray-500"}`}
                >
                  {unreadMessageCount}
                </span>
              )}
              {label === "Leads" && pendingLeadCount > 0 && (
                <span
                  className={`ml-auto  text-white text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-red-500" : "bg-gray-500"}`}
                >
                  {pendingLeadCount}
                </span>
              )}
              {label === "Notifications" && unreadNotificationCount > 0 && (
                <span
                  className={`ml-auto  text-white text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-red-500" : "bg-gray-500"}`}
                >
                  {unreadNotificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#E5E7EB] flex flex-col gap-2">
        {footerCta && (
          <Link
            href={footerCta.href}
            className="w-full py-2 rounded-2xl text-[13px] font-medium text-gray-900 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{
              border: "2px solid transparent",
              backgroundImage:
                "linear-gradient(white, white), linear-gradient(90deg, #216399 0%, #FFE500 50%, #C34B00 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            {footerCta.label}
          </Link>
        )}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-2 bg-red-50 text-[14px] font-medium text-red-500 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {showOverlay && <LogoutOverlay />}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
          isLoggingOut={isLoggingOut}
        />
      )}

      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      <div className="hidden md:flex md:shrink-0">
        <div className="w-55 min-h-screen sticky top-0">{sidebarContent}</div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 h-full z-50 shadow-xl">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
