import {
  captureCatalogWarningsByFieldKey,
  validateCaptureFieldsAgainstCatalogs,
  type CaptureCatalogValidationInput,
} from "@/lib/document-capture/capture-catalog-validation";
import {
  formatCaptureReviewDisplayValue,
} from "@/lib/document-capture/capture-field-display-value";
import { normalizeIngressoCaptureFieldRows } from "@/lib/document-capture/capture-field-key-aliases";
import {
  mapCaptureFieldsToIngresso,
  mapCaptureFieldsToTagliando,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import { sortCaptureReviewFields } from "@/lib/document-capture/capture-field-review-order";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normListSelectValue } from "@/lib/ui/list-select-utils";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";

export type CaptureIngressoFieldHint = {
  tone: "ok" | "suggested" | "ambiguous" | "catalog";
  rawOcr?: string;
  suggestion?: string;
  message?: string;
  candidates?: Array<{ id: string | null; label: string }>;
  captureFieldKey?: string;
};

/** Mappa chiavi capture → campi scheda ingresso (inverso INGRESSO_KEY_MAP). */
const CAPTURE_TO_INGRESSO: Record<string, keyof SchedaIngressoFields> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  data_ingresso: "dataIngresso",
  dataingresso: "dataIngresso",
  tipo_attrezzatura: "tipoAttrezzatura",
  tipoattrezzatura: "tipoAttrezzatura",
  attrezzatura: "tipoAttrezzatura",
  marca_attrezzatura: "marcaAttrezzatura",
  marcaattrezzatura: "marcaAttrezzatura",
  attrezzatura_marca: "marcaAttrezzatura",
  modello_attrezzatura: "modelloAttrezzatura",
  modelloattrezzatura: "modelloAttrezzatura",
  attrezzatura_modello: "modelloAttrezzatura",
  matricola: "matricola",
  attrezzatura_matricola: "matricola",
  n_scuderia: "nScuderia",
  nscuderia: "nScuderia",
  numero_scuderia: "nScuderia",
  ore: "oreLavoro",
  ore_lavoro: "oreLavoro",
  orelavoro: "oreLavoro",
  tipo_telaio: "tipoTelaio",
  tipotelaio: "tipoTelaio",
  marca_telaio: "marcaTelaio",
  marcatelaio: "marcaTelaio",
  telaio_marca: "marcaTelaio",
  modello_telaio: "modelloTelaio",
  modellotelaio: "modelloTelaio",
  telaio_modello: "modelloTelaio",
  targa: "targa",
  vin: "vin",
  numero_vin: "vin",
  telaio_vin: "vin",
  km: "km",
  descrizione_anomalia: "descrizioneAnomalia",
  descrizioneanomalia: "descrizioneAnomalia",
  livello_carburante: "livelloCarburante",
  livellocarburante: "livelloCarburante",
  addetto_accettazione: "addettoAccettazione",
  addettoaccettazione: "addettoAccettazione",
  richiedente: "richiedente",
  telefono: "richiedenteTelefono",
  telefono_richiedente: "richiedenteTelefono",
  richiedentetelefono: "richiedenteTelefono",
};

function normCaptureKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

function ingressoKeyFromCapture(fieldKey: string): keyof SchedaIngressoFields | null {
  return CAPTURE_TO_INGRESSO[normCaptureKey(fieldKey)] ?? null;
}

