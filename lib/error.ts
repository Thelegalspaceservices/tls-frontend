// lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Translates raw backend, network, and HTTP error messages into clear,
 * human-friendly text that any non-technical user can understand.
 */
export function formatFriendlyError(
  rawMessage?: string | null,
  status?: number,
): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    if (status === 401)
      return "Incorrect email or password. Please try again.";
    if (status === 403)
      return "You do not have permission to perform this action.";
    if (status === 404)
      return "We could not find the requested account or page.";
    if (status === 409)
      return "An account with this email already exists. Please sign in instead.";
    if (status === 429)
      return "Too many attempts. Please wait a minute before trying again.";
    if (status && status >= 500)
      return "Our servers are experiencing temporary difficulty. Please try again in a few moments.";
    return "Something went wrong. Please check your details and try again.";
  }

  const clean = rawMessage.trim();
  const lower = clean.toLowerCase();

  // Network / connection issues
  if (
    lower.includes("network error") ||
    lower.includes("econnrefused") ||
    lower.includes("failed to fetch") ||
    lower.includes("no internet")
  ) {
    return "No internet connection. Please check your network and try again.";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The request took too long to respond. Please check your connection and try again.";
  }

  // Raw HTTP status codes from Axios
  if (
    lower.includes("request failed with status code 400") ||
    lower === "bad request"
  ) {
    return "Please check the information you entered and try again.";
  }
  if (
    lower.includes("request failed with status code 401") ||
    lower === "unauthorized"
  ) {
    return "Incorrect email or password. Please check your login details.";
  }
  if (
    lower.includes("request failed with status code 403") ||
    lower === "forbidden"
  ) {
    return "You don't have access to complete this action.";
  }
  if (
    lower.includes("request failed with status code 404") ||
    lower === "not found"
  ) {
    return "We couldn't find your account or the requested record.";
  }
  if (
    lower.includes("request failed with status code 409") ||
    lower === "conflict"
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (
    lower.includes("request failed with status code 429") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("too many attempts")
  ) {
    return "Too many attempts. Please wait a minute before trying again.";
  }
  if (
    lower.includes("request failed with status code 500") ||
    lower.includes("internal server error") ||
    lower.includes("server error") ||
    (status && status >= 500)
  ) {
    return "Our servers are having temporary trouble. Please try again shortly.";
  }

  // Password / Credentials
  if (
    lower.includes("invalid credentials") ||
    lower.includes("invalid password") ||
    lower.includes("incorrect password") ||
    lower.includes("password is wrong")
  ) {
    return "Incorrect email or password. Please try again.";
  }

  // Account exists / not found
  if (
    lower.includes("already exists") ||
    lower.includes("already in use") ||
    lower.includes("duplicate key")
  ) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (
    lower.includes("user not found") ||
    lower.includes("account not found") ||
    lower.includes("no account found")
  ) {
    return "No account found with this email. Please check your email or sign up.";
  }

  // OTP / Verification Code
  if (lower.includes("otp expired") || lower.includes("code expired")) {
    return "Your verification code has expired. Please click resend to get a fresh code.";
  }
  if (
    lower.includes("invalid otp") ||
    lower.includes("invalid code") ||
    lower.includes("incorrect code") ||
    lower.includes("otp is incorrect")
  ) {
    return "The verification code you entered is incorrect. Please check the code and try again.";
  }

  // JWT / Session
  if (
    lower.includes("jwt") ||
    lower.includes("token expired") ||
    lower.includes("session expired")
  ) {
    return "Your session has expired. Please sign in again to continue.";
  }

  // Captcha
  if (lower.includes("captcha") || lower.includes("recaptcha")) {
    return "Security verification failed. Please refresh the page and try again.";
  }

  return clean;
}

export function parseApiError(err: unknown): {
  message: string;
  status: number;
  code: string;
} {
  if (typeof err === "object" && err !== null) {
    const axiosErr = err as any;
    const status = axiosErr?.response?.status ?? 0;
    const data = axiosErr?.response?.data;
    const rawMessage =
      data?.message ??
      axiosErr?.message ??
      "Something went wrong. Please try again.";

    const code = (() => {
      if (status === 404) return "NOT_FOUND";
      if (status === 400) return "BAD_REQUEST";
      if (status === 401) return "UNAUTHORIZED";
      if (status === 403) return "FORBIDDEN";
      if (status === 409) return "CONFLICT";
      if (status === 422) return "VALIDATION_ERROR";
      if (status === 429) return "RATE_LIMITED";
      if (status >= 500) return "SERVER_ERROR";
      if (!status) return "NETWORK_ERROR";
      return "UNKNOWN_ERROR";
    })();

    const message = formatFriendlyError(rawMessage, status);

    return { message, status, code };
  }

  return {
    message: "Something went wrong. Please check your details and try again.",
    status: 0,
    code: "UNKNOWN_ERROR",
  };
}

export const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "We couldn't find your account. Please check your details.",
  BAD_REQUEST: "Please check the information you entered and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  CONFLICT: "An account with this email already exists. Please sign in instead.",
  VALIDATION_ERROR: "Please check your details and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SERVER_ERROR: "Our servers are experiencing temporary difficulty. Please try again shortly.",
  NETWORK_ERROR: "No internet connection. Please check your network connection.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

export function getErrorMessage(err: unknown): string {
  const { message, code } = parseApiError(err);
  if (
    message &&
    message !== "Something went wrong. Please try again." &&
    message !== "Something went wrong. Please check your details and try again."
  ) {
    return formatFriendlyError(message);
  }
  return ERROR_MESSAGES[code] ?? message;
}
