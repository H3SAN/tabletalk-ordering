import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Inactivity timeout for the testing phase. The user is only signed out
// automatically after this much idle time (no pointer/keyboard/touch input).
// Otherwise the session is preserved across reloads via localStorage.
const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Restore the persisted session FIRST so we don't briefly render as
    // signed-out on reload. Then subscribe to subsequent auth changes.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    // Only react to events that change identity. Ignore TOKEN_REFRESHED and
    // USER_UPDATED — they fire frequently and previously caused cascading
    // re-renders that looked like spurious sign-outs.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        const next = session?.user ?? null;
        setUser((prev) => (prev?.id === next?.id ? prev : next));
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Inactivity-based sign-out for the testing phase. Any user interaction
  // resets the timer; the manual "Sign out" button still works as before.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_MS);
    };
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user?.id]);

  return { user, loading };
}