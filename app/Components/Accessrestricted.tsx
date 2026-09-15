// app/Components/AccessRestricted.tsx
"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import {
  useAuth,
  getPostAuthRoute,
  isPendingProfessional,
} from "../context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  USER: "Individual",
  LAWYER: "Lawyer",
  FIRM: "Law Firm",
  ADMIN: "Admin",
  PENDING_PROFESSIONAL: "Pending Professional",
};

interface AccessRestrictedProps {
  /** Optional override for the explanatory line. */
  message?: string;
}

export default function AccessRestricted({ message }: AccessRestrictedProps) {
  const router = useRouter();
  const { user } = useAuth();

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? "account") : null;
  const homeRoute = user ? getPostAuthRoute(user) : "/signin";
  // getPostAuthRoute sends a PENDING_PROFESSIONAL to the setup wizard, so the
  // primary action must not promise a dashboard it cannot open.
  const isPending = isPendingProfessional(user);

  const explanation =
    message ??
    (roleLabel
      ? `Your ${roleLabel} account doesn't have permission to view this page.`
      : "You don't have permission to view this page.");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 font-dmSans">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm px-8 py-10 text-center">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-7 w-7 text-red-500" strokeWidth={1.75} />
        </div>

        {/* Status */}
        <p className="text-[13px] font-medium tracking-wide text-gray-400 mb-1">
          403 · Access restricted
        </p>

        <h1 className="text-[22px] font-semibold text-gray-900 mb-2 leading-tight">
          You don&apos;t have access to this page
        </h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          {explanation}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => router.push(homeRoute)}
            className="w-full py-3 rounded-xl bg-[#1A56DB] text-[14px] font-medium text-white shadow-sm transition hover:bg-[#1648b8] active:scale-[0.99]"
          >
            {!user
              ? "Sign in"
              : isPending
                ? "Continue profile setup"
                : "Back to my dashboard"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-[14px] font-medium text-gray-600 transition hover:bg-white flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
