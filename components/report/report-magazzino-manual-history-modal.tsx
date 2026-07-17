"use client";

import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import type { MagazzinoMonthRow } from "@/lib/report/magazzino-monthly-rows";
import { dsInput } from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

export function ReportMagazzinoManualHistoryModal({
  rows,
  monthKey,
  entrate,
  uscite,
  deltaQty,
  deltaCapitale,
  capitaleFinale,
  onMonthKeyChange,
  onEntrateChange,
  onUsciteChange,
  onDeltaQtyChange,
  onDeltaCapitaleChange,
  onCapitaleFinaleChange,
  onClose,
  onSave,
}: {
  rows: readonly MagazzinoMonthRow[];
  monthKey: string;
  entrate: string;
  uscite: string;
  deltaQty: string;
  deltaCapitale: string;
  capitaleFinale: string;
  onMonthKeyChange: (key: string) => void;
  onEntrateChange: (value: string) => void;
  onUsciteChange: (value: string) => void;
  onDeltaQtyChange: (value: string) => void;
  onDeltaCapitaleChange: (value: string) => void;
  onCapitaleFinaleChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <GestionaleModalShell
      modalSize="analytics"
      modalHeight="tall"
      title="Storico manuale magazzino"
      titleId="report-magazzino-manual-title"
      onRequestClose={onClose}
    >
      <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-0">
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Opzionale: sovrascrivi i valori calcolati per un mese. Lascia vuoto un campo per usare il valore automatico.
          </p>
          <label htmlFor="report-mag-manual-mese" className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
            Mese (YYYY-MM)
            <GlobalSelect
              id="report-mag-manual-mese"
              variant="default"
              selectOnly
              inputClassName={`${globalInputFieldFilter} mt-1 w-full`}
              items={(rows.length ? rows : [{ key: monthKey || "2026-01", label: monthKey || "2026-01" }]).map((r) => ({
                value: r.key,
                label: r.key,
              }))}
              value={monthKey}
              onChange={onMonthKeyChange}
              strictFromList
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label htmlFor="report-mag-manual-entrate" className="text-xs text-[color:var(--cab-text-muted)]">
              Entrate
              <input
                id="report-mag-manual-entrate"
                className={`${dsInput} mt-1`}
                inputMode="decimal"
                value={entrate}
                onChange={(e) => onEntrateChange(e.target.value)}
              />
            </label>
            <label htmlFor="report-mag-manual-uscite" className="text-xs text-[color:var(--cab-text-muted)]">
              Uscite
              <input
                id="report-mag-manual-uscite"
                className={`${dsInput} mt-1`}
                inputMode="decimal"
                value={uscite}
                onChange={(e) => onUsciteChange(e.target.value)}
              />
            </label>
            <label htmlFor="report-mag-manual-dqty" className="text-xs text-[color:var(--cab-text-muted)]">
              Δ Quantità
              <input
                id="report-mag-manual-dqty"
                className={`${dsInput} mt-1`}
                inputMode="decimal"
                value={deltaQty}
                onChange={(e) => onDeltaQtyChange(e.target.value)}
              />
            </label>
            <label htmlFor="report-mag-manual-dcap" className="text-xs text-[color:var(--cab-text-muted)]">
              Δ Capitale (€)
              <input
                id="report-mag-manual-dcap"
                className={`${dsInput} mt-1`}
                inputMode="decimal"
                value={deltaCapitale}
                onChange={(e) => onDeltaCapitaleChange(e.target.value)}
              />
            </label>
            <label htmlFor="report-mag-manual-cfin" className="col-span-2 text-xs text-[color:var(--cab-text-muted)]">
              Capitale finale (€)
              <input
                id="report-mag-manual-cfin"
                className={`${dsInput} mt-1`}
                inputMode="decimal"
                value={capitaleFinale}
                onChange={(e) => onCapitaleFinaleChange(e.target.value)}
              />
            </label>
          </div>
        </GestionaleModalScrollBody>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--cab-border)] p-4">
          <button type="button" className={erpBtnNeutral} onClick={onClose}>
            Annulla
          </button>
          <button type="button" className={erpBtnAccent} onClick={onSave}>
            Salva
          </button>
        </div>
      </div>
    </GestionaleModalShell>
  );
}
