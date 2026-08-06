import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import {
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneMezzoIdentParts,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { buildSearchDocumentFromFields } from "@/lib/search/build-document";
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

  return buildSearchDocumentFromFields(
    [
      { kind: "code", value: row.codice },
      { kind: "note", value: row.note },
      { kind: "customer", value: lavorazioneClienteLabel(row, schedeStore) },
      { kind: "customer", value: row.mezzo?.cliente },
      { kind: "customer", value: ing?.utilizzatore || row.mezzo?.utilizzatore },
      { kind: "plate", value: ident.targa },
      { kind: "plate", value: row.mezzo?.targa },
      { kind: "document", value: ident.matricola },
      { kind: "document", value: ident.scuderia },
      { kind: "document", value: row.mezzo?.numero_scuderia },
      { kind: "document", value: row.mezzo?.telaio_num },
      { kind: "brand", value: ing?.marcaAttrezzatura },
      { kind: "model", value: ing?.modelloAttrezzatura },
      { kind: "brand", value: ing?.marcaTelaio },
      { kind: "model", value: ing?.modelloTelaio },
      { kind: "brand", value: row.mezzo?.marca_telaio },
      { kind: "model", value: row.mezzo?.modello_telaio },
      { kind: "description", value: ing?.descrizioneAnomalia },
      { kind: "description", value: lavorazioneMacchinaLabel(row, schedeStore) },
      { kind: "operator", value: ing?.addettoAccettazione },
      { kind: "operator", value: ing?.richiedente },
    ],
    [
      row.stato,
      labelLavorazioneStatoDb(row.stato),
      row.priorita,
      row.is_tagliando ? "tagliando" : null,
      row.is_garanzia ? "garanzia" : null,
      ing?.cantiere,
      ing?.tipoTelaio,
      row.mezzo?.tipo_telaio,
      lavRigheText,
      row.data_ingresso,
      row.data_uscita,
    ],
  );
}
