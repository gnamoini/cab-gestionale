import { mezzoGestitoFromRow } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import {
  auditInterventoContext,
  buildIdentDeltaFromContext,
} from "@/lib/domain/intervento-context/intervento-audit";
import {
  interventoIdentEquals,
  resolveIdentFromLayers,
} from "@/lib/domain/intervento-context/intervento-ident";
import type {
  InterventoContext,
  InterventoContextFetchDeps,
  InterventoContextInputs,
  InterventoIdent,
  InterventoTargetSnapshot,
  InterventoTargetType,
  LavorazioneSnapshot,
  MezzoSnapshot,
  SchedaIngressoSnapshot,
} from "@/lib/domain/intervento-context/intervento-context.types";
import { resolveTargetTypeFromScheda } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { attrezzaturaRowFromEnrichedMezzo, composeMezzoGestitoFromRows, pickAttrezzaturaForContext } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { fetchSchedeBundleForLavorazione } from "@/lib/schede/schede-sync-adapter";
import { lavorazioniService } from "@/src/services/lavorazioni.service";
import { mezziService } from "@/src/services/mezzi.service";
import { fetchAttrezzatureForMezzoIds } from "@/lib/mezzi/mezzi-attrezzature-batch";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

function emptySchedaIngressoFields(): SchedaIngressoFields {
  return {
    targetType: "attrezzatura",
    attrezzaturaId: null,
    interventoSuAttrezzatura: true,
    interventoSuTelaio: false,
    dataIngresso: "",
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "",
    nScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
  };
}

