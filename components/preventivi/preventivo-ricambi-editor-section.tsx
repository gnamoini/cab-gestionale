"use client";

import { useState } from "react";
import { CaptureRicambioCodiceField } from "@/components/document-capture/capture-ricambio-codice-field";
import { RicambioMagazzinoInlineHint } from "@/components/document-capture/ricambio-magazzino-inline-hint";
import { IconActionButton } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { GestionaleNumericField } from "@/components/gestionale/gestionale-numeric-field";
import { GestionaleQuantityField } from "@/components/gestionale/gestionale-quantity-field";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  preventivoEditorAddRowBtn,
  preventivoEditorBody,
  preventivoEditorMoneyValueSm,
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
  preventivoEditorTableInputNumber,
  preventivoEditorTableTdClass,
  preventivoEditorUmSegmentOff,
  preventivoEditorUmSegmentOn,
  preventivoEditorUmSegmentWrap,
} from "@/components/preventivi/preventivo-editor-ui";
import { NUMERIC_PRESETS } from "@/lib/core/numeric-input-policy";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  formatRicambioUnitaMisuraLabel,
  parseRicambioUnitaMisura,
  RICAMBIO_UNITA_MISURA_VALUES,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import {
  applyMagazzinoToPreventivoRigaRicambio,
  suggestionsForPreventivoRigaRicambio,
} from "@/lib/preventivi/preventivo-ricambio-magazzino";
import { PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE } from "@/lib/preventivi/preventivi-voci-standard";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";
import { RicambioRowAutocompletePortal } from "@/lib/selector-core/legacy-selector-adapters";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  dsFocus,
  dsInput,
  dsScrollbar,
  dsTable,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";
