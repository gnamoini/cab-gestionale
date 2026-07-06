import {
  composeInterventoContext,
  composeInterventoContextFromBundle,
  composeInterventoContextFromDraft,
  composeInterventoContextFromListRow,
} from "@/lib/domain/intervento-context/build-intervento-context";
import type {
  InterventoContext,
  InterventoDisplay,
} from "@/lib/domain/intervento-context/intervento-context.types";
import { resolveInterventoDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display";
import { schedaIngressoFieldsFromDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { mezzoGestitoFromRow } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow, PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import type {
  LavorazioneSchedeBundle,
  LavorazioneSchedeStore,
  SchedaIngressoFields,
} from "@/types/schede";

export type InterventoCanonicalMode = "ui" | "export" | "write";

export type InterventoCanonicalInputs = {
  lavorazioneRow?: LavorazioneListRow | null;
  schedeStore?: LavorazioneSchedeStore;
  ingressoCampi?: SchedaIngressoFields | null;
  mezzoRow?: MezzoRow | MezzoGestito | null;
  draftFields?: SchedaIngressoFields | null;
  legacyLavorazione?: LavorazioneAttiva | LavorazioneArchiviata | null;
  bundle?: LavorazioneSchedeBundle | null;
};

export type InterventoCanonicalResult = {
  context: InterventoContext;
  display: InterventoDisplay;
  exportFields: SchedaIngressoFields;
};

const SCHEDA_ONLY_KEYS: (keyof SchedaIngressoFields)[] = [
  "dataIngresso",
  "descrizioneAnomalia",
  "noteIntervento",
  "addettoAccettazione",
  "livelloCarburante",
  "tipoAttrezzatura",
  "oreLavoro",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "vin",
  "km",
  "richiedente",
];

function pickSchedaOnlyFields(
  snapshot?: Partial<SchedaIngressoFields> | null,
): Partial<SchedaIngressoFields> {
  if (!snapshot) return {};
  const out: Partial<SchedaIngressoFields> = {};
  for (const key of SCHEDA_ONLY_KEYS) {
    const v = snapshot[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      (out as Record<string, string>)[key] = String(v);
    }
  }
  return out;
}

function mergeExportFields(
  display: InterventoDisplay,
  snapshot?: Partial<SchedaIngressoFields> | null,
): SchedaIngressoFields {
  const schedaOnly = pickSchedaOnlyFields(snapshot);
  return schedaIngressoFieldsFromDisplay(display, { ...snapshot, ...schedaOnly });
}

function buildContext(inputs: InterventoCanonicalInputs): InterventoContext {
  if (inputs.draftFields) {
    return composeInterventoContextFromDraft({
      fields: inputs.draftFields,
      mezzo: (inputs.mezzoRow as MezzoGestito | null) ?? null,
      lavorazioneRow: inputs.lavorazioneRow ?? null,
      legacyLavorazione: inputs.legacyLavorazione ?? null,
    });
  }

  if (inputs.bundle && inputs.legacyLavorazione) {
    const mezzoGestito =
      inputs.mezzoRow && "marca" in inputs.mezzoRow
        ? (inputs.mezzoRow as MezzoGestito)
        : inputs.mezzoRow
          ? mezzoGestitoFromRow(inputs.mezzoRow as MezzoRow)
          : null;
    return composeInterventoContextFromBundle(inputs.bundle.lavorazioneId, inputs.bundle, {
      mezzoGestito,
      legacyLavorazione: inputs.legacyLavorazione,
      lavorazioneRow: inputs.lavorazioneRow ?? null,
      mezzoRow: inputs.mezzoRow as MezzoRow | null,
    });
  }

  if (inputs.lavorazioneRow) {
    return composeInterventoContextFromListRow(inputs.lavorazioneRow, inputs.schedeStore);
  }

  if (inputs.ingressoCampi) {
    return composeInterventoContext({
      lavorazioneId: inputs.bundle?.lavorazioneId ?? "",
      ingressoCampi: inputs.ingressoCampi,
      ingressoSorgente: "generata",
      mezzoRow: inputs.mezzoRow as MezzoRow | null,
      mezzoGestito:
        inputs.mezzoRow && "marca" in inputs.mezzoRow ? (inputs.mezzoRow as MezzoGestito) : null,
    });
  }

  return composeInterventoContext({
    lavorazioneId: "",
    ingressoCampi: null,
    ingressoSorgente: "generata",
    mezzoRow: inputs.mezzoRow as MezzoRow | null,
  });
}

function ingressoSnapshotFromInputs(inputs: InterventoCanonicalInputs): Partial<SchedaIngressoFields> | null {
  if (inputs.ingressoCampi) return inputs.ingressoCampi;
  if (inputs.lavorazioneRow && inputs.schedeStore?.[inputs.lavorazioneRow.id]?.ingresso?.campi) {
    return inputs.schedeStore[inputs.lavorazioneRow.id]!.ingresso!.campi;
  }
  if (inputs.bundle?.ingresso?.campi) return inputs.bundle.ingresso.campi;
  return null;
}

/** Singolo punto canonico read: ui | export | write. */
export function resolveInterventoCanonical(
  mode: InterventoCanonicalMode,
  inputs: InterventoCanonicalInputs,
): InterventoCanonicalResult {
  const context = buildContext(inputs);
  const display = resolveInterventoDisplay(context);
  const snapshot = ingressoSnapshotFromInputs(inputs);

  if (mode === "write") {
    const formFields = inputs.ingressoCampi ?? inputs.draftFields ?? snapshot ?? {};
    return {
      context,
      display,
      exportFields: { ...formFields } as SchedaIngressoFields,
    };
  }

  if (mode === "export") {
    return {
      context,
      display,
      exportFields: mergeExportFields(display, snapshot),
    };
  }

  return {
    context,
    display,
    exportFields: mergeExportFields(display, snapshot),
  };
}

/** Adapter preventivi: lav legacy + bundle + mezzo → inputs canonical. */
export function canonicalInputsFromPreventivoContext(opts: {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  bundle: LavorazioneSchedeBundle;
  mezzo: MezzoGestito | null;
}): InterventoCanonicalInputs {
  const { lav, bundle, mezzo } = opts;
  const statoId =
    "statoId" in lav ? lav.statoId : (lav as LavorazioneArchiviata).statoFinaleId;
  const priorita =
    "priorita" in lav ? lav.priorita : (lav as LavorazioneArchiviata).prioritaFinale;

  const listRow = {
    id: lav.id,
    codice: lav.codice ?? null,
    mezzo_id: mezzo?.id ?? ("mezzoId" in lav ? lav.mezzoId : null) ?? null,
    stato: statoId as StatoLavorazione,
    priorita: priorita as PrioritaLavorazione,
    data_ingresso: lav.dataIngresso || null,
    note: lav.noteInterne || null,
    mezzo: mezzo ? ({ id: mezzo.id } as MezzoRow) : null,
  } as LavorazioneListRow;

  const schedeStore: LavorazioneSchedeStore = {
    [lav.id]: bundle,
  };

  return {
    lavorazioneRow: listRow,
    schedeStore,
    legacyLavorazione: lav,
    bundle,
    mezzoRow: mezzo,
    ingressoCampi: bundle.ingresso?.campi ?? null,
  };
}
