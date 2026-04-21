"use client";

import { KeyRound, Settings } from "lucide-react";
import { useApiKey } from "@/components/api-key-provider";
import { cn } from "@/lib/utils";

export function SettingsButton({ className }: { className?: string }) {
  const { openSettings, apiKey, isLoaded } = useApiKey();
  const hasKey = isLoaded && !!apiKey;

  return (
    <button
      onClick={openSettings}
      className={cn(
        "group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
        hasKey
          ? "text-white/55 hover:text-white hover:bg-white/5"
          : "text-emerald-300 bg-emerald-500/[0.08] border border-emerald-500/25 hover:bg-emerald-500/[0.12]",
        className
      )}
    >
      {hasKey ? <Settings className="size-3.5" /> : <KeyRound className="size-3.5" />}
      <span className="hidden sm:inline">{hasKey ? "Settings" : "Add API key"}</span>
    </button>
  );
}
