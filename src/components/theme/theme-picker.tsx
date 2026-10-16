"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n";
import { PaletteIcon } from "../icons";
import { themeStore, type ThemePreference } from "./theme-store";

const options: ThemePreference[] = ["system", "light", "dark", "win95", "aero"];

export function useThemePreference() {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
}

/** Radio list of themes; used in the header popover and the Windows 95 Start menu. */
export function ThemeOptions({ name }: { name: string }) {
  const { t } = useI18n();
  const current = useThemePreference();
  return (
    <fieldset className="theme-options">
      <legend className="sr-only">{t.theme.label}</legend>
      {options.map((option) => (
        <label key={option} className="theme-option" data-swatch={option}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={current === option}
            onChange={() => themeStore.set(option)}
          />
          <span className="theme-option__swatch" aria-hidden="true" />
          <span>{t.theme[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function ThemePicker() {
  const { t } = useI18n();
  return (
    <>
      <button type="button" className="icon-btn" popoverTarget="theme-popover" aria-label={t.theme.label} title={t.theme.label}>
        <PaletteIcon />
      </button>
      <div id="theme-popover" popover="auto" className="popover window">
        <div className="window__titlebar">
          <span className="window__title">{t.theme.label}</span>
        </div>
        <div className="popover__body">
          <ThemeOptions name="theme-header" />
        </div>
      </div>
    </>
  );
}
