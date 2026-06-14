import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function toBulletModificaRiga(lines: string[]): string {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return "—";
  return filtered.map((l) => `• ${l.replace(/^•\s*/, "")}`).join("\n");
}

function sottoScortaDeficit(item: RicambioMagazzino): number {
  return Math.max(0, item.scortaMinima - item.scorta);
}

/** Converte un ricambio sotto scorta in voce messaggio (stile log modifiche). */
export function toMagazzinoSottoScortaLogViewModel(item: RicambioMagazzino): GestionaleLogViewModel {
  const oggetto = item.descrizione?.trim() || "Ricambio sotto scorta";
  const lines: string[] = [];
  if (item.marca?.trim()) lines.push(`Marca: ${item.marca.trim()}`);
  const codice = item.codiceFornitoreOriginale?.trim();
  if (codice) lines.push(`Codice: ${codice}`);
  lines.push(`Scorta: ${item.scorta} (min. ${item.scortaMinima})`);
  const deficit = sottoScortaDeficit(item);
  if (deficit > 0) lines.push(`Mancano ${deficit} unità`);

  return {
    tone: "update",
    tipoRiga: "SOTTO SCORTA",
    oggettoRiga: oggetto,
    modificaRiga: toBulletModificaRiga(lines),
    autore: item.autoreUltimaModifica?.trim() || "Sistema",
    atIso: item.dataUltimaModifica?.trim() || new Date().toISOString(),
  };
}
