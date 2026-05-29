"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { CardMobile, CardMobileActions, IconActionButton } from "@/components/design-system";
import {
  dsTableActionBtnInfo,
  dsTableActionBtnSecondary,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableHeadLabel,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import {
  gestionaleListColAzioniClass,
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { hrefDocumentiPerMezzo, hrefLavorazioniPerMezzo, hrefPreventiviPerMezzo, ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";

/** 5 icone × 36px + gap — larghezza fissa per non assorbire slack in `table-fixed`. */
const mezziTableActionsColClass = gestionaleListColAzioniClass;

const mezziCellStackClass = "flex min-w-0 flex-col gap-0.5";
const mezziCellPrimaryClass = "break-words text-[13px] font-medium leading-snug text-zinc-800 dark:text-zinc-100";
const mezziCellSecondaryClass = "break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400";
const mezziCellIdentLineClass = "break-words text-[13px] font-medium leading-snug text-zinc-800 dark:text-zinc-100";

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

function hasUtilizzatore(raw: string | undefined) {
  const t = raw?.trim();
  return Boolean(t && t !== "—");
}

function displayScalar(raw: string | undefined) {
  const t = raw?.trim();
  if (!t || t === "—") return "—";
  return t;
}

function identificazioneLines(m: MezzoGestito): string[] {
  const lines = [cellIdentValue(m.targa), cellIdentValue(m.matricola), cellIdentValue(m.numeroScuderia)].filter(
    (v) => v !== "—",
  );
  return lines.length > 0 ? lines : ["—"];
}

function MezziCellTwoLine({
  primary,
  secondary,
  extra,
}: {
  primary: string;
  secondary: string;
  extra?: ReactNode;
}) {
  return (
    <div className={mezziCellStackClass}>
      <span className={mezziCellPrimaryClass}>{primary}</span>
      <span className={mezziCellSecondaryClass}>{secondary}</span>
      {extra}
    </div>
  );
}

function MezziCellIdentificazione({ lines }: { lines: string[] }) {
  return (
    <div className={mezziCellStackClass}>
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className={mezziCellIdentLineClass}>
          {line}
        </span>
      ))}
    </div>
  );
}

function IconTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
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

