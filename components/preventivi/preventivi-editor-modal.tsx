"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconActionButton } from "@/components/design-system";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { ensurePreventivoStruttura, partitionRigheRicambi, pulisciDescrizioneLavorazioniSpecifiche } from "@/lib/preventivi/preventivi-struttura";
import { calcolaTotaliPreventivo, totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import {
  PREVENTIVO_COLLAUDO_DESCRIZIONE,
  PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
  PREVENTIVO_RIGA_MATERIALI_ID,
  PREVENTIVO_SANIFICAZIONE_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
} from "@/lib/preventivi/preventivi-voci-standard";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { appendPreventiviChangeLog } from "@/lib/preventivi/preventivi-change-log-storage";
import { persistPreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import type { MezzoRow } from "@/src/types/supabase-tables";
import { maybeRecordLearningOnSave } from "@/lib/preventivi/trasforma-descrizione";
import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import {
  PREVENTIVO_TIPI_DOCUMENTO,
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoTipoDocumento } from "@/lib/preventivi/types";
import {
  dsBtnDanger,
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsScrollbar,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsTable,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
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
import { dateInputValueToIso, isoToDateInputValue } from "@/lib/lavorazioni/date-day-only";

function cloneRecord(p: PreventivoRecord): PreventivoRecord {
  return JSON.parse(JSON.stringify(p)) as PreventivoRecord;
}

const ORE_MIN = 0.01;

const preventivoIntestazioneSegmentWrap = `${dsSegmentedWrap} w-full gap-0.5 p-0.5`;
const preventivoIntestazioneSegmentOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-2.5 py-1 text-xs max-sm:min-h-11 max-sm:py-2`;
const preventivoIntestazioneSegmentOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-2.5 py-1 text-xs max-sm:min-h-11 max-sm:py-2`;
const preventivoManodoperaRowGrid =
  "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] sm:items-end sm:gap-2";

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
  targa: "",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  noteIntervento: "",
};

function parseOreManodoperaInput(raw: string): number {
  const v = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(v)) return ORE_MIN;
  return Math.max(ORE_MIN, Math.round(v * 100) / 100);
}

function sumOreRigheAddetti(righe: readonly { ore: number }[]): number {
  const sum = righe.reduce((s, x) => s + (Number.isFinite(x.ore) ? x.ore : 0), 0);
  return Math.max(ORE_MIN, Math.round(sum * 100) / 100);
}

function fmtEuro(n: number): string {
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

const preventivoSanificazioneEditorLine = `- ${PREVENTIVO_SANIFICAZIONE_DESCRIZIONE};`;

function composeLavorazioniClienteEditorText(specifiche: string): string {
  const rest = specifiche.trim();
  if (!rest) return preventivoSanificazioneEditorLine;
  return `${preventivoSanificazioneEditorLine}\n${rest}`;
}

function extractLavorazioniClienteSpecifiche(composed: string): string {
  return pulisciDescrizioneLavorazioniSpecifiche(composed);
}

function SectionTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[color:var(--cab-border)] pt-2 text-sm">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{label}</span>
      <span className="tabular-nums font-semibold text-[color:var(--cab-text)]">{value}</span>
    </div>
  );
}

