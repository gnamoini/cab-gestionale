import {
  emptyClienteAnagrafica,
  emptyClienteSedeFields,
  type ClienteAnagrafica,
  type ClienteContatto,
  type ClienteContattoTipo,
  type ClienteSedeFields,
  type ClienteSedeTipo,
} from "@/lib/clienti/clienti-anagrafica-types";
import { syncSedeLegaleFromOperativa } from "@/lib/clienti/clienti-sede-sync";
import type {
  ClienteAnagraficaRow,
  ClienteContattoRow,
  ClienteSedeRow,
} from "@/src/types/supabase-tables";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function sedeFieldsFromRow(row: ClienteSedeRow | undefined): ClienteSedeFields {
  if (!row) return emptyClienteSedeFields();
  return {
    via: str(row.via),
    numeroCivico: str(row.numero_civico),
    cap: str(row.cap),
    citta: str(row.citta),
    provincia: str(row.provincia),
    stato: str(row.stato) || "IT",
  };
}

function sedeRowToFields(rows: readonly ClienteSedeRow[], tipo: ClienteSedeTipo): ClienteSedeFields {
  return sedeFieldsFromRow(rows.find((r) => r.tipo === tipo));
}

export function clienteAnagraficaRowsToUi(
  header: ClienteAnagraficaRow,
  sedi: readonly ClienteSedeRow[],
  contatti: readonly ClienteContattoRow[],
): ClienteAnagrafica {
  const operativa = sedeRowToFields(sedi, "operativa");
  const legaleStored = sedeRowToFields(sedi, "legale");
  const uguale = header.sede_legale_uguale_operativa === true;
  return {
    id: header.id,
    nomeDisplay: str(header.nome_display),
    entityKey: str(header.entity_key),
    ragioneSociale: str(header.ragione_sociale),
    partitaIva: str(header.partita_iva),
    codiceDestinatario: str(header.codice_destinatario),
    sedeLegaleUgualeOperativa: uguale,
    inListaSettings: header.in_lista_settings !== false,
    note: str(header.note),
    sedi: {
      operativa,
      legale: uguale ? syncSedeLegaleFromOperativa(operativa) : legaleStored,
    },
    contatti: [...contatti]
      .sort((a, b) => a.ordine - b.ordine)
      .map(
        (c): ClienteContatto => ({
          id: c.id,
          etichetta: str(c.etichetta),
          tipo: c.tipo as ClienteContattoTipo,
          valore: str(c.valore),
          ordine: c.ordine,
        }),
      ),
  };
}

export function clienteSedeFieldsToDb(
  clienteId: string,
  tipo: ClienteSedeTipo,
  fields: ClienteSedeFields,
): Omit<ClienteSedeRow, "id" | "created_at" | "updated_at"> {
  return {
    cliente_id: clienteId,
    tipo,
    via: fields.via.trim() || null,
    numero_civico: fields.numeroCivico.trim() || null,
    cap: fields.cap.trim() || null,
    citta: fields.citta.trim() || null,
    provincia: fields.provincia.trim().toUpperCase() || null,
    stato: fields.stato.trim().toUpperCase() || "IT",
  };
}

export function clienteAnagraficaUiToHeaderInsert(
  model: ClienteAnagrafica,
  entityKey: string,
): Omit<ClienteAnagraficaRow, "created_at" | "updated_at" | "updated_by"> {
  return {
    id: model.id || crypto.randomUUID(),
    nome_display: model.nomeDisplay.trim(),
    entity_key: entityKey,
    ragione_sociale: model.ragioneSociale.trim() || null,
    partita_iva: model.partitaIva.trim() || null,
    codice_destinatario: model.codiceDestinatario.trim().toUpperCase() || null,
    sede_legale_uguale_operativa: model.sedeLegaleUgualeOperativa,
    in_lista_settings: model.inListaSettings,
    note: model.note.trim() || null,
    meta: {},
  };
}

export function stubClienteAnagraficaForNome(nomeDisplay: string, entityKey: string): ClienteAnagrafica {
  return emptyClienteAnagrafica(nomeDisplay.trim(), entityKey);
}
