// app/Components/Lawyer-Signup/LawyerSignup.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import { registerService } from "@/services/auth.register.services";
import { useToast } from "@/app/context/ToastContext";
import { useAuth } from "@/app/context/AuthContext";
import signupIllustration from "@/public/registerillustration.png";

import Step1AccountType from "./Step1AccountType";
import StepMembership from "./StepMembership";
import StepPersonalInfo from "./StepPersonalInfo";
import StepPracticeAreas from "./StepPracticeAreas";
import StepProfessionalFees, {
  type AreaFeeEntry,
} from "./StepProfessionalFees";
import StepVerification from "./StepVerification";
import StepBarDetails from "./StepBarDetails";
import StepBarCollision from "./StepBarCollision";
import StepDispute from "./StepDispute";
import StepDisputeReview from "./StepDisputeReview";
import StepCertUpload from "./StepCertUpload";
import StepIdentity from "./StepIdentity";
import StepUnderReview from "./StepUnderReview";
import StepVerifiedTransition from "./StepVerifiedTransition";
import { profileService } from "@/services/profile.services";
import type { BarDetailsResponse } from "@/services/profile.services";
import { membershipService } from "@/services/membership.services";

export type AccountType = "lawyer" | "firm";

// ─── Step identifiers ────────────────────────────────────────────────────────
// Lawyer order (redesigned, per the integration guide):
//   account_type → bar_details → (bar_collision → dispute → dispute_review)
//   → cert_upload → identity → under_review → verified → membership
//   → personal_info → practice_areas → fees → success
// Firm order (unchanged — the firm equivalents of bar-details/identity don't
// exist in the design yet):
//   account_type → membership(pay) → personal_info → practice_areas → fees
//   → verification(cac cert) → success
type Step =
  | "account_type"
  | "bar_details"
  | "bar_collision"
  | "dispute"
  | "dispute_review"
  | "cert_upload"
  | "identity"
  | "under_review"
  | "verified"
  | "membership"
  | "personal_info"
  | "practice_areas"
  | "fees"
  | "verification" // firm-only cert/cac upload
  | "success";

const lawyerFlow: Step[] = [
  "account_type",
  "bar_details",
  "cert_upload",
  "identity",
  "under_review",
  "verified",
  "membership",
  "personal_info",
  "practice_areas",
  "fees",
  "success",
];
const firmFlow: Step[] = [
  "account_type",
  "membership",
  "personal_info",
  "practice_areas",
  "fees",
  "verification",
  "success",
];

// Maps the backend's onboarding.nextStep onto the step this wizard should
// resume at. Used both on initial load and right after login/payment.
function stepFromNextStep(nextStep: string | null | undefined): Step | null {
  switch (nextStep) {
    case "bar_details":
      return "bar_details";
    case "identity":
      return "identity";
    case "submit_application":
      return "identity"; // StepIdentity re-fetches verification and lands on the ready-to-submit panel
    case "await_review":
      return "under_review";
    case "await_dispute":
      return "dispute_review";
    case "rejected":
      return "under_review"; // same screen shows a distinct message once status is rejected
    case "select_plan":
      return "membership";
    case "profile_setup":
      return "personal_info";
    default:
      return null;
  }
}

function prevStep(
  step: Step,
  accountType: AccountType | null,
  locked: boolean,
): Step | null {
  if (step === "bar_collision") return "bar_details";
  if (step === "dispute") return "bar_collision";
  if (
    step === "dispute_review" ||
    step === "under_review" ||
    step === "verified"
  ) {
    return null; // no back once submitted / while waiting on review
  }
  let flow = accountType === "firm" ? firmFlow : lawyerFlow;
  if (locked) {
    flow = flow.filter((s) => s !== "account_type" && s !== "membership");
  }
  const idx = flow.indexOf(step);
  return idx > 0 ? flow[idx - 1] : null;
}

