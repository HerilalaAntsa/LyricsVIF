/**
 * Thème UI : clair / sombre / auto (suit la préférence OS).
 *
 * La projection (§10.1 cadrage) reste sombre quel que soit le thème UI : elle
 * est destinée à l'assemblée, pas à l'opérateur.
 *
 * Init synchrone dans index.html pour éviter le FOUC. Ce module se charge des
 * changements pendant la vie de l'app.
 */

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "fihirana:ui-theme";
const DEFAULT_MODE: ThemeMode = "system";

function readStored(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* localStorage indispo */
  }
  return DEFAULT_MODE;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyMode(mode: ThemeMode): void {
  const dark = mode === "dark" || (mode === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* mémoire seulement */
  }
  applyMode(mode);
  window.dispatchEvent(new CustomEvent<ThemeMode>("fihirana:theme", { detail: mode }));
}

export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => readStored());

  useEffect(() => {
    const onCustom = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("fihirana:theme", onCustom);
    // Si mode == system, suivre les changements OS en live
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onOs = () => {
      if (readStored() === "system") applyMode("system");
    };
    media.addEventListener("change", onOs);
    return () => {
      window.removeEventListener("fihirana:theme", onCustom);
      media.removeEventListener("change", onOs);
    };
  }, []);

  return mode;
}
