"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GestionaleCollapsibleSection } from "@/components/design-system";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useOfficinaProfiloOperativo } from "@/lib/officina/use-officina-profilo-operativo";
import {
  isPreventivoEditorDirty,
  normalizePreventivoEditorRecord,
} from "@/lib/preventivi/preventivo-editor-dirty";
import { RICAMBIO_UNITA_MISURA_DEFAULT } from "@/lib/magazzino/ricambio-unita-misura";
import { ensurePreventivoStruttura, partitionRigheRicambi } from "@/lib/preventivi/preventivi-struttura";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import {
  PREVENTIVO_RIGA_MATERIALI_ID,
} from "@/lib/preventivi/preventivi-voci-standard";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { appendPreventiviChangeLog } from "@/lib/preventivi/preventivi-change-log-storage";
import { persistPreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { maybeRecordLearningOnSave } from "@/lib/preventivi/trasforma-descrizione";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import { regeneratePreventivoDescription } from "@/lib/preventivi/regenerate-preventivo-description";
import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import {
  PREVENTIVO_TIPI_DOCUMENTO,
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoTipoDocumento } from "@/lib/preventivi/types";
import {
  dsInput,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";
import {
  preventivoEditorActionBtn,
  preventivoEditorBody,
  preventivoEditorFooterBtnNeutral,
  preventivoEditorFooterBtnPrimary,
  preventivoEditorHint,
  preventivoEditorSubsectionTitle,
} from "@/components/preventivi/preventivo-editor-ui";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import {
  anagraficaFromMezzo,
  applyAnagraficaPatchToPreventivo,
  preventivoToSchedaIngressoSlice,
  schedaIngressoSliceToPreventivoPatch,
} from "@/lib/preventivi/preventivo-anagrafica-map";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import type { SchedaIngressoFields } from "@/types/schede";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import { PDF_PREVENTIVO_IVA_PERCENT } from "@/lib/pdf/preventivo-pdf-layout";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { DdtDetailDrawer } from "@/components/ddt/ddt-detail-drawer";
import { DdtPreventivoPanel } from "@/components/ddt/ddt-preventivo-panel";
import { buildDdtDraftFromPreventivoAuto } from "@/lib/ddt/preventivo-to-ddt-draft";
import type { DdtDetail } from "@/lib/ddt/types";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { usePreventivoDdtIndex } from "@/src/hooks/gestionale/use-ddt-query";
import { usePermissions } from "@/src/hooks/use-permissions";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dateInputValueToIso, isoToDateInputValue } from "@/lib/lavorazioni/date-day-only";
import { PreventivoLavorazioniEditorSection } from "@/components/preventivi/preventivo-lavorazioni-editor-section";
import { PreventivoRicambiEditorSection } from "@/components/preventivi/preventivo-ricambi-editor-section";
import { PreventivoRiepilogoNoteSection } from "@/components/preventivi/preventivo-riepilogo-note-section";

function cloneRecord(p: PreventivoRecord): PreventivoRecord {
  return JSON.parse(JSON.stringify(p)) as PreventivoRecord;
}

const ORE_MIN = 0.01;

const preventivoIntestazioneSegmentWrap = `${dsSegmentedWrap} w-full gap-0.5 p-0.5`;
const preventivoIntestazioneSegmentOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-2.5 py-1 text-xs max-sm:min-h-11 max-sm:py-2`;
const preventivoIntestazioneSegmentOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-2.5 py-1 text-xs max-sm:min-h-11 max-sm:py-2`;
const emptySchedaIngressoFields: SchedaIngressoFields = {
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
  noteIntervento: "",
};

function sumOreRigheAddetti(righe: readonly { ore: number }[]): number {
  const sum = righe.reduce((s, x) => s + (Number.isFinite(x.ore) ? x.ore : 0), 0);
  return Math.max(ORE_MIN, Math.round(sum * 100) / 100);
}

function buildDescCtxFromPreventivo(
  draft: PreventivoRecord,
  allRecords: readonly PreventivoRecord[],
): DescrizionePreventivoContext {
  return {
    lavorazioneId: draft.lavorazioneId,
    cliente: draft.cliente,
    targa: draft.targa,
    matricola: draft.matricola,
    marcaAttrezzatura: draft.marcaAttrezzatura,
    modelloAttrezzatura: draft.modelloAttrezzatura,
    macchinaRiassunto: draft.macchinaRiassunto,
    codiciRicambi: draft.righeRicambi.map((r) => r.codiceOE).filter((c) => c && c !== "—"),
    existingPreventiviRecords: allRecords,
  };
}

export function PreventiviEditorModal({
  open,
  record,
  isNew,
  isRollbackDraft = false,
  autore,
  allRecords,
  onClose,
  onSaved,
  onSaveError,
}: {
  open: boolean;
  record: PreventivoRecord | null;
  isNew: boolean;
  isRollbackDraft?: boolean;
  autore: string;
  allRecords: readonly PreventivoRecord[];
  onClose: () => void;
  onSaved: () => void;
  onSaveError?: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const baselineRef = useRef<PreventivoRecord | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const submitLock = useSubmitLock();
  const draftRef = useRef<PreventivoRecord | null>(null);
  const [draft, setDraft] = useState<PreventivoRecord | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const [ddtDrawer, setDdtDrawer] = useState<{ open: boolean; detail: DdtDetail | null }>({ open: false, detail: null });
  const [ddtBusy, setDdtBusy] = useState(false);
  const [descRegenBusy, setDescRegenBusy] = useState(false);
  const prevPerms = usePermissions("preventivi");
  const profilo = useOfficinaProfiloOperativo();
  const toast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const preventivoId = record?.id ?? "";
  const { getDdtForPreventivo, refetch: refetchDdtIndex, isLoading: ddtIndexLoading } = usePreventivoDdtIndex(
    preventivoId ? [preventivoId] : [],
    open && !isNew && Boolean(preventivoId),
  );
  const activeDdt = preventivoId ? getDdtForPreventivo(preventivoId) : null;
  const dataCreazioneFieldId = useId();
  const lavorazioniFieldId = useId();
  const costoOrarioFieldId = useId();
  const noteFieldId = useId();

  const applyTotals = useCallback((d: PreventivoRecord): PreventivoRecord => {
    const s = ensurePreventivoStruttura(d);
    return { ...s, ...calcolaTotaliPreventivo(s) };
  }, []);

  const normalizeEditorRecord = useCallback(
    (d: PreventivoRecord): PreventivoRecord => normalizePreventivoEditorRecord(d, profilo),
    [profilo],
  );

  useEffect(() => {
    if (!open || !record) {
      setDraft(null);
      baselineRef.current = null;
      draftRef.current = null;
      setUnsavedExitOpen(false);
      return;
    }
    const c = normalizeEditorRecord(cloneRecord(record));
    baselineRef.current = normalizeEditorRecord(cloneRecord(record));
    draftRef.current = c;
    setDraft(c);
  }, [open, record, normalizeEditorRecord]);

  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const { data: settingsPayload } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const appSettings = settingsPayload?.resolved;

  const prefsAtt = useMemo(
    () => migrateMezziListePrefs(appSettings?.mezziListe ?? createMezziListePrefsDefault()),
    [appSettings?.mezziListe, open],
  );

  const totals = useMemo(() => {
    if (!draft) {
      return { totaleRicambi: 0, totaleManodopera: 0, totaleSmaltimento: 0, totaleFinale: 0 };
    }
    return calcolaTotaliPreventivo(draft);
  }, [draft]);

  const economicsPreview = useMemo(() => {
    const netto = totals.totaleFinale;
    const importoIva = Math.round(netto * (PDF_PREVENTIVO_IVA_PERCENT / 100) * 100) / 100;
    const totaleConIva = Math.round((netto + importoIva) * 100) / 100;
    return { netto, importoIva, totaleConIva };
  }, [totals.totaleFinale]);

  const ricambiPart = useMemo(
    () => (draft ? partitionRigheRicambi(draft.righeRicambi) : { standard: [], materialiConsumo: null }),
    [draft],
  );

  const isDirty = useMemo(() => {
    const cur = draft;
    const base = baselineRef.current;
    if (!cur || !base) return false;
    return isPreventivoEditorDirty(normalizeEditorRecord(cur), normalizeEditorRecord(base));
  }, [draft, normalizeEditorRecord]);

  const mezziListQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const mezziCatalog = mezziListQ.data ?? [];

  const anagraficaFields = useMemo(
    () => (draft ? preventivoToSchedaIngressoSlice(draft) : null),
    [draft],
  );

  const setAnagraficaFields = useCallback(
    (next: SchedaIngressoFields) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const anagPatch = schedaIngressoSliceToPreventivoPatch(next);
        return applyTotals(applyAnagraficaPatchToPreventivo(prev, anagPatch));
      });
    },
    [applyTotals],
  );

  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields: anagraficaFields ?? emptySchedaIngressoFields,
    setFields: setAnagraficaFields,
    mezzi: mezziCatalog,
  });

  const openDdtDrawer = useCallback(async (ddtId: string) => {
    const detail = await ddtEntry.getDetail(ddtId);
    if (!detail.success || !detail.data) {
      toast.errorOnce("ddt-detail", detail.error ?? "Impossibile aprire il DDT.");
      return;
    }
    setDdtDrawer({ open: true, detail: detail.data });
  }, [toast]);

  const createOrOpenDdt = useCallback(async () => {
    if (!draft || !preventivoId) return;
    const existing = getDdtForPreventivo(preventivoId);
    if (existing) {
      await openDdtDrawer(existing.id);
      return;
    }
    if (!prevPerms.canWrite) return;
    setDdtBusy(true);
    try {
      const payload = buildDdtDraftFromPreventivoAuto({ preventivo: draft, preventivoId });
      const created = await ddtEntry.createOrReplaceForPreventivo(payload);
      if (!created.success || !created.data) throw new Error(created.error ?? "Creazione DDT non riuscita.");
      await refetchDdtIndex();
      await openDdtDrawer(created.data.id);
      toast.successOnce("ddt-created", "DDT generato.");
    } catch (e) {
      toast.errorOnce("ddt-create", e);
    } finally {
      setDdtBusy(false);
    }
  }, [draft, getDdtForPreventivo, openDdtDrawer, preventivoId, prevPerms.canWrite, refetchDdtIndex, toast]);

  const canRegenerateDescription =
    Boolean(draft?.stato === "bozza" && draft.descrizioneLavorazioniTecnicaSorgente.trim() && prevPerms.canWrite);

  const regenerateDescription = useCallback(() => {
    if (!draft || !canRegenerateDescription) return;
    setDescRegenBusy(true);
    try {
      const ctx = buildDescCtxFromPreventivo(draft, allRecords);
      const seq = (draft.descriptionEngineMeta?.generationSequence ?? 0) + 1;
      const next = regeneratePreventivoDescription(draft, ctx, {
        autore: autore.trim() || "Operatore",
        generationSequence: seq,
      });
      setDraft(applyTotals(next));
      toast.successOnce("desc-regen", "Descrizione rigenerata dalla scheda tecnica.");
    } catch (e) {
      toast.errorOnce("desc-regen", e);
    } finally {
      setDescRegenBusy(false);
    }
  }, [allRecords, applyTotals, autore, canRegenerateDescription, draft, toast]);

  const regenerateDdt = useCallback(async () => {
    if (!draft || !preventivoId || !prevPerms.canWrite) return;
    const ok = await confirm({
      title: "Rigenerare DDT",
      message: "Rigenerare il DDT? Il documento precedente verrà annullato.",
      confirmLabel: "Rigenera",
      destructive: true,
    });
    if (!ok) return;
    setDdtBusy(true);
    try {
      const payload = buildDdtDraftFromPreventivoAuto({ preventivo: draft, preventivoId });
      const created = await ddtEntry.createOrReplaceForPreventivo(payload);
      if (!created.success || !created.data) throw new Error(created.error ?? "Rigenerazione non riuscita.");
      await refetchDdtIndex();
      await openDdtDrawer(created.data.id);
      toast.successOnce("ddt-regen", "DDT rigenerato.");
    } catch (e) {
      toast.errorOnce("ddt-regen", e);
    } finally {
      setDdtBusy(false);
    }
  }, [draft, confirm, openDdtDrawer, preventivoId, prevPerms.canWrite, refetchDdtIndex, toast]);

  const refreshDdtDrawer = useCallback(async () => {
    const detail = ddtDrawer.detail;
    if (!detail) return;
    const next = await ddtEntry.getDetail(detail.document.id);
    if (next.success && next.data) {
      setDdtDrawer((prev) => ({ ...prev, detail: next.data! }));
    }
    void refetchDdtIndex();
  }, [ddtDrawer.detail, refetchDdtIndex]);

  const printDdtPdf = useCallback(async () => {
    if (!activeDdt || ddtBusy) return;
    setDdtBusy(true);
    try {
      const opened = await openPdfArtifact("ddt", { id: activeDdt.id });
      if (opened) {
        await ddtEntry.markStampato(activeDdt.id);
        void refetchDdtIndex();
        if (ddtDrawer.detail?.document.id === activeDdt.id) void refreshDdtDrawer();
      }
    } catch (e) {
      toast.errorOnce("ddt-print", e);
    } finally {
      setDdtBusy(false);
    }
  }, [activeDdt, ddtBusy, ddtDrawer.detail?.document.id, refetchDdtIndex, refreshDdtDrawer, toast]);

  function patchAnagrafica(partial: Partial<SchedaIngressoFields>) {
    if (!draft) return;
    const merged = { ...preventivoToSchedaIngressoSlice(draft), ...partial };
    const anagPatch = schedaIngressoSliceToPreventivoPatch(merged);
    setDraft((prev) => (prev ? applyTotals(applyAnagraficaPatchToPreventivo(prev, anagPatch)) : prev));
    if (partial.cliente !== undefined) applyClienteScontoRighe(partial.cliente);
  }

  function onMezzoPromptMatch(mezzo: Parameters<typeof anagraficaFromMezzo>[0]) {
    mezzoPrompt.requestPrompt(mezzo);
  }

  function requestClose() {
    if (!isDirty) {
      setUnsavedExitOpen(false);
      onClose();
      return;
    }
    setUnsavedExitOpen(true);
  }

  function patch(p: Partial<PreventivoRecord>) {
    setDraft((prev) => (prev ? applyTotals({ ...prev, ...p }) : prev));
  }

  function applyClienteScontoRighe(clienteNome: string) {
    const trimmed = clienteNome.trim();
    if (!trimmed) return;
    const defaultSconto = getScontoRicambiCliente(prefsAtt, trimmed);
    const infer = inferEconomiciClientePreventivi(
      trimmed,
      allRecords,
      draftRef.current?.id,
      defaultSconto,
    );
    setDraft((prev) => {
      if (!prev) return prev;
      const righeRicambi = prev.righeRicambi.map((r) => {
        if ((r.scontoPercent ?? 0) > 0) return r;
        const sconto = infer.scontoRigaForCodice(r.codiceOE);
        return sconto > 0 ? { ...r, scontoPercent: sconto } : r;
      });
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function patchRiga(id: string, patchRow: Partial<PreventivoRigaRicambio>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeRicambi = prev.righeRicambi.map((r) => (r.id === id ? { ...r, ...patchRow } : r));
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function addRiga() {
    setDraft((prev) => {
      if (!prev) return prev;
      const { standard, materialiConsumo } = partitionRigheRicambi(prev.righeRicambi);
      const id = `prr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const nuova: PreventivoRigaRicambio = {
        id,
        ricambioId: null,
        codiceOE: "",
        descrizione: "",
        quantita: 1,
        unitaMisura: RICAMBIO_UNITA_MISURA_DEFAULT,
        prezzoUnitario: 0,
        scontoPercent: 0,
        tipo: "standard",
      };
      const righeRicambi = materialiConsumo ? [...standard, nuova, materialiConsumo] : [...standard, nuova];
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function removeRiga(id: string) {
    if (id === PREVENTIVO_RIGA_MATERIALI_ID) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const { standard, materialiConsumo } = partitionRigheRicambi(prev.righeRicambi);
      const nextStandard = standard.filter((r) => r.id !== id);
      const righeRicambi = materialiConsumo ? [...nextStandard, materialiConsumo] : nextStandard;
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function patchAddettoRow(idx: number, patchRow: { addetto?: string; ore?: number }) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = prev.manodopera.righeAddetti.map((r, i) => (i === idx ? { ...r, ...patchRow } : r));
      const oreTotali = sumOreRigheAddetti(righeAddetti);
      return applyTotals({
        ...prev,
        manodopera: { ...prev.manodopera, righeAddetti, oreTotali },
      });
    });
  }

  function addAddettoRow() {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = [...prev.manodopera.righeAddetti, { addetto: "", ore: 1 }];
      const oreTotali = sumOreRigheAddetti(righeAddetti);
      return applyTotals({ ...prev, manodopera: { ...prev.manodopera, righeAddetti, oreTotali } });
    });
  }

  function removeAddettoRow(idx: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = prev.manodopera.righeAddetti.filter((_, i) => i !== idx);
      if (righeAddetti.length === 0) {
        return applyTotals({
          ...prev,
          manodopera: { ...prev.manodopera, righeAddetti: [{ addetto: "Officina", ore: 1 }], oreTotali: 1 },
        });
      }
      const oreTotali = sumOreRigheAddetti(righeAddetti);
      return applyTotals({ ...prev, manodopera: { ...prev.manodopera, righeAddetti, oreTotali } });
    });
  }

  async function onSalva() {
    await runButtonSubmit(modalRootRef.current, submitLock, () => ({ draft: draftRef.current }), async (snap) => {
    const cur = snap.draft;
    if (!cur) return;
    const now = new Date().toISOString();
    const u = autore.trim() || "Operatore";
    const next = applyTotals({
      ...cur,
      aggiornatoAt: now,
      lastEditedBy: u,
    });
    const baseline = baselineRef.current;
    maybeRecordLearningOnSave(baseline, next);

    const res = await persistPreventivoRecord(next, mezziCatalog, {
      expectedUpdatedAt: !isNew ? baseline?.aggiornatoAt : undefined,
      queryClient,
    });
    if (!res.ok) {
      onSaveError?.(res.error);
      return;
    }

    const saved = res.record;
    if (isNew) {
      appendPreventiviChangeLog({
        tone: "create",
        tipoRiga: "CREAZIONE PREVENTIVO",
        oggettoRiga: `Preventivo ${saved.numero}`,
        modificaRiga: `Cliente: ${saved.cliente || "—"}. Totale ${saved.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €. ${
          saved.lavorazioneId.trim()
            ? `Lavorazione ${saved.lavorazioneId} (${saved.lavorazioneOrigine}).`
            : "Preventivo manuale (nessuna lavorazione collegata)."
        }`,
        autore: u,
        atIso: now,
      });
    } else if (isRollbackDraft) {
      appendPreventiviChangeLog({
        tone: "create",
        tipoRiga: "CREAZIONE PREVENTIVO",
        oggettoRiga: `Preventivo ${saved.numero}`,
        modificaRiga: `Generato da lavorazione ${saved.lavorazioneId} con ${saved.righeRicambi.length} ricambi e ${saved.manodopera.oreTotali} ore manodopera. Cliente: ${saved.cliente || "—"}.`,
        autore: u,
        atIso: now,
      });
    } else {
      const base = baseline;
      const changed =
        !base || JSON.stringify(applyTotals(cloneRecord(base))) !== JSON.stringify(applyTotals(cloneRecord(saved)));
      if (changed) {
        appendPreventiviChangeLog({
          tone: "update",
          tipoRiga: "AGGIORNAMENTO PREVENTIVO",
          oggettoRiga: `Preventivo ${saved.numero}`,
          modificaRiga: "Salvate modifiche a intestazione, righe ricambi/manodopera, totali o note.",
          autore: u,
          atIso: now,
        });
      }
    }
    baselineRef.current = cloneRecord(saved);
    setUnsavedExitOpen(false);
    onSaved();
    onClose();
    });
  }

  if (!open || !draft) return null;

  return (
    <LavorazioniModalShell
      modalSize="analytics"
      modalRootRef={modalRootRef}
      onRequestClose={requestClose}
      title={
        isNew
          ? `Nuovo ${preventivoTipoDocumentoLabel(draft.tipoDocumento).toLowerCase()}`
          : `${preventivoTipoDocumentoLabel(draft.tipoDocumento)} ${draft.numero}`
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <button
            type="button"
            className={preventivoEditorFooterBtnNeutral}
            onClick={() =>
              void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
                openPreventivoPdfInNewTab(applyTotals(draft), autore),
              )
            }
          >
            Anteprima PDF
          </button>
          <button type="button" className={preventivoEditorFooterBtnNeutral} onClick={requestClose}>
            Annulla
          </button>
          <button type="button" className={preventivoEditorFooterBtnPrimary} onClick={onSalva}>
            Salva
          </button>
        </div>
      }
    >
      <MezzoRegistratoIngressoDialog
        open={mezzoPrompt.promptOpen}
        mezzo={mezzoPrompt.promptMezzo}
        onAccept={() => {
          mezzoPrompt.acceptAutofill();
          const cliente = mezzoPrompt.promptMezzo?.cliente?.trim();
          if (cliente) applyClienteScontoRighe(cliente);
        }}
        onDismiss={mezzoPrompt.dismissPrompt}
      />
      <div className={`relative ${gestionaleModalBodyFlexClass}`}>
        <GestionaleModalScrollBody className="py-3">
          <div className="space-y-3">
            <GestionaleCollapsibleSection title="Dati documento" defaultCollapsed={false} variant="form">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Numero">
                    <input className={`${dsInput} tabular-nums`} readOnly value={draft.numero} />
                  </FormField>
                  <FormField label="Tipo documento">
                    <div role="tablist" aria-label="Tipo documento" className={preventivoIntestazioneSegmentWrap}>
                      {PREVENTIVO_TIPI_DOCUMENTO.map((t) => {
                        const active = draft.tipoDocumento === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={active ? preventivoIntestazioneSegmentOn : preventivoIntestazioneSegmentOff}
                            onClick={() => patch({ tipoDocumento: t.id as PreventivoTipoDocumento })}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                  <FormField label="Data creazione" htmlFor={dataCreazioneFieldId}>
                    <GlobalDatePickerYmd
                      id={dataCreazioneFieldId}
                      variant="default"
                      valueYmd={isoToDateInputValue(draft.dataCreazione)}
                      onChangeYmd={(ymd) => {
                        if (!ymd.trim()) return;
                        const r = dateInputValueToIso(ymd);
                        if (r.ok) patch({ dataCreazione: r.iso });
                      }}
                      aria-label="Data creazione"
                    />
                  </FormField>
                </div>

                {draft.lavorazioneId.trim() ? (
                  <div className="space-y-1.5">
                    <h3 className={preventivoEditorSubsectionTitle}>Lavorazione collegata</h3>
                    <p className={preventivoEditorBody}>
                      <span className="font-medium tabular-nums">
                        {lavorazioneDisplayCodice({ id: draft.lavorazioneId })}
                      </span>
                      {draft.lavorazioneOrigine === "storico" ? (
                        <span className={`ml-2 ${preventivoEditorHint}`}>(archivio)</span>
                      ) : null}
                      {draft.macchinaRiassunto.trim() ? (
                        <span className={`mt-1 block ${preventivoEditorHint}`}>{draft.macchinaRiassunto.trim()}</span>
                      ) : null}
                    </p>
                  </div>
                ) : null}
              </div>
            </GestionaleCollapsibleSection>

            {anagraficaFields ? (
              <GestionaleCollapsibleSection title="Scheda ingresso" defaultCollapsed variant="form">
                <SchedaIngressoAnagraficaFields
                  value={anagraficaFields}
                  onPatch={patchAnagrafica}
                  mezzi={mezziCatalog}
                  onExactMezzoMatch={onMezzoPromptMatch}
                  clienteRequired
                />
              </GestionaleCollapsibleSection>
            ) : null}

            <GestionaleCollapsibleSection
              title="Lavorazioni"
              defaultCollapsed={false}
              variant="form"
              action={
                canRegenerateDescription ? (
                  <button
                    type="button"
                    className={preventivoEditorActionBtn}
                    disabled={descRegenBusy}
                    onClick={regenerateDescription}
                  >
                    {descRegenBusy ? "Rigenerazione…" : "Rigenera da scheda"}
                  </button>
                ) : null
              }
            >
              <PreventivoLavorazioniEditorSection
                draft={draft}
                totaleManodopera={totals.totaleManodopera}
                lavorazioniFieldId={lavorazioniFieldId}
                costoOrarioFieldId={costoOrarioFieldId}
                onDescrizioneChange={(descrizioneLavorazioniCliente) => patch({ descrizioneLavorazioniCliente })}
                onCostoOrarioChange={(costoOrario) =>
                  setDraft((prev) =>
                    prev
                      ? applyTotals({
                          ...prev,
                          manodopera: { ...prev.manodopera, costoOrario },
                        })
                      : prev,
                  )
                }
                onCollaudoPrezzoChange={(collaudoPrezzo) => patch({ collaudoPrezzo })}
                onPatchAddettoRow={patchAddettoRow}
                onAddAddettoRow={addAddettoRow}
                onRemoveAddettoRow={removeAddettoRow}
              />
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Ricambi / materiali" defaultCollapsed={false} variant="form">
              <PreventivoRicambiEditorSection
                righe={ricambiPart.standard}
                materialiConsumo={ricambiPart.materialiConsumo}
                totaleRicambi={totals.totaleRicambi}
                onAddRiga={addRiga}
                onPatchRiga={patchRiga}
                onRemoveRiga={removeRiga}
              />
            </GestionaleCollapsibleSection>

            <GestionaleCollapsibleSection title="Riepilogo e note" defaultCollapsed={false} variant="form">
              <PreventivoRiepilogoNoteSection
                totaleSmaltimento={totals.totaleSmaltimento}
                netto={economicsPreview.netto}
                importoIva={economicsPreview.importoIva}
                totaleConIva={economicsPreview.totaleConIva}
                noteFinali={draft.noteFinali}
                noteFieldId={noteFieldId}
                onNoteChange={(noteFinali) => patch({ noteFinali })}
              />
            </GestionaleCollapsibleSection>

            {!isNew && record?.id ? (
              <GestionaleCollapsibleSection title="Documento di trasporto (DDT)" defaultCollapsed variant="form">
                <DdtPreventivoPanel
                  activeDdt={activeDdt}
                  loading={ddtIndexLoading}
                  busy={ddtBusy}
                  canWrite={prevPerms.canWrite}
                  onOpenDrawer={() => {
                    if (activeDdt) void openDdtDrawer(activeDdt.id);
                  }}
                  onGenerate={() => void createOrOpenDdt()}
                  onRegenerate={() => void regenerateDdt()}
                  onPrintPdf={() => void printDdtPdf()}
                />
              </GestionaleCollapsibleSection>
            ) : null}
          </div>
        </GestionaleModalScrollBody>

        <DdtDetailDrawer
          open={ddtDrawer.open}
          detail={ddtDrawer.detail}
          onClose={() => setDdtDrawer({ open: false, detail: null })}
          canWrite={prevPerms.canWrite}
          isAdmin={false}
          canRegenerate={prevPerms.canWrite}
          regenerateBusy={ddtBusy}
          onRegenerate={() => void regenerateDdt()}
          onChanged={() => void refreshDdtDrawer()}
        />

        <GestionaleUnsavedChangesDialog
          open={unsavedExitOpen}
          placement="nested"
          onStay={() => setUnsavedExitOpen(false)}
          onDiscard={() => {
            setUnsavedExitOpen(false);
            onClose();
          }}
          onSaveAndExit={() => {
            onSalva();
          }}
        />
        {confirmDialog}
      </div>
    </LavorazioniModalShell>
  );
}