export default function LawyerSignup() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("account_type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Bar-details collision state (only populated on the already_registered branch)
  const [collision, setCollision] = useState<{
    scn: string;
    existingAccount: BarDetailsResponse["data"]["existingAccount"];
  } | null>(null);
  const [dispute, setDispute] = useState<{
    id: string;
    caseReference: string;
  } | null>(null);

  const [locked, setLocked] = useState(false); // true once Professional payment is confirmed
  const [resuming, setResuming] = useState(true); // true while we check for a half-finished user

  // Detect a returning half-finished user and resume at the right step.
  useEffect(() => {
    (async () => {
      try {
        const account = await refreshUser();
        if (!account) {
          setResuming(false);
          return;
        }

        if (account.role === "LAWYER" || account.role === "FIRM") {
          const type: AccountType = account.role === "FIRM" ? "firm" : "lawyer";
          setAccountType(type);

          // Rehydrate steps 11–13 from the server-side draft — this is what
          // survives the Paystack round-trip and a closed tab.
          try {
            const draftRes = await profileService.getOnboardingDraft();
            const draft = draftRes.data.data;
            if (draft && Object.keys(draft).length) {
              setFormData((prev) => ({ ...draft, ...prev }));
            }
          } catch {
            /* no draft yet — start clean */
          }

          if (account.onboarding?.nextStep === "complete") {
            router.replace("/dashboard/feeds");
            return;
          }

          const resumeStep = stepFromNextStep(account.onboarding?.nextStep);
          if (resumeStep) {
            // Community/professional payment lock only matters once we're
            // past the membership step in the resumed flow.
            const membershipIdx = (
              type === "firm" ? firmFlow : lawyerFlow
            ).indexOf("membership");
            const resumeIdx = (type === "firm" ? firmFlow : lawyerFlow).indexOf(
              resumeStep,
            );
            if (resumeIdx > membershipIdx) {
              const membership = await membershipService.getMembership();
              if (membership.data?.tier === "professional") setLocked(true);
            }
            setStep(resumeStep);
            setResuming(false);
            return;
          }

          // Backend hasn't shipped `onboarding` yet, or account predates it —
          // fall back to the old profile-presence heuristic.
          const hasProfile =
            type === "lawyer" ? !!account.lawyerProfile : !!account.firmProfile;
          if (hasProfile) {
            router.replace("/dashboard/feeds");
            return;
          }
          const membership = await membershipService.getMembership();
          if (membership.data?.tier === "professional") {
            setLocked(true);
            setStep("personal_info");
          } else {
            setStep(type === "lawyer" ? "bar_details" : "membership");
          }
        }
        // role === "PENDING_PROFESSIONAL" → leave step at default "account_type"
      } catch {
        // no session / request failed — fall back to the start of the wizard
      } finally {
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const merge = (data: Record<string, unknown>) =>
    setFormData((prev) => ({ ...prev, ...data }));

  // ─── Account type selection ──────────────────────────────────────────────
  const handleAccountType = async (type: AccountType) => {
    setIsLoading(true);
    try {
      await profileService.setProfessionalRole(
        type === "firm" ? "FIRM" : "LAWYER",
      );
      // The backend promotes the role from PENDING_PROFESSIONAL to LAWYER/FIRM
      // on this call. Refresh before moving on, otherwise the cached `user` in
      // localStorage still says PENDING_PROFESSIONAL and the dashboard guard
      // would bounce the now-promoted account back here.
      await refreshUser();
      setAccountType(type);
      setStep(type === "lawyer" ? "bar_details" : "membership");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your selection. Please try again.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Back ────────────────────────────────────────────────────────────────
  const handleBack = () => {
    const prev = prevStep(step, accountType, locked);
    if (prev) setStep(prev);
  };
  const canGoBack =
    step !== "success" && prevStep(step, accountType, locked) !== null;

  // ─── Firm submit (unchanged — still cert upload via StepVerification) ───
  const handleFinish = async (file: File) => {
    if (!accountType || accountType !== "firm") return;
    setIsLoading(true);
    const practiceAreas = (formData.fees as AreaFeeEntry[] | undefined) ?? [];
    try {
      await registerService.firmSetup({
        firmName: String(formData.firmName ?? ""),
        whatsappNumber: `+234${formData.phone}`,
        officeAddress: String(formData.locationCity ?? ""),
        firmEstablishmentYear: parseInt(
          String(formData.firmEstablishmentYear),
          10,
        ),
        locationCity: String(formData.locationCity ?? ""),
        locationCountry: "Nigeria",
        practiceAreas,
      });
      await registerService.uploadDocument(file, "cac_cert");
      showSuccess("Registration complete!");
      setStep("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Setup failed. Please try again.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Firm submit (Community — no card on file) ──────────────────────────
  const handleFirmFinish = async (practiceAreasOverride?: AreaFeeEntry[]) => {
    if (!accountType) return;
    setIsLoading(true);
    const practiceAreas =
      practiceAreasOverride ??
      (formData.fees as AreaFeeEntry[] | undefined) ??
      [];
    try {
      await registerService.firmSetup({
        firmName: String(formData.firmName ?? ""),
        whatsappNumber: `+234${formData.phone}`,
        officeAddress: String(formData.locationCity ?? ""),
        firmEstablishmentYear: parseInt(
          String(formData.firmEstablishmentYear),
          10,
        ),
        locationCity: String(formData.locationCity ?? ""),
        locationCountry: "Nigeria",
        practiceAreas,
      });
      showSuccess("Registration complete!");
      setStep("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Setup failed. Please try again.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Lawyer submit (verification already done earlier in the flow) ──────
  const handleLawyerFinish = async (practiceAreasOverride?: AreaFeeEntry[]) => {
    setIsLoading(true);
    const practiceAreas =
      practiceAreasOverride ??
      (formData.fees as AreaFeeEntry[] | undefined) ??
      [];
    try {
      // `callToBarYear` was captured + NBA-checked at the bar-details step and
      // the backend ignores it here — send it only when we actually have a
      // finite number (an undefined value would serialise to null and fail the
      // integer schema). `officeAddress` isn't in the lawyer setup contract.
      const callToBarYear = Number(formData.callToBarYear);
      await registerService.lawyerSetup({
        firstName: String(formData.firstName ?? ""),
        lastName: String(formData.lastName ?? ""),
        whatsappNumber: `+234${formData.phone}`,
        ...(Number.isFinite(callToBarYear) && callToBarYear > 0
          ? { callToBarYear }
          : {}),
        locationCity: String(formData.locationCity ?? ""),
        locationCountry: "Nigeria",
        practiceAreas,
      });
      showSuccess("Registration complete!");
      setStep("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Setup failed. Please try again.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resuming guard ──────────────────────────────────────────────────────
  if (resuming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ─── Success screen ──────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-3 font-dmSans">
            Registration Complete 🎉
          </h2>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-6 font-dmSans">
            Your profile has been submitted successfully and is currently under
            review. We&apos;ll notify you once verification is complete and your
            account has been approved.
          </p>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-8 font-dmSans">
            In the meantime, you can start exploring the community, articles,
            and opportunities available on the platform.
          </p>
          <button
            onClick={() => router.replace("/dashboard/feeds")}
            className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans"
          >
            Go to Feed
          </button>
        </div>
      </div>
    );
  }

  // Steps that render their own full-bleed layout (no image panel / back-arrow chrome)
  const isBareStep =
    step === "under_review" || step === "dispute_review" || step === "verified";

  // ─── Main layout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Illustration — left half, desktop only */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src={signupIllustration}
          alt="The Legal Space"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-14 py-8">
          <div className="w-full max-w-md">
            {!isBareStep &&
              (canGoBack || (accountType && step !== "account_type")) && (
                <div className="flex items-center justify-between mb-6 sm:mb-9">
                  {canGoBack ? (
                    <button
                      onClick={handleBack}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                  ) : (
                    <div />
                  )}
                  {accountType && step !== "account_type" && (
                    <span className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D1D5DB] text-[#060B13] text-[12px] font-medium rounded-full font-dmSans">
                      {accountType === "lawyer" ? "Lawyer" : "Law Firm"}
                    </span>
                  )}
                </div>
              )}

            {step === "account_type" && (
              <Step1AccountType
                onNext={handleAccountType}
                isLoading={isLoading}
              />
            )}

            {/* ── Lawyer-only verification stages ───────────────────────── */}
            {step === "bar_details" && (
              <StepBarDetails
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onContinue={() => setStep("cert_upload")}
                onCollision={(existingAccount, scn) => {
                  setCollision({ scn, existingAccount });
                  setStep("bar_collision");
                }}
              />
            )}

            {step === "bar_collision" && collision && (
              <StepBarCollision
                scn={collision.scn}
                existingAccount={collision.existingAccount}
                onEditDetails={() => {
                  setCollision(null);
                  setStep("bar_details");
                }}
                onFlagged={(id, caseReference) => {
                  setDispute({ id, caseReference });
                  setStep("dispute");
                }}
              />
            )}

            {step === "dispute" && dispute && (
              <StepDispute
                disputeId={dispute.id}
                caseReference={dispute.caseReference}
                onSubmitted={() => setStep("dispute_review")}
              />
            )}

            {step === "dispute_review" && <StepDisputeReview />}

            {step === "cert_upload" && (
              <StepCertUpload onContinue={() => setStep("identity")} />
            )}

            {step === "identity" && (
              <StepIdentity onComplete={() => setStep("under_review")} />
            )}

            {step === "under_review" && (
              <StepUnderReview onVerified={() => setStep("verified")} />
            )}

            {step === "verified" && (
              <StepVerifiedTransition
                firstName={
                  typeof user?.fullName === "string"
                    ? user.fullName.split(" ")[0]
                    : undefined
                }
                onContinue={() => setStep("membership")}
              />
            )}

            {/* ── Shared tail (both account types) ──────────────────────── */}
            {step === "membership" && accountType && (
              <StepMembership
                accountType={accountType}
                onCommunity={() => setStep("personal_info")}
              />
            )}

            {step === "personal_info" && accountType && (
              <StepPersonalInfo
                accountType={accountType}
                email={user?.email ?? ""}
                isLoading={isLoading}
                initial={formData as Record<string, string>}
                onNext={async (data) => {
                  merge(data);
                  await profileService
                    .saveOnboardingDraft(data as Record<string, unknown>)
                    .catch(() => {});
                  setStep("practice_areas");
                }}
              />
            )}

            {step === "practice_areas" && accountType && (
              <StepPracticeAreas
                accountType={accountType}
                isSaving={isLoading}
                initialIds={(formData.practiceAreaIds as string[]) ?? []}
                onNext={async (data) => {
                  merge(data);
                  await profileService
                    .saveOnboardingDraft(data as Record<string, unknown>)
                    .catch(() => {});
                  setStep("fees");
                }}
              />
            )}

            {step === "fees" && (
              <StepProfessionalFees
                practiceAreaIds={(formData.practiceAreaIds as string[]) ?? []}
                isLoading={isLoading}
                initialFees={(formData.fees as AreaFeeEntry[]) ?? []}
                onNext={async (fees) => {
                  merge({ fees });
                  await profileService
                    .saveOnboardingDraft({ fees } as Record<string, unknown>)
                    .catch(() => {});
                  if (accountType === "lawyer") {
                    // Cert + identity already handled earlier — go straight
                    // to profile setup, no separate verification step.
                    handleLawyerFinish(fees);
                  } else {
                    handleFirmFinish(fees);
                  }
                }}
              />
            )}

            {step === "verification" && accountType === "firm" && (
              <StepVerification
                accountType={accountType}
                onFinish={handleFinish}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
