"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarRange,
  ClipboardPaste,
  FileUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { saveCourse } from "@/lib/db";
import type { Course } from "@/lib/types";
import { fetchWithKey, MissingApiKeyError } from "@/lib/api-key";
import { useApiKey } from "@/components/api-key-provider";

type Stage = "idle" | "uploading" | "parsing" | "building";
type Mode = "pdf" | "paste";

const STAGE_MESSAGES: Record<Stage, string> = {
  idle: "",
  uploading: "Sending syllabus…",
  parsing: "Reading your syllabus with AI…",
  building: "Building your study plan…",
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function UploadDropzone() {
  const router = useRouter();
  const { openSettings } = useApiKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("pdf");
  const [drag, setDrag] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [pastedText, setPastedText] = useState("");

  const defaults = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7 * 12);
    return { start: toISODate(today), end: toISODate(end) };
  }, []);

  const [termStart, setTermStart] = useState(defaults.start);
  const [termEnd, setTermEnd] = useState(defaults.end);

  const totalWeeks = useMemo(() => {
    const s = Date.parse(termStart);
    const e = Date.parse(termEnd);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
    return Math.max(1, Math.round((e - s) / (7 * 86400000)));
  }, [termStart, termEnd]);

  const datesValid = totalWeeks > 0;
  const busy = stage !== "idle";

  const submit = useCallback(
    async ({ file, text }: { file?: File; text?: string }) => {
      if (!datesValid) {
        toast.error("Term end must be after term start");
        return;
      }

      const fd = new FormData();
      fd.append("termStart", termStart);
      fd.append("termEnd", termEnd);
      let label = "";
      if (file) {
        if (file.type !== "application/pdf") {
          toast.error("Please upload a PDF file");
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error("PDF is too large (max 20MB)");
          return;
        }
        fd.append("file", file);
        label = file.name;
      } else if (text) {
        const t = text.trim();
        if (t.length < 80) {
          toast.error("Paste at least a few lines of syllabus content");
          return;
        }
        fd.append("text", t);
        label = "Pasted syllabus";
      } else {
        return;
      }

      setFileName(label);
      setStage("uploading");

      try {
        setStage("parsing");
        const res = await fetchWithKey("/api/parse-syllabus", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");

        setStage("building");
        const s = json.syllabus;

        const course: Course = {
          id: crypto.randomUUID(),
          title: s.title ?? "Untitled course",
          code: s.code,
          instructor: s.instructor,
          term: s.term,
          description: s.description,
          textbook: s.textbook,
          gradingPolicy: s.gradingPolicy,
          createdAt: new Date().toISOString(),
          rawSyllabusName: label,
          weeks: (s.weeks ?? []).map(
            (
              w: { readings?: unknown[]; objectives?: string[] } & Record<string, unknown>
            ) => ({
              ...w,
              readings: (w.readings ?? []).map((r: unknown) => ({
                ...(r as object),
                id: crypto.randomUUID(),
              })),
              objectives: w.objectives ?? [],
            })
          ),
          flashcards: [],
          notes: [],
        };

        await saveCourse(course);
        toast.success("Study plan ready!");
        router.push(`/app/${course.id}`);
      } catch (err) {
        if (err instanceof MissingApiKeyError) {
          toast.error("Add your Gemini API key first", {
            action: { label: "Settings", onClick: openSettings },
          });
        } else {
          const msg = err instanceof Error ? err.message : "Something went wrong";
          toast.error(msg);
        }
        setStage("idle");
        setFileName("");
      }
    },
    [router, termStart, termEnd, datesValid, openSettings]
  );

  return (
    <div className="space-y-4">
      <div className="panel p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-white">
            <CalendarRange className="size-4 text-emerald-300" />
            Your term window
          </div>
          <div className="text-[11px] text-white/45 font-mono">
            {datesValid ? `${totalWeeks} week${totalWeeks === 1 ? "" : "s"}` : "Invalid dates"}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Term starts
            </span>
            <input
              type="date"
              value={termStart}
              onChange={(e) => setTermStart(e.target.value)}
              disabled={busy}
              className="input-base [color-scheme:dark]"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
              Final exam / term ends
            </span>
            <input
              type="date"
              value={termEnd}
              min={termStart}
              onChange={(e) => setTermEnd(e.target.value)}
              disabled={busy}
              className="input-base [color-scheme:dark]"
            />
          </label>
        </div>
        <div className="mt-3 text-[11px] text-white/40 leading-relaxed">
          Weekly topics will be distributed evenly into this window — not the dates printed on
          the syllabus.
        </div>
      </div>

      <div className="panel p-1 inline-flex items-center gap-1">
        <ModeTab
          active={mode === "pdf"}
          onClick={() => !busy && setMode("pdf")}
          icon={<FileUp className="size-3.5" />}
          label="Upload PDF"
        />
        <ModeTab
          active={mode === "paste"}
          onClick={() => !busy && setMode("paste")}
          icon={<ClipboardPaste className="size-3.5" />}
          label="Paste text"
        />
      </div>

      {mode === "pdf" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (busy) return;
            const f = e.dataTransfer.files?.[0];
            if (f) submit({ file: f });
          }}
          onClick={() => !busy && inputRef.current?.click()}
          className={cn(
            "group relative cursor-pointer rounded-xl border border-dashed p-10 md:p-14 text-center transition-colors",
            drag
              ? "border-emerald-400/70 bg-emerald-500/[0.04]"
              : "border-[var(--color-border-strong)] hover:border-emerald-400/50 hover:bg-white/[0.02]",
            busy && "cursor-progress"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) submit({ file: f });
            }}
          />
          <DropzoneInner busy={busy} drag={drag} stage={stage} fileName={fileName} mode="pdf" />
        </div>
      ) : (
        <div className="panel p-4 md:p-5">
          {busy ? (
            <div className="py-8">
              <DropzoneInner
                busy={busy}
                drag={false}
                stage={stage}
                fileName={fileName}
                mode="paste"
              />
            </div>
          ) : (
            <>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Paste your syllabus here.\n\nInclude the course title, weekly topics, readings, and any chapter numbers.`}
                rows={14}
                className="input-base resize-y font-mono leading-relaxed !text-[13px]"
              />
              <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                <div className="text-[11px] text-white/40 font-mono">
                  {pastedText.trim().length} chars
                </div>
                <button
                  onClick={() => submit({ text: pastedText })}
                  disabled={pastedText.trim().length < 80}
                  className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2"
                >
                  <Sparkles className="size-4" /> Build study plan
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
        active
          ? "bg-white/[0.06] text-white"
          : "text-white/50 hover:text-white/80"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DropzoneInner({
  busy,
  drag,
  stage,
  fileName,
  mode,
}: {
  busy: boolean;
  drag: boolean;
  stage: Stage;
  fileName: string;
  mode: Mode;
}) {
  return (
    <>
      <div
        className={cn(
          "mx-auto mb-5 relative flex size-14 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
          drag && "animate-pulse-ring"
        )}
      >
        {busy ? (
          <Loader2 className="size-6 animate-spin" />
        ) : mode === "pdf" ? (
          <FileUp className="size-6" />
        ) : (
          <ClipboardPaste className="size-6" />
        )}
      </div>

      {busy ? (
        <div className="text-center">
          <div className="text-[14px] font-medium text-white/90">{STAGE_MESSAGES[stage]}</div>
          {fileName && (
            <div className="mt-1.5 text-[13px] text-white/45 truncate max-w-sm mx-auto">
              {fileName}
            </div>
          )}
          <div className="mt-5 mx-auto max-w-xs h-[3px] rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{
                width: stage === "uploading" ? "25%" : stage === "parsing" ? "65%" : "92%",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-[17px] font-semibold text-white">Drop your syllabus PDF</div>
          <div className="mt-1.5 text-[13px] text-white/50">
            or <span className="text-emerald-300 underline underline-offset-4 decoration-emerald-400/40">click to browse</span>
            <span className="mx-2 text-white/20">·</span>
            PDF, up to 20MB
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-emerald-300/70 font-mono">
            <Sparkles className="size-3" />
            Parsed by Gemini in ~10 seconds
          </div>
        </div>
      )}
    </>
  );
}
