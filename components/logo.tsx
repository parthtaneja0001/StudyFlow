import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative size-7 shrink-0">
        <div className="relative size-full rounded-lg bg-emerald-400 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px] text-emerald-950">
            <path
              d="M5 4h10l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
              fill="currentColor"
              fillOpacity="0.15"
            />
            <path
              d="M8 8h8M8 12h8M8 16h5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      {showText && (
        <div className="font-semibold tracking-tight text-[15px] leading-none text-white">
          StudyFlow
        </div>
      )}
    </div>
  );
}
