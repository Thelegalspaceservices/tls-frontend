// context/AuthContext.tsx — full updated version
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  AuthResponse,
  authService,
  LoginPayload,
} from "@/services/auth.services";
import { profileService } from "@/services/profile.services";
import { parseApiError } from "@/lib/error";
import { useRouter, usePathname } from "next/navigation";
import {
  disconnectSocket,
  refreshSocketAuth,
  connectSocket,
} from "@/services/socket.services";

import { urlBase64ToUint8Array } from "../utils/web-push";
import { notificationsService } from "@/services/notifications.services";
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_EXISTS"
  | "REGISTRATION_FAILED"
  | "SESSION_EXPIRED"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

interface AuthContextType {
  user:
    | (AuthResponse["data"]["account"] & {
        unreadMessageCount?: number;
        unreadNotificationCount?: number;
        pendingLeadCount?: number;
      })
    | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (
    idToken: string,
    fullName: string,
    avatarUrl?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  saveSession: (data: AuthResponse["data"]) => void; // ✅ exposed for register flow
  refreshUser: () => Promise<AuthResponse["data"]["account"] | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * The onboarding wizard, and the ONLY place a PENDING_PROFESSIONAL may be.
 *
 * That role means "signed up but onboarding is not finished", so the account
 * must never reach an authenticated app surface — not /dashboard, not /admin,
 * and not any `?redirect=` target. It stays confined here until the backend
 * promotes the role (to LAWYER/FIRM) at the end of setup.
 */
export const PROFESSIONAL_SETUP_PATH = "/register/lawyer-setup";

/**
 * True while the account is still mid-onboarding as a professional.
 *
 * Deliberately takes a structural argument (not a full account) so the guard
 * can be reused for a cached `user` object that is still being hydrated.
 */
export function isPendingProfessional(
  account: Pick<AuthResponse["data"]["account"], "role"> | null | undefined,
): boolean {
  return account?.role === "PENDING_PROFESSIONAL";
}

// ✅ Routing helper — shared between login and register
//
// Routes on onboarding.nextStep, per the integration guide's core rule:
// do NOT infer progress from lawyerProfile/firmProfile being null — the
// profile is now created early in the flow, so that stopped meaning
// "not finished". The null-profile checks below only run as a fallback
// for accounts/backends that predate the `onboarding` field.
export function getPostAuthRoute(
  account: AuthResponse["data"]["account"],
): string {
  if (account.role === "ADMIN") {
    return "/admin";
  }
  if (isPendingProfessional(account)) {
    return PROFESSIONAL_SETUP_PATH;
  }
  if (account.role === "LAWYER" || account.role === "FIRM") {
    const nextStep = account.onboarding?.nextStep;
    if (nextStep && nextStep !== "complete") {
      return "/register/lawyer-setup";
    }
    if (nextStep === "complete") {
      return "/dashboard/feeds";
    }
    // No onboarding field at all (older backend) — fall back to the old
    // heuristic rather than assuming completion.
    if (account.role === "LAWYER" && !account.lawyerProfile) {
      return "/register/lawyer-setup";
    }
    if (account.role === "FIRM" && !account.firmProfile) {
      return "/register/lawyer-setup";
    }
  }
  return "/dashboard/feeds";
}

/**
 * Single source of truth for "where does this account go after signing in?".
 *
 * Confinement beats the `?redirect=` hint deliberately. Honouring a redirect
 * param for a PENDING_PROFESSIONAL is precisely how an unfinished account used
 * to end up inside /dashboard: `/signin?redirect=/dashboard/feeds` was
 * evaluated before the role fallback, so the param won. Here the role is
 * checked first and nothing can override it.
 */
export function resolvePostAuthRoute(
  account: AuthResponse["data"]["account"],
  requested?: string | null,
): string {
  if (isPendingProfessional(account)) return PROFESSIONAL_SETUP_PATH;
  if (requested?.startsWith("/") && !requested.startsWith("//")) {
    return requested;
  }
  return getPostAuthRoute(account);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse["data"]["account"] | null>(
    null,
  );
  // Only treat the app as "loading a session" while we actually verify one —
  // i.e. on a protected /dashboard route that has a stored token. On public
  // routes (landing, /signin, /register, …) there is nothing to verify.
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const pathname = window.location.pathname;
    const onProtectedRoute =
      pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
    return onProtectedRoute && !!localStorage.getItem("accessToken");
  });
  const router = useRouter();
  const pathname = usePathname();

  // ── Session check ──────────────────────────────────────────────────────────
  // Hydrate the user from localStorage on any route if present. The network
  // check/verification must still be confined to /dashboard to avoid redirect loops
  // or unauthorized API calls on public routes.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");

