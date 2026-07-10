import { runScopeMigrations } from "@/lib/ui/collapsible-prefs/migrations";
import {
  COLLAPSIBLE_PREFS_KEY_PREFIX,
  COLLAPSIBLE_PREFS_VERSION,
  EMPTY_COLLAPSIBLE_PREFS_BLOB,
  type CollapsiblePrefValue,
  type CollapsiblePrefsBlob,
} from "@/lib/ui/collapsible-prefs/types";

export function collapsiblePrefsStorageKey(userId: string, scope: string): string {
  return `${COLLAPSIBLE_PREFS_KEY_PREFIX}:${userId}:${scope}`;
}

function isCollapsiblePrefValue(v: unknown): v is CollapsiblePrefValue {
  if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") return true;
  if (Array.isArray(v)) return v.every((x) => typeof x === "string");
  return false;
}

function parseBlob(raw: string): CollapsiblePrefsBlob | null {
  try {
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    if (o.v !== COLLAPSIBLE_PREFS_VERSION) return null;
    if (!o.sections || typeof o.sections !== "object") return null;
    const sections: Record<string, CollapsiblePrefValue> = {};
    for (const [k, v] of Object.entries(o.sections as Record<string, unknown>)) {
      if (typeof k === "string" && isCollapsiblePrefValue(v)) sections[k] = v;
    }
    return { v: COLLAPSIBLE_PREFS_VERSION, sections };
  } catch {
    return null;
  }
}

export function read(userId: string, scope: string): CollapsiblePrefsBlob {
  if (typeof globalThis.localStorage === "undefined") return EMPTY_COLLAPSIBLE_PREFS_BLOB;
  try {
    const raw = globalThis.localStorage.getItem(collapsiblePrefsStorageKey(userId, scope));
    const parsed = raw ? parseBlob(raw) : null;
    const base = parsed ?? EMPTY_COLLAPSIBLE_PREFS_BLOB;
    const migrated = runScopeMigrations(scope, base);
    if (migrated !== base || !parsed) {
      write(userId, scope, migrated.sections);
    }
    return migrated;
  } catch {
    return EMPTY_COLLAPSIBLE_PREFS_BLOB;
  }
}

export function write(userId: string, scope: string, sections: Record<string, CollapsiblePrefValue>): void {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    const blob: CollapsiblePrefsBlob = { v: COLLAPSIBLE_PREFS_VERSION, sections };
    globalThis.localStorage.setItem(collapsiblePrefsStorageKey(userId, scope), JSON.stringify(blob));
  } catch {
    /* quota */
  }
}

export function readSection<T>(
  userId: string,
  scope: string,
  key: string,
  fallback: T,
  deserialize: (raw: CollapsiblePrefValue | undefined, fallback: T) => T,
): T {
  const blob = read(userId, scope);
  return deserialize(blob.sections[key], fallback);
}

export function writeSection<T>(
  userId: string,
  scope: string,
  key: string,
  value: T,
  serialize: (v: T) => CollapsiblePrefValue,
): void {
  if (typeof globalThis.localStorage === "undefined") return;
  const blob = read(userId, scope);
  write(userId, scope, { ...blob.sections, [key]: serialize(value) });
}