function safeMezzoText(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function mezzoSnapshotFromRow(row: MezzoRow | null | undefined, gestito?: MezzoGestito | null): MezzoSnapshot {
  const g = gestito ?? (row ? mezzoGestitoFromRow(row) : null);
  if (!g) {
    return {
      id: null,
      cliente: "",
      utilizzatore: "",
      marca: "",
      modello: "",
      targa: "",
      matricola: "",
      nScuderia: "",
      tipoAttrezzatura: "",
      cantiere: "",
      present: false,
    };
  }
  return {
    id: g.id,
    cliente: safeMezzoText(g.cliente),
    utilizzatore: safeMezzoText(g.utilizzatore),
    marca: safeMezzoText(g.marca),
    modello: safeMezzoText(g.modello),
    targa: safeMezzoText(g.targa),
    matricola: safeMezzoText(g.matricola),
    nScuderia: safeMezzoText(g.numeroScuderia),
    tipoAttrezzatura: safeMezzoText(g.tipoAttrezzatura),
    cantiere: safeMezzoText(g.cantiere),
    present: true,
  };
}

function lavorazioneSnapshotFromInputs(
  lavorazioneId: string,
  row?: LavorazioneRow | null,
  legacy?: LavorazioneAttiva | LavorazioneArchiviata | null,
): LavorazioneSnapshot {
  return {
    id: lavorazioneId,
    mezzoId:
      row?.mezzo_id?.trim() ||
      (legacy && "mezzoId" in legacy ? legacy.mezzoId?.trim() : null) ||
      null,
    dataIngresso: row?.data_ingresso ?? legacy?.dataIngresso ?? null,
    note: row?.note ?? legacy?.note ?? null,
    targa: legacy?.targa?.trim() ?? "",
    matricola: legacy?.matricola?.trim() ?? "",
    nScuderia: legacy?.nScuderia?.trim() ?? "",
    cliente: legacy?.cliente?.trim() ?? "",
    utilizzatore: legacy?.utilizzatore?.trim() ?? "",
    cantiere: legacy?.cantiere?.trim() ?? "",
  };
}

function schedaIngressoSnapshotFromInputs(
  campi?: SchedaIngressoFields | null,
  sorgente?: "generata" | "file_esterno" | null,
  updatedAt?: string | null,
): SchedaIngressoSnapshot {
  const present = Boolean(campi && sorgente !== "file_esterno");
  return {
    present,
    sorgente: sorgente ?? null,
    updatedAt: updatedAt ?? null,
    campi: present ? { ...campi! } : campi ? { ...campi } : null,
  };
}

function detectIdentMismatch(
  scheda: SchedaIngressoSnapshot,
  mezzo: MezzoSnapshot,
  _ident: InterventoIdent,
): boolean {
  void _ident;
  if (!scheda.present || !mezzo.present || !scheda.campi) return false;
  const fromScheda: InterventoIdent = {
    targa: scheda.campi.targa,
    matricola: scheda.campi.matricola,
    nScuderia: scheda.campi.nScuderia,
  };
  const fromMezzo: InterventoIdent = {
    targa: mezzo.targa,
    matricola: mezzo.matricola,
    nScuderia: mezzo.nScuderia,
  };
  const schedaHasIdent = Boolean(
    (fromScheda.targa?.trim() ?? "") ||
      (fromScheda.matricola?.trim() ?? "") ||
      (fromScheda.nScuderia?.trim() ?? ""),
  );
  const mezzoHasIdent = Boolean(
    (fromMezzo.targa?.trim() ?? "") ||
      (fromMezzo.matricola?.trim() ?? "") ||
      (fromMezzo.nScuderia?.trim() ?? ""),
  );
  if (!schedaHasIdent || !mezzoHasIdent) return false;
  return !interventoIdentEquals(fromScheda, fromMezzo);
}

function targetSnapshotFromInputs(inputs: InterventoContextInputs): InterventoTargetSnapshot {
  const row = inputs.lavorazioneRow;
  const att = inputs.attrezzaturaRow;
  const scheda = inputs.ingressoCampi;
  const targetType: InterventoTargetType =
    row?.target_type ??
    scheda?.targetType ??
    resolveTargetTypeFromScheda({
      targetType: scheda?.targetType,
      marcaAttrezzatura: scheda?.marcaAttrezzatura,
      attrezzaturaId: scheda?.attrezzaturaId,
    });

  if (targetType === "telaio") {
    return {
      targetType: "telaio",
      attrezzatura: { id: null, marca: "", modello: "", matricola: "", present: false },
    };
  }

  const marca =
    att?.marca?.trim() ||
    scheda?.marcaAttrezzatura?.trim() ||
    inputs.mezzoGestito?.marca?.trim() ||
    "";
  const modello =
    att?.modello?.trim() ||
    scheda?.modelloAttrezzatura?.trim() ||
    inputs.mezzoGestito?.modello?.trim() ||
    "";

  return {
    targetType: "attrezzatura",
    attrezzatura: {
      id: row?.attrezzatura_id ?? att?.id ?? scheda?.attrezzaturaId ?? null,
      marca,
      modello,
      matricola:
        att?.matricola?.trim() ||
        scheda?.matricola?.trim() ||
        inputs.mezzoGestito?.matricola?.trim() ||
        "",
      present: Boolean(marca || modello || att?.id),
    },
  };
}

export function composeInterventoContext(inputs: InterventoContextInputs): InterventoContext {
  const lavorazioneId = inputs.lavorazioneId.trim();
  const mezzo = mezzoSnapshotFromRow(inputs.mezzoRow, inputs.mezzoGestito);
  const lavorazione = lavorazioneSnapshotFromInputs(
    lavorazioneId,
    inputs.lavorazioneRow,
    inputs.legacyLavorazione,
  );
  const schedaIngresso = schedaIngressoSnapshotFromInputs(
    inputs.ingressoCampi,
    inputs.ingressoSorgente,
    inputs.ingressoUpdatedAt,
  );

  const schedaIdent = schedaIngresso.present
    ? {
        targa: schedaIngresso.campi?.targa ?? "",
        matricola: schedaIngresso.campi?.matricola ?? "",
        nScuderia: schedaIngresso.campi?.nScuderia ?? "",
      }
    : null;
  const lavIdent = {
    targa: lavorazione.targa,
    matricola: lavorazione.matricola,
    nScuderia: lavorazione.nScuderia,
  };
  const mezzoIdent = mezzo.present
    ? { targa: mezzo.targa, matricola: mezzo.matricola, nScuderia: mezzo.nScuderia }
    : null;

  const ident = resolveIdentFromLayers(schedaIdent, lavIdent, mezzoIdent);

  const ctx: InterventoContext = {
    contextId: lavorazioneId,
    lavorazioneId,
    mezzo,
    lavorazione,
    schedaIngresso,
    ident,
    target: targetSnapshotFromInputs(inputs),
    meta: {
      schedaMissing: !schedaIngresso.present,
      mezzoUnlinked: !lavorazione.mezzoId,
      hasIdentMismatch: detectIdentMismatch(schedaIngresso, mezzo, ident),
    },
  };

  auditInterventoContext(ctx, "build", {
    identDelta: buildIdentDeltaFromContext(ctx),
  });

  return ctx;
}

export function composeInterventoContextFromBundle(
  lavorazioneId: string,
  bundle: LavorazioneSchedeBundle | null | undefined,
  options?: {
    lavorazioneRow?: LavorazioneRow | null;
    mezzoRow?: MezzoRow | null;
    mezzoGestito?: MezzoGestito | null;
    legacyLavorazione?: LavorazioneAttiva | LavorazioneArchiviata | null;
  },
): InterventoContext {
  const ing = bundle?.ingresso ?? null;
  return composeInterventoContext({
    lavorazioneId,
    lavorazioneRow: options?.lavorazioneRow,
    mezzoRow: options?.mezzoRow,
    mezzoGestito: options?.mezzoGestito,
    legacyLavorazione: options?.legacyLavorazione,
    ingressoCampi: ing?.campi ?? null,
    ingressoSorgente: ing?.sorgente ?? null,
    ingressoUpdatedAt: ing?.updatedAt ?? null,
  });
}

export function composeInterventoContextFromListRow(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): InterventoContext {
  const bundle = schedeStore?.[row.id];
  const ing = bundle?.ingresso ?? null;
  const attrezzaturaRow =
    row.attrezzatura_id && row.mezzo
      ? attrezzaturaRowFromEnrichedMezzo(
          row.mezzo,
          row.attrezzatura_id,
          row.mezzo_id ?? row.mezzo.id,
        )
      : null;
  return composeInterventoContext({
    lavorazioneId: row.id,
    lavorazioneRow: row,
    mezzoRow: row.mezzo,
    attrezzaturaRow,
    ingressoCampi: ing?.campi ?? null,
    ingressoSorgente: ing?.sorgente ?? null,
    ingressoUpdatedAt: ing?.updatedAt ?? null,
  });
}

export function composeInterventoContextFromDraft({
  lavorazioneId = "draft",
  fields,
  mezzo,
  lavorazioneRow,
  legacyLavorazione,
}: {
  lavorazioneId?: string;
  fields: SchedaIngressoFields;
  mezzo?: MezzoGestito | null;
  lavorazioneRow?: LavorazioneRow | null;
  legacyLavorazione?: LavorazioneAttiva | LavorazioneArchiviata | null;
}): InterventoContext {
  return composeInterventoContext({
    lavorazioneId,
    lavorazioneRow,
    mezzoGestito: mezzo,
    legacyLavorazione,
    ingressoCampi: { ...fields },
    ingressoSorgente: "generata",
    ingressoUpdatedAt: null,
  });
}

const defaultFetchDeps = (): InterventoContextFetchDeps => ({
  async getLavorazioneById(id) {
    const res = await lavorazioniService.getById(id);
    return res.success ? res.data : null;
  },
  async getMezzoById(id) {
    const res = await mezziService.getById(id);
    return res.success ? res.data : null;
  },
  async fetchAttrezzaturesForMezzo(mezzoId) {
    const sb = getBrowserSupabase();
    return fetchAttrezzatureForMezzoIds(sb, [mezzoId]);
  },
  async fetchSchedeBundle(lavorazioneId) {
    const bundle = await fetchSchedeBundleForLavorazione(lavorazioneId);
    if (!bundle?.ingresso) return { ingresso: null };
    return {
      ingresso: {
        campi: bundle.ingresso.campi,
        sorgente: bundle.ingresso.sorgente,
        updatedAt: bundle.ingresso.updatedAt,
      },
    };
  },
});

export async function fetchInterventoContextInputs(
  lavorazioneId: string,
  deps: InterventoContextFetchDeps = defaultFetchDeps(),
): Promise<InterventoContextInputs> {
  const id = lavorazioneId.trim();
  const lavRow = await deps.getLavorazioneById(id);
  let mezzoRow: MezzoRow | null = null;
  let mezzoGestito: MezzoGestito | null = null;
  let attrezzaturaRow: import("@/src/types/supabase-tables").AttrezzaturaRow | null = null;
  if (lavRow?.mezzo_id?.trim()) {
    const mid = lavRow.mezzo_id.trim();
    mezzoRow = await deps.getMezzoById(mid);
    if (mezzoRow) {
      const attRows = await deps.fetchAttrezzaturesForMezzo(mid);
      attrezzaturaRow = pickAttrezzaturaForContext(attRows, mid, lavRow.attrezzatura_id);
      mezzoGestito = composeMezzoGestitoFromRows(mezzoRow, attrezzaturaRow);
    }
  }
  const bundle = await deps.fetchSchedeBundle(id);
  return {
    lavorazioneId: id,
    lavorazioneRow: lavRow,
    mezzoRow,
    mezzoGestito,
    attrezzaturaRow,
    ingressoCampi: bundle?.ingresso?.campi ?? null,
    ingressoSorgente: bundle?.ingresso?.sorgente ?? null,
    ingressoUpdatedAt: bundle?.ingresso?.updatedAt ?? null,
  };
}

export async function buildInterventoContext(
  lavorazioneId: string,
  deps?: InterventoContextFetchDeps,
): Promise<InterventoContext> {
  const inputs = await fetchInterventoContextInputs(lavorazioneId, deps);
  return composeInterventoContext(inputs);
}

export { emptySchedaIngressoFields };
