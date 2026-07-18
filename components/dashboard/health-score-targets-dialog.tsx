"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  buildEditableHealthScoreAreaTargets,
  formatHealthScoreTargetLine,
  resolvedTargetsToBasePatches,
  targetInputStep,
  type HealthScoreEditableTargetGroup,
} from "@/lib/health-score/explain/health-score-area-targets";
import type { WorkshopSize } from "@/lib/health-score/types";
import {
  dsBtnGhost,
  dsBtnPrimary,
  dsInputNoSpinner,
  dsModalFormFooter,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";

type TargetsConfigResponse = {
  targets: Record<string, number>;
  updatedAt?: string | null;
  error?: string;
};

async function fetchHealthScoreTargetsConfig(): Promise<TargetsConfigResponse> {
  const res = await fetch("/api/dashboard/health-score/config", { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Target non disponibili");
  }
  return res.json() as Promise<TargetsConfigResponse>;
}

async function patchHealthScoreTargets(targets: Record<string, number>): Promise<TargetsConfigResponse> {
  const res = await fetch("/api/dashboard/health-score/config", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Salvataggio target non riuscito");
  }
  return res.json() as Promise<TargetsConfigResponse>;
}

function groupsToResolvedMap(groups: HealthScoreEditableTargetGroup[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of groups) {
    for (const row of group.rows) {
      out[row.targetKey] = row.resolvedValue;
    }
  }
  return out;
}

function targetInputWidthClass(unit: HealthScoreEditableTargetGroup["rows"][number]["unit"]): string {
  switch (unit) {
    case "currency":
      return "w-[6.5rem]";
    case "hours":
      return "w-[5.25rem]";
    default:
      return "w-[4.75rem]";
  }
}

function parseTargetDraft(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return null;
  const next = Number(normalized);
  return Number.isFinite(next) ? Math.max(0, next) : null;
}

function TargetValueField({
  row,
  editable,
  value,
  onChange,
}: {
  row: HealthScoreEditableTargetGroup["rows"][number];
  editable: boolean;
  value: number;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const next = parseTargetDraft(text);
    if (next == null) {
      setText(String(value));
      return;
    }
    onChange(next);
    setText(String(next));
  }, [onChange, text, value]);

  if (!editable) {
    return (
      <span className="shrink-0 font-semibold tabular-nums text-[color:var(--cab-primary)]">
        {formatHealthScoreTargetLine(value, row.unit, row.direction)}
      </span>
    );
  }

  return (
    <div
      className="inline-flex min-h-10 shrink-0 items-stretch overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]"
    >
      <span
        className="flex min-w-[2.25rem] items-center justify-center border-r border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-surface))] px-2 text-sm font-bold tabular-nums text-[color:var(--cab-text-muted)]"
        aria-hidden
      >
        {row.prefix}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={targetInputStep(row.unit)}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const next = parseTargetDraft(raw);
          if (next != null) onChange(next);
        }}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={`${dsInputNoSpinner} ${targetInputWidthClass(row.unit)} min-h-10 border-0 bg-transparent px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-[color:var(--cab-text)] shadow-none outline-none ring-0 focus:ring-0`}
        aria-label={`${row.label} target`}
      />
      {row.suffix ? (
        <span className="flex items-center border-l border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-surface))] px-2 text-xs font-medium tabular-nums text-[color:var(--cab-text-muted)]">
          {row.suffix}
        </span>
      ) : null}
    </div>
  );
}

