"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconActionButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
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
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
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
  dsTableHeadCell,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { migrateMezziListePrefs, modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { marcheFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import { dateInputValueToIso, isoToDateInputValue, localCalendarDayIsoFromIso } from "@/lib/lavorazioni/date-day-only";

function cloneRecord(p: PreventivoRecord): PreventivoRecord {
  return JSON.parse(JSON.stringify(p)) as PreventivoRecord;
}

const ORE_MIN = 0.01;

const preventivoIntestazioneSegmentWrap = `${dsSegmentedWrap} mt-1 w-full gap-0.5 p-0.5`;
const preventivoIntestazioneSegmentOn = `${dsSegmentedBtnOn} flex-1 px-2.5 py-1 text-xs`;
const preventivoIntestazioneSegmentOff = `${dsSegmentedBtnOff} flex-1 px-2.5 py-1 text-xs`;
const preventivoManodoperaRowGrid =
  "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] sm:items-end sm:gap-2";

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
  const draftRef = useRef<PreventivoRecord | null>(null);
  const [draft, setDraft] = useState<PreventivoRecord | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);

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

  const marcheEditorOpts = useMemo(() => marcheFromHierarchyTree(prefsAtt, "attrezzature"), [prefsAtt]);
  const utilizzatoriEditorOpts = prefsAtt.utilizzatori;
  const cantieriEditorOpts = prefsAtt.cantieri;
  const clientiEditorOpts = prefsAtt.clienti;

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
    const cur = draftRef.current;
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
  }

  if (!open || !draft) return null;

  return (
    <LavorazioniModalShell
      wide
      maxWidthClass="max-w-5xl"
      onRequestClose={requestClose}
      title={
        isNew
          ? `Nuovo ${preventivoTipoDocumentoLabel(draft.tipoDocumento).toLowerCase()}`
          : `${preventivoTipoDocumentoLabel(draft.tipoDocumento)} ${draft.numero}`
      }
    >
      <div className="relative flex max-h-[min(92dvh,900px)] min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 gestionale-scrollbar">
          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Intestazione
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Numero</span>
                  <input className={`${dsInput} mt-1 tabular-nums`} readOnly value={draft.numero} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Tipo documento</span>
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
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Data creazione</span>
                  <div className="mt-1">
                    <GlobalDatePickerYmd
                      variant="default"
                      valueYmd={isoToDateInputValue(draft.dataCreazione)}
                      onChangeYmd={(ymd) => {
                        if (!ymd.trim()) return;
                        const r = dateInputValueToIso(ymd);
                        if (r.ok) patch({ dataCreazione: r.iso });
                      }}
                      aria-label="Data creazione"
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Anagrafica cliente
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs sm:col-span-1">
                  <span className="text-zinc-500">Cliente</span>
                  <GlobalSettingsListSelect
                    listKey="mezzi:clienti"
                    className="mt-1"
                    value={draft.cliente}
                    onChange={(v) => {
                      patch({ cliente: v });
                      applyClienteScontoRighe(v);
                    }}
                    aria-label="Cliente"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Cantiere</span>
                  <GlobalSettingsListSelect listKey="mezzi:cantieri" className="mt-1" value={draft.cantiere} onChange={(v) => patch({ cantiere: v })} aria-label="Cantiere" />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Utilizzatore</span>
                  <GlobalSettingsListSelect listKey="mezzi:utilizzatori" className="mt-1" value={draft.utilizzatore} onChange={(v) => patch({ utilizzatore: v })} aria-label="Utilizzatore" />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Identificazione macchina
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Targa</span>
                  <input className={`${dsInput} mt-1`} value={draft.targa} onChange={(e) => patch({ targa: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Matricola</span>
                  <input className={`${dsInput} mt-1`} value={draft.matricola} onChange={(e) => patch({ matricola: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">N. scuderia</span>
                  <input className={`${dsInput} mt-1`} value={draft.nScuderia} onChange={(e) => patch({ nScuderia: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Marca attrezzatura</span>
                  <GlobalHierarchyMarcaSelect
                    tree="attrezzature"
                    className="mt-1"
                    value={draft.marcaAttrezzatura}
                    onChange={(marca) => {
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const p = prefsAtt;
                        const opts = marca.trim() ? modelliVisibiliPerMarca(p, marca) : [];
                        let modello = prev.modelloAttrezzatura;
                        if (modello.trim() && !opts.includes(modello.trim())) modello = "";
                        const macchinaRiassunto = [marca, modello].filter(Boolean).join(" ").trim();
                        return applyTotals({
                          ...prev,
                          marcaAttrezzatura: marca,
                          modelloAttrezzatura: modello,
                          macchinaRiassunto: macchinaRiassunto || prev.macchinaRiassunto,
                        });
                      });
                    }}
                    aria-label="Marca attrezzatura"
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-zinc-500">Modello</span>
                  <GlobalHierarchyModelloSelect
                    tree="attrezzature"
                    marcaNome={draft.marcaAttrezzatura}
                    className="mt-1"
                    value={draft.modelloAttrezzatura}
                    onChange={(modello) => {
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const macchinaRiassunto = [prev.marcaAttrezzatura, modello].filter(Boolean).join(" ").trim();
                        return applyTotals({
                          ...prev,
                          modelloAttrezzatura: modello,
                          macchinaRiassunto: macchinaRiassunto || prev.macchinaRiassunto,
                        });
                      });
                    }}
                    aria-label="Modello attrezzatura"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Lavorazioni
              </h3>
              <label className="mt-3 block text-xs">
                <span className="text-zinc-500">Lavorazioni specifiche (testo cliente)</span>
                <textarea
                  className={`${dsInput} mt-1 min-h-[7rem] resize-y`}
                  value={composeLavorazioniClienteEditorText(draft.descrizioneLavorazioniCliente)}
                  onChange={(e) =>
                    patch({ descrizioneLavorazioniCliente: extractLavorazioniClienteSpecifiche(e.target.value) })
                  }
                />
              </label>
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Le modifiche al testo allenano il modello per preventivi simili futuri.
              </p>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Manodopera</h3>
                <button type="button" className={dsBtnNeutral} onClick={addAddettoRow}>
                  Aggiungi addetto
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Costo orario (€/h)</span>
                  <input
                    className={`${dsInput} mt-1 text-right tabular-nums`}
                    type="number"
                    min={0}
                    step={0.5}
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
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Ore totali</span>
                  <input
                    className={`${dsInput} mt-1 text-right tabular-nums`}
                    readOnly
                    value={String(draft.manodopera.oreTotali)}
                    aria-label="Ore totali calcolate"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Importo manodopera</span>
                  <input
                    className={`${dsInput} mt-1 text-right tabular-nums font-medium`}
                    readOnly
                    value={fmtEuro(totals.totaleManodopera)}
                    aria-label="Importo manodopera calcolato"
                  />
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/40 dark:border-zinc-700 dark:bg-zinc-950/30">
                <div
                  className={`${preventivoManodoperaRowGrid} hidden border-b border-zinc-200/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700/80 sm:grid`}
                >
                  <span>Addetto</span>
                  <span className="text-right">Ore</span>
                  <span className="sr-only">Azioni</span>
                </div>
                <div className="divide-y divide-zinc-200/80 dark:divide-zinc-700/80">
                  {draft.manodopera.righeAddetti.map((a, idx) => (
                    <div key={`${idx}-${a.addetto}`} className={`${preventivoManodoperaRowGrid} px-3 py-2.5`}>
                      <label className="block min-w-0 text-xs">
                        <span className="text-zinc-500 sm:sr-only">Addetto</span>
                        <input
                          className={`${dsInput} mt-1 sm:mt-0`}
                          value={a.addetto}
                          onChange={(e) => patchAddettoRow(idx, { addetto: e.target.value })}
                          placeholder="Nome addetto"
                          aria-label={`Addetto riga ${idx + 1}`}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-zinc-500 sm:sr-only">Ore</span>
                        <input
                          className={`${dsInput} mt-1 text-right tabular-nums sm:mt-0`}
                          type="number"
                          min={ORE_MIN}
                          step={0.01}
                          inputMode="decimal"
                          value={a.ore}
                          onChange={(e) => patchAddettoRow(idx, { ore: parseOreManodoperaInput(e.target.value) })}
                          aria-label={`Ore addetto riga ${idx + 1}`}
                        />
                      </label>
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

              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">{PREVENTIVO_COLLAUDO_DESCRIZIONE}</span>
                  <span className="text-zinc-500">Qtà: 1</span>
                  <label className="flex items-center gap-2 sm:ml-auto">
                    <span className="whitespace-nowrap text-zinc-500">Prezzo (€)</span>
                    <input
                      className={`${dsInput} w-28 text-right tabular-nums`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft.collaudoPrezzo ?? 0}
                      onChange={(e) => patch({ collaudoPrezzo: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ricambi utilizzati</h3>
                <button type="button" className={dsBtnNeutral} onClick={addRiga}>
                  Aggiungi riga
                </button>
              </div>
              <div className={`${dsTableWrap} ${dsScrollbar} mt-3`}>
                <table className={`${dsTable} min-w-[960px]`}>
                  <thead className="sticky top-0 z-[1] bg-[var(--cab-card)] shadow-[inset_0_-1px_0_0_var(--cab-border)]">
                    <tr>
                      <th className={dsTableHeadCell}>Codice OE</th>
                      <th className={`${dsTableHeadCell} min-w-[140px]`}>Descrizione</th>
                      <th className={`${dsTableHeadCell} w-24 text-right`}>Qtà</th>
                      <th className={`${dsTableHeadCell} w-28 text-right`}>Prezzo unit.</th>
                      <th className={`${dsTableHeadCell} w-24 text-right`}>Sconto %</th>
                      <th className={`${dsTableHeadCell} w-32 text-right`}>Totale netto</th>
                      <th className={`${dsTableHeadCell} w-10`} />
                    </tr>
                  </thead>
                  <tbody>
                    {ricambiPart.standard.map((r) => (
                      <tr key={r.id} className={dsTableRow}>
                        <td className="px-2 py-1.5 align-top">
                          <input className={dsInput} value={r.codiceOE} onChange={(e) => patchRiga(r.id, { codiceOE: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input className={dsInput} value={r.descrizione} onChange={(e) => patchRiga(r.id, { descrizione: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={r.quantita}
                            onChange={(e) => patchRiga(r.id, { quantita: Math.max(0.01, parseFloat(e.target.value) || 0) })}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={r.prezzoUnitario}
                            onChange={(e) => patchRiga(r.id, { prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0) })}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={r.scontoPercent ?? 0}
                            onChange={(e) =>
                              patchRiga(r.id, { scontoPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })
                            }
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
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Materiali di consumo
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <p className="text-sm text-zinc-800 dark:text-zinc-100">{PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE}</p>
                    <label className="block text-xs">
                      <span className="text-zinc-500">Qtà</span>
                      <input className={`${dsInput} mt-1 w-20 text-right tabular-nums`} readOnly value="1" />
                    </label>
                    <label className="block text-xs">
                      <span className="text-zinc-500">Prezzo (€)</span>
                      <input
                        className={`${dsInput} mt-1 w-28 text-right tabular-nums`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={ricambiPart.materialiConsumo.prezzoUnitario}
                        onChange={(e) =>
                          patchRiga(ricambiPart.materialiConsumo!.id, {
                            prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-right text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                    Totale: {fmtEuro(totaleNettoRigaRicambio(ricambiPart.materialiConsumo))}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Totali</h3>
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Totale ricambi (netto righe)</span>
                  <span className="tabular-nums font-medium">{fmtEuro(totals.totaleRicambi)}</span>
                </p>
                <p className="mt-1 flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Totale manodopera</span>
                  <span className="tabular-nums font-medium">{fmtEuro(totals.totaleManodopera)}</span>
                </p>
                <p className="mt-1 flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>{PREVENTIVO_COLLAUDO_DESCRIZIONE}</span>
                  <span className="tabular-nums font-medium">{fmtEuro(draft.collaudoPrezzo ?? 0)}</span>
                </p>
                <p className="mt-1 flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>
                    {PREVENTIVO_SMALTIMENTO_DESCRIZIONE} ({PREVENTIVO_SMALTIMENTO_PERCENT}% netto)
                  </span>
                  <span className="tabular-nums font-medium">{fmtEuro(totals.totaleSmaltimento)}</span>
                </p>
                <p className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                  <span>Totale finale</span>
                  <span className="tabular-nums">{fmtEuro(totals.totaleFinale)}</span>
                </p>
              </div>
              <label className="mt-3 block text-xs">
                <span className="text-zinc-500">Note finali</span>
                <textarea
                  className={`${dsInput} mt-1 min-h-[4.5rem] resize-y`}
                  value={draft.noteFinali}
                  onChange={(e) => patch({ noteFinali: e.target.value })}
                />
              </label>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <button type="button" className={dsBtnNeutral} onClick={() => openPreventivoPdfInNewTab(applyTotals(draft), autore)}>
            Anteprima PDF
          </button>
          <button type="button" className={dsBtnNeutral} onClick={requestClose}>
            Annulla
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onSalva}>
            Salva
          </button>
        </div>

        {unsavedExitOpen ? (
          <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Modifiche non salvate</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Hai modifiche non salvate. Come vuoi procedere?
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button type="button" className={dsBtnNeutral} onClick={() => setUnsavedExitOpen(false)}>
                  Resta
                </button>
                <button
                  type="button"
                  className={dsBtnDanger}
                  onClick={() => {
                    setUnsavedExitOpen(false);
                    onClose();
                  }}
                >
                  Esci senza salvare
                </button>
                <button
                  type="button"
                  className={dsBtnPrimary}
                  onClick={() => {
                    onSalva();
                  }}
                >
                  Salva ed esci
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </LavorazioniModalShell>
  );
}
