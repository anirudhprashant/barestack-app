import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type Theme = 'light' | 'dark';

// The look of the app. "classic" is the original forest-and-serif design;
// "barestack" is the barestack.org design system (ink, paper, amber,
// condensed display type, hard offset shadows). Light/dark applies to both.
export type DesignTheme = 'classic' | 'barestack';
export const DESIGN_THEMES: DesignTheme[] = ['classic', 'barestack'];

interface ThemeContextType {
  theme: Theme; // what is showing now
  preference: ThemePreference; // what the user picked
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
  design: DesignTheme;
  setDesign: (d: DesignTheme) => void;
}

// Keep in sync with public/theme-init.js, which applies the theme before the
// first paint to avoid a flash of the wrong colours.
const STORAGE_KEY = 'barestack.theme';
const DESIGN_KEY = 'barestack.design';

// Browser chrome colour per design and mode (the sidebar / app bar colour).
const THEME_COLOR: Record<DesignTheme, Record<Theme, string>> = {
  classic: { light: '#192118', dark: '#121513' },
  barestack: { light: '#0A0806', dark: '#0A0806' },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'system' || v === 'light' ? v : 'light';
  } catch {
    return 'light';
  }
}

function readDesign(): DesignTheme {
  try {
    const v = localStorage.getItem(DESIGN_KEY);
    return v === 'barestack' ? v : 'classic';
  } catch {
    return 'classic';
  }
}

const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [design, setDesignState] = useState<DesignTheme>(readDesign);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = preference === 'system' ? (sysDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.setAttribute('data-theme', theme);
    for (const d of DESIGN_THEMES) root.classList.toggle(`theme-${d}`, d === design);
    root.setAttribute('data-design', design);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[design][theme]);
  }, [theme, design]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch { /* private mode */ }
  }, []);

  const setDesign = useCallback((d: DesignTheme) => {
    setDesignState(d);
    try { localStorage.setItem(DESIGN_KEY, d); } catch { /* private mode */ }
  }, []);

  const toggleTheme = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme, design, setDesign }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
