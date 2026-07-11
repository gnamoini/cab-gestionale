import { findMezzoByIngressoIdent } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { PendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";

export type PreventivoHandoffIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
};

export function resolveMezzoForPreventivoHandoff(
  mezzi: readonly MezzoGestito[],
  opts: {
    lav: LavorazioneAttiva | LavorazioneArchiviata;
    mezzoId?: string | null;
    ident?: PreventivoHandoffIdent | null;
  },
): MezzoGestito | null {
  const mezzoId = opts.mezzoId?.trim();
  if (mezzoId) {
    const byId = mezzi.find((m) => m.id === mezzoId);
    if (byId) return byId;
  }

  const fromLav = findMezzoForLavorazione([...mezzi], opts.lav);
  if (fromLav) return fromLav;

  if (opts.ident) {
    const byIdent = findMezzoByIngressoIdent(mezzi, opts.ident);
    if (byIdent) return byIdent;
  }

  const archMezzoId = "mezzoId" in opts.lav ? opts.lav.mezzoId?.trim() : "";
  if (archMezzoId) {
    return mezzi.find((m) => m.id === archMezzoId) ?? null;
  }

  return null;
}

export function mezziForPendingPreventivoHandoff(
  mezzi: readonly MezzoGestito[],
  pending: PendingPreventivoPayload,
): readonly MezzoGestito[] {
  const snap = pending.mezzo;
  if (!snap?.id?.trim()) return mezzi;
  if (mezzi.some((m) => m.id === snap.id)) return mezzi;
  return [snap, ...mezzi];
}

export function resolveMezzoForPendingPreventivo(
  mezzi: readonly MezzoGestito[],
  pending: PendingPreventivoPayload,
): MezzoGestito | null {
  const snap = pending.mezzo;
  if (snap?.id?.trim()) return snap;

  const ing = pending.bundle.ingresso?.campi;
  const ident =
    pending.ident ??
    (ing
      ? { targa: ing.targa, matricola: ing.matricola, nScuderia: ing.nScuderia }
      : null);

  return resolveMezzoForPreventivoHandoff(mezziForPendingPreventivoHandoff(mezzi, pending), {
    lav: pending.lav,
    mezzoId: pending.mezzoId,
    ident,
  });
}
