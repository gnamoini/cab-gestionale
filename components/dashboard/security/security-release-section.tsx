"use client";

import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  dsBtnDanger,
  dsPageToolbarBtn,
  dsSurfaceInteractiveKpi,
} from "@/lib/ui/design-system";
import type { ChecklistItem } from "@/src/actions/security-release-control";
import {
  pilotIncoherenceExplanation,
  type PilotControlStatus,
} from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

export type SecurityReleaseSectionProps = {
  pilotStatus: PilotControlStatus | null;
  checklist: ChecklistItem[];
  productionReady: boolean | null;
  readinessLoading: boolean;
  readinessError: string | null;
  readinessStale: boolean;
  lastReadinessSnapshotAt: string | null;
  pilotInfoExpanded: boolean;
  onPilotInfoExpandedChange: (expanded: boolean) => void;
  onRunFullChecklist: () => void;
  onTogglePilotDb: (enabled: boolean) => void;
};

export function SecurityReleaseSection({
  pilotStatus,
  checklist,
  productionReady,
  readinessLoading,
  readinessError,
  readinessStale,
  lastReadinessSnapshotAt,
  pilotInfoExpanded,
  onPilotInfoExpandedChange,
  onRunFullChecklist,
  onTogglePilotDb,
}: SecurityReleaseSectionProps) {
  return (
    <ShellCard
      id="security-panel-release"
      title="Release e pilot"
      subtitle="Pilot mode per operatori e checklist di readiness di produzione."
    >
      <div className={`${gestionalePageToolbarActionsClass} mb-4 min-w-0`}>
        <button type="button" className={dsPageToolbarBtn} onClick={onRunFullChecklist} disabled={readinessLoading}>
          {readinessLoading ? "Controllo…" : "Esegui checklist completa"}
        </button>
      </div>
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">PILOT MODE — Override funzionalità operatori</h3>
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Consente agli operatori di modificare impostazioni globali nel pilot.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={dsSurfaceInteractiveKpi}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">isOperatorGlobalSettingsEnabled()</p>
              <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.effectiveEnabled ? "TRUE" : "FALSE"}</p>
            </div>
            <div className={dsSurfaceInteractiveKpi}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">ENV flag</p>
              <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.envEnabled ? "ON" : "OFF"}</p>
            </div>
            <div className={dsSurfaceInteractiveKpi}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">DB flag app_settings</p>
              <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.dbEnabled ? "ON" : "OFF"}</p>
            </div>
            <div className={dsSurfaceInteractiveKpi}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Override attivo</p>
              <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.effectiveEnabled ? "ON" : "OFF"}</p>
            </div>
          </div>
          <div className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-xs text-[color:var(--cab-text)]">
            Stato pilot:{" "}
            <strong>
              {pilotStatus?.state === "complete"
                ? "COMPLETO (UI + RLS attivo)"
                : pilotStatus?.state === "ui_only"
                  ? "SOLO UI ATTIVO"
                  : pilotStatus?.state === "db_only"
                    ? "COMPAT DB (env OFF, override non effettivo)"
                    : "DISATTIVO (produzione-safe)"}
            </strong>
          </div>
          {pilotStatus && pilotIncoherenceExplanation(pilotStatus) ? (
            <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:var(--cab-text)]">
              {pilotIncoherenceExplanation(pilotStatus)}
            </p>
          ) : null}
          {pilotStatus?.state === "db_only" && !pilotStatus.incoherent ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              DB flag attivo per audit/compat; override effettivo disattivato (env OFF).
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={dsPageToolbarBtn} disabled title="L'env non è modificabile dalla UI.">
              Toggle UI (env): {pilotStatus?.envEnabled ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              className={dsPageToolbarBtn}
              onClick={() => void onTogglePilotDb(!(pilotStatus?.dbEnabled ?? false))}
              disabled={readinessLoading}
            >
              Toggle DB (app_settings): {pilotStatus?.dbEnabled ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              className={dsBtnDanger}
              onClick={() => void onTogglePilotDb(false)}
              disabled={readinessLoading}
            >
              Disattiva completamente pilot override
            </button>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[color:var(--cab-text-muted)]">
            <input
              type="checkbox"
              checked={pilotInfoExpanded}
              onChange={(e) => onPilotInfoExpandedChange(e.target.checked)}
            />
            Mostra avviso pilot mode
          </label>
          {pilotInfoExpanded ? (
            <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:var(--cab-text)]">
              Solo ambiente pilot/dev. Non attivare in produzione.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">PRODUCTION READINESS CHECKLIST</h3>
            {productionReady != null ? (
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                  productionReady
                    ? "bg-[color:color-mix(in_srgb,var(--cab-success)_15%,var(--cab-surface))] text-[color:var(--cab-success)]"
                    : "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:var(--cab-danger)]"
                }`}
              >
                {productionReady ? "READY" : "NOT READY"}
              </span>
            ) : null}
          </div>
          {readinessError ? (
            <p className="text-sm text-[color:var(--cab-danger)]">
              {readinessError}
              {readinessStale ? " (snapshot precedente mantenuto: stato STALE)." : ""}
            </p>
          ) : null}
          {readinessStale ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Stato checklist STALE
              {lastReadinessSnapshotAt ? ` · ultimo snapshot valido: ${fmtWhen(lastReadinessSnapshotAt)}` : ""}.
            </p>
          ) : null}
          {readinessLoading && checklist.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Esecuzione readiness check…</p>
          ) : null}
          {checklist.length > 0 ? (
            <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item.id} className="rounded-md border border-[color:var(--cab-border)] p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[color:var(--cab-text)]">{item.label}</p>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "ok"
                            ? "bg-[color:color-mix(in_srgb,var(--cab-success)_15%,var(--cab-surface))] text-[color:var(--cab-success)]"
                            : item.status === "skip"
                              ? "bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] text-[color:var(--cab-text-muted)]"
                              : "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:var(--cab-danger)]"
                        }`}
                      >
                        {item.status === "ok" ? "OK" : item.status === "skip" ? "SKIP" : "FAIL"}
                      </span>
                    </div>
                    <p className="mt-1 text-[color:var(--cab-text-muted)]">
                      Categoria: {item.category}
                      {item.explanation ? ` · ${item.explanation}` : ""}
                    </p>
                    {item.source ? <p className="mt-0.5 font-mono text-[10px] text-[color:var(--cab-text-muted)]">Source: {item.source}</p> : null}
                  </li>
                ))}
              </ul>
              {checklist.some(
                (item) => item.status === "skip" && (item.category === "build" || item.category === "test"),
              ) ? (
                <p className="mt-3 text-xs text-[color:var(--cab-text-muted)]">
                  Check build e test non eseguiti in questa run. Clicca{" "}
                  <strong className="text-[color:var(--cab-text)]">Esegui checklist completa</strong> per{" "}
                  <span className="font-mono">tsc</span>, <span className="font-mono">next build</span> e{" "}
                  <span className="font-mono">test:permissions</span>.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </ShellCard>
  );
}
