"use client";

import { IconActionButton } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { GestionaleNumericField } from "@/components/gestionale/gestionale-numeric-field";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { FormField, FormFieldBlock } from "@/components/gestionale/schede/gestionale-form-section";
import {
  preventivoEditorAddRowBtn,
  preventivoEditorBody,
  preventivoEditorHint,
  preventivoEditorKpiInlineGroup,
  preventivoEditorKpiInput,
  preventivoEditorKpiLabel,
  preventivoEditorKpiMetricCell,
  preventivoEditorManodoperaKpiRow,
  preventivoEditorMoneyValueSm,
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
  preventivoEditorTableHeader,
} from "@/components/preventivi/preventivo-editor-ui";
import { NUMERIC_PRESETS, ORE_PREVENTIVO_ADDETTO_PRESET } from "@/lib/core/numeric-input-policy";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  PREVENTIVO_COLLAUDO_DESCRIZIONE,
} from "@/lib/preventivi/preventivi-voci-standard";
import {
  composePreventivoLavorazioniClienteEditorText,
  extractPreventivoLavorazioniClienteSpecifiche,
} from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoManodopera, PreventivoRecord } from "@/lib/preventivi/types";
import {
  dsInput,
  dsInputNoSpinner,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_EXTRA } from "@/lib/validation/text-field-limits";
