import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  PREVENTIVO_EPHEMERAL_DRAFT_SESSION_KEY,
  PREVENTIVO_PENDING_SESSION_KEY,
} from "@/lib/preventivi/constants";
import { Q_PREVENTIVI_NUOVO } from "@/lib/preventivi/preventivi-query";
import type { PreventivoHandoffIdent } from "@/lib/preventivi/resolve-mezzo-for-pending-preventivo";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export type PendingPreventivoPayload = {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  origine: PreventivoLavorazioneOrigine;
  /** Snapshot bundle schede (include modifiche non ancora persistite su storage). */
  bundle: LavorazioneSchedeBundle;
  /** Mezzo già risolto nel contesto schede — evita lookup fallito su pagina preventivi. */
  mezzoId?: string | null;
  /** Snapshot anagrafica mezzo al momento del handoff (non dipende da cache React Query). */
  mezzo?: MezzoGestito | null;
  /** Identità canonica intervento (targa/matricola/scuderia) per lookup mezzo. */
  ident?: PreventivoHandoffIdent | null;
};

/** ponytail: module singleton — dedupe append su remount StrictMode. */
let pendingAppendInflight: Promise<unknown> | null = null;

export function peekPendingPreventivoPayload(): PendingPreventivoPayload | null {
  try {
    const raw = sessionStorage.getItem(PREVENTIVO_PENDING_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPreventivoPayload;
  } catch {
    return null;
  }
}

export function writePendingPreventivoPayload(p: PendingPreventivoPayload): void {
  try {
    sessionStorage.setItem(PREVENTIVO_PENDING_SESSION_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function clearPendingPreventivoPayload(): void {
  try {
    sessionStorage.removeItem(PREVENTIVO_PENDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated Prefer peek + clear on success. Kept for callers legacy. */
export function readAndClearPendingPreventivoPayload(): PendingPreventivoPayload | null {
  const pending = peekPendingPreventivoPayload();
  if (pending) clearPendingPreventivoPayload();
  return pending;
}

/** Evita doppio append se l'effect pending viene rieseguito (StrictMode / deps). */
export function dedupePendingPreventivoAppend<T>(task: () => Promise<T>): Promise<T> {
  if (pendingAppendInflight) return pendingAppendInflight as Promise<T>;
  const run = task().finally(() => {
    pendingAppendInflight = null;
  });
  pendingAppendInflight = run;
  return run;
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

/** Handoff cross-page: router.push dal modal schede non naviga in modo affidabile. */
export function navigateToPendingPreventivoCreate(): void {
  window.location.assign(`/preventivi?${Q_PREVENTIVI_NUOVO}=1`);
}
