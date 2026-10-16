// Theme preference lives in localStorage and is applied to <html data-theme> by an inline script
// before first paint (see themeScript), so static pages never flash the wrong theme.

export const themes = ["light", "dark", "win95", "aero"] as const;
export type Theme = (typeof themes)[number];
export type ThemePreference = Theme | "system";

const KEY = "anitoy.theme";
const listeners = new Set<() => void>();
let preference: ThemePreference | undefined;

const isPreference = (value: unknown): value is ThemePreference =>
  value === "system" || themes.includes(value as Theme);

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(pref: ThemePreference): Theme {
  return pref === "system" ? systemTheme() : pref;
}

function apply(pref: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(pref);
  root.dataset.themePref = pref;
}

function read(): ThemePreference {
  if (preference) return preference;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // Storage can be unavailable (private mode); fall back to the system theme.
  }
  preference = isPreference(stored) ? stored : "system";
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (preference === "system") {
      apply("system");
      listeners.forEach((l) => l());
    }
  });
  return preference;
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): ThemePreference => read(),
  getServerSnapshot: (): ThemePreference => "system",
  set(pref: ThemePreference) {
    preference = pref;
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      // Ignore: the choice still applies for this page view.
    }
    apply(pref);
    listeners.forEach((l) => l());
  },
};

/** Runs in <head> before the body is parsed. Keep in sync with resolveTheme(). */
export const themeScript = `(function(){try{var p=localStorage.getItem("${KEY}");if(["light","dark","win95","aero","system"].indexOf(p)<0)p="system";var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var r=document.documentElement;r.dataset.theme=t;r.dataset.themePref=p;}catch(e){}})();`;
