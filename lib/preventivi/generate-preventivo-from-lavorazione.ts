import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { nextPreventivoNumeroForLavorazione } from "@/lib/preventivi/preventivo-numero-lavorazione";
import { nextPreventivoId } from "@/lib/preventivi/preventivi-records-from-cache";
import { RICAMBIO_UNITA_MISURA_DEFAULT } from "@/lib/magazzino/ricambio-unita-misura";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { PREVENTIVO_TIPO_DOCUMENTO_DEFAULT } from "@/lib/preventivi/preventivi-tipo-documento";
import {
  buildPersistGenerationPayload,
  generatePreventivoDescriptionAsync,
  persistGenerationClient,
  type DescriptionGenerationProgress,
} from "@/lib/preventivi/description-engine";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoManodopera, PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  anagraficaFromSchedaIngresso,
  type PreventivoAnagraficaPatch,
} from "@/lib/preventivi/preventivo-anagrafica-map";
import { assertInterventoExportAlignment } from "@/lib/domain/intervento-context/intervento-export-alignment";
import {
  canonicalInputsFromPreventivoContext,
  resolveInterventoCanonical,
} from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { createAttrezzaturaSnapshot } from "@/lib/domain/mezzo-attrezzatura/create-attrezzatura-snapshot";
import { righeAddettiFromSchedaLavorazioni } from "@/lib/preventivi/righe-addetti-from-scheda-lavorazioni";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";

