// ── Enums ─────────────────────────────────────────────────────────────────────

export type MembershipTier = "community" | "professional";

export type SubscriptionStatus =
  | "active"
  | "non_renewing"
  | "past_due"
  | "cancelled"
  | "expired"
  | "community";

export type InvoiceStatus = "paid" | "pending" | "failed";

export type BillingRole = "LAWYER" | "FIRM";

// ── Core shapes ───────────────────────────────────────────────────────────────

export interface PlanView {
  id: string;
  code: string;
  name: string;
  tier: MembershipTier;
  forRole: BillingRole;
  priceKobo: number;
  intervalMonths: number;
  features: string[];
}

export interface PaymentMethod {
  cardBrand: string;
  cardLast4: string;
  expMonth: string;
  expYear: string;
  bank: string;
}

export interface MembershipView {
  tier: MembershipTier;
  status: SubscriptionStatus;
  plan: PlanView | null;
  autoRenew: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
  paymentMethod: PaymentMethod | null;
  availablePlans: PlanView[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  planName: string;
  amountKobo: number;
  status: InvoiceStatus;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string;
}

export interface InvoiceList {
  items: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SubscribeResult {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
  amountKobo: number;
  intervalMonths: number;
  plan: PlanView;
}

export interface PaymentMethodUpdateResult {
  link: string;
}

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  error: boolean;
  message: string;
  data?: T;
}