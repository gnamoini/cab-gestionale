import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import {
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneMezzoIdentParts,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { buildSearchDocumentFromParts } from "@/lib/search/build-document";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function buildSearchDocumentLavorazione(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  const lav = schedeStore?.[row.id]?.lavorazioni?.campi;
  const ident = lavorazioneMezzoIdentParts(row, schedeStore);

  const lavRigheText =
    lav?.righe
      .flatMap((r) => [r.lavorazioniEffettuate, ...r.addettiAssegnati.map((a) => a.addetto)])
      .join(" ") ?? "";

  return buildSearchDocumentFromParts([
    row.codice,
    row.note,
    row.stato,
    labelLavorazioneStatoDb(row.stato),
    row.priorita,
    row.is_tagliando ? "tagliando" : null,
    row.is_garanzia ? "garanzia" : null,
    lavorazioneMacchinaLabel(row, schedeStore),
    lavorazioneClienteLabel(row, schedeStore),
    ing?.utilizzatore || row.mezzo?.utilizzatore,
    ing?.cantiere,
    ident.targa,
    ident.matricola,
    ident.scuderia,
    ing?.marcaAttrezzatura,
    ing?.modelloAttrezzatura,
    ing?.tipoTelaio,
    ing?.marcaTelaio,
    ing?.modelloTelaio,
    row.mezzo?.marca_telaio,
    row.mezzo?.modello_telaio,
    row.mezzo?.tipo_telaio,
    row.mezzo?.cliente,
    row.mezzo?.targa,
    row.mezzo?.numero_scuderia,
    row.mezzo?.telaio_num,
    ing?.descrizioneAnomalia,
    ing?.addettoAccettazione,
    ing?.richiedente,
    lavRigheText,
    row.data_ingresso,
    row.data_uscita,
  ]);
}
