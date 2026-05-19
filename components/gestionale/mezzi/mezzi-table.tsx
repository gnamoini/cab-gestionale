"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { memo } from "react";
import {
  dsScrollbar,
  dsTable,
  dsTableActionBtnInfo,
  dsTableActionBtnSecondary,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  dsTableActionsGroup,
  dsTableActionsGroupStart,
  dsTableHead,
  dsTableRow,
  dsTableTdActions,
  dsTableTdCompact,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { hrefDocumentiPerMezzo, hrefLavorazioniPerMezzo, hrefPreventiviPerMezzo, ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";

const cellIdent = `${dsTableTdCompact} font-mono text-[13px] font-medium tabular-nums leading-normal text-zinc-600 dark:text-zinc-400`;

function IconInfo({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function IconFolderDocs({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconWrench({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      />
    </svg>
  );
}

function IconClipboardList({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" />
    </svg>
  );
}

function cellIdentValue(raw: string | undefined) {
  const t = raw?.trim();
  if (!t || t === "—") return "—";
  if (t === "Non assegnata") return "Non assegnata";
  return t;
}

function IconTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function MezziSortBtn({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  buttonClassName = "",
  labelClassName = "",
}: {
  label: string;
  columnKey: MezziSortKey;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
  buttonClassName?: string;
  labelClassName?: string;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className={`inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide ${buttonClassName} ${
        active ? "text-[color:var(--cab-primary)]" : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <span className={labelClassName || undefined}>{label}</span>
      {icon}
    </button>
  );
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  headerClassName = "",
  buttonClassName = "",
  labelClassName = "",
}: {
  label: string;
  columnKey: MezziSortKey;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
  headerClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
}) {
  return (
    <th className={`px-2.5 py-2 align-middle ${headerClassName}`}>
      <MezziSortBtn
        label={label}
        columnKey={columnKey}
        sortColumn={sortColumn}
        sortPhase={sortPhase}
        onSort={onSort}
        buttonClassName={buttonClassName}
        labelClassName={labelClassName}
      />
    </th>
  );
}

export type MezziTableProps = {
  rows: MezzoGestito[];
  interventiByMezzoId: Map<string, MezzoInterventoLavorazione[]>;
  inOfficina: (m: MezzoGestito) => boolean;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
  flashRowId: string | null;
  onHub: (m: MezzoGestito) => void;
  onDelete?: (m: MezzoGestito) => void;
};

function MezzoRowInner({
  m,
  interventi,
  inOff: _inOff,
  flash,
  onHub,
  onDelete,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito) => void;
  onDelete?: (m: MezzoGestito) => void;
}) {
  const ultima = ultimaLavorazioneLabel(interventi);
  void _inOff;
  return (
    <tr
      id={`mezzo-row-${m.id}`}
      className={[
        dsTableRow,
        flash
          ? "bg-white/95 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.95),0_0_20px_rgba(255,255,255,0.65)] transition-[background-color,box-shadow] duration-200 ease-out dark:bg-zinc-100/12 dark:shadow-[inset_0_0_0_1px_rgba(82,82,91,0.45),0_0_18px_rgba(255,255,255,0.06)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td className={`${dsTableTdCompact} font-medium`}>{m.marca}</td>
      <td className={`min-w-0 ${dsTableTdCompact}`}>
        <div className="break-words font-medium leading-snug">{cellIdentValue(m.modello)}</div>
        {m.hubSynthetic ? (
          <div className="mt-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</div>
        ) : null}
      </td>
      <td className={cellIdent}>{cellIdentValue(m.targa)}</td>
      <td className={cellIdent}>{cellIdentValue(m.matricola)}</td>
      <td className={cellIdent}>{cellIdentValue(m.numeroScuderia)}</td>
      <td className={`min-w-0 ${dsTableTdCompact}`}>
        <div className="break-words font-medium leading-snug">{m.cliente}</div>
        <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">{m.utilizzatore}</div>
      </td>
      <td className={`${dsTableTdCompact} whitespace-nowrap text-xs text-zinc-700 dark:text-zinc-300`}>{ultima}</td>
      <td className={dsTableTdActions}>
        <div className={dsTableActionsGroup}>
          <button type="button" className={dsTableActionBtnInfo} title="Scheda hub mezzo" aria-label="Scheda hub mezzo" onClick={() => onHub(m)}>
            <IconInfo />
          </button>
          <Link
            href={hrefDocumentiPerMezzo(m)}
            className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
            title="Documenti"
            aria-label="Documenti"
          >
            <IconFolderDocs />
          </Link>
          <Link
            href={hrefLavorazioniPerMezzo(m)}
            className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
            title="Lavorazioni (solo questo mezzo)"
            aria-label="Lavorazioni"
          >
            <IconWrench />
          </Link>
          <Link
            href={hrefPreventiviPerMezzo(m)}
            className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
            title="Preventivi"
            aria-label="Preventivi"
          >
            <IconClipboardList />
          </Link>
          {onDelete && !m.hubSynthetic ? (
            <button type="button" className={dsTableActionBtnDanger} title="Elimina mezzo" aria-label="Elimina mezzo" onClick={() => onDelete(m)}>
              <IconTrash />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function MezzoMobileCard({
  m,
  interventi,
  inOff: _inOff,
  flash,
  onHub,
  onDelete,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito) => void;
  onDelete?: (m: MezzoGestito) => void;
}) {
  const ultima = ultimaLavorazioneLabel(interventi);
  void _inOff;
  return (
    <div
      id={`mezzo-row-${m.id}`}
      className={[
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90",
        flash ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Mezzo</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{m.marca}</p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{cellIdentValue(m.modello)}</p>
          {m.hubSynthetic ? (
            <p className="mt-1 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</p>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Targa</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.targa)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Matricola</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.matricola)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Scuderia</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.numeroScuderia)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Cliente / Utilizzatore</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{m.cliente}</dd>
          <dd className="text-xs text-zinc-600 dark:text-zinc-300">{m.utilizzatore}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Ultima lav.</dt>
          <dd className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{ultima}</dd>
        </div>
      </dl>
      <div className={`mt-4 w-full min-w-0 ${dsTableActionsGroupStart}`}>
        <button type="button" className={dsTableActionBtnInfo} title="Scheda hub mezzo" aria-label="Scheda hub mezzo" onClick={() => onHub(m)}>
          <IconInfo />
        </button>
        <Link href={hrefDocumentiPerMezzo(m)} className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`} title="Documenti" aria-label="Documenti">
          <IconFolderDocs />
        </Link>
        <Link href={hrefLavorazioniPerMezzo(m)} className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`} title="Lavorazioni (solo questo mezzo)" aria-label="Lavorazioni">
          <IconWrench />
        </Link>
        <Link href={hrefPreventiviPerMezzo(m)} className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`} title="Preventivi" aria-label="Preventivi">
          <IconClipboardList />
        </Link>
        {onDelete && !m.hubSynthetic ? (
          <button type="button" className={dsTableActionBtnDanger} title="Elimina mezzo" aria-label="Elimina mezzo" onClick={() => onDelete(m)}>
            <IconTrash />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const MezzoRow = memo(MezzoRowInner);

export function MezziTable({ rows, interventiByMezzoId, inOfficina, sortColumn, sortPhase, onSort, flashRowId, onHub, onDelete }: MezziTableProps) {
  return (
    <>
      <div className={`hidden ${dsTableWrap} ${dsScrollbar} md:block`}>
        <table className={`${dsTable} w-full min-w-0 table-fixed text-left text-[13px] leading-snug text-zinc-900 dark:text-zinc-100`}>
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col />
            <col className="w-[10%]" />
            <col className="w-[12rem]" />
          </colgroup>
          <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead}`}>
            <tr>
              <SortTh label="Marca" columnKey="marca" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Modello" columnKey="modello" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Targa" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Matricola" columnKey="matricola" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Scuderia" columnKey="numeroScuderia" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Ultima lav." columnKey="ultimaLavorazione" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <th className="px-2.5 py-2 text-right align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={dsTableRow}>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  Nessun mezzo corrisponde ai criteri.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <MezzoRow
                  key={m.id}
                  m={m}
                  interventi={interventiByMezzoId.get(m.id) ?? []}
                  inOff={inOfficina(m)}
                  flash={flashRowId === m.id}
                  onHub={onHub}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nessun mezzo corrisponde ai criteri.
          </p>
        ) : (
          rows.map((m) => (
            <MezzoMobileCard
              key={m.id}
              m={m}
              interventi={interventiByMezzoId.get(m.id) ?? []}
              inOff={inOfficina(m)}
              flash={flashRowId === m.id}
              onHub={onHub}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </>
  );
}