import {
  fmtPreventivoEuro,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";

const RICAMBIO_CODICE_INPUT = `${dsInput} min-h-10 w-full min-w-0 shrink-0`;

const umCellLabel: Record<RicambioUnitaMisura, string> = {
  pz: "pz",
  metri: "m",
  lt: "lt",
};

const ricambiTableMinWidthClass = "min-w-[52rem]";

function UnitaMisuraCell({
  value,
  rowIndex,
  onChange,
}: {
  value: RicambioUnitaMisura;
  rowIndex: number;
  onChange: (unita: RicambioUnitaMisura) => void;
}) {
  return (
    <div
      className={preventivoEditorUmSegmentWrap}
      role="group"
      aria-label={`Unità di misura riga ${rowIndex + 1}`}
    >
      {RICAMBIO_UNITA_MISURA_VALUES.map((unita) => (
        <button key={unita} type="button" className={`${value === unita ? preventivoEditorUmSegmentOn : preventivoEditorUmSegmentOff} ${dsFocus}`} aria-pressed={value === unita} aria-label={formatRicambioUnitaMisuraLabel(unita)} onClick={() => onChange(unita)}>
          {umCellLabel[unita]}
        </button>
      ))}
    </div>
  );
}

function AggiungiRigaRow({ onAddRiga }: { onAddRiga: () => void }) {
  return (
    <tr className={dsTableRow}>
      <td colSpan={8} className="px-2 py-1.5">
        <button type="button" className={preventivoEditorAddRowBtn} onClick={onAddRiga}>
          <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
          Aggiungi riga ricambio
        </button>
      </td>
    </tr>
  );
}

function RicambioRigaRow({
  r,
  idx,
  prodotti,
  acRowId,
  setAcRowId,
  resolveScontoPercent,
  onPatchRiga,
  onRemoveRiga,
}: {
  r: PreventivoRigaRicambio;
  idx: number;
  prodotti: readonly RicambioMagazzino[];
  acRowId: string | null;
  setAcRowId: (id: string | null) => void;
  resolveScontoPercent: (item: RicambioMagazzino) => number;
  onPatchRiga: (id: string, patch: Partial<PreventivoRigaRicambio>) => void;
  onRemoveRiga: (id: string) => void;
}) {
  const [pendingMag, setPendingMag] = useState<RicambioMagazzino | null>(null);
  const [dismissedMagId, setDismissedMagId] = useState<string | null>(null);
  const unita = parseRicambioUnitaMisura(r.unitaMisura);
  const showMagHint = pendingMag && pendingMag.id !== dismissedMagId && pendingMag.id !== r.ricambioId;

  function applyMagazzino(item: RicambioMagazzino, patch?: Partial<PreventivoRigaRicambio>) {
    onPatchRiga(
      r.id,
      applyMagazzinoToPreventivoRigaRicambio({ ...r, ...patch }, item, resolveScontoPercent(item)),
    );
    setPendingMag(null);
  }

  return (
    <>
      <tr className={dsTableRow} data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <CaptureRicambioCodiceField
            value={r.codiceOE}
            magazzino={prodotti}
            inputClassName={RICAMBIO_CODICE_INPUT}
            onChange={(codiceOE) => {
              onPatchRiga(r.id, { codiceOE, ricambioId: null });
              setPendingMag(null);
              setAcRowId(r.id);
            }}
            onPick={(item, codiceUi) => {
              applyMagazzino(item, { codiceOE: codiceUi });
            }}
            onBlurExactMatch={(item) => {
              if (dismissedMagId === item.id || r.ricambioId === item.id) return;
              setPendingMag(item);
            }}
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <RicambioRowAutocompletePortal
            value={r.descrizione}
            onChange={(descrizione) => {
              onPatchRiga(r.id, { descrizione });
              setAcRowId(r.id);
            }}
            open={acRowId === r.id}
            onOpenChange={(next) => setAcRowId(next ? r.id : null)}
            suggestions={suggestionsForPreventivoRigaRicambio(r, prodotti).map((p) => ({
              id: p.id,
              descrizione: p.descrizione ?? "",
              marca: p.marca ?? "",
              codiceFornitoreOriginale: ricambioCodiceForUi(p.codiceFornitoreOriginale),
            }))}
            onSelect={(s) => {
              const item = prodotti.find((p) => p.id === s.id);
              if (item) {
                applyMagazzino(item);
              } else {
                onPatchRiga(r.id, {
                  ricambioId: s.id,
                  descrizione: s.descrizione,
                  codiceOE: ricambioCodiceForUi(s.codiceFornitoreOriginale),
                });
              }
              setAcRowId(null);
            }}
            placeholder="Descrizione ricambio"
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <GestionaleQuantityField
            className={preventivoEditorTableInputNumber}
            value={r.quantita}
            unitaMisura={unita}
            onCommit={(quantita) => onPatchRiga(r.id, { quantita })}
            aria-label={`Quantità riga ${idx + 1}`}
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <UnitaMisuraCell
            value={unita}
            rowIndex={idx}
            onChange={(unitaMisura) => onPatchRiga(r.id, { unitaMisura })}
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <GestionaleNumericField
            className={preventivoEditorTableInputNumber}
            value={r.prezzoUnitario}
            preset={NUMERIC_PRESETS.prezzo}
            onCommit={(prezzoUnitario) => onPatchRiga(r.id, { prezzoUnitario })}
            aria-label={`Prezzo unitario riga ${idx + 1}`}
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <GestionaleNumericField
            className={preventivoEditorTableInputNumber}
            value={r.scontoPercent ?? 0}
            preset={NUMERIC_PRESETS.percentuale}
            onCommit={(scontoPercent) => onPatchRiga(r.id, { scontoPercent })}
            aria-label={`Sconto percentuale riga ${idx + 1}`}
          />
        </td>
        <td className={`${preventivoEditorTableTdClass} text-right align-middle ${preventivoEditorMoneyValueSm}`}>
          {fmtPreventivoEuro(totaleNettoRigaRicambio(r))}
        </td>
        <td className={`${preventivoEditorTableTdClass} align-middle`}>
          <div className="flex justify-end">
            <IconActionButton
              label="Elimina riga"
              className={dsTableActionBtnDanger}
              onClick={() => onRemoveRiga(r.id)}
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
        </td>
      </tr>
      {showMagHint ? (
        <tr>
          <td colSpan={8} className="px-2 pb-2">
            <RicambioMagazzinoInlineHint
              item={pendingMag}
              onUseRicambio={() => applyMagazzino(pendingMag)}
              onDismiss={() => {
                setDismissedMagId(pendingMag.id);
                setPendingMag(null);
              }}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function MaterialiConsumoRigaRow({
  r,
  onPatchRiga,
}: {
  r: PreventivoRigaRicambio;
  onPatchRiga: (id: string, patch: Partial<PreventivoRigaRicambio>) => void;
}) {
  return (
    <tr
      className={`${dsTableRow} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_28%,var(--cab-card))]`}
    >
      <td className={`${preventivoEditorTableTdClass} ${preventivoEditorBody} text-[color:var(--cab-text-muted)]`}>
        —
      </td>
      <td className={`${preventivoEditorTableTdClass} ${preventivoEditorBody} font-medium`}>
        {PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE}
      </td>
      <td className={`${preventivoEditorTableTdClass} text-right tabular-nums ${preventivoEditorBody}`}>1</td>
      <td className={`${preventivoEditorTableTdClass} ${preventivoEditorBody} text-[color:var(--cab-text-muted)]`}>
        —
      </td>
      <td className={preventivoEditorTableTdClass}>
        <GestionaleNumericField
          id="preventivo-materiali-prezzo"
          className={preventivoEditorTableInputNumber}
          value={r.prezzoUnitario}
          preset={NUMERIC_PRESETS.prezzo}
          onCommit={(prezzoUnitario) => onPatchRiga(r.id, { prezzoUnitario })}
          aria-label="Prezzo materiali di consumo"
        />
      </td>
      <td className={`${preventivoEditorTableTdClass} text-right tabular-nums ${preventivoEditorBody} text-[color:var(--cab-text-muted)]`}>
        0
      </td>
      <td className={`${preventivoEditorTableTdClass} text-right ${preventivoEditorMoneyValueSm}`}>
        {fmtPreventivoEuro(totaleNettoRigaRicambio(r))}
      </td>
      <td className={preventivoEditorTableTdClass} aria-hidden />
    </tr>
  );
}

export function PreventivoRicambiEditorSection({
  righe,
  materialiConsumo,
  totaleRicambi,
  prodotti,
  resolveScontoPercent,
  onAddRiga,
  onPatchRiga,
  onRemoveRiga,
}: {
  righe: readonly PreventivoRigaRicambio[];
  materialiConsumo: PreventivoRigaRicambio | null;
  totaleRicambi: number;
  prodotti: readonly RicambioMagazzino[];
  resolveScontoPercent: (item: RicambioMagazzino) => number;
  onAddRiga: () => void;
  onPatchRiga: (id: string, patch: Partial<PreventivoRigaRicambio>) => void;
  onRemoveRiga: (id: string) => void;
}) {
  const [acRowId, setAcRowId] = useState<string | null>(null);

  return (
    <section {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2.5">
      <h3 className={preventivoEditorSubsectionTitle}>Righe ricambi e materiali</h3>

      <div className={`${preventivoEditorPanelClass} min-w-0`}>
        <div
          className={`${dsTableWrap} ${dsScrollbar} min-w-0 border-0 bg-transparent`}
          role="region"
          aria-label="Righe ricambi e materiali, scorrimento orizzontale su schermi piccoli"
        >
          <table className={`${dsTable} w-full ${ricambiTableMinWidthClass}`}>
            <colgroup>
              <col className="w-[7.5rem]" />
              <col />
              <col className="w-[4.5rem]" />
              <col className="w-[8.25rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[7rem]" />
              <col className="w-[2.75rem]" />
            </colgroup>
            <GlobalTableHead sticky>
              <GlobalTableHeadLabel label="Cod. OE" />
              <GlobalTableHeadLabel label="Descrizione" thClassName="min-w-[10rem]" />
              <GlobalTableHeadLabel label="Qtà" align="right" />
              <GlobalTableHeadLabel label="U.M." />
              <GlobalTableHeadLabel label="Prezzo unit." align="right" />
              <GlobalTableHeadLabel label="Sconto %" align="right" />
              <GlobalTableHeadLabel label="Totale netto" align="right" />
              <GlobalTableHeadLabel label="" thClassName="w-10" />
            </GlobalTableHead>
            <tbody>
              {righe.map((r, idx) => (
                <RicambioRigaRow
                  key={r.id}
                  r={r}
                  idx={idx}
                  prodotti={prodotti}
                  acRowId={acRowId}
                  setAcRowId={setAcRowId}
                  resolveScontoPercent={resolveScontoPercent}
                  onPatchRiga={onPatchRiga}
                  onRemoveRiga={onRemoveRiga}
                />
              ))}
              <AggiungiRigaRow onAddRiga={onAddRiga} />
              {materialiConsumo ? (
                <MaterialiConsumoRigaRow r={materialiConsumo} onPatchRiga={onPatchRiga} />
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <PreventivoEditorTotalBar label="Totale sezione" value={fmtPreventivoEuro(totaleRicambi)} />
    </section>
  );
}
