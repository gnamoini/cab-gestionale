/** Ordine campi in review — allineato alla scheda ingresso / lavorazioni / ricambi blank CAB. */

function normFieldKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/^ingresso\./, "")
    .replace(/^lav\./, "")
    .replace(/^ric\./, "");
}

/** Sequenza scheda ingresso (dall’alto verso il basso sul foglio). */
const INGRESSO_FIELD_ORDER: readonly string[] = [
  "data_ingresso",
  "dataingresso",
  "cliente",
  "cantiere",
  "utilizzatore",
  "tipo_attrezzatura",
  "tipoattrezzatura",
  "attrezzatura",
  "attrezzatura_marca",
  "marca_attrezzatura",
  "marcaattrezzatura",
  "attrezzatura_modello",
  "modello_attrezzatura",
  "modelloattrezzatura",
  "attrezzatura_matricola",
  "matricola",
  "n_scuderia",
  "nscuderia",
  "numero_scuderia",
  "ore",
  "ore_lavoro",
  "orelavoro",
  "ore_lavoro_motore",
  "ore_motore",
  "ore_lavoro_pto",
  "ore_pto",
  "tipo_telaio",
  "tipotelaio",
  "telaio_marca",
  "marca_telaio",
  "marcatelaio",
  "telaio_modello",
  "modello_telaio",
  "modellotelaio",
  "targa",
  "vin",
  "numero_vin",
  "telaio_vin",
  "km",
  "livello_carburante",
  "livellocarburante",
  "descrizione_anomalia",
  "descrizioneanomalia",
  "riparazione",
  "tipo_intervento",
  "tipointervento",
  "tagliando",
  "garanzia",
  "in_garanzia",
  "ingaranzia",
  "recidivo",
  "note",
  "note_intervento",
  "noteintervento",
  "richiedente",
  "telefono",
  "telefono_richiedente",
  "richiedentetelefono",
  "firma_richiedente",
  "firma_addetto",
  "addetto_accettazione",
  "addettoaccettazione",
  "stato_iniziale",
  "priorita",
  "nome",
  "cognome",
];

const RIGHE_HEADER_ORDER: readonly string[] = ["cliente", "targa_matricola", "targamatricola", "targa/matricola"];

const LAVORAZIONI_RIGA_COL_ORDER: readonly string[] = ["lavorazione", "nome", "ore"];
const RICAMBI_RIGA_COL_ORDER: readonly string[] = ["nome", "codice", "descrizione", "qt", "quantita", "data"];

function indexInList(list: readonly string[], norm: string): number {
  const idx = list.indexOf(norm);
  return idx >= 0 ? idx : list.length;
}

function captureFieldSortIndex(key: string, layout: "ingresso" | "righe"): number {
  const norm = normFieldKey(key);

  if (layout === "righe") {
    const headerIdx = indexInList(RIGHE_HEADER_ORDER, norm);
    if (headerIdx < RIGHE_HEADER_ORDER.length) return headerIdx;

    const rigaMatch = norm.match(/^riga_(\d+)_(.+)$/);
    if (rigaMatch) {
      const row = Number.parseInt(rigaMatch[1]!, 10);
      const col = rigaMatch[2]!;
      const colIdx = Math.min(
        indexInList(LAVORAZIONI_RIGA_COL_ORDER, col),
        indexInList(RICAMBI_RIGA_COL_ORDER, col),
      );
      return 100 + row * 20 + colIdx;
    }

    return 9000;
  }

  const ingressoIdx = indexInList(INGRESSO_FIELD_ORDER, norm);
  if (ingressoIdx < INGRESSO_FIELD_ORDER.length) return ingressoIdx;

  const rigaMatch = norm.match(/^riga_(\d+)_(.+)$/);
  if (rigaMatch) {
    const row = Number.parseInt(rigaMatch[1]!, 10);
    const col = rigaMatch[2]!;
    const colIdx = Math.min(
      indexInList(LAVORAZIONI_RIGA_COL_ORDER, col),
      indexInList(RICAMBI_RIGA_COL_ORDER, col),
    );
    return 500 + row * 20 + colIdx;
  }

  return 9000;
}

function detectCaptureReviewLayout(fields: readonly { field_key: string }[]): "ingresso" | "righe" {
  return fields.some((f) => /^riga_\d+_/i.test(normFieldKey(f.field_key))) ? "righe" : "ingresso";
}

export function sortCaptureReviewFields<T extends { field_key: string }>(rows: readonly T[]): T[] {
  const layout = detectCaptureReviewLayout(rows);
  return [...rows].sort((a, b) => {
    const diff = captureFieldSortIndex(a.field_key, layout) - captureFieldSortIndex(b.field_key, layout);
    if (diff !== 0) return diff;
    return a.field_key.localeCompare(b.field_key, "it");
  });
}
