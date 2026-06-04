import type { CampoChangeLike } from "@/lib/gestionale-log/view-model";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type MagazzinoLogTipo = "aggiunta" | "update" | "rimozione";

export type BuildMagazzinoLocalLogInput = {
  id: string;
  tipo: MagazzinoLogTipo;
  ricambioId: string;
  ricambioLabel: string;
  autore: string;
  at?: string;
  changes: CampoChangeLike[];
  autoreUserId?: string;
  undoSessionId?: string;
};

/** Etichette campi UI magazzino (allineate a `CAMPO_LABEL` in magazzino-view). */
/** Campi aggiornati automaticamente a ogni salvataggio — non mostrare nel log modifiche. */
export const MAGAZZINO_AUTOMATIC_LOG_FIELD_KEYS = new Set(["autoreUltimaModifica", "dataUltimaModifica"]);

/** Campo tecnico (SSOT ID) — la UI mostra solo «Compatibilità» (legacy labels). */
export const MAGAZZINO_INTERNAL_LOG_FIELD_KEYS = new Set(["compatibilitaRefs"]);

const MAGAZZINO_AUTO_MODIFICA_LINE_RE =
  /^(?:AutoreUltimaModifica|Autore ultima modifica|DataUltimaModifica|Data ultima modifica)\b/i;

const MAGAZZINO_COMPAT_REFS_LINE_RE = /^CompatibilitaRefs\b/i;

export function isMagazzinoAutomaticLogField(key: string): boolean {
  const k = key.trim();
  return MAGAZZINO_AUTOMATIC_LOG_FIELD_KEYS.has(k) || MAGAZZINO_INTERNAL_LOG_FIELD_KEYS.has(k);
}

export function filterMagazzinoAutomaticModifiche(lines: readonly string[]): string[] {
  return lines.filter((line) => {
    const bare = line.replace(/^•\s*/, "").trim();
    if (MAGAZZINO_AUTO_MODIFICA_LINE_RE.test(bare)) return false;
    if (MAGAZZINO_COMPAT_REFS_LINE_RE.test(bare)) return false;
    return true;
  });
}

export const MAGAZZINO_CAMPO_LABEL: Record<string, string> = {
  marca: "Marca",
  codiceFornitoreOriginale: "Codice",
  descrizione: "Descrizione",
  note: "Note",
  categoria: "Categoria",
  compatibilitaMezzi: "Compatibilità",
  scorta: "Scorta",
  scortaMinima: "Scorta minima",
  prezzoFornitoreOriginale: "Prezzo listino OE",
  scontoFornitoreOriginale: "Sconto OE %",
  markupPercentuale: "Markup %",
  prezzoVendita: "Prezzo vendita",
  marcaOriginaleSecondaria: "Marca secondaria",
  usatoInTagliandi: "Tagliando",
  fornitoriAlternativi: "Fornitori alternativi",
  fornitoreNonOriginale: "Fornitore alternativo",
  codiceFornitoreNonOriginale: "Codice alternativo",
  prezzoFornitoreNonOriginale: "Prezzo alternativo",
  scontoFornitoreNonOriginale: "Sconto alt. %",
  Foto: "Foto",
};

function summarizeChanges(changes: CampoChangeLike[], tipo: MagazzinoLogTipo, autore: string): string {
  if (tipo === "aggiunta") return "Nuovo ricambio registrato";
  if (tipo === "rimozione") return "Rimosso dal magazzino";
  const parts: string[] = [];
  for (const c of changes) {
    if (c.campo === "Scorta") {
      const p = Number.parseInt(c.prima, 10);
      const d = Number.parseInt(c.dopo, 10);
      if (!Number.isNaN(p) && !Number.isNaN(d)) {
        const delta = d - p;
        parts.push(delta >= 0 ? `Scorta +${delta}` : `Scorta ${delta}`);
      } else {
        parts.push("Scorta aggiornata");
      }
    } else if (c.campo === "Prezzo vendita") {
      parts.push("Prezzo vendita aggiornato");
    } else if (c.campo === "Fornitore alternativo") {
      parts.push("Fornitore aggiornato");
    } else if (c.campo === "Foto") {
      parts.push(c.dopo === "Foto rimossa" ? "Foto rimossa" : "Foto aggiunta");
    } else {
      parts.push(`${c.campo} aggiornato`);
    }
  }
  const base = [...new Set(parts)].join(", ");
  return base ? `${autore} — ${base}` : `${autore} — Modifica registrata`;
}

/** Voce log locale (localStorage + undo scorta) con riepilogo coerente. */
export function buildMagazzinoLocalLogEntry(input: BuildMagazzinoLocalLogInput): MagazzinoChangeLogEntry {
  const at = input.at ?? new Date().toISOString();
  return {
    id: input.id,
    tipo: input.tipo,
    ricambioId: input.ricambioId,
    ricambio: input.ricambioLabel.trim() || "Ricambio",
    autore: input.autore.trim() || "Sistema",
    at,
    changes: input.changes,
    riepilogo: summarizeChanges(input.changes, input.tipo, input.autore),
    annullato: false,
    autoreUserId: input.autoreUserId,
    undoSessionId: input.undoSessionId,
  };
}

/** Log locale scorta dopo persistenza API (undo scorta / report). */
export function buildMagazzinoScortaPersistedLogEntry(input: {
  id: string;
  ricambioId: string;
  ricambioLabel: string;
  autore: string;
  prima: number;
  dopo: number;
  autoreUserId?: string;
  undoSessionId?: string;
}): MagazzinoChangeLogEntry {
  return buildMagazzinoLocalLogEntry({
    id: input.id,
    tipo: "update",
    ricambioId: input.ricambioId,
    ricambioLabel: input.ricambioLabel,
    autore: input.autore,
    changes: [{ campo: "Scorta", prima: String(input.prima), dopo: String(input.dopo) }],
    autoreUserId: input.autoreUserId,
    undoSessionId: input.undoSessionId,
  });
}

export function magazzinoRicambioDisplayLabel(r: RicambioMagazzino): string {
  const desc = r.descrizione.trim();
  const cod = r.codiceFornitoreOriginale.trim();
  if (desc && cod) return `${desc} (${cod})`;
  return desc || cod || "Ricambio";
}
