"use client";

import { Tooltip } from "@/components/ui";
import { useCallback, useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { buildImportReportCsv, downloadTextFile } from "@/lib/data-import/core/report-builder";
import type { ImportDuplicateAction, ImportEntity, ImportExecuteResult, ImportFieldDef, ImportMappingConfig } from "@/lib/data-import/core/types";
import type { ImportRowAction, ImportStrategy } from "@/lib/data-import/core/import-plugin";
import {
  downloadImportTemplate,
  executeImport,
  fileToBase64,
  parseImportFile,
  previewImport,
  saveImportMappingPreset,
  type ImportPreviewResponse,
} from "@/lib/data-import/data-import-client";
import { formatImportRowLabel, getImportEntityClientConfig } from "@/lib/data-import/import-entity-config-client";
import { dsBtnNeutralForm, dsInput, dsPageToolbarBtn } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsScrollX } from "@/lib/ui/scroll-system";
import { globalTableTheadSticky } from "@/lib/ui/global-table";
import { ImportHistoryDrawer } from "@/components/data-import/import-history-drawer";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Step = "file" | "analysis" | "mapping" | "validation" | "execute" | "report";

const STEPS: Step[] = ["file", "analysis", "mapping", "validation", "execute", "report"];

const STEP_LABELS: Record<Step, string> = {
  file: "File",
  analysis: "Analisi",
  mapping: "Mapping",
  validation: "Validazione",
  execute: "Importazione",
  report: "Report",
};

const ALL_ACTION_OPTIONS = [
  { value: "skip", label: "Salta" },
  { value: "update", label: "Aggiorna" },
  { value: "replace", label: "Sostituisci" },
  { value: "create", label: "Crea nuovo" },
];

function actionFromSuggested(s: ImportDuplicateAction): ImportRowAction {
  if (s === "create_new") return "create";
  if (s === "replace") return "replace";
  if (s === "update") return "update";
  return "skip";
}

