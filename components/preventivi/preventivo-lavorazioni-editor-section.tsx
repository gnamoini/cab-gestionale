"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconActionButton } from "@/components/design-system";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { GestionaleNumericField } from "@/components/gestionale/gestionale-numeric-field";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { FormFieldBlock } from "@/components/gestionale/schede/gestionale-form-section";
import {
  preventivoEditorHint,
  preventivoEditorManodoperaActionsCol,
  preventivoEditorManodoperaAddBtn,
  preventivoEditorManodoperaAddettoCol,
  preventivoEditorManodoperaFooterMetricCell,
  preventivoEditorManodoperaFooterMetricLabel,
  preventivoEditorManodoperaFooterMetricValue,
  preventivoEditorManodoperaHeaderCell,
  preventivoEditorManodoperaKpiRow,
  preventivoEditorManodoperaNumCell,
  preventivoEditorManodoperaNumHeaderCell,
  preventivoEditorManodoperaOreFieldInputInner,
  preventivoEditorManodoperaOreFieldWrap,
  preventivoEditorManodoperaRowGrid,
  preventivoEditorManodoperaSchedaOreInside,
  preventivoEditorManodoperaTableWrap,
  preventivoEditorManodoperaVoceRow,
  preventivoEditorPanelClass,
  preventivoEditorRowRemoveBtn,
  preventivoEditorSubsectionTitle,
  preventivoEditorVoceDescInput,
} from "@/components/preventivi/preventivo-editor-ui";
import { NUMERIC_PRESETS, ORE_PREVENTIVO_ADDETTO_PRESET } from "@/lib/core/numeric-input-policy";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  resolveCollaudoDescrizione,
  resolveSanificazioneDescrizione,
} from "@/lib/preventivi/preventivi-voci-standard";
import { oreEffettivePerCostoPreventivo, resolveMargineTier } from "@/lib/preventivi/preventivo-profitto";
import { margineTierClass } from "@/lib/preventivi/preventivo-analisi-economica";
import {
  composePreventivoLavorazioniClienteEditorText,
  extractPreventivoLavorazioniClienteSpecifiche,
} from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoManodopera, PreventivoRecord } from "@/lib/preventivi/types";
import { AddettoPicker } from "@/components/domain/addetti";
import {
  oreSchedaAddettoMapFromLavorazioni,
  oreSchedaForPreventivoRigaAddetto,
} from "@/lib/preventivi/righe-addetti-from-scheda-lavorazioni";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import type { LavorazioneSchedeBundle, SchedaLavorazioniDoc } from "@/types/schede";
import { sliceInputValue, TEXT_EXTRA, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import {
  dsInput,
  dsInputNoSpinner,
} from "@/lib/ui/design-system";
import {
  fmtPreventivoEuro,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";
import {
  normalizeCollaudoOre,
  normalizeSanificazioneOre,
  totaleCollaudoPreventivo,
  totaleSanificazionePreventivo,
} from "@/lib/preventivi/preventivi-collaudo";

const PREVENTIVO_LAVORAZIONI_COMMIT_MS = 400;

function PreventivoLavorazioniClienteTextarea({
  specifiche,
  sanificazioneDescrizione,
  onDescrizioneChange,
  lavorazioniFieldId,
}: {
  specifiche: string;
  sanificazioneDescrizione: string;
  onDescrizioneChange: (specifiche: string) => void;
  lavorazioniFieldId: string;
}) {
  const focusedRef = useRef(false);
  const commitTimerRef = useRef<number | null>(null);
  const editorTextRef = useRef("");
  const [editorText, setEditorText] = useState(() =>
    composePreventivoLavorazioniClienteEditorText(specifiche, sanificazioneDescrizione),
  );
  editorTextRef.current = editorText;

  const commitEditorText = useCallback(
    (raw: string) => {
      const nextSpecifiche = extractPreventivoLavorazioniClienteSpecifiche(sliceInputValue(raw, TEXT_EXTRA));
      return composePreventivoLavorazioniClienteEditorText(nextSpecifiche, sanificazioneDescrizione);
    },
    [sanificazioneDescrizione],
  );

  const notifyDescrizioneChange = useCallback(
    (raw: string) => {
      const nextSpecifiche = extractPreventivoLavorazioniClienteSpecifiche(sliceInputValue(raw, TEXT_EXTRA));
      onDescrizioneChange(nextSpecifiche);
    },
    [onDescrizioneChange],
  );

  const flushEditorText = useCallback(
    (raw: string) => {
      notifyDescrizioneChange(raw);
      setEditorText(commitEditorText(raw));
    },
    [commitEditorText, notifyDescrizioneChange],
  );

  useEffect(() => {
    if (focusedRef.current) return;
    setEditorText(composePreventivoLavorazioniClienteEditorText(specifiche, sanificazioneDescrizione));
  }, [specifiche, sanificazioneDescrizione]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current != null) {
        window.clearTimeout(commitTimerRef.current);
        notifyDescrizioneChange(editorTextRef.current);
      }
    };
  }, [notifyDescrizioneChange]);

  const scheduleCommit = useCallback(
    (raw: string) => {
      if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null;
        flushEditorText(raw);
      }, PREVENTIVO_LAVORAZIONI_COMMIT_MS);
    },
    [flushEditorText],
  );

  return (
    <GestionaleTextarea
      id={lavorazioniFieldId}
      className="min-h-[5.5rem]"
      size="md"
      value={editorText}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (commitTimerRef.current != null) {
          window.clearTimeout(commitTimerRef.current);
          commitTimerRef.current = null;
        }
        flushEditorText(editorTextRef.current);
      }}
      onChange={(v) => {
        const sliced = sliceInputValue(v, TEXT_EXTRA);
        setEditorText(sliced);
        scheduleCommit(sliced);
      }}
      maxLength={TEXT_EXTRA}
      aria-label="Descrizione lavorazioni per il cliente"
    />
  );
}

