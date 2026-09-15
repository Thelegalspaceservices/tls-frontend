// app/Components/Lawyer-Signup/StepCertUpload.tsx
"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { registerService } from "@/services/auth.register.services";

interface Props {
  onContinue: () => void;
}

export default function StepCertUpload({ onContinue }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      setError("File must be under 25MB.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleContinue = async () => {
    setError("");
    if (!file) {
      setError("Please upload the required document.");
      return;
    }
    setIsLoading(true);
    try {
      await registerService.uploadDocument(file, "call_to_bar_cert");
      onContinue();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't upload your document. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 mb-2 font-dmSans leading-tight">
        Upload your Call to Bar certificate
      </h2>
      <p className="text-[14px] text-gray-500 mb-7 font-dmSans leading-relaxed">
        To maintain the integrity of The Legal Space, all lawyers are required
        to complete a verification process before their profile can be approved.
      </p>

      <p className="text-[13px] font-medium text-gray-700 mb-2 font-dmSans">
        Call to Bar Certificate
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-5 ${
          dragOver
            ? "border-[#1A56DB] bg-blue-50"
            : file
              ? "border-green-300 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="text-[13px] font-medium text-gray-700 truncate max-w-45">
                {file.name}
              </p>
              <p className="text-[11px] text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="ml-auto p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] text-gray-600 font-dmSans">
              <span className="text-[#1A56DB] font-medium">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-[12px] text-gray-400 mt-1 font-dmSans">
              PDF (max. 25MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-red-500 mb-3 font-dmSans">{error}</p>
      )}

      <button
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full py-3.5 bg-[#1A56DB] text-white text-[14px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-dmSans"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? "Uploading…" : "Continue"}
      </button>
    </div>
  );
}
