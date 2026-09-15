// app/signin/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import SignInClient from "./SignInClient";
import { useSearchParams } from "next/navigation";
import SignInClientUser from "./SignInClientUser";

export const dynamic = "force-dynamic";

function SignInContent() {
  const [loginType, setLoginType] = useState<"lawyer" | "user">("user");
  const searchParams = useSearchParams();

  useEffect(() => {
    const paramType = searchParams.get("type");
    if (paramType === "lawyer" || paramType === "user") {
      setLoginType(paramType);
      localStorage.setItem("loginType", paramType);
      return;
    }
    const stored = localStorage.getItem("loginType");
    if (stored === "lawyer" || stored === "user") {
      setLoginType(stored);
    }
  }, [searchParams]);

  return loginType === "lawyer" ? <SignInClient /> : <SignInClientUser />;
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
