export type ListinoColumnMap = {
  codiceColumn: number | null;
  descrizioneColumn: number | null;
  costoColumn: number | null;
  marcaColumn: number | null;
  headerRowIndex: number;
  dataStartRowIndex: number;
  confident: boolean;
};

const CODICE_PATTERNS = [
  /^cod(ice)?(\s*(oe|fornitore|articolo|parte|ricambio))?$/i,
  /^part(\s*(no|number|\.?\s*#))?$/i,
  /^ref(erence)?$/i,
  /^sku$/i,
  /^n\.?\s*art\.?$/i,
];

const DESCR_PATTERNS = [
  /^desc(rizione)?$/i,
  /^description$/i,
  /^nome$/i,
  /^articolo$/i,
  /^designazione$/i,
  /^prodotto$/i,
  /^denominazione$/i,
];

const COSTO_PATTERNS = [
  /^prezzo(\s*(listino|unitario|netto|lordo))?(\s*eur)?$/i,
  /^listino(\s*eur)?$/i,
  /^price$/i,
  /^costo$/i,
  /^importo$/i,
  /^eur(o)?$/i,
  /^€$/i,
  /^price$/i,
];

const MARCA_PATTERNS = [/^marca$/i, /^brand$/i, /^fornitore$/i, /^produttore$/i];

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function matchColumn(headers: string[], patterns: RegExp[]): number | null {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (!h) continue;
    if (patterns.some((p) => p.test(h))) return i;
  }
  return null;
}

function findHeaderRow(matrix: unknown[][]): number {
  for (let r = 0; r < Math.min(matrix.length, 20); r += 1) {
    const row = matrix[r] ?? [];
    const nonEmpty = row.filter((c) => normalizeHeader(c).length > 0).length;
    if (nonEmpty >= 2) return r;
  }
  return 0;
}

/** Heuristiche IT/EN per mappare colonne listino tabellare. */
export function detectListinoColumnMap(matrix: unknown[][]): ListinoColumnMap {
  const headerRowIndex = findHeaderRow(matrix);
  const headers = (matrix[headerRowIndex] ?? []).map(normalizeHeader);

  const codiceColumn = matchColumn(headers, CODICE_PATTERNS);
  const descrizioneColumn = matchColumn(headers, DESCR_PATTERNS);
  const costoColumn = matchColumn(headers, COSTO_PATTERNS);
  const marcaColumn = matchColumn(headers, MARCA_PATTERNS);

  const confident = codiceColumn != null && descrizioneColumn != null && costoColumn != null;

  return {
    codiceColumn,
    descrizioneColumn,
    costoColumn,
    marcaColumn,
    headerRowIndex,
    dataStartRowIndex: headerRowIndex + 1,
    confident,
  };
}

export function applyListinoColumnMap(
  matrix: unknown[][],
  map: Pick<
    ListinoColumnMap,
    "codiceColumn" | "descrizioneColumn" | "costoColumn" | "marcaColumn" | "dataStartRowIndex"
  >,
): Array<{ codice: string; descrizione: string; costo: number; marca?: string }> {
  const rows: Array<{ codice: string; descrizione: string; costo: number; marca?: string }> = [];
  if (map.codiceColumn == null || map.descrizioneColumn == null || map.costoColumn == null) return rows;

  for (let r = map.dataStartRowIndex; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const codice = normalizeHeader(row[map.codiceColumn]);
    const descrizione = normalizeHeader(row[map.descrizioneColumn]);
    const costoRaw = row[map.costoColumn];
    const costo =
      typeof costoRaw === "number"
        ? costoRaw
        : Number.parseFloat(String(costoRaw ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
    const marca =
      map.marcaColumn != null ? normalizeHeader(row[map.marcaColumn]) || undefined : undefined;

    if (!codice && !descrizione) continue;
    if (!codice || !descrizione || !Number.isFinite(costo) || costo < 0) continue;

    rows.push({ codice, descrizione, costo, marca });
  }

  return rows;
}