export function DataImportWizardModal({
  entity,
  title,
  onRequestClose,
  onCompleted,
}: {
  entity: ImportEntity;
  title: string;
  onRequestClose: () => void;
  onCompleted?: () => void;
}) {
  const entityConfig = getImportEntityClientConfig(entity);
  const toast = useGestionaleToast();
  const [step, setStep] = useState<Step>("file");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [sheets, setSheets] = useState<Array<{ index: number; name: string; rowCount: number; columnCount: number }>>([]);
  const [fields, setFields] = useState<ImportFieldDef[]>([]);
  const [mapping, setMapping] = useState<ImportMappingConfig | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [rowActions, setRowActions] = useState<Record<number, ImportRowAction>>({});
  const [defaultDupAction, setDefaultDupAction] = useState<ImportDuplicateAction>(entityConfig.defaultDuplicateAction);
  const [strategy, setStrategy] = useState<ImportStrategy>(entityConfig.defaultStrategy);
  const [executeResult, setExecuteResult] = useState<ImportExecuteResult | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const stepIndex = STEPS.indexOf(step);

  const actionOptions = useMemo(
    () => ALL_ACTION_OPTIONS.filter((o) => entityConfig.allowedRowActions.includes(o.value as ImportRowAction)),
    [entityConfig.allowedRowActions],
  );

  const onFileSelected = useCallback(
    async (f: File) => {
      setFile(f);
      setBusy(true);
      try {
        const b64 = await fileToBase64(f);
        setFileBase64(b64);
        const parsed = await parseImportFile(entity, f.name, b64, 0);
        setSheets(parsed.sheets);
        setFields(parsed.fields);
        setMapping(parsed.suggestedMapping);
        setParseWarnings(parsed.warnings);
        setStep("analysis");
      } catch (e) {
        toast.errorOnce("import-parse", e);
      } finally {
        setBusy(false);
      }
    },
    [entity, toast],
  );

  const runPreview = useCallback(async () => {
    if (!file || !mapping || !fileBase64) return;
    setBusy(true);
    try {
      const p = await previewImport(entity, {
        fileName: file.name,
        fileBase64,
        mapping,
        duplicateDefaultAction: defaultDupAction,
        strategy,
      });
      setPreview(p);
      if (p.suggestedStrategy) setStrategy(p.suggestedStrategy);
      const actions: Record<number, ImportRowAction> = {};
      for (const row of p.rows) {
        const idx = Number(row.rowIndex);
        actions[idx] = actionFromSuggested((row.suggestedAction as ImportDuplicateAction) ?? "skip");
      }
      setRowActions(actions);
      setStep("validation");
    } catch (e) {
      toast.errorOnce("import-preview", e);
    } finally {
      setBusy(false);
    }
  }, [defaultDupAction, entity, file, fileBase64, mapping, strategy, toast]);

  const runExecute = useCallback(async () => {
    if (!preview || !file || !mapping) return;
    setBusy(true);
    setProgressLog(["Avvio importazione…"]);
    setStep("execute");
    try {
      setProgressLog((l) => [...l, `Elaborazione ${preview.rows.length} righe (strategia: ${strategy})…`]);
      const result = await executeImport(entity, {
        batchId: preview.batchId,
        fileName: file.name,
        mapping,
        strategy,
        rules: { defaultAction: defaultDupAction },
        rowActions,
        previewRows: preview.rows,
      });
      setExecuteResult(result);
      setProgressLog((l) => [
        ...l,
        `Completato: ${result.stats.created} creati, ${result.stats.updated} aggiornati, ${result.stats.skipped} saltati, ${result.stats.errors} errori.`,
      ]);
      setStep("report");
      onCompleted?.();
    } catch (e) {
      toast.errorOnce("import-exec", e);
      setProgressLog((l) => [...l, e instanceof Error ? e.message : "Errore"]);
    } finally {
      setBusy(false);
    }
  }, [defaultDupAction, entity, file, mapping, onCompleted, preview, rowActions, strategy, toast]);

  const summaryLine = useMemo(() => {
    if (!preview) return "";
    return `${preview.stats.total} righe · ${preview.stats.duplicates} duplicati · ${preview.stats.errors} errori`;
  }, [preview]);

  const savePreset = useCallback(async () => {
    if (!mapping || !presetName.trim()) return;
    try {
      await saveImportMappingPreset(entity, presetName.trim(), mapping);
      toast.successOnce("import-preset", "Mapping salvato.");
      setPresetName("");
    } catch (e) {
      toast.errorOnce("import-preset", e);
    }
  }, [entity, mapping, presetName, toast]);

  const mappingUi = mapping ? (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--cab-text-muted)]">Associa ogni colonna del file al campo gestionale.</p>
      <ul className="space-y-2">
        {fields.map((field) => {
          const col = mapping.columns.find((c) => c.targetField === field.key);
          return (
            <li key={field.key} className="flex items-center gap-2 text-sm min-w-0 flex-nowrap sm:flex-wrap">
              <span className="min-w-0 shrink-0 font-medium sm:min-w-[10rem]">{field.label}</span>
              <select
                className={`${dsInput} min-w-0 max-w-full flex-1`}
                value={col?.sourceColumn ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setMapping((m) => {
                    if (!m) return m;
                    const cols = m.columns.filter((c) => c.targetField !== field.key);
                    if (v !== "") cols.push({ targetField: field.key, sourceColumn: Number(v) });
                    return { ...m, columns: cols };
                  });
                }}
              >
                <option value="">— Non mappato —</option>
                {Array.from({ length: 30 }).map((_, i) => (
                  <option key={i} value={i}>
                    Colonna {i + 1}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <FormFieldDuplicateDefault value={defaultDupAction} onChange={setDefaultDupAction} />
      <FormFieldStrategy value={strategy} options={entityConfig.supportedStrategies} onChange={setStrategy} />
      <div className="flex items-end gap-2 border-t border-[color:var(--cab-border)] pt-3 min-w-0 flex-nowrap sm:flex-wrap">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Salva mapping preset</span>
          <input className={dsInput} value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nome preset" />
        </label>
        <button type="button" className={dsBtnNeutralForm} disabled={!presetName.trim()} onClick={() => void savePreset()}>
          Salva
        </button>
      </div>
    </div>
  ) : null;

  return (
    <LavorazioniModalShell
      modalSize="analytics"
      title={title}
      onRequestClose={onRequestClose}
      footer={
        <div className="flex min-w-0 w-full justify-between gap-2">
          <LoadingButton type="button" variant="secondary" onClick={stepIndex > 0 && step !== "report" ? () => setStep(STEPS[stepIndex - 1]!) : onRequestClose}>
            {step === "report" ? "Chiudi" : stepIndex > 0 ? "Indietro" : "Annulla"}
          </LoadingButton>
          <div className="flex gap-2">
            {step === "analysis" ? (
              <LoadingButton type="button" variant="primary" onClick={() => setStep("mapping")}>
                Avanti
              </LoadingButton>
            ) : null}
            {step === "mapping" ? (
              <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void runPreview()}>
                Valida file
              </LoadingButton>
            ) : null}
            {step === "validation" ? (
              <LoadingButton type="button" variant="primary" onClick={() => setStep("execute")}>
                Anteprima import
              </LoadingButton>
            ) : null}
            {step === "execute" && !executeResult ? (
              <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void runExecute()}>
                Avvia importazione
              </LoadingButton>
            ) : null}
          </div>
        </div>
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-4">
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Step {stepIndex + 1}/{STEPS.length}: {STEP_LABELS[step]}
          </p>

          {step === "file" ? (
            <section className="space-y-3">
              <div
                className="flex min-h-[8rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--cab-border)] p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) void onFileSelected(f);
                }}
              >
                <p className="text-sm">Trascina qui un file Excel o CSV</p>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">.xlsx, .xls, .csv — max 10 MB</p>
                <label className={`mt-3 ${dsPageToolbarBtn} cursor-pointer`}>
                  Seleziona file
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onFileSelected(f);
                    }}
                  />
                </label>
              </div>
              <button type="button" className={dsBtnNeutralForm} onClick={() => downloadImportTemplate(entity)}>
                Scarica template ufficiale
              </button>
              <button type="button" className={dsBtnNeutralForm} onClick={() => setHistoryOpen(true)}>
                Storico importazioni
              </button>
            </section>
          ) : null}

          <ImportHistoryDrawer entity={entity} open={historyOpen} onClose={() => setHistoryOpen(false)} />

          {step === "analysis" && file ? (
            <section className="space-y-2 text-sm">
              <p>
                <strong>File:</strong> {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
              <ul className="list-disc pl-5">
                {sheets.map((s) => (
                  <li key={s.index}>
                    {s.name}: {s.rowCount} righe, {s.columnCount} colonne
                  </li>
                ))}
              </ul>
              {parseWarnings.map((w) => (
                <p key={w} className="text-amber-700 dark:text-amber-300">
                  {w}
                </p>
              ))}
            </section>
          ) : null}

          {step === "mapping" ? mappingUi : null}

          {step === "validation" && preview ? (
            <section className="space-y-3">
              <p className="text-sm">{summaryLine}</p>
              <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                <button
                  type="button"
                  className={dsBtnNeutralForm}
                  onClick={() =>
                    setRowActions((prev) => {
                      const next = { ...prev };
                      for (const r of preview.rows) {
                        next[Number(r.rowIndex)] = "skip";
                      }
                      return next;
                    })
                  }
                >
                  Salta tutti i duplicati
                </button>
                <button
                  type="button"
                  className={dsBtnNeutralForm}
                  onClick={() =>
                    setRowActions((prev) => {
                      const next = { ...prev };
                      for (const r of preview.rows) {
                        next[Number(r.rowIndex)] = r.duplicateId ? "update" : "create";
                      }
                      return next;
                    })
                  }
                >
                  Aggiorna duplicati
                </button>
              </div>
              <div className={`${dsScrollX} max-h-80 rounded border border-[color:var(--cab-border)]`}>
                <table className="min-w-full text-xs">
                  <thead className={`${globalTableTheadSticky} bg-[color:var(--cab-surface)]`}>
                    <tr>
                      <th className="p-2 text-left">Riga</th>
                      <th className="p-2 text-left">Stato</th>
                      <th className="p-2 text-left">Dati</th>
                      <th className="p-2 text-left">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 200).map((row) => {
                      const idx = Number(row.rowIndex);
                      const label = formatImportRowLabel(entity, row);
                      return (
                        <tr key={idx} className="border-t border-[color:var(--cab-border)]">
                          <td className="p-2 tabular-nums">{idx}</td>
                          <td className="p-2">{String(row.severity)}</td>
                          <Tooltip content={label}><td className="p-2 max-w-[16rem] truncate">
                            {label}
                          </td></Tooltip>
                          <td className="p-2">
                            <GlobalSelect
                              value={rowActions[idx] ?? "skip"}
                              onChange={(v) =>
                                setRowActions((prev) => ({
                                  ...prev,
                                  [idx]: v as ImportRowAction,
                                }))
                              }
                              items={actionOptions}
                              selectOnly
                              className="min-w-[7rem]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {preview.stats.truncated ? (
                <p className="text-xs text-[color:var(--cab-text-muted)]">
                  Anteprima limitata; l&apos;import elaborerà tutte le righe valide del file caricato.
                </p>
              ) : null}
            </section>
          ) : null}

          {step === "execute" ? (
            <section className="space-y-3">
              <p className="text-sm">Conferma e avvia l&apos;importazione batch.</p>
              {preview ? <p className="text-sm">{summaryLine}</p> : null}
              <ul className="max-h-40 overflow-y-auto rounded border border-[color:var(--cab-border)] p-2 text-xs font-mono">
                {progressLog.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {step === "report" && executeResult ? (
            <section className="space-y-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[color:var(--cab-text-muted)]">Creati</dt>
                  <dd className="font-semibold">{executeResult.stats.created}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--cab-text-muted)]">Aggiornati</dt>
                  <dd className="font-semibold">{executeResult.stats.updated}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--cab-text-muted)]">Saltati</dt>
                  <dd className="font-semibold">{executeResult.stats.skipped}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--cab-text-muted)]">Errori</dt>
                  <dd className="font-semibold">{executeResult.stats.errors}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--cab-text-muted)]">Durata</dt>
                  <dd className="font-semibold">{(executeResult.durationMs / 1000).toFixed(1)}s</dd>
                </div>
              </dl>
              <button
                type="button"
                className={dsBtnNeutralForm}
                onClick={() => {
                  if (!executeResult || !file) return;
                  const csv = buildImportReportCsv(executeResult.stats, executeResult.errors, file.name);
                  downloadTextFile(csv, `report-import-${Date.now()}.csv`);
                }}
              >
                Esporta report errori
              </button>
            </section>
          ) : null}
        </GestionaleModalScrollBody>
      </div>
    </LavorazioniModalShell>
  );
}

