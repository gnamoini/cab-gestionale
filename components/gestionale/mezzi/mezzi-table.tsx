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
  gestionaleListTableRowBaseClass,
  gestionaleListTableRowTone,
  gestionaleListTableTd,
  gestionaleListTableTdCenter,
  gestionaleListTableTdAzioni,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { hrefDocumentiPerMezzo, hrefLavorazioniPerMezzo, hrefPreventiviPerMezzo, ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";

/** 5 icone × 36px + gap — larghezza fissa per non assorbire slack in `table-fixed`. */
const mezziTableActionsColClass = gestionaleListColAzioniClass;

/** Righe multi-riga: min-height + sfondo come Lavorazioni/Magazzino (hover via scroll scope). */
const mezziTableRowClass = `${gestionaleListTableRowBaseClass} min-h-14 bg-white dark:bg-zinc-900/40`;

/** Padding verticale leggermente maggiore per celle a due righe. */
const mezziTableTd = `${gestionaleListTableTd} py-2`;

const mezziCellStackClass = "flex min-w-0 flex-col gap-0.5";
const mezziCellPrimaryClass = "break-words text-sm font-medium leading-snug text-[color:var(--cab-text)]";
const mezziCellSecondaryClass = "break-words text-xs leading-snug text-[color:var(--cab-text-muted)]";
const mezziCellIdentLineClass = "break-words text-sm font-medium leading-snug text-[color:var(--cab-text)]";

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
      data-gestionale-row-tone={gestionaleListTableRowTone({ flash })}
      className={mezziTableRowClass}
    >
      <td className={`min-w-0 ${mezziTableTd}`}>
        <div className={mezziCellStackClass}>
          <span className={mezziCellPrimaryClass}>{displayScalar(m.cliente)}</span>
          {hasUtilizzatore(m.utilizzatore) ? (
            <span className={mezziCellSecondaryClass}>{m.utilizzatore.trim()}</span>
          ) : null}
        </div>
      </td>
      <td className={`min-w-0 ${mezziTableTd}`}>
        <span className={mezziCellPrimaryClass}>{displayScalar(m.cantiere)}</span>
      </td>
      <td className={`min-w-0 ${mezziTableTd}`}>
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
      <td className={`min-w-0 ${mezziTableTd}`}>
        <MezziCellTwoLine
          primary={displayScalar(m.marcaTelaio)}
          secondary={displayScalar(m.modelloTelaio)}
        />
      </td>
      <td className={`min-w-0 ${mezziTableTd}`}>
        <MezziCellIdentificazione lines={identLines} />
      </td>
      <td className={`min-w-0 ${mezziTableTd}`}>
        <span className={`${mezziCellPrimaryClass} font-normal tabular-nums`}>{ultima}</span>
      </td>
      <td className={`${gestionaleListTableTdCenter} py-2`}>
        <span className={`${mezziCellPrimaryClass} tabular-nums`}>{nLavorazioni}</span>
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
  const sectionDivider = "border-b border-zinc-200/80 pb-2 dark:border-zinc-700/80";
  const metaDt = "text-[10px] font-medium text-zinc-500 dark:text-zinc-400";
  const metaDd = "mt-0.5 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200";
  void _inOff;
  return (
    <CardMobile
      id={`mezzo-row-${m.id}`}
      className={[
        "gap-0 !p-3 sm:!p-3.5",
        flash ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={sectionDivider}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cliente</p>
            <p className="line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
              {displayScalar(m.cliente)}
            </p>
            {hasUtilizzatore(m.utilizzatore) ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{m.utilizzatore.trim()}</p>
            ) : null}
          </div>
          <div className="shrink-0">
            <p className="text-right text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">N. lavorazioni</p>
            <span className="mt-1 inline-flex min-w-[2.5rem] justify-center rounded-[var(--ds-radius-lg)] bg-[var(--cab-surface-2)] px-2 py-1 font-mono text-base font-bold tabular-nums text-[color:var(--cab-text)]">
              {nLavorazioni}
            </span>
          </div>
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
        <div>
          <dt className={metaDt}>Cantiere</dt>
          <dd className={`${metaDd} text-sm text-zinc-900 dark:text-zinc-50`}>{displayScalar(m.cantiere)}</dd>
        </div>
        <div>
          <dt className={metaDt}>Attrezzatura</dt>
          <dd className={`${metaDd} text-sm text-zinc-900 dark:text-zinc-50`}>{displayScalar(m.marca)}</dd>
          <dd className="text-xs text-zinc-500 dark:text-zinc-400">{cellIdentValue(m.modello)}</dd>
          {m.hubSynthetic ? (
            <dd className="mt-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</dd>
          ) : null}
        </div>
        <div>
          <dt className={metaDt}>Telaio</dt>
          <dd className={`${metaDd} text-sm text-zinc-900 dark:text-zinc-50`}>{displayScalar(m.marcaTelaio)}</dd>
          <dd className="text-xs text-zinc-500 dark:text-zinc-400">{displayScalar(m.modelloTelaio)}</dd>
        </div>
        <div className="col-span-2">
          <dt className={metaDt}>Identificazione</dt>
          <dd className="flex flex-col gap-0.5">
            {identLines.map((line, i) => (
              <span key={`${i}-${line}`} className="text-[13px] font-medium leading-snug text-zinc-800 dark:text-zinc-100">
                {line}
              </span>
            ))}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className={metaDt}>Ultima lavorazione</dt>
          <dd className={`${metaDd} text-sm`}>{ultima}</dd>
        </div>
      </dl>
      <CardMobileActions spacing="tight" className="mt-2.5 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-700/80">
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
        wrapClassName="mt-0"
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
            <GlobalTableSortTh label="Cantiere" columnKey="cantiere" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
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
            <GlobalTableSortTh
              label="N. lavorazioni"
              columnKey="numeroLavorazioni"
              sortColumn={sortColumn}
              sortPhase={sortPhase}
              onSort={onSort}
              align="center"
            />
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
