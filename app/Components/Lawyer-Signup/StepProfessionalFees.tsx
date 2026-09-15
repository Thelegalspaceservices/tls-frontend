// app/Components/Lawyer-Signup/StepProfessionalFees.tsx
"use client";

import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { usePracticeAreas } from "@/hooks/usePracticeAreas";

export interface AreaFeeEntry {
  practiceAreaId: string;
  minFee: number; // kobo
  maxFee: number; // kobo
}

interface Props {
  practiceAreaIds: string[];
  onNext: (fees: AreaFeeEntry[]) => void;
  isLoading?: boolean;
  /** Fee entries rehydrated from the onboarding draft, if any. */
  initialFees?: AreaFeeEntry[];
}

type FeeState = Record<string, { min: string; max: string }>;

function koboFromNaira(s: string): number {
  const n = parseFloat(s.replace(/,/g, "") || "0");
  return Math.round(n * 100);
}

/** Format digits with thousands separators as the user types (e.g. 1000000 -> 1,000,000). */
function formatNairaInput(s: string): string {
  const cleaned = s.replace(/[^0-9.]/g, "");
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = intPart ? Number(intPart).toLocaleString("en-US") : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export default function StepProfessionalFees({
  practiceAreaIds,
  onNext,
  isLoading = false,
  initialFees = [],
}: Props) {
  const { data: allAreas = [] } = usePracticeAreas();

  const [fees, setFees] = useState<FeeState>(() => {
    const byId = new Map(initialFees.map((f) => [f.practiceAreaId, f]));
    return Object.fromEntries(
      practiceAreaIds.map((id) => {
        const saved = byId.get(id);
        return [
          id,
          {
            min: saved?.minFee ? String(saved.minFee / 100) : "",
            max: saved?.maxFee ? String(saved.maxFee / 100) : "",
          },
        ];
      }),
    );
  });
  const [error, setError] = useState("");
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});

  const getName = (id: string) => allAreas.find((a) => a.id === id)?.name ?? id;

  const setField = (id: string, field: "min" | "max", val: string) => {
    const current = fees[id] ?? { min: "", max: "" };
    const next = { ...current, [field]: formatNairaInput(val) };
    setFees((prev) => ({ ...prev, [id]: next }));
    // Live validation: error immediately if max < min after this input.
    const { min, max } = next;
    if (min.trim() && max.trim() && koboFromNaira(min) >= koboFromNaira(max)) {
      setRangeErrors((prevErr) => ({
        ...prevErr,
        [id]: `Maximum fee can't be lower or equal to minimum fee for ${getName(id)}.`,
      }));
    } else {
      setRangeErrors((prevErr) => {
        const nextErr = { ...prevErr };
        delete nextErr[id];
        return nextErr;
      });
    }
    setError("");
  };

  const handleNext = () => {
    setError("");
    for (const id of practiceAreaIds) {
      const { min, max } = fees[id] ?? { min: "", max: "" };
      if (!min.trim() || !max.trim()) {
        setError(`Please enter fees for ${getName(id)}.`);
        return;
      }
      if (koboFromNaira(min) > koboFromNaira(max)) {
        setError(`Minimum fee can't exceed maximum fee for ${getName(id)}.`);
        return;
      }
    }
    onNext(
      practiceAreaIds.map((id) => ({
        practiceAreaId: id,
        minFee: koboFromNaira(fees[id]?.min ?? ""),
        maxFee: koboFromNaira(fees[id]?.max ?? ""),
      })),
    );
  };

  const inputCls =
    "w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#1A56DB] transition-colors placeholder:text-gray-400 font-dmSans";

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Professional Fees
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        Help clients understand your typical fees for services within your
        practice areas.
      </p>

      <div className="flex flex-col gap-5 mb-5">
        {practiceAreaIds.map((id) => (
          <div key={id}>
            {/* Area chip */}
            <div className="px-4 py-2.5 bg-[#EEF4FF] border border-[#C7D9FF] rounded-xl mb-3 text-center">
              <span className="text-[13px] font-medium text-[#1A56DB]">
                {getName(id)}
              </span>
            </div>
            {/* Min / Max inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={fees[id]?.min ?? ""}
                  onChange={(e) => setField(id, "min", e.target.value)}
                  placeholder="Minimum Fee"
                  className={inputCls}
                />
              </div>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={fees[id]?.max ?? ""}
                  onChange={(e) => setField(id, "max", e.target.value)}
                  placeholder="Maximum Fee"
                  className={inputCls}
                />
              </div>
            </div>
            {rangeErrors[id] && (
              <p className="text-[12px] text-red-500 mt-2">{rangeErrors[id]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="rounded-xl bg-[#FAFAF7] border border-[#EBEBDC] px-4 py-3.5 mb-5">
        <p className="text-[13px] font-semibold text-gray-900 mb-1">Note</p>
        <p className="text-[13px] text-gray-600 leading-relaxed">
          This range helps clients understand your pricing expectations before
          connecting with you. Final fees may vary depending on the nature and
          complexity of the matter.
        </p>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? "Saving..." : "Save & Continue"}
      </button>
    </div>
  );
}
