// services/profile.service.ts
import { api } from "./api";
import { AuthResponse } from "./auth.services";
import type { PracticeAreaFee } from "./settings.services";
export type ProfessionalRole = "LAWYER" | "FIRM"; // NEW

export type PracticeAreaRef =
  | string
  | {
      id: string;
      name: string;
      slug?: string;
      isActive?: boolean;
      createdAt?: string;
      // Backend now returns a fee range (in kobo) per practice area.
      minFee?: number;
      maxFee?: number;
    };

export type ProfileData = AuthResponse["data"]["account"] & {
  isFollowing: boolean;
  practiceAreas: PracticeAreaRef[];
};

export type ProfileResponse = {
  error: boolean;
  message: string;
  data: ProfileData;
  email?: string;
  isAnonymous?: boolean;
  fullName?: string;
  phone?: string;
  role?: string;
};
export interface Review {
  id: string;
  reviewerAccountId: string;
  reviewedAccountId: string;
  rating: number;
  body: string;
  createdAt: string;
  reviewer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    isAnonymous: boolean;
    role: string;
  };
}
export interface ReviewsResponse {
  error: boolean;
  message: string;
  data: {
    items: Review[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface ProfileArticle {
  id: string;
  title: string;
  slug: string;
  body?: string | null;
  excerpt?: string | null;
  readCount: number;
  publishedAt: string;
  pdfUrl?: string | null;
  createdAt?: string;
  likeCount: number;
  dislikeCount: number;
}

export interface ProfileArticlesResponse {
  error: boolean;
  message: string;
  data: {
    items: ProfileArticle[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// ─── Redesigned lawyer/firm verification flow ──────────────────────────────
// Types below mirror the integration guide exactly (see LawyerSignup.tsx and
// its Step* children for where each is used).

export type NbaCheckStatus = "matched" | "unchecked" | "no_match";
export type BarDetailsOutcome =
  | "matched"
  | "unchecked"
  | "no_match"
  | "already_registered";

export interface BarDetailsPayload {
  fullName: string;
  scn: string;
  callToBarYear: number;
  nbaBranch: string;
}

export interface BarDetailsResponse {
  error: boolean;
  message: string;
  data: {
    outcome: BarDetailsOutcome;
    scn?: string;
    nbaCheck?: {
      status: NbaCheckStatus;
      reference?: string;
      detail?: string;
    };
    profile?: Record<string, unknown>;
    // Present only when outcome === "already_registered". Name/email are
    // masked server-side — render verbatim, never try to unmask.
    existingAccount?: {
      fullName: string;
      email: string;
      scn: string;
      statusLabel: string;
    };
  };
}

export interface DisputeRecord {
  id: string;
  caseReference: string;
  scn: string;
  status: string;
  claimantStatement?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  evidence: { id: string; docType: string; label: string; createdAt: string }[];
}

export type IdentityOutcome = "matched" | "no_match" | "unchecked";

export interface IdentityResponse {
  error: boolean;
  message: string;
  data: {
    outcome: IdentityOutcome;
    detail?: string;
    // Server-owned — never count attempts client-side.
    attemptsRemaining?: number;
    flaggedForReview?: boolean;
  };
}

export interface VerificationStatusResponse {
  error: boolean;
  message: string;
  data: {
    status: "pending" | "under_review" | "verified" | "rejected" | "disputed";
    barDetails?: Record<string, unknown>;
    identity?: {
      status: IdentityOutcome | string;
      attemptsRemaining?: number;
      maxAttempts?: number;
      flaggedForReview?: boolean;
    };
    requiredDocTypes?: { docType: string; label: string; uploaded: boolean }[];
    optionalDocTypes?: unknown[];
    missingDocTypes?: string[];
    uploaded?: unknown[];
    applicationSubmittedAt?: string | null;
    canSubmitApplication?: boolean;
    disputeOpen?: boolean;
  };
}

export const profileService = {
  getMe: () => api.get<ProfileResponse>("/profile/me"),

  // Step 4 — Your Bar details. Four outcomes to branch on (data.outcome);
  // see StepBarDetails.tsx.
  submitBarDetails: (payload: BarDetailsPayload) =>
    api.post<BarDetailsResponse>("/profile/me/bar-details", payload),

  // Step 4b — "Someone is impersonating me." Idempotent: a second click
  // returns alreadyFlagged: true with the same case reference.
  flagBarDetailsDispute: (payload: { scn: string; statement?: string }) =>
    api.post<{ data: { dispute: DisputeRecord; alreadyFlagged: boolean } }>(
      "/profile/me/bar-details/dispute",
      payload,
    ),

  uploadDisputeEvidence: (disputeId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ data: { dispute: DisputeRecord } }>(
      `/profile/me/bar-details/dispute/${disputeId}/evidence`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  getBarDetailsDispute: () =>
    api.get<{ data: { dispute: DisputeRecord | null } }>(
      "/profile/me/bar-details/dispute",
    ),

  // Step 6 — Verify your identity (NIN). The NIN itself is never stored.
  verifyIdentity: (payload: { nin: string; consent: boolean }) =>
    api.post<IdentityResponse>("/profile/me/identity", payload),

  // Step 7 — Complete Registration. Idempotent — already-submitted returns
  // 200 with submitted: false.
  submitApplication: () =>
    api.post<{ data: { verificationStatus: string; submitted: boolean } }>(
      "/profile/me/application",
    ),

  // Step 8/9 — backs the "under review" screen and resume-on-login.
  getVerification: () =>
    api.get<VerificationStatusResponse>("/profile/me/verification"),

  // Steps 11–13 — the wizard draft. Shallow-merged server-side, Redis-backed,
  // 7-day TTL. GET on wizard mount to rehydrate (survives the Paystack
  // round-trip / a closed tab); DELETE for an explicit "start over".
  getOnboardingDraft: () =>
    api.get<{ data: Record<string, unknown> }>("/profile/me/onboarding-draft"),
  saveOnboardingDraft: (payload: Record<string, unknown>) =>
    api.post<{ data: Record<string, unknown> }>(
      "/profile/me/onboarding-draft",
      payload,
    ),
  clearOnboardingDraft: () => api.delete("/profile/me/onboarding-draft"),

  getById: (accountId: string) =>
    api.get<ProfileResponse>(`/profile/${accountId}`),

  updateMe: (payload: Record<string, unknown>) =>
    api.patch<ProfileResponse>("/profile/me", payload),

  // NEW — call the moment the user picks Lawyer or Firm, before showing plans.
  // Re-callable and idempotent — safe to call again if they switch selection.
  setProfessionalRole: (role: ProfessionalRole) =>
    api.patch<ProfileResponse>("/profile/me/professional-role", { role }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/profile/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadCover: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/profile/me/cover", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  toggleAnonymous: (isAnonymous: boolean) =>
    api.patch("/profile/me/anonymous", { isAnonymous }),

  updatePracticeAreas: (practiceAreas: PracticeAreaFee[]) =>
    api.patch("/profile/me/practice-areas", { practiceAreas }),

  getConnections: (accountId: string, page = 1, limit = 20) =>
    api.get(`/profile/${accountId}/connections`, { params: { page, limit } }),

  getArticles: (accountId: string, page = 1, limit = 20) =>
    api.get<ProfileArticlesResponse>(`/profile/${accountId}/articles`, {
      params: { page, limit },
    }),
  getReviews: (accountId: string, page = 1, limit = 20) =>
    api.get<ReviewsResponse>(`/profile/${accountId}/reviews`, {
      params: { page, limit },
    }),
  // getReviews: (accountId: string, page = 1, limit = 20) =>
  //   api.get(`/profile/${accountId}/reviews`, { params: { page, limit } }),

  getPosts: (accountId: string, page = 1, limit = 20) =>
    api.get(`/profile/${accountId}/posts`, { params: { page, limit } }),
};
