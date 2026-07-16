import { findAddettoByStoredName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";

export type CaptureCatalogWarning = {
  fieldKey: string;
  value: string;
  message: string;
};

export type CaptureCatalogValidationInput = {
  fields: readonly { field_key: string; value: string }[];
  addettiRecords: readonly AddettoRecord[];
  mezziListe: MezziListePrefs;
  magazzino: readonly RicambioMagazzino[];
};

function normFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

function safeValue(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizePoolStrings(items: readonly unknown[]): string[] {
  return items
    .map((item) => (typeof item === "string" ? safeValue(item) : ""))
    .filter(Boolean);
}

function safeMezziListe(liste: MezziListePrefs | null | undefined): MezziListePrefs {
  return (
    liste ?? {
      clienti: [],
      utilizzatori: [],
      cantieri: [],
      marche: [],
      modelli: [],
      tipiAttrezzatura: [],
      stati: [],
      tipiTelaio: [],
      telai: [],
    }
  );
}

function rowKind(
  fields: readonly { field_key: string; value: string }[],
  rowIndex: number,
): "lavorazioni" | "ricambi" | null {
  if (
    fieldValueByKey(fields, `riga_${rowIndex}_lavorazione`) ||
    fieldValueByKey(fields, `riga_${rowIndex}_ore`)
  ) {
    return "lavorazioni";
  }
  if (
    fieldValueByKey(fields, `riga_${rowIndex}_codice`) ||
    fieldValueByKey(fields, `riga_${rowIndex}_descrizione`) ||
    fieldValueByKey(fields, `riga_${rowIndex}_qt`) ||
    fieldValueByKey(fields, `riga_${rowIndex}_data`)
  ) {
    return "ricambi";
  }
  return null;
}

function isAddettoFieldKey(
  key: string,
  fields: readonly { field_key: string; value: string }[],
): boolean {
  const k = normFieldKey(key);
  if (k === "addetto_accettazione" || k === "addettoaccettazione") return true;
  const m = k.match(/^riga_(\d+)_nome$/);
  if (!m) return false;
  const idx = Number(m[1]);
  const kind = rowKind(fields, idx);
  return kind !== "ricambi";
}

function isRicambioCodiceFieldKey(key: string): boolean {
  return /^riga_\d+_codice$/.test(normFieldKey(key));
}

function ricambioRowIndex(key: string): number | null {
  const m = normFieldKey(key).match(/^riga_(\d+)_/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function fieldValueByKey(fields: readonly { field_key: string; value: string }[], key: string): string {
  const hit = fields.find((f) => normFieldKey(f.field_key) === normFieldKey(key));
  return safeValue(hit?.value);
}

const SETTINGS_LIST_RULES: ReadonlyArray<{
  keys: readonly string[];
  pool: (liste: MezziListePrefs) => readonly string[];
  label: string;
}> = [
  { keys: ["cliente"], pool: (l) => l.clienti, label: "Cliente" },
  { keys: ["cantiere"], pool: (l) => l.cantieri, label: "Cantiere" },
  { keys: ["utilizzatore"], pool: (l) => l.utilizzatori, label: "Utilizzatore" },
  {
    keys: ["tipo_attrezzatura", "tipoattrezzatura", "attrezzatura"],
    pool: (l) => l.tipiAttrezzatura,
    label: "Tipo attrezzatura",
  },
  {
    keys: ["attrezzatura_marca", "marca_attrezzatura", "marcaattrezzatura"],
    pool: (l) => l.marche,
    label: "Marca attrezzatura",
  },
  {
    keys: ["attrezzatura_modello", "modello_attrezzatura", "modelloattrezzatura"],
    pool: (l) => l.modelli,
    label: "Modello attrezzatura",
  },
  { keys: ["tipo_telaio", "tipotelaio"], pool: (l) => l.tipiTelaio ?? [], label: "Tipo telaio" },
  {
    keys: ["telaio_marca", "marca_telaio", "marcatelaio"],
    pool: (l) => (l.telai ?? []).map((t) => t?.nome ?? ""),
    label: "Marca telaio",
  },
];

function warnSettingsList(
  fieldKey: string,
  value: string,
  mezziListe: MezziListePrefs,
): CaptureCatalogWarning | null {
  const k = normFieldKey(fieldKey);
  const rule = SETTINGS_LIST_RULES.find((r) => r.keys.includes(k));
  if (!rule) return null;
  const pool = normalizePoolStrings(rule.pool(safeMezziListe(mezziListe)));
  if (!value || pool.length === 0) return null;
  if (findExactEntityInPool(value, pool)) return null;
  return {
    fieldKey,
    value,
    message: `${rule.label} non presente nelle impostazioni del gestionale`,
  };
}

function warnAddetto(
  fieldKey: string,
  value: string,
  addettiRecords: readonly AddettoRecord[],
): CaptureCatalogWarning | null {
  if (!value || value === "—") return null;
  if (addettiRecords.length === 0) return null;
  if (findAddettoByStoredName(addettiRecords, value)) return null;
  return {
    fieldKey,
    value,
    message: "Addetto non presente nell'elenco addetti",
  };
}

function warnRicambioCodice(
  fieldKey: string,
  value: string,
  magazzino: readonly RicambioMagazzino[],
): CaptureCatalogWarning | null {
  if (!value) return null;
  if (magazzino.length === 0) return null;
  if (findDuplicateByCodici([...magazzino], value)) return null;
  return {
    fieldKey,
    value,
    message: "Codice ricambio non trovato in magazzino",
  };
}

function warnRicambioNomeSenzaCodice(
  fields: readonly { field_key: string; value: string }[],
  rowIndex: number,
  magazzino: readonly RicambioMagazzino[],
): CaptureCatalogWarning | null {
  if (rowKind(fields, rowIndex) !== "ricambi") return null;
  const codice = fieldValueByKey(fields, `riga_${rowIndex}_codice`);
  if (codice) return null;
  const nome = fieldValueByKey(fields, `riga_${rowIndex}_nome`);
  const descrizione = fieldValueByKey(fields, `riga_${rowIndex}_descrizione`);
  const label = [nome, descrizione].filter(Boolean).join(" — ").trim();
  if (!label || magazzino.length === 0) return null;

  const pool = magazzino.flatMap((r) => {
    const bits = [r.descrizione, r.marca, `${safeValue(r.marca)} ${safeValue(r.descrizione)}`.trim()].map((x) =>
      safeValue(x),
    );
    return bits.filter(Boolean);
  });
  if (findExactEntityInPool(label, pool)) return null;

  const fieldKey = fieldValueByKey(fields, `riga_${rowIndex}_nome`)
    ? `riga_${rowIndex}_nome`
    : `riga_${rowIndex}_descrizione`;
  return {
    fieldKey,
    value: label,
    message: "Ricambio non trovato in magazzino (nessun codice indicato)",
  };
}

/** ponytail: scan O(fields×magazzino) su codici; upgrade = indice codici se serve */
export function validateCaptureFieldsAgainstCatalogs(
  input: CaptureCatalogValidationInput,
): CaptureCatalogWarning[] {
  const fields = input.fields
    .map((f) => ({ field_key: safeValue(f.field_key), value: safeValue(f.value) }))
    .filter((f) => f.field_key && f.value);
  const warnings: CaptureCatalogWarning[] = [];
  const seen = new Set<string>();
  const mezziListe = safeMezziListe(input.mezziListe);
  const addettiRecords = input.addettiRecords ?? [];
  const magazzino = input.magazzino ?? [];

  const push = (w: CaptureCatalogWarning | null) => {
    if (!w) return;
    const id = `${w.fieldKey}::${w.message}`;
    if (seen.has(id)) return;
    seen.add(id);
    warnings.push(w);
  };

  for (const field of fields) {
    const { field_key, value } = field;
    if (isAddettoFieldKey(field_key, fields)) {
      push(warnAddetto(field_key, value, addettiRecords));
      continue;
    }
    if (isRicambioCodiceFieldKey(field_key)) {
      push(warnRicambioCodice(field_key, value, magazzino));
      continue;
    }
    push(warnSettingsList(field_key, value, mezziListe));
  }

  const ricambiRows = new Set<number>();
  for (const field of fields) {
    const idx = ricambioRowIndex(field.field_key);
    if (idx != null) ricambiRows.add(idx);
  }
  for (const idx of ricambiRows) {
    push(warnRicambioNomeSenzaCodice(fields, idx, magazzino));
  }

  return warnings;
}

export function captureCatalogWarningsByFieldKey(
  warnings: readonly CaptureCatalogWarning[],
): Map<string, CaptureCatalogWarning[]> {
  const map = new Map<string, CaptureCatalogWarning[]>();
  for (const w of warnings) {
    const list = map.get(w.fieldKey) ?? [];
    list.push(w);
    map.set(w.fieldKey, list);
  }
  return map;
}
