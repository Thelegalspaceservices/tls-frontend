// app/Components/Lawyer-Signup/StepPersonalInfo.tsx
"use client";

import { useState } from "react";
import {
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { AccountType } from "./LawyerSignup";

interface Props {
  accountType: AccountType;
  email: string;
  onNext: (data: Record<string, string>) => void;
  isLoading?: boolean;
  /** Values rehydrated from the saved onboarding draft, if any. */
  initial?: Record<string, string>;
}

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Federal Capital Territory (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export default function StepPersonalInfo({
  accountType,
  email,
  onNext,
  isLoading = false,
  initial = {},
}: Props) {
  const isLawyer = accountType === "lawyer";

  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [firmName, setFirmName] = useState(initial.firmName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [callToBarYear, setCallToBarYear] = useState(
    initial.callToBarYear ?? "",
  );
  const [firmEstablishmentYear, setFirmEstablishmentYear] = useState(
    initial.firmEstablishmentYear ?? "",
  );
  const [locationCity, setLocationCity] = useState(initial.locationCity ?? "");
  const [error, setError] = useState("");

  const boxCls = "border border-gray-200 rounded-xl overflow-hidden bg-white";
  const inputCls =
    "w-full px-3 py-3 text-[14px] outline-none focus:border-[#1A56DB] transition-colors bg-transparent placeholder:text-gray-400 font-dmSans";

  const handleNext = () => {
    setError("");
    if (isLawyer) {
      if (
        !firstName ||
        !lastName ||
        !phone ||
        !callToBarYear ||
        !locationCity
      ) {
        setError("Please fill in all required fields.");
        return;
      }
      onNext({
        firstName,
        lastName,
        phone,
        callToBarYear,
        locationCity,
        officeAddress: locationCity,
      });
    } else {
      if (!firmName || !phone || !firmEstablishmentYear || !locationCity) {
        setError("Please fill in all required fields.");
        return;
      }
      onNext({
        firmName,
        phone,
        firmEstablishmentYear,
        locationCity,
        officeAddress: locationCity,
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Tell Us About Yourself
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        Share your details so clients and the legal community can better
        understand your professional background.
      </p>

      {error && <p className="text-[12px] text-red-500 mb-4">{error}</p>}

      <div className="flex flex-col gap-3 mb-5">
        {/* Name / Firm name */}
        {isLawyer ? (
          <div className="grid grid-cols-2 gap-3">
            <div className={`relative ${boxCls}`}>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter firstname"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className={`relative ${boxCls}`}>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter lastname"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
        ) : (
          <div className={`relative ${boxCls}`}>
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Enter Firm Name"
              className={`${inputCls} pl-9`}
            />
          </div>
        )}

        {/* Email (locked) */}
        <div className={`relative ${boxCls}`}>
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={email}
            disabled
            className={`${inputCls} pl-9 pr-9 text-gray-400`}
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
        </div>

        {/* WhatsApp */}
        <div>
          <div className={`relative ${boxCls}`}>
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp Number"
              className={`${inputCls} pl-9`}
            />
          </div>
          <p className="text-[11px] text-gray-400 pt-1.5 px-1">
            Your number will remain confidential and will only be shared if you
            choose to do so.
          </p>
        </div>

        {/* Year established/Call to bar + Location, side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`relative ${boxCls}`}>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="number"
              value={isLawyer ? callToBarYear : firmEstablishmentYear}
              onChange={(e) =>
                isLawyer
                  ? setCallToBarYear(e.target.value)
                  : setFirmEstablishmentYear(e.target.value)
              }
              placeholder={isLawyer ? "Call to bar year" : "Year Established"}
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className={`relative ${boxCls}`}>
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className={`${inputCls} pl-9 pr-8 bg-white appearance-none`}
            >
              <option value="">Select location</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