export async function buildNewPreventivoFromLavorazioneContext(opts: {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  origine: "attiva" | "storico";
  bundle: LavorazioneSchedeBundle;
  mezzo: MezzoGestito | null;
  magazzino: RicambioMagazzino[];
  autore: string;
  existingRecords: readonly PreventivoRecord[];
  onDescriptionProgress?: (progress: DescriptionGenerationProgress) => void;
  descriptionDeps?: import("@/lib/preventivi/description-engine/generate-preventivo-description-async").GeneratePreventivoDescriptionAsyncDeps;
  addettiRecords?: readonly AddettoRecord[];
}): Promise<PreventivoRecord> {
  const { lav, origine, bundle, magazzino, autore, existingRecords } = opts;
  const now = new Date().toISOString();
  const lavScheda = bundle.lavorazioni?.tipo === "lavorazioni" ? bundle.lavorazioni : null;
  const ricScheda = bundle.ricambi?.tipo === "ricambi" ? bundle.ricambi : null;

  const canonicalInputs = canonicalInputsFromPreventivoContext({
    lav,
    bundle,
    mezzo: opts.mezzo,
  });
  const { lavorazioneRow, schedeStore } = canonicalInputs;
  if (!lavorazioneRow) {
    throw new Error("Preventivo da lavorazione richiede row per InterventoContext.");
  }
  const { exportFields } = resolveInterventoCanonical("export", canonicalInputs);
  const anag: PreventivoAnagraficaPatch = anagraficaFromSchedaIngresso(exportFields);
  assertInterventoExportAlignment(lavorazioneRow, schedeStore, { preventivoPatch: anag });
  const targetType =
    lavorazioneRow.target_type ??
    exportFields.targetType ??
    (anag.marcaAttrezzatura.trim() ? "attrezzatura" : "telaio");
  const {
    cliente,
    cantiere,
    utilizzatore,
    macchinaRiassunto,
    targa,
    matricola,
    nScuderia,
    marcaAttrezzatura,
    modelloAttrezzatura,
    tipoAttrezzatura,
    oreLavoro,
    tipoTelaio,
    marcaTelaio,
    modelloTelaio,
    km,
    livelloCarburante,
    richiedente,
  } = anag;

  const codiciRicambi = (ricScheda?.campi.righe ?? []).map((r) => r.codice.trim()).filter(Boolean);
  const descCtx = {
    lavorazioneId: lav.id,
    cliente,
    targa,
    matricola,
    marcaAttrezzatura,
    modelloAttrezzatura,
    macchinaRiassunto,
    codiciRicambi,
    existingPreventiviRecords: existingRecords,
  };

  const preventivoIdPreview = nextPreventivoId();
  const generated = await generatePreventivoDescriptionAsync({
    lavorazioneId: lav.id,
    magazzino,
    lavorazioneNote: lav.note.trim() || undefined,
    ctx: descCtx,
    targetType: targetType === "attrezzatura" ? "attrezzatura" : "telaio",
    tipoAttrezzatura,
    marcaModello: [marcaAttrezzatura, modelloAttrezzatura].filter(Boolean).join(" "),
    onProgress: opts.onDescriptionProgress,
    deps: opts.descriptionDeps,
  });

  const composed = generated.composed;
  const autoCliente = generated.description;
  const technicalBlob = generated.technicalBlob;
  const descriptionGenerationId = composed.meta.generationId;
  const descriptionEngineMeta = composed.meta;

  persistGenerationClient(
    buildPersistGenerationPayload({
      composed,
      preventivoId: preventivoIdPreview,
      lavorazioneId: lav.id,
      createdBy: autore,
    }),
  );

  const righeRicambiRaw: PreventivoRigaRicambio[] = (ricScheda?.campi.righe ?? []).map((r) => {
    const mag = r.ricambioId ? magazzino.find((x) => x.id === r.ricambioId) : undefined;
    const prezzo = mag?.prezzoVendita ?? 0;
    const codiceOE = mag?.codiceFornitoreOriginale?.trim() || r.codice.trim();
    const desc = mag?.descrizione?.trim() || r.ricambioNome.trim();
    const q = Math.max(1, r.quantita || 1);
    return {
      id: `prr-${r.id}`,
      ricambioId: r.ricambioId,
      codiceOE: codiceOE || "—",
      descrizione: desc || "—",
      quantita: q,
      unitaMisura: mag?.unitaMisura ?? RICAMBIO_UNITA_MISURA_DEFAULT,
      prezzoUnitario: Math.round(prezzo * 100) / 100,
      scontoPercent: 0,
    };
  });

  const tuttiPv = existingRecords;
  const mezziListe = migrateMezziListePrefs(getRuntimeCabAppSettings()?.mezziListe ?? createMezziListePrefsDefault());
  const defaultSconto = getScontoRicambiCliente(mezziListe, cliente);
  const infer = inferEconomiciClientePreventivi(cliente, tuttiPv, undefined, defaultSconto);
  const righeRicambi: PreventivoRigaRicambio[] = righeRicambiRaw.map((r) => ({
    ...r,
    scontoPercent: infer.scontoRigaForCodice(r.codiceOE),
  }));

  const addettiRecords =
    opts.addettiRecords ?? getRuntimeCabAppSettings()?.lavorazioni.addettiRecords ?? [];
  const righeAddetti = righeAddettiFromSchedaLavorazioni(lavScheda, addettiRecords);
  const oreTotali = righeAddetti.length
    ? Math.max(0.25, Math.round(righeAddetti.reduce((s, x) => s + x.ore, 0) * 100) / 100)
    : 0.25;

  const manodopera: PreventivoManodopera = {
    oreTotali,
    righeAddetti,
    costoOrario: infer.costoOrario,
    scontoPercent: infer.manodoperaScontoPercent,
  };

  const noteFinali = infer.noteFinaliTipiche;

  const attrezzaturaId = lavorazioneRow.attrezzatura_id ?? exportFields.attrezzaturaId ?? null;
  const attrezzaturaSnapshot =
    targetType === "attrezzatura"
      ? createAttrezzaturaSnapshot({
          id: attrezzaturaId,
          marca: marcaAttrezzatura,
          modello: modelloAttrezzatura,
          matricola,
          tipoAttrezzatura,
        })
      : undefined;

  const draft: PreventivoRecord = {
    id: preventivoIdPreview,
    numero: nextPreventivoNumeroForLavorazione(
      lavorazioneDisplayCodice(lav),
      tuttiPv,
      lav.id,
    ),
    dataCreazione: now,
    aggiornatoAt: now,
    stato: "bozza",
    tipoDocumento: PREVENTIVO_TIPO_DOCUMENTO_DEFAULT,
    lavorazioneId: lav.id,
    lavorazioneOrigine: origine,
    lavorazioneTimestamp: lav.dataIngresso || now,
    cliente,
    cantiere,
    utilizzatore,
    macchinaRiassunto,
    targa,
    matricola,
    nScuderia,
    marcaAttrezzatura,
    modelloAttrezzatura,
    tipoAttrezzatura,
    oreLavoro,
    tipoTelaio,
    marcaTelaio,
    modelloTelaio,
    km,
    livelloCarburante,
    richiedente,
    targetType,
    attrezzaturaId,
    attrezzaturaMarca: marcaAttrezzatura,
    attrezzaturaModello: modelloAttrezzatura,
    attrezzaturaMatricola: matricola,
    attrezzaturaSnapshot,
    descrizioneLavorazioniCliente: autoCliente,
    descrizioneLavorazioniTecnicaSorgente: technicalBlob,
    descrizioneGenerataAuto: autoCliente,
    descriptionGenerationId,
    descriptionEngineMeta,
    righeRicambi,
    manodopera,
    sanificazionePrezzo: 0,
    collaudoPrezzo: 0,
    noteFinali,
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleSmaltimento: 0,
    totaleFinale: 0,
    createdBy: autore,
    lastEditedBy: autore,
  };
  const strutturato = ensurePreventivoStruttura(draft);
  const withTotals = { ...strutturato, ...calcolaTotaliPreventivo(strutturato) };
  if (opts.mezzo?.id) {
    withTotals.mezzoId = opts.mezzo.id;
  }
  return withTotals;
}

export { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
