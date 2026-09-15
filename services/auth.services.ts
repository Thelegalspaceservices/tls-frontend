// services/auth.services.ts
import { api } from "./api";

export interface LoginPayload {
  authProvider: "email" | "google";
  email?: string;
  password?: string;
  idToken?: string;
  fullName?: string;
  role?: "USER" | "LAWYER" | "FIRM" | "ADMIN" | "PENDING_PROFESSIONAL";
}

export interface AuthResponse {
  error: boolean;
  message: string;
  data: {
    account: {
      id: string;
      authUserId: string;
      email: string;
      fullName: string;
      phone: string | null;
      role: "USER" | "LAWYER" | "FIRM" | "ADMIN" | "PENDING_PROFESSIONAL";
      avatarUrl: string | null;
      coverUrl: string | null;
      bio: string | null;
      locationCity: string | null;
      locationCountry: string | null;
      isAnonymous: boolean;
      status: "active" | "inactive" | "suspended";
      avgRating: string;
      reviewCount: number;
      connectionCount: number;
      followerCount: number;
      followingCount: number;
      lastActiveAt: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      lawyerProfile: null | Record<string, unknown>;
      firmProfile: null | Record<string, unknown>;
      practiceAreaLinks: unknown[];
      // NEW — drives the redesigned lawyer/firm onboarding wizard. Route on
      // this, not on lawyerProfile/firmProfile being null (see
      // getPostAuthRoute in AuthContext.tsx). null for non-professional
      // accounts (USER/ADMIN) and, on older backends that predate this
      // field, may be absent entirely — treat both the same.
      onboarding?: {
        nextStep:
          | "bar_details"
          | "identity"
          | "submit_application"
          | "await_review"
          | "await_dispute"
          | "rejected"
          | "select_plan"
          | "profile_setup"
          | "complete"
          | null;
        verificationStatus?: string;
        hasBarDetails: boolean;
        identityChecked: boolean;
        applicationSubmitted: boolean;
        profileComplete: boolean;
        disputeOpen: boolean;
      } | null;
      practiceAreaLimit?: number;
    };
    session: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
  };
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", payload),

  registerUser: (payload: LoginPayload & { fullName: string }) =>
    api.post<AuthResponse>("/auth/register/user", payload),

  registerGoogleUser: (payload: LoginPayload & { fullName: string }) =>
    api.post<AuthResponse>("/auth/register/google", payload),

  registerLawyer: (payload: Record<string, unknown>) =>
    api.post<AuthResponse>("/auth/register/lawyer", payload),

  registerFirm: (payload: Record<string, unknown>) =>
    api.post<AuthResponse>("/auth/register/firm", payload),

  logout: () => api.post("/auth/logout"),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  verifyResetCode: (email: string, code: string) =>
    api.post<{
      error: boolean;
      message: string;
      data: {
        session: {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
        };
      };
    }>("/auth/verify-reset-code", { email, code }),

  resetPassword: (accessToken: string, newPassword: string) =>
    api.post("/auth/reset-password", { accessToken, newPassword }),

  deleteAccount: () => api.delete("/auth/account"),
};