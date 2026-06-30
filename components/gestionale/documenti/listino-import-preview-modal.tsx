"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GestionaleAiActionButton, LoadingButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  executeListinoImportRequest,
  fetchListinoImportPreview,
} from "@/lib/magazzino/listino-import/listino-import-client";
import type {
  ListinoImportAction,
  ListinoImportDecision,
  ListinoImportExecuteResult,
  ListinoImportPreviewResult,
} from "@/lib/magazzino/listino-import/listino-import-types";
import { cabModalLayerClass } from "@/lib/ui/mobile-modal-behavior";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsScrollX } from "@/lib/ui/scroll-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const ACTION_LABELS: Record<ListinoImportAction, string> = {
  create: "Crea",
  skip: "Salta",
  update: "Aggiorna",
};

type RowState = ListinoImportPreviewResult["rows"][number] & { action: ListinoImportAction };

function toDecisions(rows: RowState[]): ListinoImportDecision[] {
  return rows.map((r) => ({
    rowIndex: r.rowIndex,
    action: r.action,
    codice: r.codice,
    descrizione: r.descrizione,
    costo: r.costo,
    marca: r.marca,
    duplicateRicambioId: r.duplicateRicambioId,
  }));
}

export function ListinoImportPreviewModal({
  documentoId,
  onRequestClose,
  onCompleted,
}: {
  documentoId: string;
  onRequestClose: () => void;
  onCompleted?: (result: ListinoImportExecuteResult) => void;
}) {
  const gestToast = useGestionaleToast();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<ListinoImportPreviewResult | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ListinoImportExecuteResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchListinoImportPreview(documentoId)
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        setRows(data.rows.map((r) => ({ ...r, action: r.suggestedAction })));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Analisi listino non riuscita.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentoId]);

  const statsLine = useMemo(() => {
    if (!preview) return "";
    return `${preview.rows.length} righe · ${preview.stats.duplicates} duplicati · metodo ${preview.parseMethod}`;
  }, [preview]);

  const setBulkAction = useCallback((action: ListinoImportAction, onlyDuplicates = false) => {
    setRows((prev) =>
      prev.map((r) => {
        if (onlyDuplicates && !r.duplicateRicambioId) return r;
        if (!onlyDuplicates && r.duplicateRicambioId && action === "create") return r;
        return { ...r, action };
      }),
    );
  }, []);

  async function handleExecute() {
    if (!preview || executing) return;
    setExecuting(true);
    setError(null);
    try {
      const result = await executeListinoImportRequest({
        documentoId: preview.documentoId,
        batchId: preview.batchId,
        decisions: toDecisions(rows),
      });
      setSummary(result);
      gestToast.successOnce(
        "listino-import-done",
        `Import completato: ${result.created} creati, ${result.updated} aggiornati, ${result.skipped} saltati.`,
      );
      onCompleted?.(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import non riuscito.";
      setError(message);
      gestToast.errorOnce("listino-import-fail", message, { module: "magazzino" });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <LavorazioniModalShell
      modalSize="analytics"
      layerClassName={cabModalLayerClass("base")}
      onRequestClose={onRequestClose}
      title="Import listino in magazzino"
      titleId="listino-import-modal-title"
      footer={
        summary ? (
          <button type="button" className={`${erpBtnAccent} min-h-11 w-full`} onClick={onRequestClose}>
            Chiudi
          </button>
        ) : (
          <GestionaleAiActionButton
            type="button"
            className="min-h-11 w-full justify-center"
            loading={executing}
            disabled={loading || !!error || !rows.length}
            onClick={() => void handleExecute()}
          >
            Importa selezionati
          </GestionaleAiActionButton>
        )
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3">
          {loading ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Analisi listino in corso…</p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          {preview && !summary ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[color:var(--cab-text)]">{preview.documentoNome}</p>
                <p className="text-xs text-[color:var(--cab-text-muted)]">{statsLine}</p>
                {preview.warnings.map((w) => (
                  <p key={w} className="text-xs text-amber-600 dark:text-amber-300">
                    {w}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <LoadingButton type="button" className="text-xs px-2 py-1" onClick={() => setBulkAction("create")}>
                  Tutti: crea
                </LoadingButton>
                <LoadingButton type="button" className="text-xs px-2 py-1" onClick={() => setBulkAction("skip")}>
                  Tutti: salta
                </LoadingButton>
                <LoadingButton
                  type="button"
                  className="text-xs px-2 py-1"
                  onClick={() => setBulkAction("update", true)}
                >
                  Duplicati: aggiorna
                </LoadingButton>
              </div>
              <div className={`${dsScrollX} rounded-lg border border-[color:var(--cab-border)]`}>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[var(--cab-surface-2)]/80 text-[color:var(--cab-text-muted)]">
                    <tr>
                      <th className="px-2 py-2">Codice</th>
                      <th className="px-2 py-2">Descrizione</th>
                      <th className="px-2 py-2">Costo</th>
                      <th className="px-2 py-2">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowIndex} className="border-t border-[color:var(--cab-border)]">
                        <td className="px-2 py-1.5 font-mono">{row.codice}</td>
                        <td className="max-w-[16rem] truncate px-2 py-1.5">{row.descrizione}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{row.costo.toFixed(2)} €</td>
                        <td className="px-2 py-1.5">
                          <GlobalSelect
                            items={[
                              { value: "create", label: ACTION_LABELS.create },
                              { value: "skip", label: ACTION_LABELS.skip },
                              { value: "update", label: ACTION_LABELS.update },
                            ]}
                            value={row.action}
                            onChange={(v) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.rowIndex === row.rowIndex ? { ...r, action: v as ListinoImportAction } : r,
                                ),
                              )
                            }
                            selectOnly
                            strictFromList
                            aria-label={`Azione riga ${row.codice}`}
                            className="min-w-[7rem]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {summary ? (
            <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/50 px-3 py-2 text-sm">
              <p className="font-medium text-[color:var(--cab-text)]">Import completato</p>
              <p className="mt-1 text-[color:var(--cab-text-muted)]">
                Creati: {summary.created} · Aggiornati: {summary.updated} · Saltati: {summary.skipped}
              </p>
              {summary.errors.length ? (
                <p className="mt-1 text-amber-600 dark:text-amber-300">
                  {summary.errors.length} righe con errori.
                </p>
              ) : null}
            </div>
          ) : null}
        </GestionaleModalScrollBody>
      </div>
    </LavorazioniModalShell>
  );
}
