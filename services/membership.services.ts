import { api } from "./api";
import type {
  MembershipView,
  PlanView,
  SubscribeResult,
  InvoiceList,
  PaymentMethodUpdateResult,
} from "@/app/types/membership";

// ── 1. GET /membership ────────────────────────────────────────────────────────
/** Fetch the full membership state for the current user. Call on page load. */
export const membershipService = {
  async getMembership() {
    const { data } = await api.get<{ data: MembershipView }>("/membership");
    return data;
  },

  // ── 2. GET /membership/plans ────────────────────────────────────────────────
  /** Fetch the plan comparison list (community + the role's professional plan). */
  async getPlans() {
    const { data } = await api.get<{ data: { items: PlanView[] } }>(
      "/membership/plans",
    );
    return data;
  },

  // ── 3. POST /membership/subscribe ──────────────────────────────────────────
  /**
   * Initialise checkout for the professional plan.
   * On success, redirect the browser to `data.authorizationUrl`.
   * 409 → user is already an active professional member.
   */
  async subscribe(payload?: {
    callbackUrl?: string;
    /** 6 → the 6-month price; 12 → the 12-month (annual) price. */
    intervalMonths?: 6 | 12;
  }) {
    const { data } = await api.post<{ data: SubscribeResult }>(
      "/membership/subscribe",
      payload ?? {},
    );
    return data;
  },

  // ── 4. GET /membership/verify ───────────────────────────────────────────────
  /**
   * Call from the Paystack callback page to confirm payment and get instant UI
   * feedback. Safe to call multiple times (idempotent).
   * Returns updated MembershipView on success, error on failed payment (400).
   */
  async verifyPayment(reference: string) {
    const { data } = await api.get<{ data: MembershipView }>(
      "/membership/verify",
      {
        params: { reference },
      },
    );
    return data;
  },

  // ── 5. PATCH /membership/auto-renew ────────────────────────────────────────
  /**
   * Toggle auto-renewal. Setting false → status becomes `non_renewing`
   * (stays active until period end). Returns updated MembershipView.
   * 503 → subscription still linking after first payment — retry shortly.
   */
  async setAutoRenew(autoRenew: boolean) {
    const { data } = await api.patch<{ data: MembershipView }>(
      "/membership/auto-renew",
      {
        autoRenew,
      },
    );
    return data;
  },

  // ── 6. POST /membership/cancel ──────────────────────────────────────────────
  /**
   * Cancel renewal — same effect as autoRenew: false.
   * Membership stays active until `currentPeriodEnd`, then expires.
   * Returns updated MembershipView.
   */
  async cancel() {
    const { data } = await api.post<{ data: MembershipView }>(
      "/membership/cancel",
    );
    return data;
  },

  // ── 7. POST /membership/payment-method/update ───────────────────────────────
  /**
   * Get a Paystack-hosted link to update the saved card.
   * Open `data.link` in a new tab.
   * 503 → no active subscription exists.
   */
  async getPaymentMethodUpdateLink() {
    const { data } = await api.post<{ data: PaymentMethodUpdateResult }>(
      "/membership/payment-method/update",
    );
    return data;
  },

  // ── 8. GET /membership/invoices ─────────────────────────────────────────────
  /** Paginated billing history, newest first. */
  async getInvoices(page = 1, limit = 20) {
    const { data } = await api.get<{ data: InvoiceList }>(
      "/membership/invoices",
      {
        params: { page, limit },
      },
    );
    return data;
  },

  // ── 9. GET /membership/invoices/:id/download ────────────────────────────────
  /**
   * Re-fetch the PDF download URL for a single invoice.
   * You can also use `pdfUrl` directly from the invoice list to skip this call.
   */
  async getInvoiceDownloadUrl(invoiceId: string) {
    const { data } = await api.get<{ data: { url: string } }>(
      `/membership/invoices/${invoiceId}/download`,
    );
    return data;
  },
};

// ── Utility ───────────────────────────────────────────────────────────────────

/** Convert kobo to naira and format as ₦ string. */
export function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}
