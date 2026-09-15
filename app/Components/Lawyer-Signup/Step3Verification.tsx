// app/Components/Lawyer-Signup/Step3Verification.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { AccountType } from "./LawyerSignup";

interface Props {
  accountType: AccountType;
  onFinish: (file: File) => Promise<void>;
  isLoading: boolean;
}

export default function Step3Verification({
  accountType,
  onFinish,
  isLoading,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const docLabel =
    accountType === "lawyer"
      ? "Upload NBA Certificate"
      : "Upload CAC Registration Document";

  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      setError("File size must be under 25MB.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleFinish = async () => {
    if (!file) {
      setError("Please upload the required document.");
      return;
    }
    await onFinish(file);
  };

  return (
    <div className="max-w-sm mx-auto md:mx-0">
      <div className="border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-5">
          Verification
        </h2>

        <div className="mb-4">
          <label className="block text-[12px] font-medium text-gray-600 mb-2">
            {docLabel} <span className="text-red-400">*</span>
          </label>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[#1A56DB] bg-blue-50"
                : file
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                  <p className="text-[13px] font-medium text-gray-700 truncate max-w-40">
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
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-[13px] text-gray-500">
                  <span className="text-[#1A56DB] font-medium">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-[12px] text-gray-400 mt-1">
                  PDF (max. 25MB)
                </p>
                {/* PDF icon decoration */}
                <div className="absolute bottom-3 right-4 opacity-30">
                  <FileText className="w-8 h-8 text-red-400" />
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-gray-400 italic mt-2">
            This helps us confirm your professional status.
          </p>
        </div>

        {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleFinish}
          disabled={isLoading}
          className="w-full py-3 bg-[#1A56DB] text-white text-[13px] font-medium rounded-xl hover:bg-[#1648b8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Setting up..." : "Finish Setup"}
        </button>
      </div>
    </div>
  );
}