function FormFieldDuplicateDefault({
  value,
  onChange,
}: {
  value: ImportDuplicateAction;
  onChange: (v: ImportDuplicateAction) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm min-w-0 flex-nowrap sm:flex-wrap">
      <span>Regola globale duplicati:</span>
      <select
        className={dsInput}
        value={value}
        onChange={(e) => onChange(e.target.value as ImportDuplicateAction)}
      >
        <option value="skip">Salta</option>
        <option value="update">Aggiorna</option>
        <option value="replace">Sostituisci</option>
        <option value="create_new">Crea nuovo</option>
      </select>
    </label>
  );
}

function FormFieldStrategy({
  value,
  options,
  onChange,
}: {
  value: ImportStrategy;
  options: ImportStrategy[];
  onChange: (v: ImportStrategy) => void;
}) {
  const labels: Record<ImportStrategy, string> = {
    initial: "Importazione iniziale",
    incremental: "Aggiornamento incrementale",
    sync: "Sincronizzazione prezzi",
    merge: "Merge (append unici)",
    replace: "Sostituzione completa",
  };
  return (
    <label className="flex items-center gap-2 text-sm min-w-0 flex-nowrap sm:flex-wrap">
      <span>Strategia import:</span>
      <select className={dsInput} value={value} onChange={(e) => onChange(e.target.value as ImportStrategy)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </label>
  );
}