export function PreventiviEditorModal({
  open,
  record,
  isNew,
  isRollbackDraft = false,
  autore,
  mezziRows,
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
  mezziRows: readonly MezzoRow[];
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
  const dataCreazioneFieldId = useId();
  const lavorazioniFieldId = useId();
  const costoOrarioFieldId = useId();
  const noteFieldId = useId();

  const applyTotals = useCallback((d: PreventivoRecord): PreventivoRecord => {
    const s = ensurePreventivoStruttura(d);
    return { ...s, ...calcolaTotaliPreventivo(s) };
  }, []);

  useEffect(() => {
    if (!open || !record) {
      setDraft(null);
      baselineRef.current = null;
      draftRef.current = null;
      setUnsavedExitOpen(false);
      return;
    }
    const c = applyTotals(cloneRecord(record));
    baselineRef.current = applyTotals(cloneRecord(record));
    draftRef.current = c;
    setDraft(c);
  }, [open, record, applyTotals]);

  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const { data: settingsPayload } = useCabAppSettingsPayloadQuery();
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
    return JSON.stringify(applyTotals(cur)) !== JSON.stringify(applyTotals(base));
  }, [draft, applyTotals]);

  const mezziCatalog = useMemo(() => mezziRows.map(toMezzoUI), [mezziRows]);

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

    const res = await persistPreventivoRecord(next, mezziRows, {
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
      modalSize="formLarge"
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
            className={`${dsBtnNeutral} min-h-11 w-full sm:w-auto`}
            onClick={() =>
              void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
                openPreventivoPdfInNewTab(applyTotals(draft), autore),
              )
            }
          >
            Anteprima PDF
          </button>
          <button type="button" className={`${dsBtnNeutral} min-h-11 w-full sm:w-auto`} onClick={requestClose}>
            Annulla
          </button>
          <button type="button" className={`${dsBtnPrimary} min-h-11 w-full sm:w-auto`} onClick={onSalva}>
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
          <div className="sticky top-0 z-[2] -mx-4 mb-3 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-card)_94%,transparent)] px-4 py-2 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[color:var(--cab-text-muted)]">
                <span>
                  Ricambi{" "}
                  <strong className="font-medium tabular-nums text-[color:var(--cab-text)]">{fmtEuro(totals.totaleRicambi)}</strong>
                </span>
                <span>
                  Manodopera{" "}
                  <strong className="font-medium tabular-nums text-[color:var(--cab-text)]">{fmtEuro(totals.totaleManodopera)}</strong>
                </span>
                <span>
                  IVA {PDF_PREVENTIVO_IVA_PERCENT}%{" "}
                  <strong className="font-medium tabular-nums text-[color:var(--cab-text)]">{fmtEuro(economicsPreview.importoIva)}</strong>
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                Totale {fmtEuro(economicsPreview.totaleConIva)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <FormSection title="Dati documento">
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
            </FormSection>

            {draft.lavorazioneId.trim() ? (
              <FormSection title="Lavorazione collegata">
                <p className="text-sm text-[color:var(--cab-text)]">
                  <span className="font-medium tabular-nums">{lavorazioneDisplayCodice({ id: draft.lavorazioneId })}</span>
                  {draft.lavorazioneOrigine === "storico" ? (
                    <span className="ml-2 text-xs text-[color:var(--cab-text-muted)]">(archivio)</span>
                  ) : null}
                  {draft.macchinaRiassunto.trim() ? (
                    <span className="mt-1 block text-xs text-[color:var(--cab-text-muted)]">{draft.macchinaRiassunto.trim()}</span>
                  ) : null}
                </p>
              </FormSection>
            ) : null}

            {anagraficaFields ? (
              <SchedaIngressoAnagraficaFields
                value={anagraficaFields}
                onPatch={patchAnagrafica}
                mezzi={mezziCatalog}
                onExactMezzoMatch={onMezzoPromptMatch}
                clienteRequired
              />
            ) : null}

            <FormSection title="Lavorazioni effettuate">
              <FormField label="Lavorazioni specifiche (testo cliente)" htmlFor={lavorazioniFieldId}>
                <GestionaleTextarea
                  id={lavorazioniFieldId}
                  className="min-h-[6rem]"
                  size="lg"
                  value={composeLavorazioniClienteEditorText(draft.descrizioneLavorazioniCliente)}
                  onChange={(v) =>
                    patch({
                      descrizioneLavorazioniCliente: extractLavorazioniClienteSpecifiche(
                        sliceInputValue(v, TEXT_EXTRA),
                      ),
                    })
                  }
                  maxLength={TEXT_EXTRA}
                />
              </FormField>
              <p className="text-[11px] text-[color:var(--cab-text-muted)]">
                Le modifiche al testo allenano il modello per preventivi simili futuri.
              </p>
            </FormSection>

            <FormSection
              title="Ricambi / materiali"
              action={
                <button type="button" className={dsBtnNeutral} onClick={addRiga}>
                  Aggiungi riga
                </button>
              }
            >
              <div
                className={`${dsTableWrap} ${dsScrollbar}`}
                role="region"
                aria-label="Righe ricambi e materiali, scorrimento orizzontale su schermi piccoli"
              >
                <table className={`${dsTable} min-w-[960px]`}>
                  <GlobalTableHead sticky>
                      <GlobalTableHeadLabel label="Codice OE" />
                      <GlobalTableHeadLabel label="Descrizione" thClassName="min-w-[140px]" />
                      <GlobalTableHeadLabel label="Qtà" align="right" thClassName="w-24" />
                      <GlobalTableHeadLabel label="Prezzo unit." align="right" thClassName="w-28" />
                      <GlobalTableHeadLabel label="Sconto %" align="right" thClassName="w-24" />
                      <GlobalTableHeadLabel label="Totale netto" align="right" thClassName="w-32" />
                      <GlobalTableHeadLabel label="" thClassName="w-10" />
                  </GlobalTableHead>
                  <tbody>
                    {ricambiPart.standard.map((r, idx) => (
                      <tr key={r.id} className={dsTableRow}>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={dsInput}
                            value={r.codiceOE}
                            onChange={(e) => patchRiga(r.id, { codiceOE: e.target.value })}
                            aria-label={`Codice OE riga ${idx + 1}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={dsInput}
                            value={r.descrizione}
                            onChange={(e) => patchRiga(r.id, { descrizione: e.target.value })}
                            aria-label={`Descrizione riga ${idx + 1}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0.01}
                            step={0.01}
                            inputMode="decimal"
                            value={r.quantita}
                            onChange={(e) => patchRiga(r.id, { quantita: Math.max(0.01, parseFloat(e.target.value) || 0) })}
                            aria-label={`Quantità riga ${idx + 1}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            step={0.01}
                            inputMode="decimal"
                            value={r.prezzoUnitario}
                            onChange={(e) => patchRiga(r.id, { prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0) })}
                            aria-label={`Prezzo unitario riga ${idx + 1}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            inputMode="decimal"
                            value={r.scontoPercent ?? 0}
                            onChange={(e) =>
                              patchRiga(r.id, { scontoPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })
                            }
                            aria-label={`Sconto percentuale riga ${idx + 1}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle text-right text-sm tabular-nums font-medium text-[color:var(--cab-text)]">
                          {fmtEuro(totaleNettoRigaRicambio(r))}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <button type="button" className={`${dsBtnDanger} px-2 py-1 text-xs`} onClick={() => removeRiga(r.id)} aria-label="Elimina riga">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ricambiPart.materialiConsumo ? (
                <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_50%,transparent)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Materiali di consumo
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <p className="text-sm text-[color:var(--cab-text)]">{PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE}</p>
                    <FormField label="Qtà">
                      <input className={`${dsInput} w-20 text-right tabular-nums`} readOnly value="1" />
                    </FormField>
                    <FormField label="Prezzo (€)" htmlFor="preventivo-materiali-prezzo">
                      <input
                        id="preventivo-materiali-prezzo"
                        className={`${dsInput} w-28 text-right tabular-nums`}
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        value={ricambiPart.materialiConsumo.prezzoUnitario}
                        onChange={(e) =>
                          patchRiga(ricambiPart.materialiConsumo!.id, {
                            prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ) : null}
              <SectionTotal label="Totale" value={fmtEuro(totals.totaleRicambi)} />
            </FormSection>

            <FormSection
              title="Manodopera"
              action={
                <button type="button" className={dsBtnNeutral} onClick={addAddettoRow}>
                  Aggiungi addetto
                </button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Costo orario (€/h)" htmlFor={costoOrarioFieldId}>
                  <input
                    id={costoOrarioFieldId}
                    className={`${dsInput} text-right tabular-nums`}
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    value={draft.manodopera.costoOrario}
                    onChange={(e) => {
                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                      setDraft((prev) =>
                        prev
                          ? applyTotals({
                              ...prev,
                              manodopera: { ...prev.manodopera, costoOrario: v },
                            })
                          : prev,
                      );
                    }}
                  />
                </FormField>
                <FormField label="Ore totali">
                  <input
                    className={`${dsInput} text-right tabular-nums`}
                    readOnly
                    value={String(draft.manodopera.oreTotali)}
                    aria-label="Ore totali calcolate"
                  />
                </FormField>
                <FormField label="Importo manodopera">
                  <input
                    className={`${dsInput} text-right tabular-nums font-medium`}
                    readOnly
                    value={fmtEuro(totals.totaleManodopera)}
                    aria-label="Importo manodopera calcolato"
                  />
                </FormField>
              </div>

              <div className="overflow-hidden rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)]">
                <div
                  className={`${preventivoManodoperaRowGrid} hidden border-b border-[color:var(--cab-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] sm:grid`}
                >
                  <span>Addetto</span>
                  <span className="text-right">Ore</span>
                  <span className="sr-only">Azioni</span>
                </div>
                <div className="divide-y divide-[color:var(--cab-border)]">
                  {draft.manodopera.righeAddetti.map((a, idx) => (
                    <div key={`${idx}-${a.addetto}`} className={`${preventivoManodoperaRowGrid} px-3 py-2.5`}>
                      <FormField label="Addetto" className="sm:[&>div]:mt-0 sm:[&>span]:sr-only">
                        <input
                          className={dsInput}
                          value={a.addetto}
                          onChange={(e) => patchAddettoRow(idx, { addetto: e.target.value })}
                          placeholder="Nome addetto"
                          aria-label={`Addetto riga ${idx + 1}`}
                        />
                      </FormField>
                      <FormField label="Ore" className="sm:[&>div]:mt-0 sm:[&>span]:sr-only">
                        <input
                          className={`${dsInput} text-right tabular-nums`}
                          type="number"
                          min={ORE_MIN}
                          step={0.01}
                          inputMode="decimal"
                          value={a.ore}
                          onChange={(e) => patchAddettoRow(idx, { ore: parseOreManodoperaInput(e.target.value) })}
                          aria-label={`Ore addetto riga ${idx + 1}`}
                        />
                      </FormField>
                      <div className="flex items-end justify-end">
                        <IconActionButton
                          label="Rimuovi"
                          className={dsTableActionBtnDanger}
                          onClick={() => removeAddettoRow(idx)}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </IconActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="font-medium text-[color:var(--cab-text)]">{PREVENTIVO_COLLAUDO_DESCRIZIONE}</span>
                  <span className="text-[color:var(--cab-text-muted)]">Qtà: 1</span>
                  <label htmlFor="preventivo-collaudo-prezzo" className="ml-auto flex items-center gap-2">
                    <span className="whitespace-nowrap text-[color:var(--cab-text-muted)]">Prezzo (€)</span>
                    <input
                      id="preventivo-collaudo-prezzo"
                      className={`${dsInput} w-28 text-right tabular-nums`}
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      aria-label="Prezzo collaudo"
                      value={draft.collaudoPrezzo ?? 0}
                      onChange={(e) => patch({ collaudoPrezzo: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </label>
                </div>
              </div>
              <SectionTotal
                label="Totale"
                value={fmtEuro(totals.totaleManodopera + (draft.collaudoPrezzo ?? 0))}
              />
            </FormSection>

            <FormSection title="Riepilogo economico">
              <div className="space-y-2 text-sm">
                <p className="flex justify-between text-[color:var(--cab-text-muted)]">
                  <span>
                    {PREVENTIVO_SMALTIMENTO_DESCRIZIONE} ({PREVENTIVO_SMALTIMENTO_PERCENT}% netto)
                  </span>
                  <span className="tabular-nums font-medium text-[color:var(--cab-text)]">{fmtEuro(totals.totaleSmaltimento)}</span>
                </p>
                <p className="flex justify-between border-t border-[color:var(--cab-border)] pt-2 font-semibold text-[color:var(--cab-text)]">
                  <span>Totale netto</span>
                  <span className="tabular-nums">{fmtEuro(economicsPreview.netto)}</span>
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    IVA ({PDF_PREVENTIVO_IVA_PERCENT}%)
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-[color:var(--cab-text)]">
                    {fmtEuro(economicsPreview.importoIva)}
                  </p>
                </div>
                <div className="rounded-[var(--ds-radius-md)] border border-[color:color-mix(in_srgb,var(--cab-primary)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Totale con IVA</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-[color:var(--cab-text)]">
                    {fmtEuro(economicsPreview.totaleConIva)}
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection title="Note">
              <FormField label="Note finali" htmlFor={noteFieldId}>
                <GestionaleTextarea
                  id={noteFieldId}
                  className="min-h-[4rem]"
                  size="md"
                  value={draft.noteFinali}
                  onChange={(v) => patch({ noteFinali: sliceInputValue(v, TEXT_LONG) })}
                  maxLength={TEXT_LONG}
                />
              </FormField>
            </FormSection>
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
