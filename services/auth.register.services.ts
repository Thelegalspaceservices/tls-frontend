// services/auth.register.service.ts
import { api } from "./api";
import type { AreaFeeEntry } from "@/app/Components/Lawyer-Signup/StepProfessionalFees";

export type RegisterRole = "USER" | "LAWYER" | "FIRM" | "PENDING_PROFESSIONAL";

export const registerService = {
  // Step 1
  // `captchaToken` is only required while the backend has CAPTCHA_ENABLED=true;
  // it is omitted otherwise (see app/utils/captcha.ts).
  start: (payload: {
    email: string;
    password: string;
    role: RegisterRole;
    captchaToken?: string;
  }) => api.post("/auth/register/start", payload),

  // Step 2
  verify: (payload: { email: string; otp: string }) =>
    api.post("/auth/register/verify", payload),

  // Resend
  resend: (email: string) => api.post("/auth/register/resend", { email }),

  // Google
  google: (payload: {
    idToken: string;
    role: RegisterRole;
    fullName?: string;
  }) => api.post("/auth/register/google", payload),

  // Lawyer setup — Bearer token required
  // NOTE: practiceAreas now carries fee ranges (minFee/maxFee in kobo).
  // The old practiceAreaIds + services[] shape was removed by the backend.
  // NOTE: `callToBarYear` is accepted-and-ignored by the backend now (it was
  // captured + NBA-checked at the bar-details step), so it is optional here and
  // omitted when unknown. `officeAddress` is not part of the lawyer setup
  // contract at all — sending it would only be stripped.
  lawyerSetup: (payload: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    callToBarYear?: number;
    locationCity: string;
    locationCountry?: string;
    practiceAreas: AreaFeeEntry[];
  }) => api.post("/profile/me/lawyer/setup", payload),

  // Firm setup — Bearer token required
  firmSetup: (payload: {
    firmName: string;
    whatsappNumber: string;
    officeAddress: string;
    firmEstablishmentYear: number;
    locationCity: string;
    locationCountry?: string;
    practiceAreas: AreaFeeEntry[];
  }) => api.post("/profile/me/firm/setup", payload),

  // Document upload
  uploadDocument: (file: File, docType: "call_to_bar_cert" | "cac_cert") => {
    const form = new FormData();
    form.append("file", file);
    return api.post(
      `/profile/me/verification/document?docType=${docType}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
};
