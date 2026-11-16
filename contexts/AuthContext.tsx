// ============================================================
// AUTH CONTEXT - session + profile state, gates the app by age_group + phone
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { AgeGroup } from "@/utils/ageGuard";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  dob: string;
  age: number;
  age_group: AgeGroup;
  phone: string | null;
  phone_verified: boolean;
  auth_provider: string | null;
  vibe_theme: any;
};

type AuthContextValue = {
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setSession: (s: any) => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  setSession: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile((data as Profile) || null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = await getCurrentUserId();
    if (uid) await loadProfile(uid);
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, refreshProfile, setSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
