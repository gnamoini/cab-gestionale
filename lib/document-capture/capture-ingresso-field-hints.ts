import {
  captureCatalogWarningsByFieldKey,
  validateCaptureFieldsAgainstCatalogs,
  type CaptureCatalogValidationInput,
} from "@/lib/document-capture/capture-catalog-validation";
import {
  formatCaptureReviewDisplayValue,
  formatCaptureReviewDraftValue,
} from "@/lib/document-capture/capture-field-display-value";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { mapCaptureFieldsToIngresso } from "@/lib/document-capture/capture-field-mapper";
import { sortCaptureReviewFields } from "@/lib/document-capture/capture-field-review-order";
import { buildClientResolutionContext } from "@/lib/entity-resolution/build-client-resolution-context";
import type { EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";
import { resolveCaptureGraph } from "@/lib/entity-resolution/resolve-capture-graph";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

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
  note: "noteIntervento",
  note_intervento: "noteIntervento",
  noteintervento: "noteIntervento",
  firma_richiedente: "richiedenteFirma",
  richiedente_firma: "richiedenteFirma",
  firma_autista: "richiedenteFirma",
  firma_addetto: "addettoFirma",
  addetto_firma: "addettoFirma",
  firma_addetto_officina: "addettoFirma",
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

function fieldRawValue(row: CaptureFieldRow): string {
  const ext = row as CaptureFieldRow & { raw_value?: string | null };
  return safeTrim(ext.raw_value) || safeTrim(row.confirmed_value) || safeTrim(row.normalized_value);
}

export type CaptureIngressoCompileData = {
  fieldRows: CaptureFieldRow[];
  fields: SchedaIngressoFields;
  hints: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>;
  resolutionByCaptureKey: Record<string, EntityResolutionResult>;
  ambiguousCaptureKeys: string[];
  reviewCount: number;
};

export async function buildCaptureIngressoCompileData(input: {
  captureId: string;
  fieldRows: readonly CaptureFieldRow[];
  sharedGlobalOpts: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  mezzi?: readonly MezzoGestito[];
  addettiRecords?: readonly AddettoRecord[];
}): Promise<CaptureIngressoCompileData> {
  const rows = sortCaptureReviewFields([...input.fieldRows]);
  const addettiRecords =
    input.addettiRecords ?? input.sharedGlobalOpts.lavorazioni.addettiRecords ?? [];

  const rawByKey: Record<string, string> = {};
  const draftByKey: Record<string, string> = {};
  for (const row of rows) {
    const raw = fieldRawValue(row);
    rawByKey[row.field_key] = raw;
    const ext = row as CaptureFieldRow & { raw_value?: string | null };
    draftByKey[row.field_key] = formatCaptureReviewDisplayValue(
      row.field_key,
      {
        raw: ext.raw_value,
        normalized: row.normalized_value,
        confirmed: row.confirmed_value,
      },
      { addettiRecords },
    );
  }

  const resolutionCtx = buildClientResolutionContext({
    sharedGlobalOpts: input.sharedGlobalOpts,
    magazzino: input.magazzino ?? [],
    mezzi: input.mezzi ?? [],
  });

  const resolutionByCaptureKey: Record<string, EntityResolutionResult> = {};
  if (resolutionCtx) {
    const resolutionInputs = Object.entries(draftByKey)
      .filter(([, v]) => v.trim())
      .map(([field_key, value]) => ({
        field_key,
        raw_value: rawByKey[field_key] ?? value,
        normalized_value: value,
      }));

    const { fields: resolved } = await resolveCaptureGraph(resolutionInputs, resolutionCtx, {
      captureId: input.captureId,
    });

    for (const row of resolved) {
      if (row.resolution.entityType !== "GENERIC") {
        resolutionByCaptureKey[row.field_key] = row.resolution;
      }
    }

    for (const [fieldKey, resolution] of Object.entries(resolutionByCaptureKey)) {
      if (resolution.status === "resolved" && resolution.resolvedLabel) {
        draftByKey[fieldKey] = formatCaptureReviewDraftValue(fieldKey, resolution.resolvedLabel, {
          addettiRecords,
        });
      }
    }
  }

  const mappedRows: CaptureFieldRow[] = rows.map((row) => ({
    ...row,
    confirmed_value: draftByKey[row.field_key] ?? row.confirmed_value,
    normalized_value: draftByKey[row.field_key] ?? row.normalized_value,
  }));

  const fields = mapCaptureFieldsToIngresso(mappedRows, addettiRecords);

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

  for (const row of rows) {
    const ingressoKey = ingressoKeyFromCapture(row.field_key);
    if (!ingressoKey) continue;

    const raw = safeTrim(rawByKey[row.field_key]);
    const resolution = resolutionByCaptureKey[row.field_key];
    const catalogMsg = warningsByCaptureKey.get(row.field_key)?.[0]?.message;
    const current = safeTrim(String(fields[ingressoKey] ?? ""));

    if (resolution?.status === "ambiguous") {
      ambiguousCaptureKeys.push(row.field_key);
      const existing = hints[ingressoKey];
      hints[ingressoKey] = {
        tone: "ambiguous",
        rawOcr: raw || existing?.rawOcr,
        suggestion: existing?.suggestion,
        message: "Più corrispondenze possibili. Scegli il valore corretto.",
        candidates:
          resolution.candidateList?.map((c) => ({ id: c.id, label: c.label })) ?? existing?.candidates,
        captureFieldKey: row.field_key,
      };
      continue;
    }

    if (catalogMsg) {
      hints[ingressoKey] = {
        tone: "catalog",
        rawOcr: raw,
        message: catalogMsg,
        captureFieldKey: row.field_key,
      };
      continue;
    }

    const suggested = resolution?.resolvedLabel?.trim();
    if (
      suggested &&
      raw &&
      safeTrim(suggested).toLowerCase() !== raw.toLowerCase() &&
      safeTrim(suggested).toLowerCase() !== current.toLowerCase()
    ) {
      hints[ingressoKey] = {
        tone: "suggested",
        rawOcr: raw,
        suggestion: suggested,
        captureFieldKey: row.field_key,
      };
      continue;
    }

    if (raw && current && raw.toLowerCase() !== current.toLowerCase()) {
      hints[ingressoKey] = {
        tone: "suggested",
        rawOcr: raw,
        suggestion: current,
        captureFieldKey: row.field_key,
      };
    }
  }

  const reviewCount = Object.values(hints).filter((h) => h.tone !== "ok").length;

  return {
    fieldRows: mappedRows,
    fields,
    hints,
    resolutionByCaptureKey,
    ambiguousCaptureKeys,
    reviewCount,
  };
}

export function countCaptureHintsNeedingReview(
  hints: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>,
): number {
  return Object.values(hints).filter((h) => h.tone === "ambiguous" || h.tone === "catalog" || h.tone === "suggested")
    .length;
}

export function captureAmbiguousItemsFromCompileData(data: CaptureIngressoCompileData): Array<{
  fieldKey: string;
  original: string;
  resolution: EntityResolutionResult;
}> {
  return data.ambiguousCaptureKeys
    .map((fieldKey) => {
      const resolution = data.resolutionByCaptureKey[fieldKey];
      if (!resolution || resolution.status !== "ambiguous") return null;
      const row = data.fieldRows.find((r) => r.field_key === fieldKey);
      if (!row) return null;
      const original = fieldRawValue(row);
      return { fieldKey, original, resolution };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
