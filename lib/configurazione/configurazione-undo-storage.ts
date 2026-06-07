import type { SettingsWorkspaceSnapshot } from "@/lib/configurazione/settings-workspace-snapshot";
import { dispatchConfigurazioneUndoRefresh } from "@/lib/sistema/cab-events";

export const CONFIGURAZIONE_UNDO_STORAGE_KEY = "gestionale-configurazione-undo-v1";
export const CONFIGURAZIONE_UNDO_MAX = 8;

export type ConfigurazioneUndoStored = {
  id: string;
  beforeSnapshot: SettingsWorkspaceSnapshot;
  undoSessionId: string;
  userId: string;
  autore: string;
  atIso: string;
  reverted?: boolean;
};

function nextId(): string {
  return `cfgundo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneSnapshot(snapshot: SettingsWorkspaceSnapshot): SettingsWorkspaceSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SettingsWorkspaceSnapshot;
}

export function loadConfigurazioneUndoStack(): ConfigurazioneUndoStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONFIGURAZIONE_UNDO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ConfigurazioneUndoStored[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : nextId();
      const undoSessionId = typeof o.undoSessionId === "string" ? o.undoSessionId : "";
      const userId = typeof o.userId === "string" ? o.userId : "";
      const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Operatore";
      const atIso = typeof o.atIso === "string" && o.atIso.trim() ? o.atIso.trim() : new Date().toISOString();
      const beforeSnapshot = o.beforeSnapshot;
      if (!undoSessionId || !userId || !beforeSnapshot || typeof beforeSnapshot !== "object") continue;
      out.push({
        id,
        undoSessionId,
        userId,
        autore,
        atIso,
        beforeSnapshot: cloneSnapshot(beforeSnapshot as SettingsWorkspaceSnapshot),
        reverted: o.reverted === true,
      });
    }
    return out.slice(0, CONFIGURAZIONE_UNDO_MAX);
  } catch {
    return [];
  }
}

function saveConfigurazioneUndoStack(entries: ConfigurazioneUndoStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONFIGURAZIONE_UNDO_STORAGE_KEY,
      JSON.stringify(entries.slice(0, CONFIGURAZIONE_UNDO_MAX)),
    );
    dispatchConfigurazioneUndoRefresh();
  } catch {
    /* ignore quota */
  }
}

export function pushConfigurazioneUndo(input: {
  beforeSnapshot: SettingsWorkspaceSnapshot;
  undoSessionId: string;
  userId: string;
  autore: string;
}): void {
  const row: ConfigurazioneUndoStored = {
    id: nextId(),
    atIso: new Date().toISOString(),
    beforeSnapshot: cloneSnapshot(input.beforeSnapshot),
    undoSessionId: input.undoSessionId,
    userId: input.userId,
    autore: input.autore.trim() || "Operatore",
  };
  saveConfigurazioneUndoStack([row, ...loadConfigurazioneUndoStack()]);
}

export function latestUndoableConfigurazioneSave(
  userId: string | null | undefined,
  sessionId: string | null | undefined,
): ConfigurazioneUndoStored | null {
  if (!userId || !sessionId) return null;
  return (
    loadConfigurazioneUndoStack().find(
      (entry) => !entry.reverted && entry.userId === userId && entry.undoSessionId === sessionId,
    ) ?? null
  );
}

export function markConfigurazioneUndoReverted(id: string): void {
  const next = loadConfigurazioneUndoStack().map((entry) =>
    entry.id === id ? { ...entry, reverted: true } : entry,
  );
  saveConfigurazioneUndoStack(next);
}
