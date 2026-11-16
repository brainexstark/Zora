// ============================================================
// VIBE THEME PROVIDER - loads the daily generative vibe for the whole app
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getTodayVibe, DEFAULT_VIBE, VibeTheme } from "@/utils/vibeEngine";

type ThemeContextValue = {
  vibe: VibeTheme;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  vibe: DEFAULT_VIBE,
  loading: true,
  refresh: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [vibe, setVibe] = useState<VibeTheme>(DEFAULT_VIBE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const v = await getTodayVibe();
    setVibe(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ThemeContext.Provider value={{ vibe, loading, refresh }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