function MezzoRowActions({
  m,
  onHub,
  onDelete,
}: {
  m: MezzoGestito;
  onHub: (m: MezzoGestito) => void;
  onDelete?: (m: MezzoGestito) => void;
}) {
  return (
    <>
      <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => onHub(m)}>
        <IconInfo />
      </IconActionButton>
      <IconActionButton
        as="link"
        href={hrefDocumentiPerMezzo(m)}
        label="Documenti"
        className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
      >
        <IconFolderDocs />
      </IconActionButton>
      <IconActionButton
        as="link"
        href={hrefLavorazioniPerMezzo(m)}
        label="Lavorazioni"
        className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
      >
        <IconWrench />
      </IconActionButton>
      <IconActionButton
        as="link"
        href={hrefPreventiviPerMezzo(m)}
        label="Preventivi"
        className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
      >
        <IconClipboardList />
      </IconActionButton>
      {onDelete && !m.hubSynthetic ? (
        <IconActionButton label="Elimina" className={dsTableActionBtnDanger} onClick={() => onDelete(m)}>
          <IconTrash />
        </IconActionButton>
      ) : null}
    </>
  );
}

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
  const nLavorazioni = interventi.length;
  const identLines = identificazioneLines(m);
  void _inOff;
  return (
    <tr
      id={`mezzo-row-${m.id}`}
      className={[
        gestionaleListTableRowClass,
        flash
          ? "bg-white/95 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.95),0_0_20px_rgba(255,255,255,0.65)] transition-[background-color,box-shadow] duration-200 ease-out dark:bg-zinc-100/12 dark:shadow-[inset_0_0_0_1px_rgba(82,82,91,0.45),0_0_18px_rgba(255,255,255,0.06)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <div className={mezziCellStackClass}>
          <span className={mezziCellPrimaryClass}>{displayScalar(m.cliente)}</span>
          {hasUtilizzatore(m.utilizzatore) ? (
            <span className={mezziCellSecondaryClass}>{m.utilizzatore.trim()}</span>
          ) : null}
        </div>
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <span className={mezziCellPrimaryClass}>{displayScalar(m.cantiere)}</span>
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <MezziCellTwoLine
          primary={displayScalar(m.marca)}
          secondary={cellIdentValue(m.modello)}
          extra={
            m.hubSynthetic ? (
              <span className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</span>
            ) : null
          }
        />
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <MezziCellTwoLine
          primary={displayScalar(m.marcaTelaio)}
          secondary={displayScalar(m.modelloTelaio)}
        />
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <MezziCellIdentificazione lines={identLines} />
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <span className={`${mezziCellPrimaryClass} font-normal`}>{ultima}</span>
      </td>
      <td className={`min-w-0 ${gestionaleListTableTd}`}>
        <div className={mezziCellStackClass}>
          <span className={`${mezziCellPrimaryClass} tabular-nums`}>{nLavorazioni}</span>
          <span className={mezziCellSecondaryClass}>
            {nLavorazioni === 1 ? "lavorazione" : "lavorazioni"}
          </span>
        </div>
      </td>
      <td className={gestionaleListTableTdAzioni}>
        <div className={gestionaleListTableActionsGroupEnd}>
          <MezzoRowActions m={m} onHub={onHub} onDelete={onDelete} />
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
  const nLavorazioni = interventi.length;
  const identLines = identificazioneLines(m);
  void _inOff;
  return (
    <CardMobile
      id={`mezzo-row-${m.id}`}
      className={flash ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]" : ""}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cliente</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{displayScalar(m.cliente)}</p>
        {hasUtilizzatore(m.utilizzatore) ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.utilizzatore.trim()}</p>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Cantiere</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{displayScalar(m.cantiere)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">N. lavorazioni</dt>
          <dd className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">{nLavorazioni}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Attrezzatura</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{displayScalar(m.marca)}</dd>
          <dd className="text-xs text-zinc-500 dark:text-zinc-400">{cellIdentValue(m.modello)}</dd>
          {m.hubSynthetic ? (
            <dd className="mt-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Telaio</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{displayScalar(m.marcaTelaio)}</dd>
          <dd className="text-xs text-zinc-500 dark:text-zinc-400">{displayScalar(m.modelloTelaio)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Identificazione</dt>
          <dd className="flex flex-col gap-0.5">
            {identLines.map((line, i) => (
              <span key={`${i}-${line}`} className="text-[13px] font-medium leading-snug text-zinc-800 dark:text-zinc-100">
                {line}
              </span>
            ))}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Ultima lavorazione</dt>
          <dd className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{ultima}</dd>
        </div>
      </dl>
      <CardMobileActions>
        <MezzoRowActions m={m} onHub={onHub} onDelete={onDelete} />
      </CardMobileActions>
    </CardMobile>
  );
}

const MezzoRow = memo(MezzoRowInner);

export function MezziTable({ rows, interventiByMezzoId, inOfficina, sortColumn, sortPhase, onSort, flashRowId, onHub, onDelete }: MezziTableProps) {
  return (
    <>
      <GestionaleListTable
        visibilityClass="hidden md:block"
        colgroup={
          <>
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className={mezziTableActionsColClass} />
          </>
        }
        headRow={
          <>
            <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <GlobalTableHeadLabel label="Cantiere" />
            <GlobalTableSortTh label="Attrezzatura" columnKey="marca" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <GlobalTableHeadLabel label="Telaio" />
            <GlobalTableSortTh label="Identificazione" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <GlobalTableSortTh
              label="Ultima lavorazione"
              columnKey="ultimaLavorazione"
              sortColumn={sortColumn}
              sortPhase={sortPhase}
              onSort={onSort}
            />
            <GlobalTableHeadLabel label="N. lavorazioni" />
            <GestionaleListTableActionsHead />
          </>
        }
        empty={rows.length === 0}
        emptyMessage="Nessun mezzo corrisponde ai criteri."
        colSpan={8}
      >
        {rows.map((m) => (
          <MezzoRow
            key={m.id}
            m={m}
            interventi={interventiByMezzoId.get(m.id) ?? []}
            inOff={inOfficina(m)}
            flash={flashRowId === m.id}
            onHub={onHub}
            onDelete={onDelete}
          />
        ))}
      </GestionaleListTable>

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
