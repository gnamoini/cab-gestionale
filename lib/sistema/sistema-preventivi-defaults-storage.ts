/** @deprecated Chiave legacy; preferire `app_settings`. */
export const SISTEMA_PREVENTIVI_DEFAULTS_STORAGE_KEY = "gestionale-sistema-preventivi-defaults-v1";

export type SistemaPreventiviDefaults = {
  costoOrarioDefault: number;
};

const FALLBACK: SistemaPreventiviDefaults = { costoOrarioDefault: 48 };

export function loadSistemaPreventiviDefaults(): SistemaPreventiviDefaults {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const raw = window.localStorage.getItem(SISTEMA_PREVENTIVI_DEFAULTS_STORAGE_KEY);
    if (!raw) return FALLBACK;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const c = Number(o.costoOrarioDefault);
    return {
      costoOrarioDefault: Number.isFinite(c) && c > 0 ? Math.round(c * 100) / 100 : FALLBACK.costoOrarioDefault,
    };
  } catch {
    return FALLBACK;
  }
}

export function saveSistemaPreventiviDefaults(next: SistemaPreventiviDefaults): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SISTEMA_PREVENTIVI_DEFAULTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
