// app/Components/Lawyer-Signup/StepVerifiedTransition.tsx
"use client";

interface Props {
  firstName?: string;
  onContinue: () => void;
}

export default function StepVerifiedTransition({ firstName, onContinue }: Props) {
  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        You&apos;re verified{firstName ? `, ${firstName}` : ""} 🎉
      </h2>
      <p className="text-[14px] text-gray-500 mb-8 font-dmSans leading-relaxed">
        Hey! Your profile is up and running on TLS. Thanks for hanging in
        there!
      </p>
      <button
        onClick={onContinue}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors font-dmSans"
      >
        Continue
      </button>
    </div>
  );
}