    // Hydrate immediately from cache so the user state is available on all pages.
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupt cache — drop it.
        localStorage.removeItem("user");
      }
    }

    const isProtectedRoute =
      (pathname?.startsWith("/dashboard") ?? false) ||
      (pathname?.startsWith("/admin") ?? false);
    if (!isProtectedRoute) return; // public route — nothing else to check

    // No token on a protected route → isLoading already starts false (see
    // initializer), so the dashboard/admin guard can redirect right away.
    if (!token) return;

    let cancelled = false;
    profileService
      .getMe()
      .then((r) => {
        if (cancelled) return;
        const fresh = r.data.data;
        localStorage.setItem("user", JSON.stringify(fresh));
        setUser(fresh);
        refreshSocketAuth(token);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const handleAuthLogout = () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      // Only redirect away on protected routes. On public routes (landing,
      // /signin, /register, …) a failed token check should clear state
      // silently without interrupting what the user is doing.
      if (window.location.pathname.startsWith("/dashboard")) {
        router.replace("/");
      }
    };
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, [router]);
  // Auto-subscribe to push notifications after login
  useEffect(() => {
    if (!user) return;

    const autoSubscribe = async () => {
      try {
        // Check if browser supports push
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }

        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed, but we can sync it with backend if needed
          return;
        }

        // Only ask for permission if not denied
        if (Notification.permission === "denied") {
          console.log("[Push] Permission denied, skipping auto-subscribe.");
          return;
        }

        // If default, request permission (user will see prompt)
        if (Notification.permission === "default") {
          const result = await Notification.requestPermission();
          if (result !== "granted") {
            console.log("[Push] Permission not granted, skipping.");
            return;
          }
        }

        // Now subscribe
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        });

        const serializedSub = JSON.parse(JSON.stringify(sub));
        await notificationsService.savePushSubscription(
          serializedSub,
          "desktop", // you can detect device type if needed
        );
        console.log("[Push] Auto-subscribed successfully.");
      } catch (error) {
        console.error("[Push] Auto-subscribe failed:", error);
      }
    };

    autoSubscribe();
  }, [user]);
  // ✅ Exposed so RegisterFlow can call it after OTP verify
  const saveSession = (data: AuthResponse["data"]) => {
    const { account, session } = data;
    localStorage.setItem("accessToken", session.accessToken);
    localStorage.setItem("refreshToken", session.refreshToken);
    localStorage.setItem("user", JSON.stringify(account));
    refreshSocketAuth(session.accessToken);
    setUser(account);
  };

  const clearSession = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    disconnectSocket();
    setUser(null);
  };

  const classifyError = (err: unknown): AuthError => {
    // If the error is already an AuthError carrying a known AuthErrorCode
    // (e.g. the "Unexpected response." thrown inside login), pass it through
    // unchanged instead of re-deriving a generic message. This also guards the
    // google/register flows that re-classify errors they just built.
    const KNOWN_CODES: AuthErrorCode[] = [
      "INVALID_CREDENTIALS",
      "ACCOUNT_NOT_FOUND",
      "ACCOUNT_EXISTS",
      "REGISTRATION_FAILED",
      "SESSION_EXPIRED",
      "NETWORK_ERROR",
      "SERVER_ERROR",
      "UNKNOWN_ERROR",
    ];
    if (
      typeof err === "object" &&
      err !== null &&
      typeof (err as AuthError).message === "string" &&
      KNOWN_CODES.includes((err as AuthError).code as AuthErrorCode)
    ) {
      return err as AuthError;
    }
    const { status, message, code } = parseApiError(err);
    // Prefer the backend's own message from the network response so the user
    // sees exactly what the API returned (these messages are written to be
    // shown as-is). The friendly text below is only a fallback when the
    // server supplied no message of its own.
    const backendMessage = (() => {
      if (typeof err === "object" && err !== null) {
        const msg = (err as { response?: { data?: { message?: unknown } } })
          ?.response?.data?.message;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
      }
      return null;
    })();
    if (code === "NETWORK_ERROR")
      return { code: "NETWORK_ERROR", message: "No internet connection." };
    if (status >= 500)
      return {
        code: "SERVER_ERROR",
        message: backendMessage ?? "Server error. Please try again.",
      };
    if (status === 404 || message.toLowerCase().includes("not found"))
      return {
        code: "ACCOUNT_NOT_FOUND",
        message: backendMessage ?? "Account not found.",
      };
    if (
      status === 401 ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("incorrect")
    )
      return {
        code: "INVALID_CREDENTIALS",
        message: backendMessage ?? "Incorrect email or password.",
      };
    if (status === 409 || message.toLowerCase().includes("already exists"))
      return {
        code: "ACCOUNT_EXISTS",
        message: backendMessage ?? "An account with this email already exists.",
      };
    return {
      code: "UNKNOWN_ERROR",
      message: (backendMessage ?? message) || "Something went wrong.",
    };
  };

  const syncGoogleAvatar = async (googleAvatarUrl: string) => {
    try {
      const imageResponse = await fetch(googleAvatarUrl);
      const blob = await imageResponse.blob();
      const file = new File([blob], "avatar.jpg", { type: blob.type });
      await profileService.uploadAvatar(file);
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: googleAvatarUrl } : prev,
      );
    } catch {
      console.warn("Avatar sync failed");
    }
  };

  /**
   * Read `?redirect=` from the current URL, returning it only when it is an
   * internal path. `//evil.com` is rejected too — it starts with "/" but is
   * protocol-relative, so accepting it would make this an open redirect.
   */
  function getRequestedRedirect(): string | null {
    if (typeof window === "undefined") return null;
    const redirect = new URLSearchParams(window.location.search).get(
      "redirect",
    );
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      return redirect;
    }
    return null;
  }

  const login = async (payload: LoginPayload): Promise<void> => {
    try {
      const response = await authService.login(payload);
      if (!response?.data?.data)
        throw { code: "UNKNOWN_ERROR", message: "Unexpected response." };

      const data = response.data.data;
      saveSession(data);

      // ✅ Route on profile completion. A PENDING_PROFESSIONAL is confined to
      // the setup wizard and cannot be redirected past it — see
      // resolvePostAuthRoute.
      router.replace(
        resolvePostAuthRoute(data.account, getRequestedRedirect()),
      );
    } catch (err: unknown) {
      // Always classify so the backend message from the network response is
      // surfaced. (Axios errors carry a `code` property, so an unconditional
      // "if it has a code, rethrow raw" check would swallow the real message.)
      throw classifyError(err);
    }
  };

  const loginWithGoogle = async (
    idToken: string,
    fullName: string,
    avatarUrl?: string,
  ): Promise<void> => {
    const attemptLogin = async () =>
      authService.login({ authProvider: "google", idToken, fullName });

    const handlePostLogin = async (
      data: AuthResponse["data"],
      googleAvatarUrl?: string,
    ) => {
      saveSession(data);
      if (googleAvatarUrl && !data.account.avatarUrl) {
        await syncGoogleAvatar(googleAvatarUrl);
      }
      // ✅ Same resolution as the email path — confinement first, then the
      // `?redirect=` hint, then the role's default route.
      router.replace(
        resolvePostAuthRoute(data.account, getRequestedRedirect()),
      );
    };

    try {
      const response = await attemptLogin();
      // A PENDING_PROFESSIONAL is confined to the wizard — never a landing
      // page and never a `?redirect=` target.
      if (isPendingProfessional(response.data.data.account)) {
        router.replace(PROFESSIONAL_SETUP_PATH);
        return;
      } else {
        await handlePostLogin(response.data.data, avatarUrl);
      }
    } catch (err: unknown) {
      const authError = classifyError(err);
      if (authError.code === "ACCOUNT_NOT_FOUND") {
        try {
          await authService.registerGoogleUser({
            authProvider: "google",
            idToken,
            fullName,
            role: "USER",
          });
          const response = await attemptLogin();
          // Same confinement as the branch above.
          if (isPendingProfessional(response.data.data.account)) {
            router.replace(PROFESSIONAL_SETUP_PATH);
            return;
          }
          await handlePostLogin(response.data.data, avatarUrl);
        } catch (registerErr: unknown) {
          const registerError = classifyError(registerErr);
          if (registerError.code === "ACCOUNT_EXISTS") {
            try {
              const response = await attemptLogin();
              await handlePostLogin(response.data.data, avatarUrl);
            } catch (finalErr: unknown) {
              throw classifyError(finalErr);
            }
            return;
          }
          throw registerError;
        }
        return;
      }
      if (authError.code === "SESSION_EXPIRED") {
        window.dispatchEvent(new Event("auth:logout"));
        throw authError;
      }
      throw authError;
    }
  };

  const refreshUser = async (): Promise<
    AuthResponse["data"]["account"] | null
  > => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    try {
      const r = await profileService.getMe();
      const fresh = r.data.data;
      localStorage.setItem("user", JSON.stringify(fresh));
      setUser(fresh);
      return fresh;
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const pathname = window.location.pathname;
    const shouldUseRealtime = [
      "/dashboard/messages",
      "/dashboard/notifications",
      "/dashboard/leads",
    ].some((route) => pathname.startsWith(route));

    if (!token || !user || !shouldUseRealtime) return;

    const socket = connectSocket(token);

    const handleUpdate = () => {
      refreshUser();
    };

    socket.on("notification", handleUpdate);
    socket.on("message", handleUpdate);
    socket.on("conversation:updated", handleUpdate);
    socket.on("message:read", handleUpdate);

    return () => {
      socket.off("notification", handleUpdate);
      socket.off("message", handleUpdate);
      socket.off("conversation:updated", handleUpdate);
      socket.off("message:read", handleUpdate);
    };
  }, [user?.id]);

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
    } finally {
      clearSession();
      router.replace("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        saveSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
