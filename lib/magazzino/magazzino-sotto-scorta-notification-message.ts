import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";

function toBulletModificaRiga(lines: string[]): string {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return "—";
  return filtered.map((l) => `• ${l.replace(/^•\s*/, "")}`).join("\n");
}

/** Converte un ricambio sotto scorta in voce messaggio (stile log modifiche). */
export function toMagazzinoSottoScortaLogViewModel(item: RicambioMagazzino): GestionaleLogViewModel {
  const descrizione = item.descrizione?.trim() || "Ricambio sotto scorta";
  const marca = item.marca?.trim();
  const oggetto = marca ? `${marca} ${descrizione}` : descrizione;
  const lines: string[] = [];
  const codice = ricambioCodiceForUi(item.codiceFornitoreOriginale);
  if (codice) lines.push(`Codice: ${codice}`);
  lines.push(`Scorta: ${item.scorta} (min. ${item.scortaMinima})`);

  return {
    tone: "update",
    tipoRiga: "SOTTO SCORTA",
    oggettoRiga: oggetto,
    modificaRiga: toBulletModificaRiga(lines),
    autore: item.autoreUltimaModifica?.trim() || "Sistema",
    atIso: item.dataUltimaModifica?.trim() || new Date().toISOString(),
  };
}
