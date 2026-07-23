import {
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";

export function captureSchedaTipoLabel(tipo: SchedaTipo): string {
  switch (tipo) {
    case "ingresso":
      return SCHEDA_INGRESSO_LABEL;
    case "lavorazioni":
      return SCHEDA_LAVORAZIONI_LABEL;
    case "ricambi":
      return SCHEDA_RICAMBI_LABEL;
    default:
      return `Scheda ${tipo}`;
  }
}

export function lavorazioneHasExistingScheda(
  store: LavorazioneSchedeStore,
  lavorazioneId: string,
  tipo: SchedaTipo,
): boolean {
  const id = lavorazioneId.trim();
  if (!id) return false;
  const bundle = store[id];
  if (!bundle) return false;
  switch (tipo) {
    case "ingresso":
      return bundle.ingresso != null;
    case "lavorazioni":
      return bundle.lavorazioni != null;
    case "ricambi":
      return bundle.ricambi != null;
    default:
      return false;
  }
}