function safeTrim(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Stesso valore per hint/capture — case, punteggiatura e sigle societarie (cliente). */
export function captureFieldValuesEquivalent(
  a: string,
  b: string,
  options?: { standardizeLegalSuffix?: boolean },
): boolean {
  const left = safeTrim(a);
  const right = safeTrim(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.toLowerCase() === right.toLowerCase()) return true;
  const normOpts = options?.standardizeLegalSuffix ? { standardizeLegalSuffix: true as const } : undefined;
  if (findExactEntityInPool(left, [right], normOpts)) return true;
  return normListSelectValue(left) === normListSelectValue(right);
}

const INGRESSO_SETTINGS_CANON: Partial<
  Record<
    keyof SchedaIngressoFields,
    { pool: (liste: MezziListePrefs) => readonly string[]; standardizeLegalSuffix?: boolean }
  >
> = {
  cliente: { pool: (l) => l.clienti, standardizeLegalSuffix: true },
  cantiere: { pool: (l) => l.cantieri },
  utilizzatore: { pool: (l) => l.utilizzatori },
  tipoAttrezzatura: { pool: (l) => l.tipiAttrezzatura },
  marcaAttrezzatura: { pool: (l) => l.marche },
  modelloAttrezzatura: { pool: (l) => l.modelli },
  tipoTelaio: { pool: (l) => l.tipiTelaio ?? [] },
  marcaTelaio: {
    pool: (l) => (l.telai ?? []).map((t) => safeTrim(t?.nome)).filter(Boolean),
  },
};

function canonicalizeIngressoCatalogFields(
  fields: SchedaIngressoFields,
  mezziListe: MezziListePrefs,
): SchedaIngressoFields {
  const next = { ...fields };
  for (const [key, rule] of Object.entries(INGRESSO_SETTINGS_CANON) as Array<
    [keyof SchedaIngressoFields, (typeof INGRESSO_SETTINGS_CANON)[keyof SchedaIngressoFields]]
  >) {
    if (!rule) continue;
    const raw = safeTrim(String(next[key] ?? ""));
    if (!raw) continue;
    const canon = findExactEntityInPool(raw, rule.pool(mezziListe), {
      standardizeLegalSuffix: rule.standardizeLegalSuffix,
    });
    if (canon) (next[key] as string) = canon;
  }
  return next;
}

function canonicalIngressoLabelFromSettings(
  ingressoKey: keyof SchedaIngressoFields,
  label: string,
  mezziListe: MezziListePrefs,
): string {
  const rule = INGRESSO_SETTINGS_CANON[ingressoKey];
  if (!rule) return label.trim();
  return (
    findExactEntityInPool(label, rule.pool(mezziListe), {
      standardizeLegalSuffix: rule.standardizeLegalSuffix,
    }) ?? label.trim()
  );
}

function fieldRawValue(row: CaptureFieldRow): string {
  const ext = row as CaptureFieldRow & { raw_value?: string | null };
  return safeTrim(ext.raw_value) || safeTrim(row.confirmed_value) || safeTrim(row.normalized_value);
}

export type CaptureIngressoCompileData = {
  fieldRows: CaptureFieldRow[];
  fields: SchedaIngressoFields;
  tagliandoFields: TagliandoLavorazioneFields;
  hints: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>;
  ambiguousCaptureKeys: string[];
  reviewCount: number;
};

function buildDraftMaps(
  rows: readonly CaptureFieldRow[],
  addettiRecords: readonly AddettoRecord[],
): { rawByKey: Record<string, string>; draftByKey: Record<string, string> } {
  const rawByKey: Record<string, string> = {};
  const draftByKey: Record<string, string> = {};
  for (const row of rows) {
    const raw = fieldRawValue(row);
    rawByKey[row.field_key] = raw;
    const ext = row as CaptureFieldRow & { raw_value?: string | null };
    const storedNormalized = safeTrim(row.normalized_value);
    const display = formatCaptureReviewDisplayValue(
      row.field_key,
      {
        raw: ext.raw_value,
        normalized: row.normalized_value,
        confirmed: row.confirmed_value,
        resolvedLabel: storedNormalized || undefined,
      },
      { addettiRecords },
    );
    draftByKey[row.field_key] = storedNormalized || display;
  }
  return { rawByKey, draftByKey };
}

/** Fast path: campi ingresso da SSOT `document_capture_fields` (senza re-resolve). */
export function buildCaptureIngressoCompileDataFast(input: {
  fieldRows: readonly CaptureFieldRow[];
  sharedGlobalOpts: GlobalOptionsSlice;
  addettiRecords?: readonly AddettoRecord[];
}): Pick<CaptureIngressoCompileData, "fieldRows" | "fields" | "tagliandoFields"> {
  const normalizedRows = normalizeIngressoCaptureFieldRows(
    input.fieldRows,
    input.sharedGlobalOpts.mezziListe,
  );
  const rows = sortCaptureReviewFields(normalizedRows);
  const addettiRecords =
    input.addettiRecords ?? input.sharedGlobalOpts.lavorazioni.addettiRecords ?? [];
  const { draftByKey } = buildDraftMaps(rows, addettiRecords);
  const mappedRows: CaptureFieldRow[] = rows.map((row) => ({
    ...row,
    confirmed_value: draftByKey[row.field_key] ?? row.confirmed_value,
    normalized_value: draftByKey[row.field_key] ?? row.normalized_value,
  }));
  const fields = canonicalizeIngressoCatalogFields(
    mapCaptureFieldsToIngresso(mappedRows, addettiRecords),
    input.sharedGlobalOpts.mezziListe,
  );
  const tagliandoFields: TagliandoLavorazioneFields = {
    ...DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
    ...mapCaptureFieldsToTagliando(mappedRows),
  };
  return { fieldRows: mappedRows, fields, tagliandoFields };
}

export async function buildCaptureIngressoCompileHints(input: {
  fieldRows: readonly CaptureFieldRow[];
  fields: SchedaIngressoFields;
  sharedGlobalOpts: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  addettiRecords?: readonly AddettoRecord[];
}): Promise<Pick<CaptureIngressoCompileData, "hints" | "ambiguousCaptureKeys" | "reviewCount">> {
  const addettiRecords =
    input.addettiRecords ?? input.sharedGlobalOpts.lavorazioni.addettiRecords ?? [];
  const { rawByKey, draftByKey } = buildDraftMaps(input.fieldRows, addettiRecords);
  const catalogValidation: CaptureCatalogValidationInput = {
    fields: Object.entries(draftByKey).map(([field_key, value]) => ({ field_key, value })),
    addettiRecords,
    mezziListe: input.sharedGlobalOpts.mezziListe,
    magazzino: input.magazzino ?? [],
  };
  const catalogWarnings = validateCaptureFieldsAgainstCatalogs(catalogValidation);
  const warningsByCaptureKey = captureCatalogWarningsByFieldKey(catalogWarnings);
  const hints: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>> = {};
  const ambiguousCaptureKeys: string[] = [];

  if (!input.fields.dataIngresso.trim()) {
    hints.dataIngresso = {
      tone: "catalog",
      message: "Data ingresso non letta — inserire manualmente.",
      captureFieldKey: "data_ingresso",
    };
  }

  for (const row of input.fieldRows) {
    const ingressoKey = ingressoKeyFromCapture(row.field_key);
    if (!ingressoKey) continue;
    const raw = safeTrim(rawByKey[row.field_key]);
    const catalogMsg = warningsByCaptureKey.get(row.field_key)?.[0]?.message;
    const current = safeTrim(String(input.fields[ingressoKey] ?? ""));
    const storedNormalized = safeTrim(row.normalized_value);
    const equivOpts =
      ingressoKey === "cliente" ? ({ standardizeLegalSuffix: true } as const) : undefined;

    if (catalogMsg) {
      hints[ingressoKey] = {
        tone: "catalog",
        rawOcr: raw,
        message: catalogMsg,
        captureFieldKey: row.field_key,
      };
      continue;
    }

    if (
      storedNormalized &&
      raw &&
      !captureFieldValuesEquivalent(storedNormalized, raw, equivOpts) &&
      !captureFieldValuesEquivalent(storedNormalized, current, equivOpts)
    ) {
      hints[ingressoKey] = {
        tone: "suggested",
        rawOcr: raw,
        suggestion: canonicalIngressoLabelFromSettings(
          ingressoKey,
          storedNormalized,
          input.sharedGlobalOpts.mezziListe,
        ),
        captureFieldKey: row.field_key,
      };
      continue;
    }

    if (raw && current && !captureFieldValuesEquivalent(raw, current, equivOpts)) {
      hints[ingressoKey] = {
        tone: "suggested",
        rawOcr: raw,
        suggestion: current,
        captureFieldKey: row.field_key,
      };
    }
  }

  const reviewCount = Object.values(hints).filter((h) => h.tone !== "ok").length;
  return { hints, ambiguousCaptureKeys, reviewCount };
}

export async function buildCaptureIngressoCompileData(input: {
  captureId: string;
  fieldRows: readonly CaptureFieldRow[];
  sharedGlobalOpts: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  mezzi?: readonly MezzoGestito[];
  addettiRecords?: readonly AddettoRecord[];
}): Promise<CaptureIngressoCompileData> {
  const fast = buildCaptureIngressoCompileDataFast(input);
  const slow = await buildCaptureIngressoCompileHints({
    fieldRows: fast.fieldRows,
    fields: fast.fields,
    sharedGlobalOpts: input.sharedGlobalOpts,
    magazzino: input.magazzino,
    addettiRecords: input.addettiRecords,
  });
  return { ...fast, ...slow };
}

export function countCaptureHintsNeedingReview(
  hints: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>,
): number {
  return Object.values(hints).filter((h) => h.tone === "ambiguous" || h.tone === "catalog" || h.tone === "suggested")
    .length;
}

const INGRESSO_CATALOG_CAPTURE_KEY: Partial<Record<keyof SchedaIngressoFields, string>> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  tipoAttrezzatura: "tipo_attrezzatura",
  marcaAttrezzatura: "marca_attrezzatura",
  modelloAttrezzatura: "modello_attrezzatura",
  tipoTelaio: "tipo_telaio",
  marcaTelaio: "marca_telaio",
  addettoAccettazione: "addetto_accettazione",
};