import {
  fmtPreventivoEuro,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";

const manodoperaRowGrid =
  "grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_2.25rem] sm:items-center sm:gap-3";

export function PreventivoLavorazioniEditorSection({
  draft,
  totaleManodopera,
  lavorazioniFieldId,
  costoOrarioFieldId,
  onDescrizioneChange,
  onCostoOrarioChange,
  onCollaudoPrezzoChange,
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
    | "manodopera"
  >;
  totaleManodopera: number;
  lavorazioniFieldId: string;
  costoOrarioFieldId: string;
  onDescrizioneChange: (specifiche: string) => void;
  onCostoOrarioChange: (costoOrario: number) => void;
  onCollaudoPrezzoChange: (prezzo: number) => void;
  onPatchAddettoRow: (idx: number, patch: Partial<PreventivoManodopera["righeAddetti"][number]>) => void;
  onAddAddettoRow: () => void;
  onRemoveAddettoRow: (idx: number) => void;
}) {
  const collaudoPrezzo = draft.collaudoPrezzo ?? 0;
  const sezioneTotale = totaleManodopera + collaudoPrezzo;

  return (
    <div className="space-y-4">
      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2">
        <h3 className={preventivoEditorSubsectionTitle}>Descrizione per il cliente</h3>
        <FormFieldBlock>
          <GestionaleTextarea
            id={lavorazioniFieldId}
            className="min-h-[5.5rem]"
            size="md"
            value={composePreventivoLavorazioniClienteEditorText(draft.descrizioneLavorazioniCliente)}
            onChange={(v) =>
              onDescrizioneChange(extractPreventivoLavorazioniClienteSpecifiche(sliceInputValue(v, TEXT_EXTRA)))
            }
            maxLength={TEXT_EXTRA}
            aria-label="Descrizione lavorazioni per il cliente"
          />
        </FormFieldBlock>
        <p className={preventivoEditorHint}>
          Il testo si genera dai dati della scheda tecnica collegata. Puoi adattarlo liberamente: al salvataggio le
          modifiche restano su questo preventivo e, se diverse dal testo generato, vengono proposte come suggerimento
          per revisione admin (il catalogo TKB non si aggiorna da solo). «Rigenera da scheda» riscrive il testo con
          i dati più recenti.
          {draft.descriptionGenerationId ? (
            <span className="mt-1 block tabular-nums">
              Generazione: {draft.descriptionGenerationId.slice(0, 8)}…
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
          <div className={preventivoEditorManodoperaKpiRow}>
            <div className={preventivoEditorKpiInlineGroup}>
              <label htmlFor={costoOrarioFieldId} className={`${preventivoEditorKpiLabel} whitespace-nowrap`}>
                Costo orario (€/h)
              </label>
              <GestionaleNumericField
                id={costoOrarioFieldId}
                className={preventivoEditorKpiInput}
                value={draft.manodopera.costoOrario}
                preset={NUMERIC_PRESETS.prezzo}
                onCommit={onCostoOrarioChange}
                aria-label="Costo orario"
              />
            </div>
            <div className={preventivoEditorKpiMetricCell}>
              <span className={preventivoEditorKpiLabel}>Ore totali</span>
              <span className={`${preventivoEditorBody} font-semibold tabular-nums`}>
                {draft.manodopera.oreTotali}
              </span>
            </div>
            <div className={preventivoEditorKpiMetricCell}>
              <span className={preventivoEditorKpiLabel}>Importo manodopera</span>
              <span className={preventivoEditorMoneyValueSm}>{fmtPreventivoEuro(totaleManodopera)}</span>
            </div>
          </div>

          <div
            className={`${manodoperaRowGrid} hidden border-b border-[color:var(--cab-border)] px-3 py-2 sm:grid ${preventivoEditorTableHeader}`}
          >
            <span>Addetto</span>
            <span className="text-right">Ore</span>
            <span className="sr-only">Azioni</span>
          </div>

          {draft.manodopera.righeAddetti.map((a, idx) => (
            <div
              key={`${idx}-${a.addetto}`}
              className={`${manodoperaRowGrid} border-b border-[color:var(--cab-border)] px-3 py-2.5`}
            >
              <FormField label="Addetto" className="sm:[&>div]:mt-0 sm:[&>span]:sr-only">
                <input
                  className={dsInput}
                  value={a.addetto}
                  onChange={(e) => onPatchAddettoRow(idx, { addetto: e.target.value })}
                  placeholder="Nome addetto"
                  aria-label={`Addetto riga ${idx + 1}`}
                />
              </FormField>
              <FormField label="Ore" className="sm:[&>div]:mt-0 sm:[&>span]:sr-only">
                <GestionaleNumericField
                  className={`${dsInput} ${dsInputNoSpinner} text-right tabular-nums`}
                  value={a.ore}
                  preset={ORE_PREVENTIVO_ADDETTO_PRESET}
                  onCommit={(ore) => onPatchAddettoRow(idx, { ore })}
                  aria-label={`Ore addetto riga ${idx + 1}`}
                />
              </FormField>
              <div className="flex items-center justify-end">
                <IconActionButton
                  label="Rimuovi addetto"
                  className={dsTableActionBtnDanger}
                  onClick={() => onRemoveAddettoRow(idx)}
                >
                  <svg
                    className={dsTableActionGlyph}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </IconActionButton>
              </div>
            </div>
          ))}

          <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
            <button type="button" className={preventivoEditorAddRowBtn} onClick={onAddAddettoRow}>
              <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
              Aggiungi addetto
            </button>
          </div>

          <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={`${preventivoEditorBody} font-medium`}>{PREVENTIVO_COLLAUDO_DESCRIZIONE}</p>
            </div>
            <FormField
              label="Prezzo (€)"
              htmlFor="preventivo-collaudo-prezzo"
              className="w-full shrink-0 sm:w-auto sm:[&>div]:mt-0"
            >
              <GestionaleNumericField
                id="preventivo-collaudo-prezzo"
                className={`${dsInput} ${dsInputNoSpinner} w-full text-right tabular-nums sm:w-28`}
                value={collaudoPrezzo}
                preset={NUMERIC_PRESETS.prezzo}
                onCommit={onCollaudoPrezzoChange}
                aria-label="Prezzo collaudo"
              />
            </FormField>
          </div>
        </div>

        <PreventivoEditorTotalBar label="Totale sezione" value={fmtPreventivoEuro(sezioneTotale)} />
      </div>
    </div>
  );
}