export function PreventivoLavorazioniEditorSection({
  draft,
  totaleManodopera,
  schedaBundle,
  lavorazioniFieldId,
  costoOrarioFieldId,
  prezzoOrarioFieldId,
  onDescrizioneChange,
  onCostoOrarioChange,
  onPrezzoOrarioChange,
  onCollaudoPrezzoChange,
  onCollaudoOreChange,
  onCollaudoDescrizioneChange,
  onSanificazionePrezzoChange,
  onSanificazioneOreChange,
  onSanificazioneDescrizioneChange,
  onPatchAddettoRow,
  onAddAddettoRow,
  onRemoveAddettoRow,
}: {
  draft: Pick<
    PreventivoRecord,
    | "descrizioneLavorazioniCliente"
    | "descriptionGenerationId"
    | "descriptionEngineMeta"
    | "collaudoPrezzo"
    | "collaudoOre"
    | "collaudoDescrizione"
    | "sanificazionePrezzo"
    | "sanificazioneOre"
    | "sanificazioneDescrizione"
    | "manodopera"
  >;
  totaleManodopera: number;
  /** Bundle schede lavorazione collegata (ore scheda in griglia + costo tot.). */
  schedaBundle?: LavorazioneSchedeBundle | null;
  lavorazioniFieldId: string;
  costoOrarioFieldId: string;
  prezzoOrarioFieldId: string;
  onDescrizioneChange: (specifiche: string) => void;
  onCostoOrarioChange: (costoOrario: number) => void;
  onPrezzoOrarioChange: (prezzoOrario: number) => void;
  onCollaudoPrezzoChange: (prezzo: number) => void;
  onCollaudoOreChange: (ore: number) => void;
  onCollaudoDescrizioneChange: (descrizione: string) => void;
  onSanificazionePrezzoChange: (prezzo: number) => void;
  onSanificazioneOreChange: (ore: number) => void;
  onSanificazioneDescrizioneChange: (descrizione: string) => void;
  onPatchAddettoRow: (idx: number, patch: Partial<PreventivoManodopera["righeAddetti"][number]>) => void;
  onAddAddettoRow: () => void;
  onRemoveAddettoRow: (idx: number) => void;
}) {
  const { lavorazioni } = useGlobalOptions();
  const addettiRecords = lavorazioni.addettiRecords;
  const schedaLavorazioni: SchedaLavorazioniDoc | null = schedaBundle?.lavorazioni ?? null;
  const oreSchedaAddettoMap = useMemo(
    () => oreSchedaAddettoMapFromLavorazioni(schedaLavorazioni, addettiRecords),
    [schedaLavorazioni, addettiRecords],
  );
  const orePerCostoManodopera = useMemo(
    () => oreEffettivePerCostoPreventivo(draft, schedaBundle),
    [draft, schedaBundle],
  );
  const collaudoOre = normalizeCollaudoOre(draft.collaudoOre);
  const collaudoPrezzo = draft.collaudoPrezzo ?? 0;
  const collaudoDescrizione = resolveCollaudoDescrizione(draft.collaudoDescrizione);
  const sanificazioneOre = normalizeSanificazioneOre(draft.sanificazioneOre);
  const sanificazionePrezzo = draft.sanificazionePrezzo ?? 0;
  const sanificazioneDescrizione = resolveSanificazioneDescrizione(draft.sanificazioneDescrizione);
  const totaleCollaudo = totaleCollaudoPreventivo({ collaudoOre, collaudoPrezzo });
  const totaleSanificazione = totaleSanificazionePreventivo({ sanificazioneOre, sanificazionePrezzo });
  const sezioneTotale = totaleManodopera + totaleSanificazione + totaleCollaudo;
  const totCostoManodopera =
    Math.round(orePerCostoManodopera * draft.manodopera.costoOrario * 100) / 100;
  const totMargineManodopera = Math.round((totaleManodopera - totCostoManodopera) * 100) / 100;
  const margineManodoperaPct =
    totaleManodopera > 0
      ? Math.round(((totaleManodopera - totCostoManodopera) / totaleManodopera) * 1000) / 10
      : null;
  const margineManodoperaTier = resolveMargineTier(margineManodoperaPct);
  const manodoperaNumInputClass = `${dsInput} ${dsInputNoSpinner} w-full text-center tabular-nums`;

  return (
    <div className="space-y-4">
      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2">
        <h3 className={preventivoEditorSubsectionTitle}>Descrizione per il cliente</h3>
        <FormFieldBlock>
          <PreventivoLavorazioniClienteTextarea
            lavorazioniFieldId={lavorazioniFieldId}
            specifiche={draft.descrizioneLavorazioniCliente}
            sanificazioneDescrizione={sanificazioneDescrizione}
            onDescrizioneChange={onDescrizioneChange}
          />
        </FormFieldBlock>
        <p className={preventivoEditorHint}>
          Testo generato dalla scheda tecnica collegata. Le modifiche restano su questo preventivo; «Rigenera da
          scheda» aggiorna dal catalogo.
          {draft.descriptionGenerationId ? (
            <span className="mt-1 block tabular-nums text-[color:var(--cab-text-muted)]">
              Generazione {draft.descriptionGenerationId.slice(0, 8)}…
              {draft.descriptionEngineMeta?.kbVersion != null
                ? ` · KB v${draft.descriptionEngineMeta.kbVersion}`
                : null}
            </span>
          ) : null}
        </p>
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2">
        <h3 className={preventivoEditorSubsectionTitle}>Manodopera e collaudo</h3>

        <div className={preventivoEditorPanelClass}>
          <div className={preventivoEditorManodoperaTableWrap}>
            <div
              className={`${preventivoEditorManodoperaRowGrid} border-b border-[color:var(--cab-border)] px-3 py-1.5`}
            >
              <span className={preventivoEditorManodoperaHeaderCell}>Addetto</span>
              <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
              <span className={preventivoEditorManodoperaNumHeaderCell}>Ore</span>
              <span className={preventivoEditorManodoperaNumHeaderCell}>Costo (€)</span>
              <span className={preventivoEditorManodoperaNumHeaderCell}>Prezzo (€)</span>
              <span className={preventivoEditorManodoperaNumHeaderCell} aria-hidden />
            </div>

            {draft.manodopera.righeAddetti.map((a, idx) => {
              const oreScheda = oreSchedaForPreventivoRigaAddetto(oreSchedaAddettoMap, addettiRecords, a);
              return (
              <div
                key={`${idx}-${a.addettoId ?? a.addettoLegacy ?? "row"}`}
                className={`${preventivoEditorManodoperaRowGrid} border-b border-[color:var(--cab-border)] px-3 py-2`}
              >
                <div className={preventivoEditorManodoperaAddettoCol}>
                  <AddettoPicker
                    value={
                      backfillAddettoIdFromLegacyString(addettiRecords, a.addettoLegacy, a.addettoId) ||
                      a.addettoId
                    }
                    onChange={(addettoId) => onPatchAddettoRow(idx, { addettoId })}
                    ariaLabel={`Addetto riga ${idx + 1}`}
                    allowEmpty
                  />
                  {a.legacyWarning ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{a.legacyWarning}</p>
                  ) : null}
                </div>
                <div className={`${preventivoEditorManodoperaActionsCol} flex items-center justify-center`}>
                  <IconActionButton
                    label="Rimuovi addetto"
                    className={preventivoEditorRowRemoveBtn}
                    onClick={() => onRemoveAddettoRow(idx)}
                  >
                    <ShellNavIconClose dense className="h-5 w-5" />
                  </IconActionButton>
                </div>
                <div className={preventivoEditorManodoperaNumCell}>
                  {oreScheda != null ? (
                    <div className={preventivoEditorManodoperaOreFieldWrap}>
                      <span
                        className={preventivoEditorManodoperaSchedaOreInside}
                        title="Ore da scheda lavorazioni (non modificabili)"
                        aria-label={`Ore scheda addetto riga ${idx + 1}: ${oreScheda}`}
                      >
                        Scheda {oreScheda}
                      </span>
                      <GestionaleNumericField
                        className={preventivoEditorManodoperaOreFieldInputInner}
                        value={a.ore}
                        preset={ORE_PREVENTIVO_ADDETTO_PRESET}
                        onCommit={(ore) => onPatchAddettoRow(idx, { ore })}
                        aria-label={`Ore addetto riga ${idx + 1}`}
                      />
                    </div>
                  ) : (
                    <GestionaleNumericField
                      className={manodoperaNumInputClass}
                      value={a.ore}
                      preset={ORE_PREVENTIVO_ADDETTO_PRESET}
                      onCommit={(ore) => onPatchAddettoRow(idx, { ore })}
                      aria-label={`Ore addetto riga ${idx + 1}`}
                    />
                  )}
                </div>
                <div className={preventivoEditorManodoperaNumCell}>
                  {idx === 0 ? (
                    <GestionaleNumericField
                      id={costoOrarioFieldId}
                      className={manodoperaNumInputClass}
                      value={draft.manodopera.costoOrario}
                      preset={NUMERIC_PRESETS.prezzo}
                      onCommit={onCostoOrarioChange}
                      aria-label="Costo orario interno"
                    />
                  ) : null}
                </div>
                <div className={preventivoEditorManodoperaNumCell}>
                  {idx === 0 ? (
                    <GestionaleNumericField
                      id={prezzoOrarioFieldId}
                      className={manodoperaNumInputClass}
                      value={draft.manodopera.prezzoOrario}
                      preset={NUMERIC_PRESETS.prezzo}
                      onCommit={onPrezzoOrarioChange}
                      aria-label="Prezzo orario cliente"
                    />
                  ) : null}
                </div>
              </div>
              );
            })}

            <div className={preventivoEditorManodoperaKpiRow}>
              <button type="button" className={preventivoEditorManodoperaAddBtn} onClick={onAddAddettoRow}>
                <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
                Aggiungi addetto
              </button>
              <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
              <div className={preventivoEditorManodoperaFooterMetricCell}>
                <span className={preventivoEditorManodoperaFooterMetricLabel}>Ore tot.</span>
                <span className={preventivoEditorManodoperaFooterMetricValue}>
                  {draft.manodopera.oreTotali}
                </span>
              </div>
              <div className={preventivoEditorManodoperaFooterMetricCell}>
                <span className={preventivoEditorManodoperaFooterMetricLabel}>Costo tot.</span>
                <span className={preventivoEditorManodoperaFooterMetricValue}>
                  {fmtPreventivoEuro(totCostoManodopera)}
                </span>
              </div>
              <div className={preventivoEditorManodoperaFooterMetricCell}>
                <span className={preventivoEditorManodoperaFooterMetricLabel}>Ricavo tot.</span>
                <span className={preventivoEditorManodoperaFooterMetricValue}>
                  {fmtPreventivoEuro(totaleManodopera)}
                </span>
              </div>
              <div className={preventivoEditorManodoperaFooterMetricCell}>
                <span className={preventivoEditorManodoperaFooterMetricLabel}>Margine</span>
                <span
                  className={`${preventivoEditorManodoperaFooterMetricValue} ${margineTierClass(margineManodoperaTier)}`}
                >
                  {fmtPreventivoEuro(totMargineManodopera)}
                </span>
              </div>
            </div>
          </div>

          <div className={preventivoEditorManodoperaVoceRow}>
            <div className={preventivoEditorManodoperaAddettoCol}>
              <input
                type="text"
                className={preventivoEditorVoceDescInput}
                value={sanificazioneDescrizione}
                maxLength={TEXT_SHORT}
                onChange={(e) =>
                  onSanificazioneDescrizioneChange(sliceInputValue(e.target.value, TEXT_SHORT))
                }
                onBlur={() => {
                  const resolved = resolveSanificazioneDescrizione(sanificazioneDescrizione);
                  if (resolved !== sanificazioneDescrizione) onSanificazioneDescrizioneChange(resolved);
                }}
                aria-label="Descrizione sanificazione"
              />
            </div>
            <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
            <div className={preventivoEditorManodoperaNumCell}>
              <GestionaleNumericField
                id="preventivo-sanificazione-ore"
                className={manodoperaNumInputClass}
                value={sanificazioneOre}
                preset={ORE_PREVENTIVO_ADDETTO_PRESET}
                onCommit={onSanificazioneOreChange}
                aria-label="Ore sanificazione"
              />
            </div>
            <div className={preventivoEditorManodoperaNumCell} aria-hidden />
            <div className={preventivoEditorManodoperaNumCell}>
              <GestionaleNumericField
                id="preventivo-sanificazione-prezzo"
                className={manodoperaNumInputClass}
                value={sanificazionePrezzo}
                preset={NUMERIC_PRESETS.prezzo}
                onCommit={onSanificazionePrezzoChange}
                aria-label="Prezzo sanificazione"
              />
            </div>
          </div>

          <div className={preventivoEditorManodoperaVoceRow}>
            <div className={preventivoEditorManodoperaAddettoCol}>
              <input
                type="text"
                className={preventivoEditorVoceDescInput}
                value={collaudoDescrizione}
                maxLength={TEXT_SHORT}
                onChange={(e) =>
                  onCollaudoDescrizioneChange(sliceInputValue(e.target.value, TEXT_SHORT))
                }
                onBlur={() => {
                  const resolved = resolveCollaudoDescrizione(collaudoDescrizione);
                  if (resolved !== collaudoDescrizione) onCollaudoDescrizioneChange(resolved);
                }}
                aria-label="Descrizione collaudo"
              />
            </div>
            <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
            <div className={preventivoEditorManodoperaNumCell}>
              <GestionaleNumericField
                id="preventivo-collaudo-ore"
                className={manodoperaNumInputClass}
                value={collaudoOre}
                preset={ORE_PREVENTIVO_ADDETTO_PRESET}
                onCommit={onCollaudoOreChange}
                aria-label="Ore collaudo"
              />
            </div>
            <div className={preventivoEditorManodoperaNumCell} aria-hidden />
            <div className={preventivoEditorManodoperaNumCell}>
              <GestionaleNumericField
                id="preventivo-collaudo-prezzo"
                className={manodoperaNumInputClass}
                value={collaudoPrezzo}
                preset={NUMERIC_PRESETS.prezzo}
                onCommit={onCollaudoPrezzoChange}
                aria-label="Prezzo collaudo"
              />
            </div>
          </div>
        </div>

        <PreventivoEditorTotalBar label="Totale sezione" value={fmtPreventivoEuro(sezioneTotale)} />
      </div>
    </div>
  );
}
