import { proposeMezzoReconciliation } from "@/lib/mezzi/mezzo-reconciliation";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { PendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";

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
    return mezzi.find((m) => m.id === mezzoId) ?? null;
  }

  const archMezzoId = "mezzoId" in opts.lav ? opts.lav.mezzoId?.trim() : "";
  if (archMezzoId) {
    return mezzi.find((m) => m.id === archMezzoId) ?? null;
  }

  if (opts.ident) {
    const recon = proposeMezzoReconciliation(mezzi, opts.ident);
    if (recon.status === "resolved") {
      return mezzi.find((m) => m.id === recon.mezzoId) ?? null;
    }
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
