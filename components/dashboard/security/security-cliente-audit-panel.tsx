"use client";

import { useState } from "react";
import {
  auditClienteAssociationsAction,
  type ClienteAssociationAuditIssue,
  type ClienteAssociationAuditResult,
} from "@/src/actions/security-users-permissions";
import {
  SecurityInlineNotice,
  securitySubsectionShellClass,
} from "@/components/dashboard/security/security-inline-notice";
import { GestionaleListTable, GestionaleListTableRow } from "@/components/gestionale/global-table";
import {
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsSectionTitle,
  dsSkeletonPulse,
} from "@/lib/ui/design-system";
import { gestionaleListTableClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

const CATEGORY_LABEL: Record<ClienteAssociationAuditIssue["category"], string> = {
  cliente_senza_associazione: "Cliente senza associazione",
  associazione_invalida: "Associazione non valida",
  ref_orfano_staff: "Ref orfano (staff)",
  allowlist_non_autorizzato: "Allowlist non autorizzata",
};

const STAT_CARDS: Array<{
  key: ClienteAssociationAuditIssue["category"] | "allowlist";
  label: string;
}> = [
  { key: "cliente_senza_associazione", label: "Senza associazione" },
  { key: "associazione_invalida", label: "Ref non in anagrafica" },
  { key: "ref_orfano_staff", label: "Ref orfano staff" },
  { key: "allowlist", label: "Allowlist puliti" },
];

function countByCategory(issues: ClienteAssociationAuditIssue[], category: ClienteAssociationAuditIssue["category"]) {
  return issues.filter((i) => i.category === category).length;
}

type Props = {
  readOnly?: boolean;
};

export function SecurityClienteAuditPanel({ readOnly = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<ClienteAssociationAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await auditClienteAssociationsAction();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult(res);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  const issues = result?.issues ?? [];
  const cleaned = result?.allowlistCleaned ?? [];

  return (
    <section className={`${securitySubsectionShellClass} mt-4 p-3 sm:mt-5 sm:p-4`} aria-label="Report associazioni cliente">
      <button
        type="button"
        className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
        onClick={() => setExpanded((o) => !o)}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <h3 className={dsSectionTitle}>Report associazioni cliente</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
            Verifica utenti Cliente incompleti, riferimenti non in anagrafica e pulizia allowlist portale.
          </p>
        </div>
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          <svg className="h-4 w-4 text-[color:var(--cab-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-[color:var(--cab-border)] pt-4">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {!readOnly ? (
              <button type="button" className={dsPageToolbarBtn} onClick={() => void runAudit()} disabled={loading}>
                {loading ? "Analisi…" : "Aggiorna report"}
              </button>
            ) : null}
          </div>

          {error ? <SecurityInlineNotice variant="danger">{error}</SecurityInlineNotice> : null}

          {loading && !result ? <div className={`h-16 rounded-lg ${dsSkeletonPulse}`} /> : null}

          {result ? (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {STAT_CARDS.map((card) => {
                  const value =
                    card.key === "allowlist"
                      ? cleaned.length
                      : countByCategory(issues, card.key);
                  return (
                    <div
                      key={card.key}
                      className="flex min-h-[4.5rem] flex-col justify-between rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                        {card.label}
                      </span>
                      <p className="text-xl font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</p>
                    </div>
                  );
                })}
              </div>

              {cleaned.length > 0 ? (
                <p className="text-xs text-[color:var(--cab-text-muted)]">
                  Rimossi dall&apos;allowlist portale: {cleaned.map((c) => `${c.nome} (${c.ruolo})`).join(", ")}
                </p>
              ) : null}

              {issues.length === 0 ? (
                <SecurityInlineNotice variant="info">Nessun problema rilevato.</SecurityInlineNotice>
              ) : (
                <GestionaleListTable
                  className={gestionaleListTableClass}
                  colSpan={5}
                  headRow={
                    <>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Utente</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Ruolo</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Cliente ref</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Problema</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Dettaglio</th>
                    </>
                  }
                >
                  {issues.map((issue) => (
                    <GestionaleListTableRow key={`${issue.userId}-${issue.category}`}>
                      <td className={gestionaleListTableTd}>
                        <span className="block text-xs font-medium">{issue.nome}</span>
                        <span className="block text-[10px] text-[color:var(--cab-text-muted)]">{issue.email}</span>
                      </td>
                      <td className={gestionaleListTableTd}>
                        <span className="text-xs">{issue.ruolo}</span>
                      </td>
                      <td className={gestionaleListTableTd}>
                        <span className="text-xs">{issue.clienteRef ?? "—"}</span>
                      </td>
                      <td className={gestionaleListTableTd}>
                        <span className="text-xs">{CATEGORY_LABEL[issue.category]}</span>
                      </td>
                      <td className={gestionaleListTableTd}>
                        <span className="text-xs text-[color:var(--cab-text-muted)]">{issue.detail}</span>
                      </td>
                    </GestionaleListTableRow>
                  ))}
                </GestionaleListTable>
              )}

              <p className="text-[10px] text-[color:var(--cab-text-muted)]">
                Anagrafica clienti: {result.knownClientiCount} etichette · Scansione:{" "}
                {new Date(result.scannedAt).toLocaleString("it-IT")}
              </p>
            </>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_30%,transparent)] px-4 py-8 text-center">
              <p className="max-w-md text-xs text-[color:var(--cab-text-muted)]">
                Esegui l&apos;analisi per individuare utenti Cliente incompleti, riferimenti non validi e voci allowlist
                obsolete. Nessuna correzione automatica su profili o ruoli.
              </p>
              {!readOnly ? (
                <button type="button" className={dsBtnPrimary} onClick={() => void runAudit()}>
                  Esegui prima analisi
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
