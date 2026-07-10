"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GestionaleAiActionButton, LoadingButton, LoadingProgressBar } from "@/components/design-system";
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
import { dsBtnNeutral, dsScrollX } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const ACTION_LABELS: Record<ListinoImportAction, string> = {
  create: "Crea",
  skip: "Salta",
  update: "Aggiorna",
};

const LISTINO_IMPORT_ROW_INPUT =
  "min-h-8 w-full min-w-0 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1 text-xs text-[color:var(--cab-text)] outline-none focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-1 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

type RowState = ListinoImportPreviewResult["rows"][number] & { action: ListinoImportAction };

function patchImportRow(prev: RowState[], rowIndex: number, patch: Partial<RowState>): RowState[] {
  return prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r));
}

function validateListinoImportRows(
  rows: RowState[],
  categorieDisponibili: readonly string[],
): string | null {
  if (!rows.some((r) => r.action !== "skip")) {
    return "Nessuna riga selezionata per l'import.";
  }
  for (const row of rows) {
    if (row.action === "skip") continue;
    if (!row.codice.trim() || !row.descrizione.trim()) {
      return `Riga ${row.rowIndex + 1}: codice e descrizione obbligatori.`;
    }
    if (!Number.isFinite(row.costo) || row.costo < 0) {
      return `Riga ${row.rowIndex + 1}: costo non valido.`;
    }
    if (row.action === "update" && !row.duplicateRicambioId) {
      return `Riga ${row.rowIndex + 1}: nessun duplicato da aggiornare.`;
    }
    const categoria = row.categoria?.trim();
    if (categoria && !categorieDisponibili.some((c) => c.toLowerCase() === categoria.toLowerCase())) {
      return `Riga ${row.rowIndex + 1}: categoria non valida.`;
    }
  }
  return null;
}

function parseMethodLabel(method: ListinoImportPreviewResult["parseMethod"]): string {
  if (method === "ai_pdf") return "analisi IA (PDF)";
  if (method === "ai_columns") return "analisi IA (colonne)";
  return method;
}

function toDecisions(rows: RowState[]): ListinoImportDecision[] {
  return rows.map((r) => ({
    rowIndex: r.rowIndex,
    action: r.action,
    codice: r.codice,
    descrizione: r.descrizione,
    costo: r.costo,
    marca: r.marca,
    categoria: r.categoria?.trim() || "Generale",
    duplicateRicambioId: r.duplicateRicambioId,
  }));
}

