import { durataMsStorico } from "@/lib/lavorazioni/duration";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import { migrateStatoConfigId } from "@/src/shared/selectors";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

export function normMezzoKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match forte ident (matricola / targa / scuderia esatti).
 * Per riconciliazione proposta — non usare per attach automatico senza disambiguazione.
 */
export function lavorazioneStrongIdentMatchesMezzo(
  m: MezzoGestito,
  lav: { targa: string; matricola: string; nScuderia?: string },
): boolean {
  const nm = normMezzoKey(m.matricola);
  const lm = normMezzoKey(lav.matricola);
  if (nm && lm && nm === lm) return true;
  const nt = normMezzoKey(m.targa);
  const lt = normMezzoKey(lav.targa);
  if (nt && lt && nt === lt) return true;
  const nsM = normMezzoKey(m.numeroScuderia ?? "");
  const nsL = normMezzoKey(lav.nScuderia ?? "");
  return Boolean(nsM && nsL && nsM === nsL);
}

function lavorazioneFuzzyMarcaModelloMatchesMezzo(
  m: MezzoGestito,
  lav: { macchina: string },
): boolean {
  const ml = normMezzoKey(`${m.marca} ${m.modello}`).replace(/mercedes-benz/g, "mercedes");
  const mac = normMezzoKey(lav.macchina).replace(/mercedes-benz/g, "mercedes");
  if (!ml || !mac) return false;
  if (ml === mac) return true;
  if (mac.startsWith(ml) || ml.startsWith(mac)) return true;
  if (ml.length >= 4 && mac.includes(ml)) return true;
  const mlAlnum = ml.replace(/[^a-z0-9]/g, "");
  const macAlnum = mac.replace(/[^a-z0-9]/g, "");
  return mlAlnum.length >= 6 && (macAlnum.includes(mlAlnum) || mlAlnum.includes(macAlnum));
}

/**
 * Match display/hint (include fuzzy marca+modello).
 * Non usare per collegamento persistente — vedi lavorazioneCollegataMezzoDb.
 */
export function lavorazioneMatchesMezzo(
  m: MezzoGestito,
  lav: { id: string; targa: string; matricola: string; macchina: string; nScuderia?: string },
): boolean {
  if (m.lavorazioneMezzoId && lav.id === m.lavorazioneMezzoId) return true;
  if (lavorazioneStrongIdentMatchesMezzo(m, lav)) return true;
  return lavorazioneFuzzyMarcaModelloMatchesMezzo(m, lav);
}

function labelStato(statoId: string): string {
  const dbId = migrateStatoConfigId(statoId);
  return labelLavorazioneStatoDb(dbId as StatoLavorazione);
}

function prioritaIt(p: string): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "bassa") return "Bassa";
  return p;
}

export function mezzoHaLavorazioneAttiva(m: MezzoGestito, attive: LavorazioneAttiva[]): boolean {
  return attive.some((lav) => lavorazioneMatchesMezzo(m, lav));
}

function giorniTra(isoIn: string, isoOut: string | null): { label: string; num: number } {
  if (!isoOut?.trim()) return { label: "—", num: 0 };
  const ms = durataMsStorico(isoIn, isoOut);
  const g = ms / 86400000;
  const rounded = Math.round(g * 10) / 10;
  if (rounded === 0) return { label: "< 1 giorno", num: g };
  return { label: `${rounded} giorni`, num: g };
}

/** Interventi da tabella storico + lavorazioni attive collegate (in corso). */
export function interventiMezzoDaLavorazioni(
  m: MezzoGestito,
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
): MezzoInterventoLavorazione[] {
  const out: MezzoInterventoLavorazione[] = [];

  for (const lav of storico) {
    if (!lavorazioneMatchesMezzo(m, lav)) continue;
    const { label, num } = giorniTra(lav.dataIngresso, lav.dataCompletamento);
    out.push({
      id: lav.id,
      origine: "storico",
      dataIngresso: lav.dataIngresso,
      dataCompletamento: lav.dataCompletamento,
      durataGiorniLabel: label,
      durataGiorniNum: num,
      tipoIntervento: labelStato(lav.statoFinaleId),
      descrizione: lav.noteInterne.trim() || "—",
      prioritaLabel: prioritaIt(lav.prioritaFinale),
      statoFinale: labelStato(lav.statoFinaleId),
    });
  }

  for (const lav of attive) {
    if (!lavorazioneMatchesMezzo(m, lav)) continue;
    const completed = lav.dataCompletamento;
    const dur = completed ? giorniTra(lav.dataIngresso, completed) : { label: "In corso", num: 0 };
    out.push({
      id: lav.id,
      origine: "attiva",
      dataIngresso: lav.dataIngresso,
      dataCompletamento: lav.dataCompletamento,
      durataGiorniLabel: dur.label,
      durataGiorniNum: dur.num,
      tipoIntervento: labelStato(lav.statoId),
      descrizione: lav.noteInterne.trim() || "—",
      prioritaLabel: prioritaIt(lav.priorita),
      statoFinale: completed ? labelStato(lav.statoId) : "In officina",
    });
  }

  out.sort((a, b) => {
    const ta = new Date(a.dataIngresso).getTime();
    const tb = new Date(b.dataIngresso).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return out;
}
