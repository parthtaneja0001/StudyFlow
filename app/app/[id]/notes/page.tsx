"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  Copy,
  Download,
  Loader2,
  NotebookPen,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCourse } from "@/components/course-provider";
import { updateCourse } from "@/lib/db";
import { MarkdownViewer } from "@/components/markdown-viewer";
import type { NoteDoc } from "@/lib/types";
import { cn, formatDate, slugify, truncate } from "@/lib/utils";

const STYLES = [
  {
    key: "comprehensive" as const,
    label: "Comprehensive",
    desc: "Full explanations + examples",
  },
  {
    key: "outline" as const,
    label: "Outline",
    desc: "Hierarchical, scannable",
  },
  {
    key: "cheatsheet" as const,
    label: "Cheatsheet",
    desc: "Dense, formula-heavy",
  },
];

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesInner />
    </Suspense>
  );
}

function NotesInner() {
  const { course } = useCourse();
  const search = useSearchParams();
  const [topic, setTopic] = useState(search.get("topic") ?? "");
  const [style, setStyle] = useState<"comprehensive" | "outline" | "cheatsheet">(
    "comprehensive"
  );
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = search.get("topic");
    if (t) setTopic(t);
  }, [search]);

  async function generate() {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }
    setLoading(true);
    try {
      const relevantWeek = course.weeks.find((w) =>
        w.topic.toLowerCase().includes(topic.toLowerCase())
      );
      const res = await fetch("/api/generate-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          textbook: course.textbook,
          topic: topic.trim(),
          objectives: relevantWeek?.objectives ?? [],
          style,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      const note: NoteDoc = {
        id: crypto.randomUUID(),
        topic: topic.trim(),
        markdown: json.markdown,
        createdAt: new Date().toISOString(),
      };
      await updateCourse(course.id, { notes: [note, ...course.notes] });
      toast.success("Notes generated");
      setOpenId(note.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await updateCourse(course.id, {
      notes: course.notes.filter((n) => n.id !== id),
    });
    toast.success("Note deleted");
  }

  const openNote = openId ? course.notes.find((n) => n.id === openId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-white tracking-tight">Study Notes</h1>
          <p className="text-[13px] text-white/50 mt-1">
            {course.notes.length} note{course.notes.length === 1 ? "" : "s"} generated
          </p>
        </div>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-4 uppercase tracking-wider">
          <Sparkles className="size-3.5 text-emerald-300" />
          Generate notes
        </div>
        <div className="space-y-4">
          <input
            className="input-base"
            placeholder="Topic (e.g. Newton's laws, Big-O complexity, Supply and demand)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2 font-semibold">
                Style
              </div>
              <div className="flex gap-2 flex-wrap">
                {STYLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStyle(s.key)}
                    disabled={loading}
                    className={cn(
                      "px-3 py-2 rounded-md text-left transition text-xs border",
                      style === s.key
                        ? "border-emerald-500/50 bg-emerald-500/10 text-white"
                        : "border-[var(--color-border)] bg-white/[0.02] text-white/60 hover:text-white/85 hover:border-[var(--color-border-strong)]"
                    )}
                  >
                    <div className="font-semibold text-[13px]">{s.label}</div>
                    <div className="opacity-70 text-[11px] mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="btn-primary inline-flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Writing" : "Generate notes"}
            </button>
          </div>
        </div>
      </section>

      <section>
        {course.notes.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="mx-auto size-11 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-center mb-3">
              <NotebookPen className="size-5 text-white/50" />
            </div>
            <div className="text-white/80 font-medium text-[14px]">No notes yet</div>
            <div className="text-[13px] text-white/50 mt-1">
              Pick a topic above and StudyFlow drafts polished notes in seconds.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {course.notes.map((note) => {
              const preview = note.markdown
                .replace(/^#.*$/gm, "")
                .replace(/[#*_`>-]/g, "")
                .replace(/\n+/g, " ")
                .trim();
              return (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId(note.id);
                    }
                  }}
                  className="group panel panel-hover relative p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <NotebookPen className="size-4 text-emerald-300" />
                    </div>
                    <span className="text-[11px] text-white/35 ml-auto font-mono">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <div className="text-[14px] font-semibold text-white leading-snug mb-2 line-clamp-2">
                    {note.topic}
                  </div>
                  <div className="text-[12px] text-white/55 line-clamp-3 leading-relaxed">
                    {truncate(preview, 180)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {openNote && (
          <NoteViewer key={openNote.id} note={openNote} onClose={() => setOpenId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NoteViewer({ note, onClose }: { note: NoteDoc; onClose: () => void }) {
  async function copy() {
    await navigator.clipboard.writeText(note.markdown);
    toast.success("Markdown copied to clipboard");
  }
  function download() {
    const blob = new Blob([note.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(note.topic)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-3xl panel p-6 md:p-10 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky -top-6 md:-top-10 -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-4 z-10 bg-[var(--color-panel)]/95 backdrop-blur border-b border-[var(--color-border)] rounded-t-xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[13px] text-white/55 hover:text-white transition"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={copy}
              className="p-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition"
              title="Copy markdown"
            >
              <Copy className="size-4" />
            </button>
            <button
              onClick={download}
              className="p-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition"
              title="Download .md"
            >
              <Download className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <MarkdownViewer markdown={note.markdown} />
      </motion.div>
    </motion.div>
  );
}