export function ListinoImportPreviewModal({
  documentoId,
  documentoNome,
  onRequestClose,
  onCompleted,
}: {
  documentoId: string;
  documentoNome?: string;
  onRequestClose: () => void;
  onCompleted?: (result: ListinoImportExecuteResult) => void;
}) {
  const gestToast = useGestionaleToast();
  const [analysisRequested, setAnalysisRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<ListinoImportPreviewResult | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ListinoImportExecuteResult | null>(null);

  useEffect(() => {
    if (!analysisRequested) return;
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
  }, [documentoId, analysisRequested]);

  const isPdfListino = /\.pdf$/i.test(documentoNome?.trim() ?? "");

  const statsLine = useMemo(() => {
    if (!preview) return "";
    return `${preview.rows.length} righe · ${preview.stats.duplicates} duplicati · ${parseMethodLabel(preview.parseMethod)}`;
  }, [preview]);

  const validationError = useMemo(
    () => (rows.length && preview ? validateListinoImportRows(rows, preview.categorieDisponibili) : null),
    [rows, preview],
  );

  const categoriaItems = useMemo(
    () =>
      (preview?.categorieDisponibili ?? []).map((c) => ({
        value: c,
        label: c,
      })),
    [preview?.categorieDisponibili],
  );

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
    const rowValidation = validateListinoImportRows(rows, preview.categorieDisponibili);
    if (rowValidation) {
      setError(rowValidation);
      gestToast.warning(rowValidation);
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      const result = await executeListinoImportRequest({
        documentoId: preview.documentoId,
        importFileId: preview.importFileId,
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
        ) : !analysisRequested ? (
          <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={`${dsBtnNeutral} min-h-11 w-full sm:w-auto`} onClick={onRequestClose}>
              Annulla
            </button>
            <GestionaleAiActionButton
              type="button"
              className="min-h-11 w-full justify-center sm:w-auto"
              onClick={() => setAnalysisRequested(true)}
            >
              Avvia analisi
            </GestionaleAiActionButton>
          </div>
        ) : (
          <GestionaleAiActionButton
            type="button"
            className="min-h-11 w-full justify-center"
            loading={executing}
            disabled={loading || !!error || !rows.length || !!validationError}
            onClick={() => void handleExecute()}
          >
            Importa selezionati
          </GestionaleAiActionButton>
        )
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3">
          {!analysisRequested && !summary ? (
            <div className="space-y-3">
              {documentoNome ? (
                <p className="text-sm font-medium text-[color:var(--cab-text)]">{documentoNome}</p>
              ) : null}
              <p className="text-sm text-[color:var(--cab-text)]">
                Vuoi avviare l&apos;analisi di questo listino per importare i ricambi in magazzino?
              </p>
              <p className="text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                {isPdfListino
                  ? "I PDF vengono analizzati con IA: può richiedere alcuni minuti su documenti lunghi. Potrai rivedere e modificare le righe prima dell'import."
                  : "Excel e CSV vengono analizzati subito. Potrai rivedere e modificare le righe prima dell'import."}
              </p>
            </div>
          ) : null}
          {analysisRequested && loading ? (
            <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
              <LoadingProgressBar label="Analisi listino in corso" />
              <p className="text-sm text-[color:var(--cab-text-muted)]">
                Analisi listino in corso. I PDF grandi possono richiedere alcuni minuti.
              </p>
            </div>
          ) : null}
          {analysisRequested && error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          {analysisRequested && preview && !summary ? (
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
              {validationError ? (
                <p className="text-xs text-amber-600 dark:text-amber-300" role="status">
                  {validationError}
                </p>
              ) : null}
              <div className={`${dsScrollX} rounded-lg border border-[color:var(--cab-border)]`}>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[var(--cab-surface-2)]/80 text-[color:var(--cab-text-muted)]">
                    <tr>
                      <th className="px-2 py-2">Codice</th>
                      <th className="px-2 py-2">Descrizione</th>
                      <th className="px-2 py-2">Categoria</th>
                      <th className="px-2 py-2">Costo</th>
                      <th className="px-2 py-2">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`border-t border-[color:var(--cab-border)] ${row.action === "skip" ? "opacity-60" : ""}`}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.codice}
                            disabled={row.action === "skip"}
                            aria-label={`Codice riga ${row.rowIndex + 1}`}
                            className={`${LISTINO_IMPORT_ROW_INPUT} font-mono`}
                            onChange={(e) =>
                              setRows((prev) => patchImportRow(prev, row.rowIndex, { codice: e.target.value }))
                            }
                          />
                        </td>
                        <td className="min-w-[12rem] px-2 py-1.5">
                          <input
                            type="text"
                            value={row.descrizione}
                            disabled={row.action === "skip"}
                            aria-label={`Descrizione riga ${row.rowIndex + 1}`}
                            className={LISTINO_IMPORT_ROW_INPUT}
                            onChange={(e) =>
                              setRows((prev) => patchImportRow(prev, row.rowIndex, { descrizione: e.target.value }))
                            }
                          />
                        </td>
                        <td className="min-w-[8rem] px-2 py-1.5">
                          <GlobalSelect
                            items={categoriaItems}
                            value={row.categoria ?? "Generale"}
                            disabled={row.action === "skip"}
                            onChange={(v) =>
                              setRows((prev) =>
                                patchImportRow(prev, row.rowIndex, {
                                  categoria: v,
                                  categoriaSource: undefined,
                                }),
                              )
                            }
                            selectOnly
                            strictFromList
                            aria-label={`Categoria riga ${row.rowIndex + 1}`}
                            className="min-w-[7.5rem]"
                          />
                          {row.categoriaSource === "ai" ? (
                            <span
                              className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]"
                              title="Categoria suggerita da IA"
                            >
                              IA
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={Number.isFinite(row.costo) ? row.costo : 0}
                            disabled={row.action === "skip"}
                            aria-label={`Costo riga ${row.rowIndex + 1}`}
                            className={`${LISTINO_IMPORT_ROW_INPUT} min-w-[5.5rem] font-mono tabular-nums`}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value.replace(",", "."));
                              setRows((prev) =>
                                patchImportRow(prev, row.rowIndex, {
                                  costo: Number.isFinite(parsed) ? parsed : 0,
                                }),
                              );
                            }}
                          />
                        </td>
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
                                patchImportRow(prev, row.rowIndex, { action: v as ListinoImportAction }),
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
