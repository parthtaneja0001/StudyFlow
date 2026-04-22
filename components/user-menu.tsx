"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SessionUser = {
  email?: string;
  name?: string;
  avatar?: string;
};

export function UserMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      if (!u) {
        setUser(null);
        return;
      }
      setUser({
        email: u.email,
        name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string),
        avatar: (u.user_metadata?.avatar_url as string) ?? (u.user_metadata?.picture as string),
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      const u = session.user;
      setUser({
        email: u.email,
        name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string),
        avatar: (u.user_metadata?.avatar_url as string) ?? (u.user_metadata?.picture as string),
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  if (!user) return null;

  const initial = (user.name ?? user.email ?? "?").trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-center size-8 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-panel)] hover:border-[var(--color-border-strong)] transition-colors",
          open && "border-emerald-500/40"
        )}
        aria-label="Account menu"
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-[13px] font-semibold text-white/85">{initial}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 panel p-1.5 shadow-xl z-50">
          <div className="px-2.5 py-2 border-b border-[var(--color-border)] mb-1">
            <div className="text-[13px] font-medium text-white truncate">
              {user.name ?? "Signed in"}
            </div>
            {user.email && (
              <div className="text-[11px] text-white/50 truncate font-mono">{user.email}</div>
            )}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-white/75 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Fallback for legacy imports
export { UserMenu as default };
export function UserAvatarPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center size-8 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] text-white/50",
        className
      )}
    >
      <User className="size-4" />
    </div>
  );
}
