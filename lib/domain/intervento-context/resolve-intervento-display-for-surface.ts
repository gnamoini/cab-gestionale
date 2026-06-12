import type { InterventoDisplay } from "@/lib/domain/intervento-context/intervento-context.types";
import {
  resolveInterventoCanonical,
  type InterventoCanonicalInputs,
} from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { resolveInterventoIdent } from "@/lib/domain/intervento-context/resolve-intervento-display";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type InterventoDisplaySurface = "list" | "hub" | "pdf" | "preventivo" | "draft" | "filter";

export type InterventoDisplaySurfaceInputs = {
  lavorazioneRow?: LavorazioneListRow | null;
  mezzoRow?: MezzoRow | MezzoGestito | null;
  ingressoCampi?: SchedaIngressoFields | null;
  schedeStore?: LavorazioneSchedeStore;
  draftFields?: SchedaIngressoFields | null;
  mezzoIdHint?: string | null;
};

function surfaceToCanonicalMode(surface: InterventoDisplaySurface): "ui" | "export" {
  return surface === "pdf" || surface === "preventivo" ? "export" : "ui";
}

function toCanonicalInputs(inputs: InterventoDisplaySurfaceInputs): InterventoCanonicalInputs {
  return {
    lavorazioneRow: inputs.lavorazioneRow,
    schedeStore: inputs.schedeStore,
    ingressoCampi: inputs.ingressoCampi,
    mezzoRow: inputs.mezzoRow,
    draftFields: inputs.draftFields,
  };
}

/** Read SSOT unificato per surface UI/PDF/preventivi. */
export function resolveInterventoDisplayForSurface(
  surface: InterventoDisplaySurface,
  inputs: InterventoDisplaySurfaceInputs,
): InterventoDisplay {
  return resolveInterventoCanonical(surfaceToCanonicalMode(surface), toCanonicalInputs(inputs)).display;
}

export function resolveInterventoIdentForSurface(
  surface: InterventoDisplaySurface,
  inputs: InterventoDisplaySurfaceInputs,
) {
  void surface;
  const display = resolveInterventoDisplayForSurface(surface, inputs);
  return display.ident;
}

/** Campi flat per PDF / preventivi da display canonico. */
export function schedaIngressoFieldsFromDisplay(
  display: ReturnType<typeof resolveInterventoDisplay>,
  fallback?: Partial<SchedaIngressoFields>,
): SchedaIngressoFields {
  const base = fallback ?? {};
  return {
    dataIngresso: base.dataIngresso ?? "",
    cliente: display.cliente.value || base.cliente || "",
    cantiere: display.cantiere.value || base.cantiere || "",
    utilizzatore: display.utilizzatore.value || base.utilizzatore || "",
    tipoAttrezzatura: base.tipoAttrezzatura ?? "",
    marcaAttrezzatura: display.marcaModello.value.split(" ")[0] ?? base.marcaAttrezzatura ?? "",
    modelloAttrezzatura:
      display.marcaModello.value.split(" ").slice(1).join(" ") || base.modelloAttrezzatura || "",
    matricola: display.matricola.value || base.matricola || "",
    nScuderia: display.nScuderia.value || base.nScuderia || "",
    oreLavoro: base.oreLavoro ?? "",
    tipoTelaio: base.tipoTelaio ?? "",
    marcaTelaio: base.marcaTelaio ?? "",
    modelloTelaio: base.modelloTelaio ?? "",
    targa: display.targa.value || base.targa || "",
    km: base.km ?? "",
    descrizioneAnomalia: base.descrizioneAnomalia ?? "",
    livelloCarburante: base.livelloCarburante ?? "",
    addettoAccettazione: base.addettoAccettazione ?? "",
    richiedente: base.richiedente ?? "",
    noteIntervento: base.noteIntervento ?? "",
  };
}
