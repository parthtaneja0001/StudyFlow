"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const next = search.get("next") ?? "/";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="panel p-7 text-center">
          <h1 className="text-[22px] font-semibold text-white tracking-tight mb-2">
            Welcome to StudyFlow
          </h1>
          <p className="text-[13px] text-white/55 mb-7 leading-relaxed">
            Sign in to save your courses, quizzes, and notes across devices.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white text-zinc-900 text-[14px] font-semibold hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon className="size-4" />
            )}
            Continue with Google
          </button>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-[11px] text-white/40 leading-relaxed">
            Your data is stored in our database, protected by row-level security — only you can
            read or write your own courses.
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.2 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5c-7.6 0-14.1 4.3-17.7 9.6z" />
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.6-1.7 13.1-4.7l-6-5.1c-2 1.4-4.4 2.3-7.1 2.3-5.4 0-9.9-3.1-11.3-7.5l-6.6 5.1c3.4 6 10.1 10 17.9 9.9z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.8-3.7 5-.1.1-6 5.1-6 5.1 3.3.6 9.4 0 13.9-5.1 3.3-3.8 4.6-8.3 4.1-12.5z" />
    </svg>
  );
}
