"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, KeyRound, Loader2, Trash2, X } from "lucide-react";

type ProfileInfo = { hasKey: boolean; keyPreview: string | null };

type Ctx = {
  hasKey: boolean;
  keyPreview: string | null;
  isLoaded: boolean;
  openSettings: () => void;
  refresh: () => Promise<void>;
};

const ApiKeyContext = createContext<Ctx | null>(null);

export function useApiKey() {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey must be used inside ApiKeyProvider");
  return ctx;
}

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<ProfileInfo>({ hasKey: false, keyPreview: null });
  const [isLoaded, setIsLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) {
        // Not signed in — leave hasKey false, that's fine
        setInfo({ hasKey: false, keyPreview: null });
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as ProfileInfo;
      setInfo(json);
    } catch {
      // ignore — network issues surface elsewhere
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSettings = useCallback(() => setOpen(true), []);

  const value = useMemo(
    () => ({
      hasKey: info.hasKey,
      keyPreview: info.keyPreview,
      isLoaded,
      openSettings,
      refresh,
    }),
    [info, isLoaded, openSettings, refresh]
  );

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {open && (
          <SettingsModal
            keyPreview={info.keyPreview}
            onSaved={async () => {
              await refresh();
              toast.success("API key saved");
              setOpen(false);
            }}
            onCleared={async () => {
              await refresh();
              toast.success("API key removed");
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </ApiKeyContext.Provider>
  );
}

function SettingsModal({
  keyPreview,
  onSaved,
  onCleared,
  onClose,
}: {
  keyPreview: string | null;
  onSaved: () => void;
  onCleared: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 20) {
      toast.error("That doesn't look like a valid Gemini API key");
      return;
    }
    setSaving(true);
    try {
      // Step 1: validate by pinging Gemini
      const vres = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "content-type": "application/json", "x-gemini-key": trimmed },
      });
      const vjson = await vres.json();
      if (!vres.ok || !vjson.ok) {
        toast.error(vjson.error ?? "Key validation failed");
        setSaving(false);
        return;
      }
      // Step 2: persist to profile
      const sres = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geminiKey: trimmed }),
      });
      if (!sres.ok) {
        const j = await sres.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setValue("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to remove key");
        return;
      }
      onCleared();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/5 transition"
        >
          <X className="size-4" />
        </button>

        <div className="mb-5">
          <div className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 mb-3">
            <KeyRound className="size-4" />
          </div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">
            Gemini API Key
          </h2>
          <p className="text-[13px] text-white/55 mt-1 leading-relaxed">
            Stored encrypted at rest in your account. Sent to Google&apos;s Gemini API only when
            you generate something — never exposed to other users.
          </p>
        </div>

        {keyPreview && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-[var(--color-border)] px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-0.5">
                Current key
              </div>
              <div className="text-[13px] font-mono text-white/80 truncate">{keyPreview}</div>
            </div>
            <button
              onClick={handleClear}
              disabled={saving}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 transition"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          </div>
        )}

        <label className="block mb-2">
          <span className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold">
            {keyPreview ? "Replace with a new key" : "Paste your key"}
          </span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) handleSave();
              }}
              placeholder="AIzaSy…"
              className="input-base font-mono !text-[13px] pr-9"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition"
              aria-label={show ? "Hide" : "Show"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-emerald-300 hover:text-emerald-200 transition mb-5"
        >
          Get a free key at aistudio.google.com
          <ExternalLink className="size-3" />
        </a>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost !py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || value.trim().length < 20}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving" : "Save key"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
