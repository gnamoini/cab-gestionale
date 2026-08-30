"use client";

import { useMemo, useState } from "react";
import { CaptureRicambioCodiceField } from "@/components/document-capture/capture-ricambio-codice-field";
import { RicambioMagazzinoInlineHint } from "@/components/document-capture/ricambio-magazzino-inline-hint";
import { IconActionButton } from "@/components/design-system";
import { OptionalTooltip } from "@/components/ui";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { RicambioUnitaMisuraPicker } from "@/components/gestionale/magazzino/ricambio-unita-misura-picker";
import { GestionaleNumericField } from "@/components/gestionale/gestionale-numeric-field";
import { GestionaleQuantityField } from "@/components/gestionale/gestionale-quantity-field";
import {
  preventivoEditorBody,
  preventivoEditorManodoperaActionsCol,
  preventivoEditorRicambiAddBtn,
  preventivoEditorManodoperaFooterMetricCell,
  preventivoEditorManodoperaFooterMetricLabel,
  preventivoEditorManodoperaFooterMetricValue,
  preventivoEditorManodoperaHeaderCell,
  preventivoEditorManodoperaNumHeaderCell,
  preventivoEditorPanelClass,
  preventivoEditorRicambiKpiRow,
  preventivoEditorRicambiMarkupReadout,
  preventivoEditorRicambiQtyUmInput,
  preventivoEditorRicambiQtyUmWrap,
  preventivoEditorRicambiRowGrid,
  preventivoEditorRicambiTableWrap,
  preventivoEditorRicambiTotaleCell,
  preventivoEditorRowRemoveBtn,
  preventivoEditorSubsectionTitle,
  preventivoEditorTableInputNumber,
} from "@/components/preventivi/preventivo-editor-ui";
import { NUMERIC_PRESETS } from "@/lib/core/numeric-input-policy";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  parseRicambioUnitaMisura,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import {
  applyMagazzinoToPreventivoRigaRicambio,
  suggestionsForPreventivoRigaRicambio,
} from "@/lib/preventivi/preventivo-ricambio-magazzino";
import {
  fmtPreventivoMarkupPercent,
  resolvePreventivoRigaRicambioCostoUnitario,
  resolvePreventivoRigaRicambioMarkup,
} from "@/lib/preventivi/preventivo-ricambio-markup";
import { PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE } from "@/lib/preventivi/preventivi-voci-standard";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";
import { RicambioRowAutocompletePortal } from "@/lib/selector-core/legacy-selector-adapters";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { dsInput } from "@/lib/ui/design-system";
import {
  fmtPreventivoEuro,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";

const RICAMBIO_CODICE_INPUT = `${dsInput} min-h-10 w-full min-w-0 shrink-0`;
const ricambiNumInputClass = `${preventivoEditorTableInputNumber} text-center`;

function magazzinoForRiga(
  r: Pick<PreventivoRigaRicambio, "ricambioId">,
  prodotti: readonly RicambioMagazzino[],
): RicambioMagazzino | undefined {
  const id = r.ricambioId?.trim();
  if (!id) return undefined;
  return prodotti.find((p) => p.id === id);
}

function RicambioQuantitaUnitaField({
  quantita,
  unita,
  rowIndex,
  onQuantitaCommit,
  onUnitaChange,
}: {
  quantita: number;
  unita: RicambioUnitaMisura;
  rowIndex: number;
  onQuantitaCommit: (quantita: number) => void;
  onUnitaChange: (unita: RicambioUnitaMisura) => void;
}) {
  return (
    <div className={preventivoEditorRicambiQtyUmWrap}>
      <GestionaleQuantityField
        className={preventivoEditorRicambiQtyUmInput}
        value={quantita}
        unitaMisura={unita}
        onCommit={onQuantitaCommit}
        aria-label={`Quantità riga ${rowIndex + 1}`}
      />
      <RicambioUnitaMisuraPicker
        layout="embedded"
        value={unita}
        rowIndex={rowIndex}
        onChange={onUnitaChange}
      />
    </div>
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
  const mag = magazzinoForRiga(r, prodotti);
  const costoUnitario = resolvePreventivoRigaRicambioCostoUnitario(r, mag);
  const markup = resolvePreventivoRigaRicambioMarkup(r, mag);

  function applyMagazzino(item: RicambioMagazzino, patch?: Partial<PreventivoRigaRicambio>) {
    onPatchRiga(
      r.id,
      applyMagazzinoToPreventivoRigaRicambio({ ...r, ...patch }, item, resolveScontoPercent(item)),
    );
    setPendingMag(null);
  }

  return (
    <div className="space-y-1">
      <div
        className={`${preventivoEditorRicambiRowGrid} border-b border-[color:var(--cab-border)] px-3 py-2`}
        data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}
      >
        <div className="min-w-0">
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
        </div>
        <div className="min-w-0">
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
        </div>
        <RicambioQuantitaUnitaField
          quantita={r.quantita}
          unita={unita}
          rowIndex={idx}
          onQuantitaCommit={(quantita) => onPatchRiga(r.id, { quantita })}
          onUnitaChange={(unitaMisura) => onPatchRiga(r.id, { unitaMisura })}
        />
        <GestionaleNumericField
          className={ricambiNumInputClass}
          value={costoUnitario}
          preset={NUMERIC_PRESETS.prezzo}
          onCommit={(next) => onPatchRiga(r.id, { costoUnitario: next })}
          aria-label={`Costo unitario riga ${idx + 1}`}
        />
        <GestionaleNumericField
          className={ricambiNumInputClass}
          value={r.prezzoUnitario}
          preset={NUMERIC_PRESETS.prezzo}
          onCommit={(prezzoUnitario) => onPatchRiga(r.id, { prezzoUnitario })}
          aria-label={`Prezzo unitario riga ${idx + 1}`}
        />
        <OptionalTooltip
          content={
            markup.source === "magazzino"
              ? "Markup da magazzino/scheda ricambio"
              : markup.source === "calcolato"
                ? "Markup calcolato da prezzo e costo"
                : undefined
          }
        >
          <div
            className={preventivoEditorRicambiMarkupReadout}
            aria-label={
              markup.percent != null
                ? `Markup riga ${idx + 1}: ${fmtPreventivoMarkupPercent(markup.percent)}`
                : `Markup riga ${idx + 1}: non disponibile`
            }
          >
            {markup.percent != null ? fmtPreventivoMarkupPercent(markup.percent) : "—"}
          </div>
        </OptionalTooltip>
        <GestionaleNumericField
          className={ricambiNumInputClass}
          value={r.scontoPercent ?? 0}
          preset={NUMERIC_PRESETS.percentuale}
          onCommit={(scontoPercent) => onPatchRiga(r.id, { scontoPercent })}
          aria-label={`Sconto percentuale riga ${idx + 1}`}
        />
        <span className={preventivoEditorRicambiTotaleCell}>
          {fmtPreventivoEuro(totaleNettoRigaRicambio(r))}
        </span>
        <div className={`${preventivoEditorManodoperaActionsCol} flex items-center justify-center`}>
          <IconActionButton
            label="Elimina riga"
            className={preventivoEditorRowRemoveBtn}
            onClick={() => onRemoveRiga(r.id)}
          >
            <ShellNavIconClose dense className="h-5 w-5" />
          </IconActionButton>
        </div>
      </div>
      {showMagHint ? (
        <div className="px-3 pb-2">
          <RicambioMagazzinoInlineHint
            item={pendingMag}
            onUseRicambio={() => applyMagazzino(pendingMag)}
            onDismiss={() => {
              setDismissedMagId(pendingMag.id);
              setPendingMag(null);
            }}
          />
        </div>
      ) : null}
    </div>
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
    <div
      className={`${preventivoEditorRicambiRowGrid} border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_28%,var(--cab-card))] px-3 py-2`}
    >
      <span className={`${preventivoEditorBody} text-[color:var(--cab-text-muted)]`}>—</span>
      <span className={`${preventivoEditorBody} min-w-0 font-medium`}>
        {PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE}
      </span>
      <span className={`${preventivoEditorBody} text-center tabular-nums text-[color:var(--cab-text-muted)]`}>
        1 pz
      </span>
      <span className={`${preventivoEditorBody} text-center text-[color:var(--cab-text-muted)]`}>—</span>
      <GestionaleNumericField
        id="preventivo-materiali-prezzo"
        className={ricambiNumInputClass}
        value={r.prezzoUnitario}
        preset={NUMERIC_PRESETS.prezzo}
        onCommit={(prezzoUnitario) => onPatchRiga(r.id, { prezzoUnitario })}
        aria-label="Prezzo materiali di consumo"
      />
      <span className={preventivoEditorRicambiMarkupReadout} aria-hidden>—</span>
      <span className={`${preventivoEditorBody} text-center tabular-nums text-[color:var(--cab-text-muted)]`}>0</span>
      <span className={preventivoEditorRicambiTotaleCell}>
        {fmtPreventivoEuro(totaleNettoRigaRicambio(r))}
      </span>
      <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
    </div>
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

  const totCostoRicambi = useMemo(() => {
    const all = materialiConsumo ? [...righe, materialiConsumo] : [...righe];
    let sum = 0;
    for (const r of all) {
      const qty = Number.isFinite(r.quantita) && r.quantita > 0 ? r.quantita : 0;
      if (qty <= 0) continue;
      const mag = magazzinoForRiga(r, prodotti);
      const costo = resolvePreventivoRigaRicambioCostoUnitario(r, mag);
      sum += qty * costo;
    }
    return Math.round(sum * 100) / 100;
  }, [righe, materialiConsumo, prodotti]);

  return (
    <section {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2.5">
      <h3 className={preventivoEditorSubsectionTitle}>Righe ricambi e materiali</h3>

      <div className={preventivoEditorPanelClass}>
        <div className={preventivoEditorRicambiTableWrap}>
          <div
            className={`${preventivoEditorRicambiRowGrid} border-b border-[color:var(--cab-border)] px-3 py-1.5`}
          >
            <span className={preventivoEditorManodoperaHeaderCell}>Cod. OE</span>
            <span className={preventivoEditorManodoperaHeaderCell}>Descrizione</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Qtà</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Costo (€)</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Prezzo (€)</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Markup</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Sconto %</span>
            <span className={preventivoEditorManodoperaNumHeaderCell}>Totale</span>
            <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
          </div>

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

          {materialiConsumo ? (
            <MaterialiConsumoRigaRow r={materialiConsumo} onPatchRiga={onPatchRiga} />
          ) : null}

          <div className={preventivoEditorRicambiKpiRow}>
            <button type="button" className={preventivoEditorRicambiAddBtn} onClick={onAddRiga}>
              <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
              Aggiungi riga ricambio
            </button>
            <span aria-hidden />
            <div className={preventivoEditorManodoperaFooterMetricCell}>
              <span className={preventivoEditorManodoperaFooterMetricLabel}>Costo tot.</span>
              <span className={preventivoEditorManodoperaFooterMetricValue}>
                {fmtPreventivoEuro(totCostoRicambi)}
              </span>
            </div>
            <span aria-hidden />
            <span aria-hidden />
            <span aria-hidden />
            <div className={preventivoEditorManodoperaFooterMetricCell}>
              <span className={preventivoEditorManodoperaFooterMetricLabel}>Totale netto</span>
              <span className={preventivoEditorManodoperaFooterMetricValue}>
                {fmtPreventivoEuro(totaleRicambi)}
              </span>
            </div>
            <span className={preventivoEditorManodoperaActionsCol} aria-hidden />
          </div>
        </div>
      </div>

      <PreventivoEditorTotalBar label="Totale sezione" value={fmtPreventivoEuro(totaleRicambi)} />
    </section>
  );
}
