import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/types/domain";
import { fetchOwnProfile, signInWithIdentifier, signOut as doSignOut } from "@/features/auth/authService";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  /** True when a session exists but the account has no active staff profile. */
  noAccess: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!sessionReady) return;
    if (!userId) {
      setProfile(null);
      setNoAccess(false);
      setProfileReady(true);
      return;
    }
    let cancelled = false;
    setProfileReady(false);
    fetchOwnProfile(userId)
      .then((p) => {
        if (cancelled) return;
        if (p && p.is_active) {
          setProfile(p);
          setNoAccess(false);
        } else {
          setProfile(null);
          setNoAccess(true);
        }
        setProfileReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setNoAccess(true);
        setProfileReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady, userId]);

  const signIn = useCallback((identifier: string, password: string) => signInWithIdentifier(identifier, password), []);
  const signOut = useCallback(async () => {
    await doSignOut();
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const p = await fetchOwnProfile(userId);
      if (p && p.is_active) {
        setProfile(p);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const value = useMemo<AuthContextValue>(() => {
    const status: Status = !sessionReady || !profileReady ? "loading" : profile ? "signedIn" : "signedOut";
    return { status, session, profile, role: profile?.role ?? null, noAccess, signIn, signOut, reloadProfile };
  }, [sessionReady, profileReady, profile, session, noAccess, signIn, signOut, reloadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
