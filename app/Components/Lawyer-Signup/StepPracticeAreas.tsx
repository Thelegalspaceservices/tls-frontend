// app/Components/Lawyer-Signup/StepPracticeAreas.tsx
"use client";

import { useState } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { usePracticeAreas } from "@/hooks/usePracticeAreas";
import { AccountType } from "./LawyerSignup";

interface Props {
  accountType: AccountType;
  onNext: (data: { practiceAreaIds: string[] }) => void;
  isSaving?: boolean;
  /** Previously-selected area ids, rehydrated from the onboarding draft. */
  initialIds?: string[];
}

const LAWYER_MAX = 2;
const FIRM_MAX = 7;

export default function StepPracticeAreas({
  accountType,
  onNext,
  isSaving = false,
  initialIds = [],
}: Props) {
  const { data: allAreas = [], isLoading } = usePracticeAreas();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [error, setError] = useState("");

  const maxSelect = accountType === "firm" ? FIRM_MAX : LAWYER_MAX;
  const isFirm = accountType === "firm";

  const filtered = allAreas.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    setError("");
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= maxSelect) return;
      setSelected([...selected, id]);
    }
  };

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Please select at least one practice area.");
      return;
    }
    onNext({ practiceAreaIds: selected });
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Professional Information
      </h2>
      <p className="text-[14px] text-gray-500 mb-6 font-dmSans">
        {isFirm
          ? `Select up to ${FIRM_MAX} practice areas that best represent your firm's expertise.`
          : "Select your primary and secondary practice areas to showcase your expertise."}
      </p>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search practice areas"
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#1A56DB] transition-colors font-dmSans"
        />
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {isLoading ? (
          <div className="h-12 w-full">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
          </div>
        ) : (
          filtered.map((area) => {
            const isSelected = selected.includes(area.id);
            const isDisabled = !isSelected && selected.length >= maxSelect;
            return (
              <button
                key={area.id}
                onClick={() => toggle(area.id)}
                disabled={isDisabled}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] border transition-colors font-dmSans ${
                  isSelected
                    ? "bg-blue-50 border-blue-300 text-[#1A56DB]"
                    : isDisabled
                      ? "border-gray-100 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {area.name}
                {isSelected ? (
                  <X className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
              </button>
            );
          })
        )}
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        disabled={isSaving}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? "Saving..." : "Save & Continue"}
      </button>
    </div>
  );
}
