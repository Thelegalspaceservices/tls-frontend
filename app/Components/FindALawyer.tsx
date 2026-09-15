// components/intake/FindALawyer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Hourglass,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

import {
  MatchOffer,
  MatchResult,
  SearchPayload,
  ExtractedIntake,
  buildIntakeSteps,
  BUDGET_OPTIONS,
  intakeService,
} from "@/services/intake.services";

import { SendRequestPayload } from "@/services/requests.services";
import { useSearchByText } from "@/hooks/useIntake";
import { useSendRequest } from "@/hooks/useRequests";
import { usePracticeAreas } from "@/hooks/usePracticeAreas";
import Image from "next/image";
import LawyerProfileView from "./LawyerProfileView";

type ClarifyKey = "matter" | "budget" | "location";

interface ClarifyState {
  originalText: string;
  extracted: ExtractedIntake;
  missing: ClarifyKey[]; // remaining questions to ask, in order
  message: string; // banner text straight from the API
}

interface SearchState {
  results: MatchResult[];
  extracted: ExtractedIntake;
  searchPayload?: SearchPayload;
  total: number;
  offer: MatchOffer | null;
}

/**
 * A hard stop surfaced instead of a results grid. The backend now returns three
 * blocking states from search — on cooldown, allowance used up, no match found —
 * and the intake should check availability up front rather than erroring after
 * every question.
 */
interface BlockedState {
  type: "cooldown" | "quota" | "no-match";
  message: string;
  hoursRemaining?: number;
  offersUsed?: number;
  offersAllowed?: number;
  cooldownUntil?: string;
}

function getInitials(name: string): string {
  if (!name) return "?";

  return name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  if (!name) return "bg-gray-100 text-gray-500";

  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
  ];

  return colors[name.charCodeAt(0) % colors.length];
}

function formatBudgetLabel(budget: string | null): string {
  if (!budget) return "";

  const map: Record<string, string> = {
    under_100k: "Under ₦100k",
    "100k_to_500k": "₦100k - ₦500k",
    "500k_to_2m": "₦500k - ₦2M",
    above_2m: "Above ₦2M",
  };

  return map[budget] ?? budget.replace(/_/g, " ");
}

// Folds the answers picked from the clarify chips back into the user's
// original free text as plain sentences, then that combined text is
// re-submitted to /matchmaking/search-by-text — reusing the same NLP
// endpoint rather than switching to the structured one.
function buildClarifiedText(
  originalText: string,
  extracted: ExtractedIntake,
): string {
  const sentences = [originalText.trim()];

  if (extracted.matter?.name) {
    sentences.push(`Legal matter: ${extracted.matter.name}.`);
  }
  if (extracted.budget) {
    const label =
      BUDGET_OPTIONS.find((o) => o.value === extracted.budget)?.label ??
      extracted.budget;
    sentences.push(`Budget: ${label}.`);
  }
  if (extracted.location) {
    sentences.push(`Location: ${extracted.location}.`);
  }

  return sentences.join(" ");
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null) return fallback;

  const maybe = err as {
    response?: { data?: { message?: string } };
  };

  return maybe.response?.data?.message ?? fallback;
}

function getErrorStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;

  const maybe = err as { response?: { status?: number } };
  return maybe.response?.status ?? null;
}

// Some backends send the "couldn't determine enough" clarify payload with
// a non-2xx HTTP status instead of HTTP 200 + error:true — axios rejects
// in that case, so the response never reaches a normal `try` block. This
// pulls the same { message, extracted } shape out of a thrown error, if
// present, so callers can branch into clarify mode either way.
function extractClarifyErrorBody(
  err: unknown,
): { message: string; extracted: ExtractedIntake } | null {
  if (typeof err !== "object" || err === null) return null;

  const maybe = err as {
    response?: {
      data?: {
        error?: boolean;
        message?: string;
        data?: { extracted?: ExtractedIntake };
      };
    };
  };

  const body = maybe.response?.data;
  if (body?.error && body.data?.extracted) {
    return {
      message: body.message ?? "We need a bit more information to search.",
      extracted: body.data.extracted,
    };
  }

  return null;
}

