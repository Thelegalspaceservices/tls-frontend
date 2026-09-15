// app/Components/Lawyer-Signup/StepBarDetails.tsx
"use client";

import { useState } from "react";
import { User, Hash, Calendar, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { profileService, BarDetailsResponse } from "@/services/profile.services";

const NBA_BRANCHES = [
  "Lagos", "Abuja", "Ibadan", "Port Harcourt", "Kano", "Enugu", "Benin",
  "Kaduna", "Jos", "Calabar", "Ilorin", "Owerri", "Abeokuta", "Warri",
  "Onitsha", "Uyo", "Asaba", "Akure", "Aba", "Sokoto",
];

// {
//   "organization": "Nigerian Bar Association (NBA)",
//   "total_active_branches": 129,
//   "branches": [
//     { "code": "001", "name": "Aba Branch", "state": "Abia" },
//     { "code": "002", "name": "Abakaliki Branch", "state": "Ebonyi" },
//     { "code": "003", "name": "Abeokuta Branch", "state": "Ogun" },
//     { "code": "004", "name": "Abuja Branch (Unity Bar)", "state": "FCT" },
//     { "code": "005", "name": "Ado-Ekiti Branch", "state": "Ekiti" },
//     { "code": "006", "name": "Afikpo Branch", "state": "Ebonyi" },
//     { "code": "007", "name": "Agbor Branch", "state": "Delta" },
//     { "code": "008", "name": "Aguata Branch", "state": "Anambra" },
//     { "code": "009", "name": "Ahoada Branch", "state": "Rivers" },
//     { "code": "010", "name": "Akure Branch", "state": "Ondo" },
//     { "code": "011", "name": "Asaba Branch", "state": "Delta" },
//     { "code": "012", "name": "Auchi Branch", "state": "Edo" },
//     { "code": "013", "name": "Awka Branch", "state": "Anambra" },
//     { "code": "014", "name": "Badagry Branch", "state": "Lagos" },
//     { "code": "018", "name": "Birnin Kebbi Branch", "state": "Kebbi" },
//     { "code": "020", "name": "Bori Branch", "state": "Rivers" },
//     { "code": "021", "name": "Calabar Branch", "state": "Cross River" },
//     { "code": "025", "name": "Dutse Branch", "state": "Jigawa" },
//     { "code": "027", "name": "Effurun Branch", "state": "Delta" },
//     { "code": "028", "name": "Enugu Branch", "state": "Enugu" },
//     { "code": "029", "name": "Epe Branch", "state": "Lagos" },
//     { "code": "031", "name": "Eti-Osa Branch", "state": "Lagos" },
//     { "code": "033", "name": "Garki Branch", "state": "FCT" },
//     { "code": "034", "name": "Gboko Branch", "state": "Benue" },
//     { "code": "036", "name": "Gwagwalada Branch", "state": "FCT" },
//     { "code": "037", "name": "Ibadan Branch (Premier Branch)", "state": "Oyo" },
//     { "code": "039", "name": "Idah Branch", "state": "Kogi" },
//     { "code": "040", "name": "Idemili Branch", "state": "Anambra" },
//     { "code": "041", "name": "Ijebu-Ode Branch", "state": "Ogun" },
//     { "code": "043", "name": "Ikeja Branch", "state": "Lagos" },
//     { "code": "044", "name": "Ikorodu Branch", "state": "Lagos" },
//     { "code": "045", "name": "Ilaro Branch", "state": "Ogun" },
//     { "code": "046", "name": "Ilesa Branch", "state": "Osun" },
//     { "code": "047", "name": "Ilorin Branch", "state": "Kwara" },
//     { "code": "049", "name": "Isiokpo Branch", "state": "Rivers" },
//     { "code": "051", "name": "Iwo Branch", "state": "Osun" },
//     { "code": "052", "name": "Jalingo Branch", "state": "Taraba" },
//     { "code": "053", "name": "Jos Branch", "state": "Plateau" },
//     { "code": "054", "name": "Kaduna Branch", "state": "Kaduna" },
//     { "code": "060", "name": "Lagos Branch", "state": "Lagos" },
//     { "code": "061", "name": "Maiduguri Branch", "state": "Borno" },
//     { "code": "062", "name": "Makurdi Branch", "state": "Benue" },
//     { "code": "063", "name": "Minna Branch", "state": "Niger" },
//     { "code": "074", "name": "Obollo-Afor Branch", "state": "Enugu" },
//     { "code": "077", "name": "Oleh Branch", "state": "Delta" },
//     { "code": "078", "name": "Ondo Branch", "state": "Ondo" },
//     { "code": "079", "name": "Onitsha Branch", "state": "Anambra" },
//     { "code": "080", "name": "Orlu Branch", "state": "Imo" },
//     { "code": "081", "name": "Osogbo Branch", "state": "Osun" },
//     { "code": "082", "name": "Owerri Branch", "state": "Imo" },
//     { "code": "083", "name": "Port Harcourt Branch", "state": "Rivers" },
//     { "code": "085", "name": "Sagbama Branch", "state": "Bayelsa" },
//     { "code": "089", "name": "Sokoto Branch", "state": "Sokoto" },
//     { "code": "091", "name": "Udu Branch", "state": "Delta" },
//     { "code": "092", "name": "Ughelli Branch", "state": "Delta" },
//     { "code": "095", "name": "Warri Branch", "state": "Delta" },
//     { "code": "096", "name": "Yenagoa Branch", "state": "Bayelsa" },
//     { "code": "097", "name": "Yola Branch", "state": "Adamawa" }
//   ]
// }

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i);