export function HealthScoreTargetsDialog({
  open,
  onClose,
  workshopSize,
  workshopSizeLabel,
  visibleAreaLabels,
}: {
  open: boolean;
  onClose: () => void;
  workshopSize: WorkshopSize;
  workshopSizeLabel: string;
  visibleAreaLabels?: string[];
}) {
  const { canManageSettings } = usePermissions();
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baseTargets, setBaseTargets] = useState<Record<string, number> | null>(null);
  const [draftResolved, setDraftResolved] = useState<Record<string, number>>({});

  const initialGroups = useMemo(
    () =>
      baseTargets
        ? buildEditableHealthScoreAreaTargets(workshopSize, visibleAreaLabels, { targets: baseTargets })
        : [],
    [baseTargets, visibleAreaLabels, workshopSize],
  );

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHealthScoreTargetsConfig();
      setBaseTargets(data.targets);
      const groups = buildEditableHealthScoreAreaTargets(workshopSize, visibleAreaLabels, {
        targets: data.targets,
      });
      setDraftResolved(groupsToResolvedMap(groups));
    } catch (e) {
      gestToast.error(e instanceof Error ? e.message : "Caricamento target non riuscito");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [gestToast, onClose, visibleAreaLabels, workshopSize]);

  useEffect(() => {
    if (!open) return;
    void loadConfig();
  }, [loadConfig, open]);

  const initialResolved = useMemo(() => groupsToResolvedMap(initialGroups), [initialGroups]);
  const dirty = useMemo(() => {
    for (const [key, value] of Object.entries(initialResolved)) {
      if (draftResolved[key] !== value) return true;
    }
    return false;
  }, [draftResolved, initialResolved]);

  const groups = useMemo(() => {
    if (!baseTargets) return [];
    const built = buildEditableHealthScoreAreaTargets(workshopSize, visibleAreaLabels, {
      targets: baseTargets,
    });
    return built.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({
        ...row,
        resolvedValue: draftResolved[row.targetKey] ?? row.resolvedValue,
      })),
    }));
  }, [baseTargets, draftResolved, visibleAreaLabels, workshopSize]);

  const handleSave = async () => {
    if (!canManageSettings || !dirty) return;
    setSaving(true);
    try {
      const patches = resolvedTargetsToBasePatches(workshopSize, draftResolved);
      const data = await patchHealthScoreTargets(patches);
      setBaseTargets(data.targets);
      const nextGroups = buildEditableHealthScoreAreaTargets(workshopSize, visibleAreaLabels, {
        targets: data.targets,
      });
      setDraftResolved(groupsToResolvedMap(nextGroups));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "health-score", "v2"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "health-score", "history"] }),
      ]);
      gestToast.success("Target aggiornati. Il punteggio verrà ricalcolato.");
      onClose();
    } catch (e) {
      gestToast.error(e instanceof Error ? e.message : "Salvataggio target non riuscito");
    } finally {
      setSaving(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <GestionaleModalShell
      modalSize="formMedium"
      modalHeight="standard"
      onRequestClose={onClose}
      title="Target officina per area"
      titleId="health-score-targets-title"
      footer={
        canManageSettings ? (
          <div className={`${dsModalFormFooter} w-full justify-end`}>
            <button type="button" className={dsBtnGhost} onClick={onClose} disabled={saving}>
              Annulla
            </button>
            <button
              type="button"
              className={dsBtnPrimary}
              onClick={() => void handleSave()}
              disabled={saving || loading || !dirty}
            >
              {saving ? "Salvataggio…" : "Salva target"}
            </button>
          </div>
        ) : undefined
      }
    >
      <GestionaleModalScrollBody className="space-y-4">
        <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
          Riferimenti usati dal punteggio per confrontare i dati degli ultimi 30 giorni. Calibrati per{" "}
          <span className="font-medium text-[color:var(--cab-text)]">{workshopSizeLabel}</span>.
          {canManageSettings ? (
            <>
              {" "}
              Modifica i valori e salva per aggiornare il calcolo del punteggio.
            </>
          ) : null}
        </p>

        {loading ? (
          <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>Caricamento target…</p>
        ) : groups.length === 0 ? (
          <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
            Nessuna area disponibile con i tuoi permessi di lettura.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <section
                key={group.areaLabel}
                className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3"
              >
                <h4 className="text-sm font-semibold text-[color:var(--cab-text)]">{group.areaLabel}</h4>
                <ul className="mt-2 divide-y divide-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)]">
                  {group.rows.map((row) => (
                    <li
                      key={`${group.areaLabel}-${row.targetKey}`}
                      className="flex min-w-0 flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 text-sm leading-snug text-[color:var(--cab-text)]">{row.label}</span>
                      <TargetValueField
                        row={row}
                        editable={canManageSettings}
                        value={row.resolvedValue}
                        onChange={(next) =>
                          setDraftResolved((prev) => ({ ...prev, [row.targetKey]: next }))
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className={`${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>
          I target si adattano alla dimensione dell&apos;officina. Valori migliori del riferimento aumentano il
          punteggio dell&apos;indicatore.
        </p>
      </GestionaleModalScrollBody>
    </GestionaleModalShell>,
    document.body,
  );
}
