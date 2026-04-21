"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCourse } from "@/components/course-provider";
import { useApiKey } from "@/components/api-key-provider";
import { updateCourse } from "@/lib/db";
import { fetchWithKey, MissingApiKeyError, parseJsonResponse } from "@/lib/api-key";
import type { Flashcard } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FlashcardsPage() {
  return (
    <Suspense fallback={null}>
      <FlashcardsInner />
    </Suspense>
  );
}

function FlashcardsInner() {
  const { course } = useCourse();
  const { openSettings } = useApiKey();
  const search = useSearchParams();
  const [topic, setTopic] = useState(search.get("topic") ?? "");
  const [chapter, setChapter] = useState(search.get("chapter") ?? "");
  const [count, setCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [openDeck, setOpenDeck] = useState<string | null>(null);

  const decks = useMemo(() => {
    const map = new Map<string, Flashcard[]>();
    for (const c of course.flashcards) {
      const key = c.topic;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].map(([name, cards]) => ({ name, cards }));
  }, [course.flashcards]);

  useEffect(() => {
    const t = search.get("topic");
    if (t) setTopic(t);
    const c = search.get("chapter");
    if (c) setChapter(c);
  }, [search]);

  async function generate() {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithKey("/api/generate-flashcards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          textbook: course.textbook,
          topic: topic.trim(),
          chapter: chapter.trim() || undefined,
          count,
        }),
      });
      const json = await parseJsonResponse<{ flashcards: Omit<Flashcard, "id">[] }>(res);

      const newCards: Flashcard[] = (json.flashcards ?? []).map(
        (c: Omit<Flashcard, "id">) => ({ ...c, id: crypto.randomUUID() })
      );
      await updateCourse(course.id, {
        flashcards: [...course.flashcards, ...newCards],
      });
      toast.success(`Generated ${newCards.length} flashcards`);
      setOpenDeck(topic.trim());
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        toast.error("Add your Gemini API key first", {
          action: { label: "Settings", onClick: openSettings },
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to generate");
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteDeck(name: string) {
    if (!confirm(`Delete the "${name}" deck?`)) return;
    await updateCourse(course.id, {
      flashcards: course.flashcards.filter((c) => c.topic !== name),
    });
    toast.success("Deck deleted");
  }

  const activeDeck = openDeck ? decks.find((d) => d.name === openDeck) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-white tracking-tight">Flashcards</h1>
          <p className="text-[13px] text-white/50 mt-1">
            {course.flashcards.length} cards · {decks.length} deck
            {decks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-4 uppercase tracking-wider">
          <Sparkles className="size-3.5 text-emerald-300" />
          Generate a new deck
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <input
            className="input-base md:col-span-5"
            placeholder="Topic (e.g. Derivatives)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
          <input
            className="input-base md:col-span-4"
            placeholder="Chapter (optional)"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            disabled={loading}
          />
          <input
            type="number"
            min={4}
            max={30}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 12)}
            className="input-base md:col-span-1 text-center"
            disabled={loading}
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="btn-primary md:col-span-2 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {loading ? "Generating" : "Generate"}
          </button>
        </div>
      </section>

      <section>
        {decks.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="mx-auto size-11 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-center mb-3">
              <Layers className="size-5 text-white/50" />
            </div>
            <div className="text-white/80 font-medium text-[14px]">No decks yet</div>
            <div className="text-[13px] text-white/50 mt-1">
              Enter a topic above to generate your first deck.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {decks.map((deck) => (
              <div
                key={deck.name}
                role="button"
                tabIndex={0}
                onClick={() => setOpenDeck(deck.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenDeck(deck.name);
                  }
                }}
                className="group panel panel-hover text-left p-5 relative cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Layers className="size-4 text-emerald-300" />
                  </div>
                  <span className="text-[11px] text-white/35 font-mono">
                    {deck.cards.length} cards
                  </span>
                </div>
                <div className="text-[14px] font-semibold text-white/90 leading-snug mb-1 line-clamp-2">
                  {deck.name}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <DifficultyDot cards={deck.cards} diff="easy" />
                  <DifficultyDot cards={deck.cards} diff="medium" />
                  <DifficultyDot cards={deck.cards} diff="hard" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDeck(deck.name);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete deck"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {activeDeck && (
          <DeckViewer
            key={activeDeck.name}
            name={activeDeck.name}
            cards={activeDeck.cards}
            onClose={() => setOpenDeck(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DifficultyDot({ cards, diff }: { cards: Flashcard[]; diff: Flashcard["difficulty"] }) {
  const n = cards.filter((c) => c.difficulty === diff).length;
  const colors = {
    easy: "bg-emerald-400",
    medium: "bg-amber-400",
    hard: "bg-rose-400",
  }[diff];
  if (n === 0) return null;
  return (
    <div className="flex items-center gap-1 text-[11px] text-white/50 font-mono">
      <span className={`size-1.5 rounded-full ${colors}`} />
      {n}
    </div>
  );
}

function DeckViewer({
  name,
  cards,
  onClose,
}: {
  name: string;
  cards: Flashcard[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState(() => cards.map((_, i) => i));

  const current = cards[order[idx]];

  const next = () => {
    setFlipped(false);
    setIdx((i) => Math.min(i + 1, order.length - 1));
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => Math.max(i - 1, 0));
  };
  const shuffle = () => {
    setIdx(0);
    setFlipped(false);
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
  };
  const reset = () => {
    setIdx(0);
    setFlipped(false);
    setOrder(cards.map((_, i) => i));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.length]);

  const progress = ((idx + 1) / order.length) * 100;

  const diffColors = {
    easy: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    medium: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    hard: "text-rose-300 bg-rose-500/10 border-rose-500/25",
  }[current.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5 font-semibold">
              Deck
            </div>
            <div className="text-[17px] font-semibold text-white leading-tight tracking-tight">
              {name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/5 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-white/45 mb-1.5 font-mono">
            <span>
              {idx + 1} / {order.length}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider ${diffColors}`}
            >
              {current.difficulty}
            </span>
          </div>
          <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          onClick={() => setFlipped((f) => !f)}
          className="relative cursor-pointer h-[360px] [perspective:1600px]"
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0.2, 1] }}
            className="relative size-full [transform-style:preserve-3d]"
          >
            <CardFace>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-3 font-semibold">
                Question
              </div>
              <div className="text-[20px] md:text-[22px] text-white leading-snug font-medium tracking-tight">
                {current.front}
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-center text-[11px] text-white/30 font-mono">
                Space or Enter to flip
              </div>
            </CardFace>
            <CardFace flipped>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-3 font-semibold">
                Answer
              </div>
              <div className="text-[17px] md:text-[18px] text-white/90 leading-relaxed">
                {current.back}
              </div>
              {current.chapter && (
                <div className="absolute bottom-5 left-5 right-5 text-center text-[11px] text-white/30 font-mono">
                  {current.chapter}
                </div>
              )}
            </CardFace>
          </motion.div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={shuffle}
              className="p-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition"
              title="Shuffle"
            >
              <Shuffle className="size-4" />
            </button>
            <button
              onClick={reset}
              className="p-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition"
              title="Reset"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={idx === 0}
              className="btn-ghost inline-flex items-center gap-1 !py-2"
            >
              <ChevronLeft className="size-4" /> Prev
            </button>
            <button
              onClick={next}
              disabled={idx === order.length - 1}
              className="btn-primary inline-flex items-center gap-1"
            >
              Next <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CardFace({ flipped, children }: { flipped?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-xl panel p-6 md:p-8 flex items-center justify-center text-center [backface-visibility:hidden]",
        flipped && "[transform:rotateY(180deg)]"
      )}
    >
      <div className="max-w-lg relative">{children}</div>
    </div>
  );
}