interface Props {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  /** Called with the matched/unchecked outcome once the user can move on. */
  onContinue: () => void;
  /** Called when the SCN is already claimed by another account. */
  onCollision: (existing: BarDetailsResponse["data"]["existingAccount"], scn: string) => void;
}

const boxCls = "border border-gray-200 rounded-xl overflow-hidden bg-white";
const inputCls =
  "w-full px-3 py-3 text-[14px] outline-none focus:border-[#1A56DB] transition-colors bg-transparent placeholder:text-gray-400 font-dmSans";

export default function StepBarDetails({
  isLoading,
  setIsLoading,
  onContinue,
  onCollision,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [scn, setScn] = useState("");
  const [callToBarYear, setCallToBarYear] = useState("");
  const [nbaBranch, setNbaBranch] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<BarDetailsResponse["data"] | null>(null);

  const canSubmit = fullName.trim().split(/\s+/).length >= 2 && scn && callToBarYear && nbaBranch;

  const handleValidate = async () => {
    setError("");
    if (!canSubmit) {
      setError(
        !fullName.trim() || fullName.trim().split(/\s+/).length < 2
          ? "Enter your full name as called to bar (at least two words)."
          : "Please fill in all fields.",
      );
      return;
    }
    setIsLoading(true);
    try {
      const res = await profileService.submitBarDetails({
        fullName: fullName.trim(),
        scn,
        callToBarYear: parseInt(callToBarYear, 10),
        nbaBranch,
      });
      const data = res.data.data;
      if (data.outcome === "already_registered") {
        onCollision(data.existingAccount, scn);
        return;
      }
      if (data.outcome === "no_match") {
        // Nothing was saved server-side — let them correct and retry.
        setError(
          data.nbaCheck?.detail ??
            "These details don't match an NBA record. Please check and try again.",
        );
        return;
      }
      // matched + unchecked both let the user through — unchecked just
      // means no provider verdict yet, checked manually during review.
      setResult(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't validate your bar details. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Your Bar details
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        This is checked against NBA records and used to anchor your identity.
      </p>

      <div className="flex flex-col gap-3 mb-5">
        <div className={`relative ${boxCls}`}>
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name (as called to bar)"
            disabled={!!result}
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className={`relative ${boxCls}`}>
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={scn}
            onChange={(e) => setScn(e.target.value)}
            placeholder="Supreme Court Number (SCN)"
            disabled={!!result}
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`relative ${boxCls}`}>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={callToBarYear}
              onChange={(e) => setCallToBarYear(e.target.value)}
              disabled={!!result}
              className={`${inputCls} pl-9 pr-8 bg-white appearance-none`}
            >
              <option value="">Year called to bar</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className={`relative ${boxCls}`}>
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={nbaBranch}
              onChange={(e) => setNbaBranch(e.target.value)}
              disabled={!!result}
              className={`${inputCls} pl-9 pr-8 bg-white appearance-none`}
            >
              <option value="">NBA branch</option>
              {NBA_BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <div
            className={`px-4 py-3 rounded-xl border ${
              result.nbaCheck?.status === "matched"
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  result.nbaCheck?.status === "matched" ? "text-green-500" : "text-gray-400"
                }`}
              />
              <p className="text-[13px] font-medium text-gray-800 font-dmSans">
                {result.nbaCheck?.status === "matched"
                  ? "NBA record matched"
                  : "We'll check this manually"}
              </p>
            </div>
            <p className="text-[12px] text-gray-500 mt-1 pl-6 font-dmSans">
              {result.nbaCheck?.detail ??
                (result.nbaCheck?.status === "matched"
                  ? "Name and call-to-bar year match NBA listing."
                  : "Your bar details will be checked manually during review.")}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3 font-dmSans">{error}</p>}

      <button
        onClick={result ? onContinue : handleValidate}
        disabled={isLoading || (!result && !canSubmit)}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-dmSans"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? "Validating…" : result ? "Continue" : "Validate"}
      </button>
    </div>
  );
}
