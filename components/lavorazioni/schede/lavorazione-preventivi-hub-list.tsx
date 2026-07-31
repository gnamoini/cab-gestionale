"use client";

import { OptionalTooltip } from "@/components/ui";
import { CardMobile, CardMobileActions, IconActionButton } from "@/components/design-system";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import {
  dsBtnPrimary,
  dsHubModalMetaChip,
  dsScrollbar,
  dsTableActionBtnPrimary,
  dsTableActionGlyph,
  dsTableActionTextBtnPrimary,
  dsTableActionsGroup,
  dsTableRow,
  dsTableTdActions,
} from "@/lib/ui/design-system";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  fmtPreventivoDataTabella,
  fmtPreventivoMarcaModello,
} from "@/lib/preventivi/preventivi-per-macchina";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

/** Allineato a `preventivi-view` (archivio). */
const prevTableTd = gestionaleListTableTd;
const prevTableTdText = `${gestionaleListTableTd} min-w-0 text-sm text-zinc-800 dark:text-zinc-100`;

type LavorazionePreventiviHubListProps = {
  listSurface: ListSurface;
  rows: PreventivoRecord[];
  /** Evidenzia i preventivi collegati a questa lavorazione. */
  lavorazioneId?: string;
  onApriNeiPreventivi: (p: PreventivoRecord) => void;
  onCreaPreventivo?: () => void;
};

function isPreventivoCollegato(p: PreventivoRecord, lavorazioneId?: string): boolean {
  return Boolean(lavorazioneId && p.lavorazioneId === lavorazioneId);
}

function PreventivoCollegatoBadge() {
  return <span className={dsHubModalMetaChip}>Collegato</span>;
}

function PreventivoIdentCell({ p }: { p: PreventivoRecord }) {
  const targa = p.targa?.trim() || "—";
  const matricola = p.matricola?.trim() || "—";
  const scuderia = p.nScuderia?.trim();
  return (
    <div className="min-w-0 text-left leading-tight">
      <div className="truncate font-mono text-xs font-medium text-zinc-800 dark:text-zinc-100">{targa}</div>
      <div className="truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{matricola}</div>
      {scuderia ? (
        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">N. {scuderia}</div>
      ) : null}
    </div>
  );
}

function PreventiviHubEmptyState({ onCreaPreventivo }: { onCreaPreventivo?: () => void }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-4 text-center">
      <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessun preventivo per questo mezzo</p>
      <p className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
        I preventivi creati con targa, matricola o scuderia uguali compariranno qui.
      </p>
      {onCreaPreventivo ? <CreaPreventivoButton className="mt-3" onClick={onCreaPreventivo} /> : null}
    </div>
  );
}

