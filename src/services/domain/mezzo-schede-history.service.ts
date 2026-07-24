"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { SchedaTipo } from "@/types/schede";

export type MezzoSchedaHistoryRow = {
  lavorazioneId: string;
  schedaId: string;
  tipo: SchedaTipo;
  updatedAt: string;
};

/** Carica schede lavorazione per tutte le lavorazioni di un mezzo (batch). */
export async function fetchMezzoSchedeHistory(mezzoId: string): Promise<MezzoSchedaHistoryRow[]> {
  const sb = getBrowserSupabase();
  const id = mezzoId.trim();
  if (!id) return [];

  const { data: lavRows, error: lavErr } = await sb
    .from("lavorazioni")
    .select("id")
    .eq("mezzo_id", id)
    .is("deleted_at", null);
  if (lavErr) throw lavErr;
  const lavIds = (lavRows ?? []).map((r) => r.id).filter(Boolean);
  if (lavIds.length === 0) return [];

  const { data: schede, error: schErr } = await sb
    .from("scheda_lavorazione")
    .select("id, lavorazione_id, tipo, updated_at")
    .in("lavorazione_id", lavIds);
  if (schErr) throw schErr;

  return (schede ?? []).map((s) => ({
    lavorazioneId: s.lavorazione_id,
    schedaId: s.id,
    tipo: s.tipo as SchedaTipo,
    updatedAt: s.updated_at,
  }));
}

export function schedeHistoryBadges(rows: readonly MezzoSchedaHistoryRow[], lavorazioneId: string) {
  const forLav = rows.filter((r) => r.lavorazioneId === lavorazioneId);
  return {
    ingresso: forLav.some((r) => r.tipo === "ingresso"),
    lavorazioni: forLav.some((r) => r.tipo === "lavorazioni"),
    ricambi: forLav.some((r) => r.tipo === "ricambi"),
  };
}
