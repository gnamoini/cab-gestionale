import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import {
  PREVENTIVO_EPHEMERAL_DRAFT_SESSION_KEY,
  PREVENTIVO_PENDING_SESSION_KEY,
} from "@/lib/preventivi/constants";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export type PendingPreventivoPayload = {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  origine: PreventivoLavorazioneOrigine;
  /** Snapshot bundle schede (include modifiche non ancora persistite su storage). */
  bundle: LavorazioneSchedeBundle;
};

export function writePendingPreventivoPayload(p: PendingPreventivoPayload): void {
  try {
    sessionStorage.setItem(PREVENTIVO_PENDING_SESSION_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function readAndClearPendingPreventivoPayload(): PendingPreventivoPayload | null {
  try {
    const raw = sessionStorage.getItem(PREVENTIVO_PENDING_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREVENTIVO_PENDING_SESSION_KEY);
    return JSON.parse(raw) as PendingPreventivoPayload;
  } catch {
    return null;
  }
}

export function markEphemeralPreventivoDraft(id: string): void {
  try {
    sessionStorage.setItem(PREVENTIVO_EPHEMERAL_DRAFT_SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readEphemeralPreventivoDraftId(): string | null {
  try {
    return sessionStorage.getItem(PREVENTIVO_EPHEMERAL_DRAFT_SESSION_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearEphemeralPreventivoDraft(): void {
  try {
    sessionStorage.removeItem(PREVENTIVO_EPHEMERAL_DRAFT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
