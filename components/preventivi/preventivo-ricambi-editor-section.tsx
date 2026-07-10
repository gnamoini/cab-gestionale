"use client";

import { Tooltip } from "@/components/ui";
import { IconActionButton } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  preventivoEditorAddRowBtn,
  preventivoEditorBody,
  preventivoEditorMoneyValueSm,
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
  preventivoEditorTableInput,
  preventivoEditorTableInputNumber,
  preventivoEditorTableTdClass,
  preventivoEditorUmSegmentOff,
  preventivoEditorUmSegmentOn,
  preventivoEditorUmSegmentWrap,
} from "@/components/preventivi/preventivo-editor-ui";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  formatRicambioUnitaMisuraLabel,
  parseRicambioUnitaMisura,
  RICAMBIO_UNITA_MISURA_VALUES,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import { PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE } from "@/lib/preventivi/preventivi-voci-standard";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";
import {
  dsFocus,
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
        <Tooltip content={formatRicambioUnitaMisuraLabel(unita)}><button key={unita} type="button" className={`${value === unita ? preventivoEditorUmSegmentOn : preventivoEditorUmSegmentOff} ${dsFocus}`} aria-pressed={value === unita} aria-label={formatRicambioUnitaMisuraLabel(unita)} onClick={() => onChange(unita)}>
          {umCellLabel[unita]}
        </button></Tooltip>
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
  onPatchRiga,
  onRemoveRiga,
}: {
  r: PreventivoRigaRicambio;
  idx: number;
  onPatchRiga: (id: string, patch: Partial<PreventivoRigaRicambio>) => void;
  onRemoveRiga: (id: string) => void;
}) {
  const unita = parseRicambioUnitaMisura(r.unitaMisura);
  return (
    <tr className={dsTableRow}>
      <td className={preventivoEditorTableTdClass}>
        <input
          className={preventivoEditorTableInput}
          value={r.codiceOE}
          onChange={(e) => onPatchRiga(r.id, { codiceOE: e.target.value })}
          aria-label={`Codice OE riga ${idx + 1}`}
        />
      </td>
      <td className={preventivoEditorTableTdClass}>
        <input
          className={preventivoEditorTableInput}
          value={r.descrizione}
          onChange={(e) => onPatchRiga(r.id, { descrizione: e.target.value })}
          aria-label={`Descrizione riga ${idx + 1}`}
        />
      </td>
      <td className={preventivoEditorTableTdClass}>
        <input
          className={preventivoEditorTableInputNumber}
          type="number"
          min={0.01}
          step={0.01}
          inputMode="decimal"
          value={r.quantita}
          onChange={(e) => onPatchRiga(r.id, { quantita: Math.max(0.01, parseFloat(e.target.value) || 0) })}
          aria-label={`Quantità riga ${idx + 1}`}
        />
      </td>
      <td className={preventivoEditorTableTdClass}>
        <UnitaMisuraCell
          value={unita}
          rowIndex={idx}
          onChange={(unitaMisura) => onPatchRiga(r.id, { unitaMisura })}
        />
      </td>
      <td className={preventivoEditorTableTdClass}>
        <input
          className={preventivoEditorTableInputNumber}
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={r.prezzoUnitario}
          onChange={(e) =>
            onPatchRiga(r.id, { prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0) })
          }
          aria-label={`Prezzo unitario riga ${idx + 1}`}
        />
      </td>
      <td className={preventivoEditorTableTdClass}>
        <input
          className={preventivoEditorTableInputNumber}
          type="number"
          min={0}
          max={100}
          step={0.5}
          inputMode="decimal"
          value={r.scontoPercent ?? 0}
          onChange={(e) =>
            onPatchRiga(r.id, {
              scontoPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
            })
          }
          aria-label={`Sconto percentuale riga ${idx + 1}`}
        />
      </td>
      <td className={`${preventivoEditorTableTdClass} text-right ${preventivoEditorMoneyValueSm}`}>
        {fmtPreventivoEuro(totaleNettoRigaRicambio(r))}
      </td>
      <td className={preventivoEditorTableTdClass}>
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
        <input
          id="preventivo-materiali-prezzo"
          className={preventivoEditorTableInputNumber}
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          aria-label="Prezzo materiali di consumo"
          value={r.prezzoUnitario}
          onChange={(e) =>
            onPatchRiga(r.id, {
              prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0),
            })
          }
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
  onAddRiga,
  onPatchRiga,
  onRemoveRiga,
}: {
  righe: readonly PreventivoRigaRicambio[];
  materialiConsumo: PreventivoRigaRicambio | null;
  totaleRicambi: number;
  onAddRiga: () => void;
  onPatchRiga: (id: string, patch: Partial<PreventivoRigaRicambio>) => void;
  onRemoveRiga: (id: string) => void;
}) {
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
