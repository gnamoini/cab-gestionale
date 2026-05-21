import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** Cliente — attrezzatura (marca e modello uniti, come in tabella) per titolo voce log. */
export function formatLavorazioneLogOggettoLabel(opts: {
  cliente?: string | null;
  marca?: string | null;
  modello?: string | null;
  tipoAttrezzatura?: string | null;
}): string {
  const cliente = formatTitleCasePhrase((opts.cliente ?? "").trim());
  const marcaModello = [formatTitleCasePhrase((opts.marca ?? "").trim()), formatTitleCasePhrase((opts.modello ?? "").trim())]
    .filter((p) => p && p !== "—")
    .join(" ");
  const attrezzatura =
    marcaModello || formatTitleCasePhrase((opts.tipoAttrezzatura ?? "").trim());
  const parts = [cliente, attrezzatura].filter((p) => p && p !== "—");
  return parts.length ? parts.join(" — ") : "—";
}

export function lavorazioneLogOggettoFromMezzo(mezzo: MezzoRow | null | undefined): string {
  if (!mezzo) return "—";
  return formatLavorazioneLogOggettoLabel({
    cliente: mezzo.cliente,
    marca: mezzo.marca,
    modello: mezzo.modello,
    tipoAttrezzatura: mezzo.tipo_attrezzatura,
  });
}

export function lavorazioneLogOggettoFromListRow(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  return formatLavorazioneLogOggettoLabel({
    cliente: ing?.cliente?.trim() || row.mezzo?.cliente,
    marca: ing?.marcaAttrezzatura?.trim() || row.mezzo?.marca,
    modello: ing?.modelloAttrezzatura?.trim() || row.mezzo?.modello,
    tipoAttrezzatura: ing?.tipoAttrezzatura?.trim() || row.mezzo?.tipo_attrezzatura,
  });
}
