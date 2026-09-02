"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { TruncatedTextTooltip } from "@/components/ui";
import { gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog-styles";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { isOrdineSpesaVariaRiga } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import {
  findOrdineFornitoreStockBlockedLines,
  ordineFornitoreDeliveryHasStockDelta,
  validateOrdineFornitoreDeliveryRequest,
} from "@/lib/ordini-fornitori/ordine-fornitore-delivery-validation";
import { ordineFornitoreResidualQty } from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { preventivoEditorFooterBtnNeutral, preventivoEditorTableInputNumber } from "@/components/preventivi/preventivo-editor-ui";

type LineState = {
  rigaId: string;
  codice: string;
  descrizione: string;
  quantita: number;
  quantitaRicevuta: number;
  ricambioId: string | null;
  target: number;
};

function buildLineStates(record: OrdineFornitoreRecord): LineState[] {
  return record.righe
    .filter((r) => !isOrdineSpesaVariaRiga(r.meta))
    .map((r) => ({
      rigaId: r.id,
      codice: r.codice,
      descrizione: r.descrizione,
      quantita: r.quantita,
      quantitaRicevuta: r.quantitaRicevuta ?? 0,
      ricambioId: r.ricambioId,
      target: (r.quantitaRicevuta ?? 0) + ordineFornitoreResidualQty(r.quantita, r.quantitaRicevuta ?? 0),
    }));
}

export function OrdineFornitoreDeliveryModal({
  record,
  open,
  onClose,
  onCompleted,
}: {
  record: OrdineFornitoreRecord;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [lines, setLines] = useState<LineState[]>(() => buildLineStates(record));
  const [pending, setPending] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  const batchIdRef = useMemo(() => crypto.randomUUID(), [record.id, open]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setLines(buildLineStates(record));
  }, [open, record]);

  const stockBlockedLines = useMemo(() => findOrdineFornitoreStockBlockedLines(lines), [lines]);
  const hasStockDelta = ordineFornitoreDeliveryHasStockDelta(lines);
  const hasReceiptDelta = lines.some((l) => l.target > l.quantitaRicevuta);

  const submit = useCallback(
    async (applyStock: boolean) => {
      const payloadLines = lines.map((l) => ({
        riga_id: l.rigaId,
        quantita_ricevuta_target: l.target,
      }));
      const validationError = validateOrdineFornitoreDeliveryRequest({
        status: record.status,
        righe: record.righe,
        lines: payloadLines,
        applyStock,
      });
      if (validationError) {
        gestToast.errorOnce("ordine-delivery-validate", validationError, { module: "ordini_fornitori" });
        return;
      }
      if (!hasReceiptDelta) {
        gestToast.errorOnce("ordine-delivery-validate", "Indica almeno una quantità ricevuta.", {
          module: "ordini_fornitori",
        });
        return;
      }

      setPending(true);
      try {
        const res = await ordiniFornitoriEntry.receiveDelivery(record.id, {
          batch_id: batchIdRef,
          apply_stock: applyStock,
          lines: payloadLines,
        });
        if (!res.success) throw new Error(res.error ?? "Ricezione fallita.");
        if (res.data?.complete) {
          gestToast.successOnce("ordine-delivery", "Ordine consegnato.");
        } else {
          gestToast.successOnce(
            "ordine-delivery",
            "Ricezione parziale registrata. L'ordine resta in consegna.",
          );
        }
        onCompleted();
        onClose();
      } catch (e) {
        gestToast.errorOnce("ordine-delivery", e, { module: "ordini_fornitori" });
      } finally {
        setPending(false);
      }
    },
    [batchIdRef, gestToast, hasReceiptDelta, lines, onClose, onCompleted, record.id, record.righe, record.status],
  );

  const table = (
    <div className="space-y-3 text-sm">
      <p className="text-[color:var(--cab-text-muted)]">
        Registra le quantità ricevute. Vuoi aggiungere i ricambi di questo ordine al magazzino?
      </p>
      {stockBlockedLines.length > 0 ? (
        <div
          role="alert"
          className="rounded-[var(--ds-radius-lg)] border border-amber-300/80 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          Per caricare il magazzino collega un ricambio a:{" "}
          {stockBlockedLines.map((l) => l.codice || l.descrizione).join(", ")}.
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-[color:var(--cab-border)] text-left text-[color:var(--cab-text-muted)]">
              <th className="py-1 pe-2 font-medium">Articolo</th>
              <th className="py-1 pe-2 font-medium">Ordinati</th>
              <th className="py-1 pe-2 font-medium">Già ricevuti</th>
              <th className="py-1 pe-2 font-medium">Ricevuti ora</th>
              <th className="py-1 font-medium">Mancanti</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const missing = Math.max(0, line.quantita - line.target);
              return (
                <tr
                  key={line.rigaId}
                  className="border-b border-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]"
                >
                  <td className="max-w-[14rem] py-1.5 pe-2">
                    <TruncatedTextTooltip text={line.descrizione} className="truncate font-medium" />
                    {line.codice ? (
                      <div className="font-mono text-[10px] text-[color:var(--cab-text-muted)]">{line.codice}</div>
                    ) : null}
                    {!line.ricambioId ? (
                      <div className="mt-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                        Non collegato a magazzino
                      </div>
                    ) : null}
                  </td>
                  <td className="py-1.5 pe-2 font-mono tabular-nums">{line.quantita}</td>
                  <td className="py-1.5 pe-2 font-mono tabular-nums">{line.quantitaRicevuta}</td>
                  <td className="py-1.5 pe-2">
                    <input
                      type="number"
                      min={line.quantitaRicevuta}
                      max={line.quantita}
                      step="any"
                      className={preventivoEditorTableInputNumber}
                      value={line.target}
                      disabled={pending}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        const clamped = Math.min(line.quantita, Math.max(line.quantitaRicevuta, n));
                        setLines((prev) =>
                          prev.map((l) => (l.rigaId === line.rigaId ? { ...l, target: clamped } : l)),
                        );
                      }}
                    />
                  </td>
                  <td className="py-1.5 font-mono tabular-nums">{missing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Segna come consegnato"
      message={table}
      pending={pending}
      onCancel={onClose}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onClose} disabled={pending}>
            Annulla
          </GestionaleModalFooterCancelButton>
          <button
            type="button"
            className={`${preventivoEditorFooterBtnNeutral} w-full sm:w-auto`}
            disabled={pending || !hasReceiptDelta}
            onClick={() => void submit(false)}
          >
            Conferma consegna senza aggiungere al magazzino
          </button>
          <GestionaleModalFooterSaveButton
            type="button"
            className="w-full sm:w-auto"
            loading={pending}
            disabled={pending || !hasStockDelta || stockBlockedLines.length > 0}
            onClick={() => void submit(true)}
          >
            Conferma consegna + aggiungi al magazzino
          </GestionaleModalFooterSaveButton>
        </div>
      }
    />
  );
}
