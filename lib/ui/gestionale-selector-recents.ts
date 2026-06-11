import { normListSelectValue } from "@/lib/ui/list-select-utils";

const STORAGE_PREFIX = "cab-selector-recents:";
const DEFAULT_MAX = 5;

function storageKey(listKey: string): string {
  return `${STORAGE_PREFIX}${listKey}`;
}

/** Ultime selezioni persistite per listKey (localStorage). */
export function readSelectorRecents(listKey: string, max = DEFAULT_MAX): string[] {
  if (typeof window === "undefined" || !listKey.trim()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(listKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .slice(0, max);
  } catch {
    return [];
  }
}

/** Aggiunge un valore in testa alla cronologia (dedupe, cap). */
export function pushSelectorRecent(listKey: string, value: string, max = DEFAULT_MAX): void {
  if (typeof window === "undefined" || !listKey.trim()) return;
  const trimmed = value.trim();
  if (!trimmed) return;
  const prev = readSelectorRecents(listKey, max + 4);
  const trimmedNorm = normListSelectValue(trimmed);
  const next = [
    trimmed,
    ...prev.filter((v) => normListSelectValue(v) !== trimmedNorm),
  ].slice(0, max);
  try {
    window.localStorage.setItem(storageKey(listKey), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