/** Pulsante primario condiviso (tab Preventivi empty state, footer tab Schede). */
function IconPreventivo({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function CreaPreventivoButton({
  onClick,
  disabled,
  disabledTitle,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  disabledTitle?: string;
  className?: string;
}) {
  return (
    <OptionalTooltip content={disabled ? disabledTitle : undefined}>
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1.5 ${dsBtnPrimary} min-h-11${className ? ` ${className}` : ""}`}
        disabled={disabled}
        onClick={onClick}
      >
        <IconPreventivo />
        Crea preventivo
      </button>
    </OptionalTooltip>
  );
}

export function LavorazionePreventiviHubList({
  listSurface,
  rows,
  lavorazioneId,
  onApriNeiPreventivi,
  onCreaPreventivo,
}: LavorazionePreventiviHubListProps) {
  if (rows.length === 0) {
    return <PreventiviHubEmptyState onCreaPreventivo={onCreaPreventivo} />;
  }

  return (
    <div className="min-w-0 max-w-full">
    <>
      {listSurface === "table" ? (
      <GestionaleListTable
        masterScrollScope={false}
        className="w-full min-w-0 text-sm text-zinc-900 dark:text-zinc-100"
        colgroup={
          <>
            <col className="w-[5.25rem]" />
            <col className="w-[5.75rem]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[9.75rem]" />
            <col className="w-[10.5rem]" />
          </>
        }
        headRow={
          <>
            <GlobalTableHeadLabel label="N." thClassName="w-[5.25rem] min-w-[5.25rem]" />
            <GlobalTableHeadLabel label="Data" thClassName="w-[5.75rem] min-w-[5.75rem]" />
            <GlobalTableHeadLabel label="Cliente" thClassName="min-w-0" />
            <GlobalTableHeadLabel label="Cantiere" thClassName="min-w-0" />
            <GlobalTableHeadLabel label="Utilizzatore" thClassName="min-w-0" />
            <GlobalTableHeadLabel label="Attrezzatura" thClassName="min-w-0" />
            <GlobalTableHeadLabel label="Targa / Matricola" thClassName="w-[9.75rem] min-w-[9.75rem]" />
            <GestionaleListTableActionsHead />
          </>
        }
        empty={false}
        colSpan={8}
      >
        {rows.map((p) => (
          <tr key={p.id} className={`${dsTableRow} h-14 bg-white dark:bg-zinc-900/40`}>
            <td
              className={`whitespace-nowrap ${prevTableTd} font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>{p.numero}</span>
                {isPreventivoCollegato(p, lavorazioneId) ? <PreventivoCollegatoBadge /> : null}
              </div>
            </td>
            <td className={`whitespace-nowrap ${prevTableTd} text-xs tabular-nums text-zinc-600 dark:text-zinc-300`}>
              {fmtPreventivoDataTabella(p.dataCreazione)}
            </td>
            <td className={prevTableTdText}>
              <span className="line-clamp-2 break-words text-sm leading-snug">{p.cliente || "—"}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-xs leading-snug">{p.cantiere || "—"}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-xs leading-snug">{p.utilizzatore || "—"}</span>
            </td>
            <td className={`min-w-0 max-w-[1px] ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-sm leading-snug">{fmtPreventivoMarcaModello(p)}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd}`}>
              <PreventivoIdentCell p={p} />
            </td>
            <td className={dsTableTdActions}>
              <div className={dsTableActionsGroup}>
                <IconActionButton label="Apri" className={dsTableActionBtnPrimary} onClick={() => onApriNeiPreventivi(p)}>
                  <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 0L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </IconActionButton>
              </div>
            </td>
          </tr>
        ))}
      </GestionaleListTable>
      ) : (
      <div className={`space-y-3 ${dsScrollbar}`}>
        {rows.map((p) => (
          <CardMobile key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs font-semibold tabular-nums text-[color:var(--cab-text-muted)]">{p.numero}</p>
                  {isPreventivoCollegato(p, lavorazioneId) ? <PreventivoCollegatoBadge /> : null}
                </div>
                <p className="mt-1 text-sm font-semibold text-[color:var(--cab-text)]">{p.cliente || "—"}</p>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">{fmtPreventivoMarcaModello(p)}</p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-[color:var(--cab-text-muted)]">
                {fmtPreventivoDataTabella(p.dataCreazione)}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-[color:var(--cab-text-muted)]">Cantiere</dt>
                <dd className="font-medium text-[color:var(--cab-text)]">{p.cantiere || "—"}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--cab-text-muted)]">Utilizzatore</dt>
                <dd className="font-medium text-[color:var(--cab-text)]">{p.utilizzatore || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[color:var(--cab-text-muted)]">Targa / Matricola</dt>
                <dd className="mt-0.5">
                  <PreventivoIdentCell p={p} />
                </dd>
              </div>
            </dl>
            <CardMobileActions>
              <button
                type="button"
                className={dsTableActionTextBtnPrimary}
                onClick={() => onApriNeiPreventivi(p)}
              >
                Apri
              </button>
            </CardMobileActions>
          </CardMobile>
        ))}
      </div>
      )}
    </>
    </div>
  );
}
