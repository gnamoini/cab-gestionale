export type CaptureFieldBinding = {
  fieldKeyPattern: string;
  entityType: import("@/lib/entity-resolution/entity-resolution-types").EntityType;
  parentFieldKeys?: string[];
  hierarchy?: "attrezzature" | "telai";
};

function normFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

export const CAPTURE_FIELD_BINDINGS: CaptureFieldBinding[] = [
  { fieldKeyPattern: "cliente", entityType: "CLIENTE" },
  { fieldKeyPattern: "cantiere", entityType: "CANTIERE", parentFieldKeys: ["cliente"] },
  { fieldKeyPattern: "utilizzatore", entityType: "UTILIZZATORE" },
  { fieldKeyPattern: "marca_attrezzatura", entityType: "MARCA", hierarchy: "attrezzature" },
  { fieldKeyPattern: "marcaattrezzatura", entityType: "MARCA", hierarchy: "attrezzature" },
  { fieldKeyPattern: "attrezzatura_marca", entityType: "MARCA", hierarchy: "attrezzature" },
  {
    fieldKeyPattern: "modello_attrezzatura",
    entityType: "MODELLO",
    parentFieldKeys: ["marca_attrezzatura", "marcaattrezzatura", "attrezzatura_marca"],
    hierarchy: "attrezzature",
  },
  { fieldKeyPattern: "marca_telaio", entityType: "MARCA", hierarchy: "telai" },
  { fieldKeyPattern: "marcatelaio", entityType: "MARCA", hierarchy: "telai" },
  { fieldKeyPattern: "telaio_marca", entityType: "MARCA", hierarchy: "telai" },
  {
    fieldKeyPattern: "modello_telaio",
    entityType: "MODELLO",
    parentFieldKeys: ["marca_telaio", "marcatelaio", "telaio_marca"],
    hierarchy: "telai",
  },
  { fieldKeyPattern: "tipo_attrezzatura", entityType: "TIPO_ATTREZZATURA" },
  { fieldKeyPattern: "tipoattrezzatura", entityType: "TIPO_ATTREZZATURA" },
  { fieldKeyPattern: "attrezzatura", entityType: "TIPO_ATTREZZATURA" },
  { fieldKeyPattern: "tipo_telaio", entityType: "TIPO_TELAIO" },
  { fieldKeyPattern: "tipotelaio", entityType: "TIPO_TELAIO" },
  { fieldKeyPattern: "addetto_accettazione", entityType: "OPERATORE" },
  { fieldKeyPattern: "addettoaccettazione", entityType: "OPERATORE" },
  { fieldKeyPattern: "targa", entityType: "MEZZO_IDENT", parentFieldKeys: ["cliente"] },
  { fieldKeyPattern: "matricola", entityType: "MEZZO_IDENT", parentFieldKeys: ["cliente"] },
  { fieldKeyPattern: "vin", entityType: "MEZZO_IDENT" },
];

export function bindingForFieldKey(fieldKey: string): CaptureFieldBinding | null {
  const k = normFieldKey(fieldKey);
  if (/^riga_(\d+)_codice$/.test(k)) {
    return {
      fieldKeyPattern: "riga_N_codice",
      entityType: "RICAMBIO",
      parentFieldKeys: ["marca_attrezzatura", "modello_attrezzatura", "marcaattrezzatura", "modelloattrezzatura"],
    };
  }
  if (/^riga_(\d+)_nome$/.test(k)) {
    return { fieldKeyPattern: "riga_N_nome", entityType: "OPERATORE" };
  }
  return CAPTURE_FIELD_BINDINGS.find((b) => normFieldKey(b.fieldKeyPattern) === k) ?? null;
}

export function topologicalFieldOrder(fieldKeys: readonly string[]): string[] {
  const keys = [...new Set(fieldKeys)];
  const bindingMap = new Map(keys.map((k) => [k, bindingForFieldKey(k)]));
  const depth = new Map<string, number>();

  function depDepth(key: string, seen = new Set<string>()): number {
    if (depth.has(key)) return depth.get(key)!;
    if (seen.has(key)) return 0;
    seen.add(key);
    const binding = bindingMap.get(key);
    const parents = binding?.parentFieldKeys ?? [];
    const parentKeys = parents
      .map((p) => keys.find((k) => normFieldKey(k) === normFieldKey(p)))
      .filter((k): k is string => Boolean(k));
    const d = parentKeys.length === 0 ? 0 : Math.max(...parentKeys.map((p) => depDepth(p, seen))) + 1;
    depth.set(key, d);
    return d;
  }

  for (const key of keys) depDepth(key);
  return keys.sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || a.localeCompare(b));
}
