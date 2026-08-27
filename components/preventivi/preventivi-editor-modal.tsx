"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GestionaleCollapsibleSection,
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
  LoadingFormSkeleton,
  gestionaleModalFooterCancelBtnClass,
} from "@/components/design-system";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
import { usePwaUpdateGuard } from "@/lib/pwa/pwa-update-guard";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useOfficinaProfiloOperativo } from "@/lib/officina/use-officina-profilo-operativo";
import { isPreventivoEditableByStaff } from "@/lib/preventivi/preventivo-edit-lock";
import {
  isPreventivoEditorDirty,
  normalizePreventivoEditorRecord,
} from "@/lib/preventivi/preventivo-editor-dirty";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { RICAMBIO_UNITA_MISURA_DEFAULT } from "@/lib/magazzino/ricambio-unita-misura";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ensurePreventivoStruttura, partitionRigheRicambi } from "@/lib/preventivi/preventivi-struttura";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import {
  PREVENTIVO_RIGA_MATERIALI_ID,
} from "@/lib/preventivi/preventivi-voci-standard";
import { openPreventivoPdfPreviewFromRecord } from "@/lib/preventivi/preventivi-pdf";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { persistPreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { useMezziListQuery, useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { maybeRecordLearningOnSave } from "@/lib/preventivi/trasforma-descrizione";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import { regeneratePreventivoDescription } from "@/lib/preventivi/regenerate-preventivo-description";
import { normalizePreventivoRigaAddettoWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import type { PreventivoRecord, PreventivoRigaAddetto, PreventivoRigaRicambio } from "@/lib/preventivi/types";
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
  preventivoEditorHint,
} from "@/components/preventivi/preventivo-editor-ui";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import {
  applyAnagraficaPatchToPreventivo,
  preventivoToSchedaIngressoSlice,
  schedaIngressoSliceToPreventivoPatch,
} from "@/lib/preventivi/preventivo-anagrafica-map";
import type { SchedaIngressoFields } from "@/types/schede";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import { PDF_PREVENTIVO_IVA_PERCENT } from "@/lib/pdf/preventivo-pdf-layout";
import { SchedaMezzoIdentificazioneReadonly } from "@/components/lavorazioni/schede/scheda-form-utils";
import {
  formatIdentificazioneMezzoBands,
  identificazionePartsFromMezzo,
  identificazionePartsFromSchedaIngresso,
} from "@/lib/mezzi/identificazione-mezzo";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import { usePermissions } from "@/src/hooks/use-permissions";
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
  const [descRegenBusy, setDescRegenBusy] = useState(false);
  const [descProgressLabel, setDescProgressLabel] = useState<string | null>(null);
  const pdfLogoRef = useRef<string | null>(null);
  const [withdrawPending, setWithdrawPending] = useState(false);
  const prevPerms = usePermissions("preventivi");
  const profilo = useOfficinaProfiloOperativo();
  const toast = useGestionaleToast();
  const dataCreazioneFieldId = useId();
  const lavorazioniFieldId = useId();
  const costoOrarioFieldId = useId();
  const prezzoOrarioFieldId = useId();
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
    if (!open) {
      pdfLogoRef.current = null;
      return;
    }
    void loadBrandingLogoDataUrl().then((logo) => {
      pdfLogoRef.current = logo;
    });
  }, [open]);

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

  const magazzinoQ = useMagazzinoRicambiUIQuery(undefined, { enabled: open });
  const prodottiMagazzino = magazzinoQ.data ?? [];

  const resolveScontoPercent = useCallback(
    (item: RicambioMagazzino) => {
      const cliente = draftRef.current?.cliente?.trim() ?? "";
      const defaultSconto = getScontoRicambiCliente(prefsAtt, cliente);
      const infer = inferEconomiciClientePreventivi(
        cliente,
        allRecords,
        draftRef.current?.id,
        defaultSconto,
      );
      return infer.scontoRigaForCodice(ricambioCodiceForUi(item.codiceFornitoreOriginale));
    },
    [allRecords, prefsAtt],
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
  usePwaUpdateGuard(isDirty, "Salva o chiudi il preventivo prima di aggiornare l'app.");

  const mezziListQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const mezziCatalog = mezziListQ.data ?? [];
  const linkedLavorazioneId = draft?.lavorazioneId?.trim() ?? "";
  const lavorazioniListQ = useLavorazioniReportSlice({
    mezziRows: mezziCatalog,
    enabled: open && Boolean(linkedLavorazioneId),
    staleTime: 30_000,
  });

  const anagraficaFields = useMemo(
    () => (draft ? preventivoToSchedaIngressoSlice(draft) : null),
    [draft],
  );

  const linkedLavorazioneCodice = useMemo(() => {
    if (!linkedLavorazioneId) return "";
    const lav = (lavorazioniListQ.data ?? []).find((row) => row.id === linkedLavorazioneId);
    return lav?.codice?.trim() || lavorazioneDisplayCodice({ id: linkedLavorazioneId });
  }, [linkedLavorazioneId, lavorazioniListQ.data]);

  const { store: schedeStore } = useSchedeBundlesQuery(open && Boolean(linkedLavorazioneId), {
    lavorazioneIds: linkedLavorazioneId ? [linkedLavorazioneId] : [],
  });
  const linkedSchedeBundle = linkedLavorazioneId ? schedeStore[linkedLavorazioneId] ?? null : null;

  const linkedLavorazioneIdentParts = useMemo(() => {
    if (!draft) return null;
    const fromSlice = anagraficaFields
      ? identificazionePartsFromSchedaIngresso(anagraficaFields)
      : null;
    if (fromSlice && formatIdentificazioneMezzoBands(fromSlice).length > 0) return fromSlice;
    const lav = (lavorazioniListQ.data ?? []).find((row) => row.id === linkedLavorazioneId);
    const mezzoId = lav?.mezzo_id?.trim();
    const mezzo = mezzoId ? mezziCatalog.find((m) => m.id === mezzoId) : null;
    if (mezzo) return identificazionePartsFromMezzo(mezzo);
    return fromSlice;
  }, [anagraficaFields, draft, linkedLavorazioneId, lavorazioniListQ.data, mezziCatalog]);

  const canRegenerateDescription =
    Boolean(draft?.stato === "bozza" && draft.lavorazioneId?.trim() && prevPerms.canWrite);

  const regenerateDescription = useCallback(async () => {
    if (!draft || !canRegenerateDescription) return;
    setDescRegenBusy(true);
    setDescProgressLabel("Generazione descrizione tecnica…");
    try {
      const ctx = buildDescCtxFromPreventivo(draft, allRecords);
      const seq = (draft.descriptionEngineMeta?.generationSequence ?? 0) + 1;
      const next = await regeneratePreventivoDescription(draft, ctx, {
        autore: autore.trim() || "Operatore",
        generationSequence: seq,
        onProgress: (p) => setDescProgressLabel(p.label),
      });
      setDraft(applyTotals(next));
      if (next.descriptionEngineMeta?.polish?.fallback && process.env.NODE_ENV !== "production") {
        console.info(
          "AI Polish non disponibile, utilizzata descrizione tecnica originale",
          next.descriptionEngineMeta.polish,
        );
      }
      toast.successOnce("desc-regen", "Descrizione rigenerata dalla scheda tecnica.");
    } catch (e) {
      toast.errorOnce("desc-regen", e);
    } finally {
      setDescProgressLabel(null);
      setDescRegenBusy(false);
    }
  }, [allRecords, applyTotals, autore, canRegenerateDescription, draft, toast]);

  function patchAnagrafica(partial: Partial<SchedaIngressoFields>) {
    if (!draft) return;
    const merged = { ...preventivoToSchedaIngressoSlice(draft), ...partial };
    const anagPatch = schedaIngressoSliceToPreventivoPatch(merged);
    setDraft((prev) => (prev ? applyTotals(applyAnagraficaPatchToPreventivo(prev, anagPatch)) : prev));
    if (partial.cliente !== undefined) applyClienteScontoRighe(partial.cliente);
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

  function patchAddettoRow(idx: number, patchRow: Partial<PreventivoRigaAddetto>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = prev.manodopera.righeAddetti.map((r, i) => {
        if (i !== idx) return r;
        return normalizePreventivoRigaAddettoWrite({ ...r, ...patchRow } as Record<string, unknown>) as PreventivoRigaAddetto;
      });
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
      const righeAddetti = [...prev.manodopera.righeAddetti, { addettoId: null, ore: 1 }];
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
          manodopera: {
            ...prev.manodopera,
            righeAddetti: [
              normalizePreventivoRigaAddettoWrite({
                addettoId: null,
                ore: 1,
                addettoLegacy: "Officina",
                legacyWarning: "Addetto storico non convertibile: Officina",
              }) as PreventivoRigaAddetto,
            ],
            oreTotali: 1,
          },
        });
      }
      const oreTotali = sumOreRigheAddetti(righeAddetti);
      return applyTotals({ ...prev, manodopera: { ...prev.manodopera, righeAddetti, oreTotali } });
    });
  }

  const staffEditable =
    isNew ||
    (draft
      ? isPreventivoEditableByStaff({
          stato_workflow: draft.statoWorkflow,
          stato_cliente: draft.statoCliente,
        })
      : false);
  const canWithdraw =
    draft != null &&
    draft.statoWorkflow === "inviato" &&
    draft.statoCliente === "pending" &&
    prevPerms.canWrite;

  async function onRitiraPreventivo() {
    if (!draft || !canWithdraw || withdrawPending) return;
    setWithdrawPending(true);
    try {
      const res = await fetch(`/api/preventivi/${encodeURIComponent(draft.id)}/transition-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "bozza", autore: autore.trim() || "Operatore" }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.errorOnce("preventivo-ritira", body.error ?? "Ritiro non riuscito.");
        return;
      }
      toast.successOnce("preventivo-ritira", "Preventivo ritirato in bozza.");
      onSaved();
      onClose();
    } catch (e) {
      toast.errorOnce("preventivo-ritira", e);
    } finally {
      setWithdrawPending(false);
    }
  }

  async function onSalva() {
    if (!staffEditable) return;
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
    void saved;
    baselineRef.current = cloneRecord(saved);
    setUnsavedExitOpen(false);
    onSaved();
    onClose();
    });
  }

  if (!open) return null;

  if (open && !record) return null;

  if (open && record && !draft) {
    return (
      <LavorazioniModalShell
        modalSize="analytics"
        modalRootRef={modalRootRef}
        onRequestClose={onClose}
        title="Preventivo"
      >
        <LoadingFormSkeleton sections={3} />
      </LavorazioniModalShell>
    );
  }

  if (!draft) return null;

  return (
    <LavorazioniModalShell
      modalSize="analytics"
      modalRootRef={modalRootRef}
      onRequestClose={requestClose}
      title={
        isNew
          ? `Nuovo ${preventivoTipoDocumentoLabel(draft.tipoDocumento).toLowerCase()}`
          : `${preventivoTipoDocumentoLabel(draft.tipoDocumento)} ${draft.numero}${draft.versione > 1 ? ` v${draft.versione}` : ""}`
      }
      footer={
        <GestionaleModalFooterActions className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {canWithdraw ? (
            <button
              type="button"
              className={`${gestionaleModalFooterCancelBtnClass} w-full sm:w-auto`}
              disabled={withdrawPending}
              onClick={() => void onRitiraPreventivo()}
            >
              {withdrawPending ? "Ritiro…" : "Ritira preventivo"}
            </button>
          ) : null}
          <button
            type="button"
            className={`${gestionaleModalFooterCancelBtnClass} w-full sm:w-auto`}
            onClick={() => {
              if (!draft) return;
              openPreventivoPdfPreviewFromRecord(applyTotals(draft), autore, pdfLogoRef.current);
            }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Anteprima PDF
          </button>
          <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={requestClose} />
          <GestionaleModalFooterSaveButton
            className="w-full sm:w-auto"
            type="button"
            onClick={onSalva}
            disabled={!staffEditable}
          >
            Salva
          </GestionaleModalFooterSaveButton>
        </GestionaleModalFooterActions>
      }
    >
      <div className={`relative ${gestionaleModalBodyFlexClass}`}>
        {!staffEditable && !isNew ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {draft.statoCliente === "pending"
              ? "Preventivo in attesa di risposta cliente: modifica bloccata. Ritira in bozza per modificare."
              : "Preventivo non modificabile in questo stato."}
          </p>
        ) : null}
        <GestionaleModalScrollBody
          className={`py-3${!staffEditable && !isNew ? " pointer-events-none opacity-60" : ""}`}
        >
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
                    <SchedaMezzoIdentificazioneReadonly
                      parts={linkedLavorazioneIdentParts}
                      lavorazioneCodice={linkedLavorazioneCodice || undefined}
                      fallbackLine={draft.macchinaRiassunto.trim() || undefined}
                    />
                    {draft.lavorazioneOrigine === "storico" ? (
                      <p className={preventivoEditorHint}>(archivio)</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </GestionaleCollapsibleSection>

            {anagraficaFields ? (
              <GestionaleCollapsibleSection title="Scheda ingresso" defaultCollapsed variant="form">
                <SchedaIngressoAnagraficaFields
                  surface="preventivo"
                  sections={["cliente", "attrezzatura", "telaio"]}
                  value={anagraficaFields}
                  onPatch={patchAnagrafica}
                  mezzi={[]}
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
                    {descRegenBusy ? (descProgressLabel ?? "Rigenerazione…") : "Rigenera da scheda"}
                  </button>
                ) : null
              }
            >
              <PreventivoLavorazioniEditorSection
                draft={draft}
                totaleManodopera={totals.totaleManodopera}
                schedaBundle={linkedSchedeBundle}
                lavorazioniFieldId={lavorazioniFieldId}
                costoOrarioFieldId={costoOrarioFieldId}
                prezzoOrarioFieldId={prezzoOrarioFieldId}
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
                onPrezzoOrarioChange={(prezzoOrario) =>
                  setDraft((prev) =>
                    prev
                      ? applyTotals({
                          ...prev,
                          manodopera: { ...prev.manodopera, prezzoOrario },
                        })
                      : prev,
                  )
                }
                onCollaudoPrezzoChange={(collaudoPrezzo) => patch({ collaudoPrezzo })}
                onCollaudoOreChange={(collaudoOre) => patch({ collaudoOre })}
                onCollaudoDescrizioneChange={(collaudoDescrizione) => patch({ collaudoDescrizione })}
                onSanificazionePrezzoChange={(sanificazionePrezzo) => patch({ sanificazionePrezzo })}
                onSanificazioneOreChange={(sanificazioneOre) => patch({ sanificazioneOre })}
                onSanificazioneDescrizioneChange={(sanificazioneDescrizione) => patch({ sanificazioneDescrizione })}
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
                prodotti={prodottiMagazzino}
                resolveScontoPercent={resolveScontoPercent}
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
          </div>
        </GestionaleModalScrollBody>

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
      </div>
    </LavorazioniModalShell>
  );
}
