"use client";

import type { DirtyEntry } from "@/lib/sync/gestionale-dirty-state";

const STORAGE_KEY = "cab-gestionale-dirty-v1";

type PersistedDirtyPayload = {
  lastSeenAt: number;
  entries: DirtyEntry[];
};

function readPayload(): PersistedDirtyPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDirtyPayload;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePayload(entries: DirtyEntry[], lastSeenAt: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: PersistedDirtyPayload = { lastSeenAt, entries };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function persistGestionaleDirtyEntry(entry: DirtyEntry): void {
  const existing = readPayload();
  const entries = existing?.entries ?? [];
  const key = `${entry.table}:${entry.entityId ?? "*"}`;
  const next = entries.filter((e) => `${e.table}:${e.entityId ?? "*"}` !== key);
  next.push(entry);
  writePayload(next, entry.timestamp || Date.now());
}

export function readPersistedGestionaleDirtyEntries(): DirtyEntry[] {
  return readPayload()?.entries ?? [];
}

export function clearPersistedGestionaleDirty(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getPersistedGestionaleDirtyLastSeenAt(): number | null {
  return readPayload()?.lastSeenAt ?? null;
}

/** Test helper */
export function resetGestionaleDirtyPersistForTests(): void {
  clearPersistedGestionaleDirty();
}
