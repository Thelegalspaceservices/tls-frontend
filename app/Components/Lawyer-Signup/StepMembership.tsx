// app/Components/Lawyer-Signup/StepMembership.tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { membershipService } from "@/services/membership.services";
import type { PlanView } from "@/app/types/membership";
import { AccountType } from "./LawyerSignup";

interface Props {
  accountType: AccountType;
  /** Called when user picks Community (free) — skip payment */
  onCommunity: () => void;
}

const FALLBACK_PRO_LAWYER: Omit<PlanView, "id" | "code" | "forRole"> = {
  name: "Professional Membership",
  tier: "professional",
  priceKobo: 3500000,
  intervalMonths: 6,
  features: [
    "Everything in Community Membership",
    "Access to Client Leads",
    "Direct Messaging",
    "TLS Research",
    "TLS Library",
    "TLS News",
    "Professional Opportunities",
  ],
};

const FALLBACK_PRO_FIRM: Omit<PlanView, "id" | "code" | "forRole"> = {
  name: "Professional Membership",
  tier: "professional",
  priceKobo: 5000000,
  intervalMonths: 6,
  features: [
    "Everything in Community Membership",
    "List up to 7 Practice Areas",
    "Firm Profile & Branding",
    "Access to Client Leads",
    "Direct Messaging",
    "TLS Research",
    "TLS Library",
    "TLS News",
    "Priority Visibility",
    "Professional Opportunities",
    "Optional Team Access Seats",
  ],
};

const COMMUNITY_FEATURES = [
  "Professional Profile",
  "Publish Articles",
  "Community Visibility",
  "Access to Public Events",
  "TLS Services",
];

type Tab = "professional" | "community";

function formatPrice(kobo: number, months: number, annually: boolean) {
  const naira = kobo / 100;
  return annually
    ? `₦${(naira * 2).toLocaleString()}`
    : `₦${naira.toLocaleString()}`;
}

export default function StepMembership({ accountType, onCommunity }: Props) {
  const [tab, setTab] = useState<Tab>("professional");
  const [annually, setAnnually] = useState(false);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const billingRole = accountType === "firm" ? "FIRM" : "LAWYER";
  const fallback =
    accountType === "firm" ? FALLBACK_PRO_FIRM : FALLBACK_PRO_LAWYER;

  useEffect(() => {
    membershipService
      .getPlans()
      .then((res) => {
        const items: PlanView[] =
          (res as { data: { items: PlanView[] } }).data?.items ?? [];
        const pro = items.find(
          (p) => p.tier === "professional" && p.forRole === billingRole,
        );
        if (pro) setPlan(pro);
      })
      .catch(() => {
        /* use fallback */
      })
      .finally(() => setFetching(false));
  }, [billingRole]);

  const activePlan = plan ?? {
    ...fallback,
    id: "",
    code: "",
    forRole: billingRole,
  };

  const handleChooseProfessional = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await membershipService.subscribe({
        callbackUrl: `${window.location.origin}/membership/callback`,
        intervalMonths: annually ? 12 : 6,
      });
      if (!res.data?.authorizationUrl) {
        setError("Couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }
      // Reconcile what we displayed against what will actually be charged
      // before redirecting — amountKobo is the source of truth.
      const displayedKobo = activePlan.priceKobo * (annually ? 2 : 1);
      if (
        typeof res.data.amountKobo === "number" &&
        res.data.amountKobo !== displayedKobo
      ) {
        setError(
          "The checkout amount doesn't match what was shown here. Please contact support before paying.",
        );
        setLoading(false);
        return;
      }
      window.location.href = res.data.authorizationUrl;
    } catch (err: unknown) {
      // 400 here means the origin isn't in FRONTEND_ALLOWED_ORIGINS yet —
      // surface something more useful than the generic fallback for that case.
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 400) {
        setError(
          "This environment isn't set up for payments yet. Please contact support.",
        );
      } else {
        setError("Couldn't start checkout. Please try again.");
      }
      setLoading(false);
    }
  };

  const priceLabel = formatPrice(
    activePlan.priceKobo,
    activePlan.intervalMonths,
    annually,
  );
  const billingLabel = annually
    ? "Every 12 Months"
    : `Every ${activePlan.intervalMonths} Months`;

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Select a Membership Plan
      </h2>
      <p className="text-[14px] text-gray-500 mb-6 font-dmSans">
        Choose the membership that best fits your professional needs.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["professional", "community"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "professional"
              ? "Professional Membership"
              : "Community Membership"}
          </button>
        ))}
      </div>

      {tab === "professional" ? (
        <div className="border border-gray-200 rounded-2xl p-5">
          {/* Billing toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#EEF4FF] rounded-xl mb-5">
            <span className="text-[13px] font-medium text-[#1A56DB]">
              {billingLabel}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500">Every 12 months</span>
              <button
                type="button"
                onClick={() => setAnnually(!annually)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  annually ? "bg-[#1A56DB]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    annually ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {fetching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="text-[36px] font-bold text-gray-900 mb-1">
                {priceLabel}
              </p>
              <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
                {accountType === "firm"
                  ? "Designed for law firms looking to grow their visibility, manage their team, and access premium tools."
                  : "Access the full experience designed for modern legal professionals."}
              </p>
              <div className="border-t border-gray-100 pt-4 mb-5 flex flex-col gap-2.5">
                {activePlan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span
                      className={`text-[13px] text-gray-600 ${f.includes("Practice Areas") ? "font-semibold" : ""}`}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-[12px] text-red-500 mb-3">{error}</p>
              )}
              <button
                onClick={handleChooseProfessional}
                disabled={loading}
                className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Redirecting to payment…" : "Choose Professional"}
              </button>
            </>
          )}
        </div>
      ) : (
        /* Community tab — free, no payment */
        <div className="border border-gray-200 rounded-2xl p-5">
          <div className="px-4 py-2.5 bg-[#EEF4FF] rounded-xl mb-5 text-[13px] font-medium text-[#1A56DB]">
            Forever
          </div>
          <p className="text-[36px] font-bold text-gray-900 mb-1 decoration-gray-400">
            ₦ Free
          </p>
          <p className="text-[13px] text-gray-500 mb-5">
            Establish your presence on The Legal Space.
          </p>
          <div className="border-t border-gray-100 pt-4 mb-5 flex flex-col gap-2.5">
            {COMMUNITY_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-[13px] text-gray-600">{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onCommunity}
            className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors"
          >
            Choose Free
          </button>
        </div>
      )}
    </div>
  );
}