function catalogWarningsForIngressoValue(
  key: keyof SchedaIngressoFields,
  value: string,
  hint: CaptureIngressoFieldHint,
  catalogInput: CaptureCatalogValidationInput,
) {
  const captureKey = hint.captureFieldKey ?? INGRESSO_CATALOG_CAPTURE_KEY[key];
  if (!captureKey || !value.trim()) return [];
  return validateCaptureFieldsAgainstCatalogs({
    ...catalogInput,
    fields: [{ field_key: captureKey, value: value.trim() }],
  });
}

/** Aggiorna/rimuove hint dopo modifica manuale del campo (es. correzione da lista impostazioni). */
export function reconcileCaptureIngressoHintAfterEdit(
  key: keyof SchedaIngressoFields,
  newValue: string,
  hint: CaptureIngressoFieldHint,
  catalogInput: CaptureCatalogValidationInput,
): CaptureIngressoFieldHint | undefined {
  const trimmed = newValue.trim();

  if (hint.tone === "ambiguous") {
    return isCaptureAmbiguousHintResolved(key, trimmed, hint) ? undefined : hint;
  }

  const catalogWarnings = catalogWarningsForIngressoValue(key, trimmed, hint, catalogInput);

  if (hint.tone === "catalog") {
    return catalogWarnings.length > 0
      ? { ...hint, message: catalogWarnings[0]?.message ?? hint.message }
      : undefined;
  }

  if (hint.tone === "suggested") {
    const suggestion = hint.suggestion?.trim();
    const equivOpts = key === "cliente" ? ({ standardizeLegalSuffix: true } as const) : undefined;
    if (suggestion && captureFieldValuesEquivalent(suggestion, trimmed, equivOpts)) return undefined;
    if (catalogWarnings.length === 0) return undefined;
    return {
      tone: "catalog",
      rawOcr: hint.rawOcr,
      message: catalogWarnings[0]!.message,
      captureFieldKey: hint.captureFieldKey ?? INGRESSO_CATALOG_CAPTURE_KEY[key],
    };
  }

  return hint;
}

/** Ambiguità risolta: candidato scelto o valore diverso dall'OCR (revisione manuale). */
export function isCaptureAmbiguousHintResolved(
  ingressoKey: keyof SchedaIngressoFields,
  value: string,
  hint: CaptureIngressoFieldHint,
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const equivOpts = ingressoKey === "cliente" ? ({ standardizeLegalSuffix: true } as const) : undefined;
  if (hint.candidates?.some((c) => captureFieldValuesEquivalent(c.label, trimmed, equivOpts))) return true;
  const raw = hint.rawOcr?.trim() ?? "";
  if (raw && !captureFieldValuesEquivalent(raw, trimmed, equivOpts)) return true;
  return false;
}
