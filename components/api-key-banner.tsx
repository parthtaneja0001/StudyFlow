"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useApiKey } from "@/components/api-key-provider";

export function ApiKeyBanner() {
  const { apiKey, isLoaded, openSettings } = useApiKey();

  if (!isLoaded || apiKey) return null;

  return (
    <button
      onClick={openSettings}
      className="w-full max-w-3xl mx-auto flex items-center gap-3 text-left panel p-4 md:px-5 md:py-4 hover:bg-[var(--color-panel-hover)] transition-colors group"
    >
      <div className="shrink-0 size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-300">
        <KeyRound className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight">
          Add your Gemini API key to get started
        </div>
        <div className="text-[12px] text-white/55 mt-0.5 leading-relaxed">
          Free key from Google AI Studio. Stored only in your browser — never on our servers.
        </div>
      </div>
      <ArrowRight className="size-4 text-white/35 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition shrink-0" />
    </button>
  );
}
