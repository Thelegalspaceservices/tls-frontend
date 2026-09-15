"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  Download,
  AlertCircle,
  RefreshCw,
  WifiOff,
  CreditCard,
  Clock,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

import type { MembershipView, Invoice, BillingRole } from "../types/membership";

import { membershipService, formatNaira } from "@/services/membership.services";

// ── Error helpers ─────────────────────────────────────────────────────────────

function friendlyError(err: any): string {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;

  if (!navigator.onLine)
    return "You're offline. Please check your internet connection and try again.";
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404)
    return "We couldn't find what you were looking for. Please refresh the page.";
  if (status === 409) return "You already have an active membership.";
  if (status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  if (status === 503 || status === 502)
    return "Our servers are under maintenance. Please try again in a few minutes.";
  if (status >= 500)
    return "Something went wrong on our end. We're working on it — please try again shortly.";
  if (serverMsg) return serverMsg;
  return "Something went wrong. Please try again.";
}

// ── Small components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const styles = {
    paid: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-orange-50 text-orange-600 border-orange-200",
    failed: "bg-red-50 text-red-600 border-red-200",
  };
  const dots = {
    paid: "bg-green-500",
    pending: "bg-orange-500",
    failed: "bg-red-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CardIcon({ brand }: { brand: string }) {
  if (brand.toLowerCase() === "mastercard") {
    return (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect width="32" height="20" rx="3" fill="#f5f5f5" />
        <circle cx="12" cy="10" r="7" fill="#EB001B" />
        <circle cx="20" cy="10" r="7" fill="#F79E1B" />
        <path d="M16 4.8a7 7 0 0 1 0 10.4A7 7 0 0 1 16 4.8z" fill="#FF5F00" />
      </svg>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wide">
      {brand.slice(0, 4)}
    </span>
  );
}

function DaysRing({
  daysLeft,
  totalDays,
  expiresAt,
}: {
  daysLeft: number;
  totalDays: number;
  expiresAt: string;
}) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, daysLeft / totalDays));
  const isLow = daysLeft <= 14;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#F0F0F0"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={isLow ? "#F97316" : "#22C55E"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold text-gray-900 leading-none">
            {daysLeft}
          </span>
          <span className="text-[12px] text-gray-500 mt-0.5">days left</span>
        </div>
      </div>
      {isLow && (
        <p className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
          <Clock size={11} /> Renewing soon
        </p>
      )}
      <p className="text-[12px] text-gray-500">
        Expires: <span className="font-medium text-gray-700">{expiresAt}</span>
      </p>
    </div>
  );
}

function FreeRing() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#F0F0F0"
            strokeWidth="8"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold text-gray-900 leading-none">
            Free
          </span>
          <span className="text-[12px] text-gray-500 mt-0.5">Forever</span>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
        ${checked ? "bg-blue-600" : "bg-gray-200"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6 mb-5">
      {children}
    </div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-[13px] text-red-700">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 text-[12px] shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
      <Check size={16} className="text-green-500 shrink-0" />
      <p className="text-[13px] text-green-700">{message}</p>
    </div>
  );
}

function PageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        {message.toLowerCase().includes("offline") ||
        message.toLowerCase().includes("internet") ? (
          <WifiOff size={22} className="text-red-400" />
        ) : (
          <AlertCircle size={22} className="text-red-400" />
        )}
      </div>
      <p className="text-[15px] font-medium text-gray-900 mb-1">
        Something went wrong
      </p>
      <p className="text-[13px] text-gray-500 mb-6 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 transition"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 hover:bg-white transition"
          >
            Keep membership
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium text-white transition ${
              destructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pro subscriber view ───────────────────────────────────────────────────────

function ProView({
  membership,
  invoices,
  onMembershipUpdate,
}: {
  membership: MembershipView;
  invoices: Invoice[];
  onMembershipUpdate: (m: MembershipView) => void;
}) {
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const plan = membership.plan!;
  const pm = membership.paymentMethod;

  const expiresAt = membership.currentPeriodEnd
    ? new Date(membership.currentPeriodEnd).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const totalDays = (() => {
    if (!membership.currentPeriodStart || !membership.currentPeriodEnd)
      return 180;
    const start = new Date(membership.currentPeriodStart).getTime();
    const end = new Date(membership.currentPeriodEnd).getTime();
    return Math.round((end - start) / 86_400_000);
  })();

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function handleAutoRenewToggle(value: boolean) {
    clearMessages();
    setAutoRenewLoading(true);
    try {
      const res = await membershipService.setAutoRenew(value);
      if (res.data) {
        onMembershipUpdate(res.data);
        setSuccess(
          value
            ? "Auto-renewal has been turned on."
            : "Auto-renewal has been turned off. Your membership won't renew automatically.",
        );
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setAutoRenewLoading(false);
    }
  }

  async function handleCancel() {
    setShowCancelDialog(false);
    clearMessages();
    setCancelLoading(true);
    try {
      const res = await membershipService.cancel();
      if (res.data) {
        onMembershipUpdate(res.data);
        setSuccess(
          `Your membership has been cancelled. You'll still have full access until ${expiresAt}.`,
        );
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleUpdateCard() {
    clearMessages();
    setCardLoading(true);
    try {
      const res = await membershipService.getPaymentMethodUpdateLink();
      if (res.data?.link) {
        window.open(res.data.link, "_blank", "noopener,noreferrer");
      } else {
        setError("We couldn't generate a card update link. Please try again.");
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setCardLoading(false);
    }
  }

  async function handleInvoiceDownload(invoice: Invoice) {
    try {
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const res = await membershipService.getInvoiceDownloadUrl(invoice.id);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setError(
          "We couldn't prepare your invoice download. Please try again.",
        );
      }
    } catch (err: any) {
      setError(friendlyError(err));
    }
  }

  const isCancelled =
    membership.status === "non_renewing" || membership.status === "cancelled";

  return (
    <>
      {showCancelDialog && (
        <ConfirmDialog
          title="Cancel your membership?"
          description={`You'll keep full access to all Pro features until ${expiresAt}. After that, your account will move to the free Community plan.`}
          confirmLabel={cancelLoading ? "Cancelling…" : "Yes, cancel renewal"}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelDialog(false)}
          destructive
        />
      )}

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}
      {success && <SuccessBanner message={success} />}

      <Section>
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-2">
              Current Subscription
            </p>
            <h2 className="text-[26px] font-['Instrument_Serif'] text-gray-900 mb-2">
              {plan.name}
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              {plan.features[0] ??
                "Full access to professional tools and resources."}
            </p>
            <div className="flex gap-8 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                  Billing Cycle
                </p>
                <p className="text-[13px] font-semibold text-gray-900">
                  Every {plan.intervalMonths} Months
                </p>
              </div>
              {expiresAt && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                    {isCancelled ? "Access Until" : "Next Renewal"}
                  </p>
                  <p className="text-[13px] font-semibold text-gray-900">
                    {expiresAt}
                  </p>
                </div>
              )}
            </div>
            {!isCancelled ? (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-700 hover:bg-white transition disabled:opacity-50"
              >
                Cancel subscription
              </button>
            ) : (
              <div className="flex items-start gap-2 text-[13px] text-orange-600">
                <Clock size={14} className="mt-0.5 shrink-0" />
                <p>
                  Renewal cancelled — you have full access until{" "}
                  <span className="font-semibold">{expiresAt}</span>.
                </p>
              </div>
            )}
          </div>

          <div className="w-52 shrink-0 border border-gray-100 rounded-xl bg-white flex items-center justify-center py-6">
            {membership.daysRemaining !== null && expiresAt ? (
              <DaysRing
                daysLeft={membership.daysRemaining}
                totalDays={totalDays}
                expiresAt={expiresAt}
              />
            ) : (
              <FreeRing />
            )}
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Auto Renewal
            </p>
            <p className="text-[14px] text-gray-800 font-medium mb-1">
              Automatically renew your membership
            </p>
            <p className="text-[12px] text-gray-400">
              {membership.autoRenew
                ? `Your membership will automatically renew on ${expiresAt}.`
                : "Your membership will not renew automatically. You can turn this back on anytime."}
            </p>
          </div>
          <Toggle
            checked={membership.autoRenew}
            onChange={handleAutoRenewToggle}
            disabled={autoRenewLoading || isCancelled}
          />
        </div>
      </Section>

      {pm && (
        <Section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-1">
                Billing
              </p>
              <h3 className="text-[17px] font-semibold text-gray-900">
                Payment method
              </h3>
            </div>
            <button
              onClick={handleUpdateCard}
              disabled={cardLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-700 hover:bg-white transition disabled:opacity-50"
            >
              <CreditCard size={13} />
              {cardLoading ? "Opening…" : "Update card"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <CardIcon brand={pm.cardBrand} />
            <div>
              <p className="text-[14px] font-medium text-gray-900">
                •••• •••• •••• {pm.cardLast4}
              </p>
              <p className="text-[12px] text-gray-400">
                {pm.bank} · Expires {pm.expMonth}/{pm.expYear}
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-1">
              Records
            </p>
            <h3 className="text-[17px] font-semibold text-gray-900">
              Billing history
            </h3>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px] text-gray-400">
              No invoices yet — they'll appear here after your first payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Invoice #", "Date", "Plan", "Amount", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] text-gray-400 font-medium pb-3 pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 last:border-none"
                  >
                    <td className="py-3.5 pr-4 text-gray-700 font-medium">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500">
                      {new Date(inv.issuedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 pr-4 text-blue-600">
                      {inv.planName}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-900 font-medium">
                      {formatNaira(inv.amountKobo)}
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5">
                      <button
                        onClick={() => handleInvoiceDownload(inv)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-white transition flex items-center gap-1"
                      >
                        <Download size={11} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

// ── Community (free) view ─────────────────────────────────────────────────────

function CommunityView({
  membership,
  billingRole,
}: {
  membership: MembershipView;
  billingRole: BillingRole;
}) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const communityPlan = membership.availablePlans.find(
    (p) => p.tier === "community",
  );
  const proPlan = membership.availablePlans.find(
    (p) => p.tier === "professional" && p.forRole === billingRole,
  );

  const basePriceKobo = proPlan?.priceKobo ?? 0;
  const displayPriceKobo = isAnnual ? basePriceKobo * 2 : basePriceKobo;
  const proCycle = isAnnual
    ? "Every 12 Months"
    : `Every ${proPlan?.intervalMonths ?? 6} Months`;
  const isFirm = billingRole === "FIRM";

  const communityFeatures = communityPlan?.features ?? [
    "Professional Profile",
    "Publish Articles",
    "Community Visibility",
    "Access to Public Events",
    "TLS Services",
  ];

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
      const res = await membershipService.subscribe({
        intervalMonths: isAnnual ? 12 : 6,
      });
      if (res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        setError("We couldn't start your checkout. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      <Section>
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-2">
              Current Subscription
            </p>
            <h2 className="text-[26px] font-['Instrument_Serif'] text-gray-900 mb-2">
              Community Membership
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              Establish your professional presence on The Legal Space and
              connect with the legal community through your public profile,
              articles, events, and platform visibility.
            </p>
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                Billing Cycle
              </p>
              <p className="text-[13px] font-semibold text-gray-900">
                Free Forever
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Taking you to checkout…
                </>
              ) : (
                `Upgrade to ${proPlan?.name ?? (isFirm ? "Firm Membership" : "Professional Membership")}`
              )}
            </button>
          </div>
          <div className="w-52 shrink-0 border border-gray-100 rounded-xl bg-white flex items-center justify-center py-6">
            <FreeRing />
          </div>
        </div>
      </Section>

      <div className="mb-5">
        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-1">
          Plans
        </p>
        <h3 className="text-[20px] font-semibold text-gray-900 mb-4">
          Change plan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Community card */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-5">
            <div
              className="rounded-xl px-5 py-3 mb-4"
              style={{ background: "#E7F0FF", border: "1px solid #1A56DB33" }}
            >
              <span className="text-[13px] font-medium text-blue-700">
                Forever
              </span>
            </div>
            <div className="mb-1">
              <span className="text-[32px] font-bold text-gray-900">
                ₦ Free
              </span>
            </div>
            <p className="text-[13px] text-gray-500 mb-5">
              Establish your presence on The Legal Space.
            </p>
            <ul className="space-y-3 mb-6">
              {communityFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-[13px] text-gray-700"
                >
                  <Check size={15} className="text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="border border-gray-200 rounded-lg py-2.5 text-center text-[13px] font-semibold text-gray-600 bg-white">
              Current Plan
            </div>
          </div>

          {/* Professional card */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-5">
            <div
              className="rounded-xl px-5 py-3 mb-4 flex items-center justify-between"
              style={{ background: "#E7F0FF", border: "1px solid #1A56DB33" }}
            >
              <span className="text-[13px] font-medium text-blue-600">
                {proCycle}
              </span>
              <div className="flex items-center gap-2 text-[12px] text-gray-500">
                Every 12 Months
                <Toggle checked={isAnnual} onChange={setIsAnnual} />
              </div>
            </div>
            <div className="mb-1">
              <span className="text-[32px] font-bold text-gray-900">
                {formatNaira(displayPriceKobo)}
              </span>
            </div>
            <p className="text-[13px] text-gray-500 mb-5">
              {isFirm
                ? "Designed for law firms looking to grow their visibility, manage their team, and access premium tools."
                : "Access the full experience designed for modern legal professionals."}
            </p>
            <ul className="space-y-3 mb-6">
              {(proPlan?.features ?? []).map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 text-[13px] text-gray-700"
                >
                  <Check size={15} className="text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium rounded-lg transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Taking you to checkout…
                </>
              ) : (
                `Choose ${isFirm ? "Firm" : "Professional"}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  const { user } = useAuth();

  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const role = user?.role;
  const billingRole: BillingRole | null =
    role === "LAWYER" || role === "PENDING_PROFESSIONAL"
      ? "LAWYER"
      : role === "FIRM"
        ? "FIRM"
        : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [membershipRes, invoicesRes] = await Promise.all([
        membershipService.getMembership(),
        membershipService.getInvoices(),
      ]);
      if (membershipRes.data) setMembership(membershipRes.data);
      if (invoicesRes.data) setInvoices(invoicesRes.data.items);
    } catch (err: any) {
      setPageError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (reference) {
      membershipService
        .verifyPayment(reference)
        .then((res) => {
          if (res.data) setMembership(res.data);
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => {
          // payment verification failure is non-fatal — page still loads
        });
    }
    loadData();
  }, [loadData]);

  if (!billingRole) {
    return (
      <div className="flex items-center justify-center py-24 px-6 text-center">
        <div>
          <p className="text-[15px] font-medium text-gray-700 mb-1">
            Not available
          </p>
          <p className="text-[13px] text-gray-400">
            Membership plans are not available for your account type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw size={18} className="text-gray-400 animate-spin" />
          <p className="text-[13px] text-gray-400">Loading your membership…</p>
        </div>
      )}

      {!loading && pageError && (
        <PageError message={pageError} onRetry={loadData} />
      )}

      {!loading &&
        !pageError &&
        membership &&
        (membership.tier === "professional" ? (
          <ProView
            membership={membership}
            invoices={invoices}
            onMembershipUpdate={setMembership}
          />
        ) : (
          <CommunityView membership={membership} billingRole={billingRole} />
        ))}
    </div>
  );
}