// Both QuestionBlock and ClarifyQuestion sit inside a scroll panel padded
// with px-4 md:px-8. Pulling the divider out with a matching negative
// margin (then re-applying the same padding) lets the border-b span the
// full panel width edge-to-edge instead of stopping at the content's
// max-w-2xl indent.
const FULL_BLEED_DIVIDER = "-mx-4 md:-mx-8 px-4 md:px-8";

function QuestionBlock({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div
      className={`${FULL_BLEED_DIVIDER} pb-5 border-b border-[#EFEFEF] last:border-none`}
    >
      <div className="inline-flex items-center rounded-full border border-[#E67E22] px-5 py-2.5 bg-white shadow-sm">
        <p className="text-[14px] font-medium text-[#202020]">{question}</p>
      </div>

      <div className="mt-3">
        <div className="inline-flex items-center rounded-2xl bg-[#EEF4FF] px-5 py-3 text-[14px] font-medium text-[#2D6BFF] shadow-sm">
          {answer}
        </div>
      </div>
    </div>
  );
}

function ClarifyQuestion({
  question,
  options,
  onSelect,
  disabled,
}: {
  question: string;
  options: { label: string; value: string }[];
  onSelect: (option: { label: string; value: string }) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`${FULL_BLEED_DIVIDER} pb-5 border-b border-[#EFEFEF] last:border-none`}
    >
      <div className="inline-flex items-center rounded-full border border-[#E67E22] px-5 py-2.5 bg-white shadow-sm">
        <p className="text-[14px] font-medium text-[#202020]">{question}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="rounded-2xl border border-[#EAEAEA] bg-[#F7F7F7] px-5 py-3 text-[14px] font-medium text-[#333] transition-colors hover:border-[#1D4ED8] hover:bg-[#EEF4FF] hover:text-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LawyerCard({
  match,
  extracted,
  onViewProfile,
}: {
  match: MatchResult;
  extracted: ExtractedIntake;
  onViewProfile: (accountId: string) => void;
}) {
  const sendRequest = useSendRequest();

  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { account, score } = match;

  const handleSend = async () => {
    if (isSending || sent) return;
    setIsSending(true);
    setError("");

    try {
      const freeText = localStorage.getItem("freeText");
      const payload: SendRequestPayload = {
        lawyerAccountId: account.id,
        intakePayload: {
          matter: extracted.matter?.id ?? "",
          budget: extracted.budget ?? "",
          location: extracted.location ?? "",
          preference: extracted.preference ?? "either",
          freeText: freeText ?? "null",
        },
      };

      await sendRequest.mutateAsync(payload);
      if (isMountedRef.current) {
        setSent(true);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(getErrorMessage(err, "Failed to send request"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  };

  const scoreColorClasses =
    score >= 80
      ? "bg-[#EFFAF2] text-[#159947]"
      : score > 40
        ? "bg-[#FFF8E8] text-[#C48529]"
        : "bg-[#FFF4F4] text-[#C42929]";

  return (
    <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          {/* Avatar: show image if available, otherwise initials */}
          <div
            className={`relative w-16 h-16 rounded-full flex items-center justify-center font-semibold text-base shrink-0 overflow-hidden ${getAvatarColor(
              account.fullName,
            )}`}
          >
            {account.avatarUrl ? (
              <Image
                src={account.avatarUrl}
                alt={account.fullName}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              getInitials(account.fullName)
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[22px] font-['Instrument_Serif'] text-[#202020] truncate">
                {account.fullName}
              </h3>

              {account.lawyerProfile?.verificationStatus === "verified" && (
                <div className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2 py-1 text-[11px] text-[#2D6BFF] shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>

            {/* Subtitle line — plain text, e.g. "Lawyer | Goal-Oriented | Future-focused" */}
            {account.bio && (
              <p className="text-[13px] text-[#6B7280] mt-1 font-['Geist'] truncate">
                {account.bio}
              </p>
            )}
          </div>
        </div>

        {/* Combined score + "Match" pill, single line */}
        <div
          className={`rounded-full px-4 py-2 text-[13px] font-semibold shrink-0 whitespace-nowrap ${scoreColorClasses}`}
        >
          {score}% Match
        </div>
      </div>

      {/* Location + rating side by side */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {account.locationCity ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EAFBF0] px-4 py-2.5 text-[13px] font-medium text-[#22C55E]">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {account.locationCity}, {account.locationCountry}
            </span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#FEF9EC] px-4 py-2.5 text-[13px] font-medium text-[#D9A441]">
          <Star className="w-3.5 h-3.5 fill-[#D9A441] text-[#D9A441] shrink-0" />
          {parseFloat(account.avgRating || "0").toFixed(1)}
        </div>
      </div>

      {/* Connections — full width */}
      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EAF3FF] px-4 py-2.5 text-[13px] font-medium text-[#0084FF] mt-3">
        <Users className="w-3.5 h-3.5" />
        {account.connectionCount}+ Connections
      </div>

      {/* Why this match — fee_range reads as "Within your budget". */}
      <MatchFactorBadges factors={match.matchedFactors} />

      {error && <p className="text-[12px] text-red-500 mt-4">{error}</p>}
      {sent && (
        <p className="text-[12px] text-[#159947] mt-3">
          Request sent — you will be connected once they accept.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => onViewProfile(account.id)}
          className="h-11 rounded-lg border border-[#EAEAEA] bg-[#F7F7F7] text-[13px] font-medium text-[#444] hover:bg-[#EFEFEF] transition-colors"
        >
          Profile
        </button>

        <button
          onClick={handleSend}
          disabled={sent || isSending || sendRequest.isPending}
          className={`h-11 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
            sent
              ? "bg-green-500 text-white"
              : "bg-[#1D4ED8] text-white hover:bg-[#1B46C4]"
          }`}
        >
          {isSending || sendRequest.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : sent ? (
            <>
              <Check className="w-4 h-4" />
              Sent
            </>
          ) : (
            "Send Request"
          )}
        </button>
      </div>
    </div>
  );
}

// Same gradient-border technique used for the sidebar's "Find a Lawyer"
// pill — a transparent border painted with two layered backgrounds so the
// gradient only shows on the border, not the fill.
function GradientPill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-fit py-2 px-6 rounded-4xl text-[13px] font-medium text-gray-900 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity font-['Geist']"
      style={{
        border: "2px solid transparent",
        backgroundImage:
          "linear-gradient(white, white), linear-gradient(90deg, #216399 0%, #FFE500 50%, #C34B00 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      {children}
    </div>
  );
}

// ─── Match screen helpers ─────────────────────────────────────────────────────
// The backend no longer returns a browsable list — at most one lawyer and one
// firm, plus an offer block. These helpers render that single match.

const MATCH_FACTOR_LABELS: Record<string, string> = {
  practice_area: "Practice area",
  location: "Location",
  fee_range: "Within your budget",
  rating: "Highly rated",
  experience: "Experienced",
  availability: "Available",
};

function matchedFactorLabel(factor: string): string {
  return (
    MATCH_FACTOR_LABELS[factor] ??
    factor
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function formatRespondBy(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatHours(hours: number): string {
  const h = Math.max(1, Math.round(hours));
  return h === 1 ? "1 hour" : `${h} hours`;
}

/** Cooldown helpers — kept at module scope so relative time is not computed in render. */
function isCooldownActive(offer: MatchOffer): boolean {
  if (!offer.cooldownUntil) return false;
  return new Date(offer.cooldownUntil).getTime() > Date.now();
}

function cooldownHoursRemaining(offer: MatchOffer): number {
  if (!offer.cooldownUntil) return 0;
  return Math.max(
    1,
    Math.ceil(
      (new Date(offer.cooldownUntil).getTime() - Date.now()) / (60 * 60 * 1000),
    ),
  );
}

/** Why this match was chosen — fee_range reads as "Within your budget". */
function MatchFactorBadges({ factors }: { factors: string[] }) {
  if (!factors?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {factors.map((f) => (
        <span
          key={f}
          className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
            f === "fee_range"
              ? "bg-[#EFFAF2] text-[#159947]"
              : "bg-[#EEF4FF] text-[#2D6BFF]"
          }`}
        >
          {matchedFactorLabel(f)}
        </span>
      ))}
    </div>
  );
}

/** Deadline + allowance + cooldown state for the current match. */
function OfferBanner({ offer }: { offer: MatchOffer }) {
  const respondBy = formatRespondBy(offer.expiresAt);
  const isCooldown = isCooldownActive(offer);
  const cooldownHours = isCooldown ? cooldownHoursRemaining(offer) : 0;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#2D6BFF]" />
          <span className="text-[13px] font-medium text-[#202020]">
            {respondBy ? `Respond by ${respondBy}` : "Match active"}
          </span>
        </div>
        <span className="text-[12px] text-[#6B7280]">
          {offer.offersUsed} of {offer.offersAllowed} matches used this week
        </span>
      </div>
      {isCooldown && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#EEF4FF] px-3 py-2 text-[12px] text-[#2D6BFF]">
          <Hourglass className="w-3.5 h-3.5 shrink-0" />
          You can be matched again for this type of matter in{" "}
          {formatHours(cooldownHours)}.
        </div>
      )}
    </div>
  );
}

/**
 * The only affordability signal a client gets once fee figures are gone. Surface
 * it plainly — it's the only warning they'll see that the match may cost more.
 */
function BudgetRelaxedBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-amber-900">
            No lawyers matched your budget
          </p>
          <p className="text-[13px] leading-6 text-amber-800 mt-1">
            This is the closest fit and may cost more than indicated.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Whether an account is a firm or an individual lawyer — used to cap a match to one of each. */
function classifyRole(account: MatchResult["account"]): "lawyer" | "firm" {
  const role = (account.role ?? "").toUpperCase();
  if (role === "FIRM" || account.firmProfile) return "firm";
  return "lawyer";
}

/** Empty-state card for the three blocking outcomes of a search. */
function BlockedCard({ blocked }: { blocked: BlockedState }) {
  const title =
    blocked.type === "quota"
      ? "You've used your matches for this matter"
      : blocked.type === "cooldown"
        ? "You'll be matched again soon"
        : "No match found right now";
  const icon =
    blocked.type === "no-match" ? (
      <Users className="w-7 h-7 text-[#999]" />
    ) : (
      <Hourglass className="w-7 h-7 text-[#C48529]" />
    );

  return (
    <div className="rounded-3xl border border-[#ECECEC] bg-white p-10 text-center">
      <div className="w-16 h-16 rounded-3xl bg-[#F7F7F7] border border-[#EFEFEF] mx-auto flex items-center justify-center mb-2">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-[#202020]">{title}</h3>
      <p className="text-[13px] text-[#6B7280] mt-1 leading-6 max-w-md mx-auto">
        {blocked.message}
      </p>
      {blocked.type === "quota" && (
        <p className="text-[13px] text-[#1D4ED8] mt-4">
          Try a different type of legal matter.
        </p>
      )}
    </div>
  );
}

export default function FindALawyer() {
  const [inputValue, setInputValue] = useState("");
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [validationError, setValidationError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [clarifyState, setClarifyState] = useState<ClarifyState | null>(null);
  const [blockedState, setBlockedState] = useState<BlockedState | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "firms" | "lawyers">(
    "all",
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [showMobileResults, setShowMobileResults] = useState(false);

  const searchByText = useSearchByText();
  const { data: practiceAreas } = usePracticeAreas();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [searchState, clarifyState]);

  const clarifySteps = buildIntakeSteps(practiceAreas ?? []).filter(
    (step) =>
      step.key === "matter" || step.key === "budget" || step.key === "location",
  );

  const applyClarifyOrError = (
    text: string,
    message: string,
    extracted: ExtractedIntake,
  ) => {
    const missing = (["matter", "budget", "location"] as ClarifyKey[]).filter(
      (key) => (key === "matter" ? !extracted.matter : !extracted[key]),
    );

    if (missing.length > 0) {
      setShowMobileResults(false);
      setClarifyState({ originalText: text, extracted, missing, message });
      return;
    }

    setValidationError(message);
  };

  /**
   * Pre-check the per-practice-area allowance before walking the user through
   * the remaining intake questions. Only a hard quota stop blocks here — an
   * active cooldown just replays their existing match, which the results screen
   * renders as "Your match".
   */
  const checkAvailability = async (
    practiceAreaId: string,
  ): Promise<boolean> => {
    try {
      const res = await intakeService.availability(practiceAreaId);
      const a = res.data.data;
      if (a.quotaExhausted) {
        setClarifyState(null);
        setBlockedState({
          type: "quota",
          message: `You've used your ${a.offersUsed} of ${a.offersAllowed} matches for this type of matter in the last ${a.windowDays} days. You can be matched again for it soon, or start a request for a different type of legal matter.`,
          offersUsed: a.offersUsed,
          offersAllowed: a.offersAllowed,
        });
        setShowMobileResults(true);
        return true;
      }
      return false;
    } catch {
      // If availability can't be read, let the search itself enforce the rules.
      return false;
    }
  };

  /** Turn a rejected search into a blocking state or a plain inline error. */
  const applySearchError = (err: unknown, fallback: string) => {
    const status = getErrorStatus(err);
    const message = getErrorMessage(err, fallback);

    if (status === 404) {
      // No eligible lawyer for that matter — an empty state, not an error toast.
      setBlockedState({ type: "no-match", message });
      setShowMobileResults(true);
      return;
    }
    if (status === 400) {
      // From matchmaking/search a 400 means the allowance for this practice
      // area is spent. The backend copy is user-readable — surface it as-is.
      setBlockedState({ type: "quota", message });
      setShowMobileResults(true);
      return;
    }
    setValidationError(message);
  };

  const runClarifiedSearch = async (
    extracted: ExtractedIntake,
    originalText: string,
  ) => {
    setValidationError("");
    setBlockedState(null);

    const clarifiedText = buildClarifiedText(originalText, extracted);
    localStorage.setItem("freeText", clarifiedText);

    try {
      const res = await searchByText.mutateAsync({ text: clarifiedText });

      if (res.error) {
        applyClarifyOrError(originalText, res.message, res.data.extracted);
        return;
      }

      setSearchState({
        results: res.data.items,
        extracted: res.data.extracted,
        total: res.data.pagination.total,
        offer: res.data.offer ?? null,
      });
      setShowMobileResults(true);
      setClarifyState(null);
    } catch (err: unknown) {
      const clarify = extractClarifyErrorBody(err);
      if (clarify) {
        applyClarifyOrError(originalText, clarify.message, clarify.extracted);
        return;
      }

      applySearchError(err, "Search failed");
    }
  };

  const handleClarifyAnswer = async (
    key: ClarifyKey,
    option: { label: string; value: string },
  ) => {
    if (!clarifyState) return;

    if (key === "matter") {
      const blocked = await checkAvailability(option.value);
      if (blocked) return;
    }

    const nextExtracted: ExtractedIntake = {
      ...clarifyState.extracted,
      ...(key === "matter"
        ? { matter: { id: option.value, name: option.label } }
        : { [key]: option.value }),
    };

    const nextMissing = clarifyState.missing.filter((k) => k !== key);

    if (nextMissing.length === 0) {
      setClarifyState({
        ...clarifyState,
        extracted: nextExtracted,
        missing: nextMissing,
      });
      runClarifiedSearch(nextExtracted, clarifyState.originalText);
      return;
    }

    setClarifyState({
      ...clarifyState,
      extracted: nextExtracted,
      missing: nextMissing,
    });
  };

  const handleClarifyTextAnswer = async (key: ClarifyKey, text: string) => {
    if (!clarifyState || searchByText.isPending) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const nextExtracted: ExtractedIntake = {
      ...clarifyState.extracted,
    };

    if (key === "matter") {
      const known = clarifySteps
        .find((s) => s.key === "matter")
        ?.options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase());
      nextExtracted.matter = known
        ? { id: known.value, name: known.label }
        : { id: "", name: trimmed };
    } else if (key === "budget") {
      const known = BUDGET_OPTIONS.find(
        (o) =>
          o.value === trimmed ||
          o.label.toLowerCase() === trimmed.toLowerCase(),
      );
      nextExtracted.budget = known ? known.value : trimmed;
    } else {
      nextExtracted.location = trimmed;
    }

    if (key === "matter" && nextExtracted.matter?.id) {
      const blocked = await checkAvailability(nextExtracted.matter.id);
      if (blocked) return;
    }

    const nextMissing = clarifyState.missing.filter((k) => k !== key);

    if (nextMissing.length === 0) {
      setClarifyState({
        ...clarifyState,
        extracted: nextExtracted,
        missing: nextMissing,
      });
      runClarifiedSearch(nextExtracted, clarifyState.originalText);
      return;
    }

    setClarifyState({
      ...clarifyState,
      extracted: nextExtracted,
      missing: nextMissing,
    });
  };

  const handleSearch = async (text: string) => {
    if (text.length < 10) {
      setValidationError(
        "Please describe your situation in at least 10 characters",
      );
      return;
    }

    setValidationError("");
    setClarifyState(null);
    setBlockedState(null);
    setShowMobileResults(false);
    setHasSearched(true);
    localStorage.setItem("freeText", text);

    try {
      const res = await searchByText.mutateAsync({ text });

      if (res.error) {
        applyClarifyOrError(text, res.message, res.data.extracted);
        return;
      }

      setSearchState({
        results: res.data.items,
        extracted: res.data.extracted,
        total: res.data.pagination.total,
        offer: res.data.offer ?? null,
      });
      setShowMobileResults(true);
    } catch (err: unknown) {
      const clarify = extractClarifyErrorBody(err);
      if (clarify) {
        applyClarifyOrError(text, clarify.message, clarify.extracted);
        return;
      }

      applySearchError(err, "Search failed");
    }
  };

  const handleSubmit = () => {
    const text = inputValue.trim();

    if (!text || searchByText.isPending) return;

    if (clarifyState && clarifyState.missing.length > 0) {
      handleClarifyTextAnswer(clarifyState.missing[0], text);
      setInputValue("");
      return;
    }

    handleSearch(text);
  };

  const handleRestart = () => {
    setInputValue("");
    setSearchState(null);
    setValidationError("");
    setClarifyState(null);
    setBlockedState(null);
    setActiveTab("all");
    setHasSearched(false);
    setShowMobileResults(false);
    setSelectedAccountId(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelMobileResults = () => {
    setShowMobileResults(false);
    setSelectedAccountId(null);
  };

  const extracted = searchState?.extracted;

  const isSearching = searchByText.isPending;

  const activeClarifyKey = clarifyState?.missing[0];
  const inputPlaceholder = activeClarifyKey
    ? activeClarifyKey === "matter"
      ? "Type your legal matter (e.g. Property Law) and press Enter..."
      : activeClarifyKey === "budget"
        ? "Type your budget (e.g. 250,000) and press Enter..."
        : "Type your location (e.g. Enugu) and press Enter..."
    : "Describe your legal situation...";

  // A single match (one lawyer and/or one firm) — never a browsable list. We
  // also cap defensively: even if a stale backend still returns more than two
  // items, the screen shows at most the best lawyer and the best firm.
  const matchItems = (() => {
    const results = searchState?.results ?? [];
    const firm = results.find((r) => classifyRole(r.account) === "firm");
    const lawyer = results.find((r) => classifyRole(r.account) === "lawyer");
    const picks: MatchResult[] = [];
    if (firm) picks.push(firm);
    if (lawyer) picks.push(lawyer);
    return picks.length > 0 ? picks : results.slice(0, 2);
  })();

  // Tab filter over the single match: Firms, Lawyers, or All.
  const firmMatch = matchItems.find((r) => classifyRole(r.account) === "firm");
  const lawyerMatch = matchItems.find(
    (r) => classifyRole(r.account) === "lawyer",
  );
  const visibleMatches =
    activeTab === "firms"
      ? firmMatch
        ? [firmMatch]
        : []
      : activeTab === "lawyers"
        ? lawyerMatch
          ? [lawyerMatch]
          : []
        : matchItems;

  const isPinned = searchState?.offer?.pinned ?? false;
  const matchSummaryText = isPinned ? "Your match" : "We found you a match";

  return (
    <>
      {selectedAccountId && (
        <LawyerProfileView
          accountId={selectedAccountId}
          onBack={() => setSelectedAccountId(null)}
        />
      )}

      <div
        className={`flex flex-col h-full bg-[#FAFAFA] overflow-hidden ${
          selectedAccountId ? "hidden" : ""
        }`}
      >
        <div className="h-18.5 border-b border-[#F0F0F0] px-4 md:px-8 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h1 className="text-[20px] font-['Instrument_serif'] text-[#202020]">
              Find a Lawyer
            </h1>
          </div>

          {hasSearched && (
            <button
              onClick={handleRestart}
              className="rounded-full bg-[#F7F7F7] px-4 py-2 text-[12px] text-[#555] hover:bg-[#EFEFEF] transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Start over
            </button>
          )}
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[55%_45%] flex-1 min-h-0 overflow-hidden">
          <div
            className={`bg-white md:border-r border-[#ECECEC] flex flex-col overflow-hidden flex-1 min-h-0 ${
              showMobileResults ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 h-full min-h-0">
              {!hasSearched && (
                <div className="max-w-2xl">
                  <div className={`${FULL_BLEED_DIVIDER} pb-5 border-b border-[#EFEFEF]`}>
                    <GradientPill>The Legal Space AI</GradientPill>

                    <p className="mt-4 text-[14px] leading-7 text-[#374151] font-['Geist'] max-w-xl">
                      Tell me your situation in plain language. I will read your
                      intent, tag it to the right area of law, and match you
                      with verified professionals.
                    </p>

                    <p className="mt-2 text-[14px] leading-7 font-bold text-[#3A3A3A] max-w-xl">
                      Note: Only send a request if you&apos;re ready to speak
                      with a lawyer.
                    </p>
                  </div>

                  <div className="pt-5">
                    <GradientPill>
                      What is your legal matter about?
                    </GradientPill>
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#1D4ED8] animate-spin" />

                    <div className="text-center">
                      <p className="text-[15px] font-medium text-[#202020]">
                        Analysing your request
                      </p>

                      <p className="text-[13px] text-[#777] mt-1">
                        Finding your best matches...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isSearching && clarifyState && (
                <div className="max-w-2xl">
                  <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <p className="text-[13px] leading-6 text-amber-800">
                      {clarifyState.message}
                    </p>
                  </div>

                  <div className="space-y-5">
                    {clarifySteps
                      .filter(
                        (step) =>
                          !clarifyState.missing.includes(
                            step.key as ClarifyKey,
                          ),
                      )
                      .map((step) => {
                        const key = step.key as ClarifyKey;
                        const answer =
                          key === "matter"
                            ? clarifyState.extracted.matter?.name
                            : clarifyState.extracted[key];
                        return (
                          <QuestionBlock
                            key={step.key}
                            question={step.question}
                            answer={answer || "—"}
                          />
                        );
                      })}

                    {clarifyState.missing.length > 0 &&
                      (() => {
                        const currentKey = clarifyState.missing[0];
                        const step = clarifySteps.find(
                          (s) => s.key === currentKey,
                        );
                        if (!step) return null;
                        return (
                          <ClarifyQuestion
                            question={step.question}
                            options={step.options}
                            disabled={searchByText.isPending}
                            onSelect={(option) =>
                              handleClarifyAnswer(currentKey, option)
                            }
                          />
                        );
                      })()}
                  </div>
                </div>
              )}

              {!isSearching && !clarifyState && searchState && extracted && (
                <div className="max-w-2xl space-y-5">
                  <QuestionBlock
                    question="What is your legal matter about?"
                    answer={extracted.matter?.name || "General Legal Matter"}
                  />

                  {extracted.budget ? (
                    <QuestionBlock
                      question="What is your budget?"
                      answer={formatBudgetLabel(extracted.budget)}
                    />
                  ) : (
                    <ClarifyQuestion
                      question="What is your budget?"
                      options={BUDGET_OPTIONS}
                      onSelect={(opt) => {
                        setSearchState((prev) =>
                          prev
                            ? {
                                ...prev,
                                extracted: {
                                  ...prev.extracted,
                                  budget: opt.value,
                                },
                              }
                            : prev,
                        );
                      }}
                    />
                  )}

                  <QuestionBlock
                    question="Where do you need legal help?"
                    answer={extracted.location || "Anywhere"}
                  />

                  <QuestionBlock
                    question="Who would you prefer?"
                    answer={extracted.preference || "Either"}
                  />
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-[#ECECEC] bg-white px-4 md:px-6 py-4 shrink-0">
              {validationError && (
                <p className="text-[12px] text-red-500 mb-2">
                  {validationError}
                </p>
              )}

              <div className="flex items-center gap-3 bg-white">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputValue}
                  disabled={isSearching}
                  placeholder={inputPlaceholder}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-7 text-[#202020] placeholder:text-[#999] rounded-full border border-[#EAEAEA] px-5 py-2 h-11 focus:border-[#1D4ED8]"
                />

                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isSearching}
                  className="w-11 h-11 rounded-full bg-[#1D4ED8] flex items-center justify-center hover:bg-[#1947C6] transition-colors disabled:opacity-40 shrink-0"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`bg-[#FCFCFC] overflow-y-auto min-h-0 ${
              showMobileResults
                ? "flex flex-1 flex-col md:block"
                : "hidden md:block"
            }`}
          >
            <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl">
              {showMobileResults && (
                <div className="flex items-center justify-between mb-5 md:hidden">
                  <button
                    onClick={handleCancelMobileResults}
                    className="flex items-center gap-2 rounded-full bg-white border border-[#EAEAEA] px-4 py-2 text-[13px] font-medium text-[#444] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
              {searchState && (
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[30px] font-[Instrument_serif] text-[#202020] leading-none">
                      {matchSummaryText}
                    </h2>

                    <p className="text-[13px] text-[#777] mt-1">
                      You can only request someone you were matched with.
                    </p>
                  </div>
                </div>
              )}

              {searchState?.offer && (
                <div className="mb-5">
                  <OfferBanner offer={searchState.offer} />
                  {searchState.offer.budgetRelaxed && <BudgetRelaxedBanner />}
                </div>
              )}

              {searchState && !blockedState && (
                <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                      activeTab === "all"
                        ? "bg-[#1D4ED8] border-[#1D4ED8] text-white"
                        : "bg-white border-[#EAEAEA] text-[#444] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("firms")}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                      activeTab === "firms"
                        ? "bg-[#1D4ED8] border-[#1D4ED8] text-white"
                        : "bg-white border-[#EAEAEA] text-[#444] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    Firms
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("lawyers")}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                      activeTab === "lawyers"
                        ? "bg-[#1D4ED8] border-[#1D4ED8] text-white"
                        : "bg-white border-[#EAEAEA] text-[#444] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    Lawyers
                  </button>
                </div>
              )}

              {!hasSearched && (
                <div className="h-[70vh] flex items-center justify-center">
                  <div className="text-center max-w-sm">
                    <div className="mx-auto flex items-center justify-center mb-2">
                      <Users className="w-7 h-7 text-[#999]" />
                    </div>

                    <h3 className="text-[15px] font-semibold text-[#202020]">
                      Matches will appear here
                    </h3>

                    <p className="text-[13px] leading-6 text-[#777] mt-1">
                      Describe your situation and we&apos;ll match you with
                      firms and lawyers by expertise, budget, and location.
                    </p>
                  </div>
                </div>
              )}

              {!isSearching && blockedState && (
                <BlockedCard blocked={blockedState} />
              )}

              {!isSearching && !blockedState && searchState && (
                <div className="space-y-5">
                  {visibleMatches.length > 0 ? (
                    visibleMatches.map((match) => (
                      <LawyerCard
                        key={match.account.id}
                        match={match}
                        extracted={searchState.extracted}
                        onViewProfile={setSelectedAccountId}
                      />
                    ))
                  ) : matchItems.length === 0 ? (
                    <div className="rounded-3xl border border-[#ECECEC] bg-white p-10 text-center">
                      <h3 className="text-[15px] font-semibold text-[#202020]">
                        No match found right now
                      </h3>
                      <p className="text-[13px] text-[#777] mt-1 leading-6 max-w-md mx-auto">
                        Try a different type of legal matter, or check back
                        shortly.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-[#ECECEC] bg-white p-10 text-center">
                      <h3 className="text-[15px] font-semibold text-[#202020]">
                        {activeTab === "firms"
                          ? "No firms matched"
                          : "No lawyers matched"}
                      </h3>
                      <p className="text-[13px] text-[#777] mt-1 leading-6 max-w-md mx-auto">
                        Check out the{" "}
                        <button
                          onClick={() =>
                            setActiveTab(
                              activeTab === "firms" ? "lawyers" : "firms",
                            )
                          }
                          className="text-[#1D4ED8] hover:text-[#1947C6]"
                        >
                          {activeTab === "firms" ? "lawyers" : "firms"}
                        </button>{" "}
                        instead.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}