"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui";
import { memo, useCallback } from "react";
import { CardMobile, IconActionButton } from "@/components/design-system";
import {
  LavorazioneMobileCardFooter,
  LavorazioneMobileMetaGrid,
  LavorazioneMobileMetaItem,
  formatLavorazioneMobileIdentLine,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-card";
import {
  formatMezzoUltimaModificaMobileLines,
  formatMezzoUltimaModificaTooltip,
  type MezzoUltimaModificaInfo,
} from "@/lib/mezzi/mezzo-ultima-modifica-info";
import {
  dsTableActionBtnInfo,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  type GestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GestionaleListTableMobileEmpty,
  GlobalTableHeadLabel,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import {
  gestionaleListTableRowBaseClass,
  gestionaleListTableRowTone,
  gestionaleListTableTd,
  gestionaleListTableTdCenter,
  gestionaleListTableTdAzioni,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { hrefDocumentiPerMezzo, hrefLavorazioniPerMezzo, hrefPreventiviPerMezzo, ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import type { MezziHubTabId } from "@/components/gestionale/mezzi/mezzi-hub-ui";

/** 4 icone × 36px + gap — larghezza fissa per non assorbire slack in `table-fixed`. */
const mezziTableActionsColClass = "w-[11.5rem] min-w-[11.5rem]";

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

export type MezziTableProps = {
  listLayout: GestionaleListLayout;
  rows: MezzoGestito[];
  interventiByMezzoId: Map<string, MezzoInterventoLavorazione[]>;
  ultimaModificaInfoByMezzoId: Map<string, MezzoUltimaModificaInfo>;
  inOfficina: (m: MezzoGestito) => boolean;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
  flashRowId: string | null;
  onHub: (m: MezzoGestito, tab?: MezziHubTabId) => void;
};

function MezzoRowActions({
  m,
  onHub,
}: {
  m: MezzoGestito;
  onHub: (m: MezzoGestito, tab?: MezziHubTabId) => void;
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
    </>
  );
}

function MezzoRowInner({
  m,
  interventi,
  inOff: _inOff,
  flash,
  onHub,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito, tab?: MezziHubTabId) => void;
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
          <MezzoRowActions m={m} onHub={onHub} />
        </div>
      </td>
    </tr>
  );
}

function mezzoAttrezzaturaTitle(m: MezzoGestito): string {
  const marca = displayScalar(m.marca);
  const modello = cellIdentValue(m.modello);
  if (marca === "—") return modello;
  if (modello === "—") return marca;
  return `${marca} ${modello}`;
}

function mezzoTelaioMobileValue(m: MezzoGestito): ReactNode {
  const marca = displayScalar(m.marcaTelaio);
  const modello = displayScalar(m.modelloTelaio);
  if (marca === "—" && modello === "—") return "—";
  if (modello === "—") return marca;
  if (marca === "—") return modello;
  return (
    <>
      <span>{marca}</span>
      <span className="block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">{modello}</span>
    </>
  );
}

function MezzoMobileCard({
  m,
  interventi,
  ultimaModificaInfo,
  inOff: _inOff,
  flash,
  onHub,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  ultimaModificaInfo: MezzoUltimaModificaInfo;
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito, tab?: MezziHubTabId) => void;
}) {
  const ultimaLav = ultimaLavorazioneLabel(interventi);
  const { date: ultimaModifica, autore: ultimaModificaAutore } =
    formatMezzoUltimaModificaMobileLines(ultimaModificaInfo);
  const modificaTooltip = formatMezzoUltimaModificaTooltip(ultimaModificaInfo);
  const nLavorazioni = interventi.length;
  const identLine = formatLavorazioneMobileIdentLine({
    targa: m.targa,
    matricola: m.matricola,
    scuderia: m.numeroScuderia ?? "",
  });
  void _inOff;
  return (
    <CardMobile
      id={`mezzo-row-${m.id}`}
      className={[
        "min-w-0 h-full gap-0 !p-3 sm:!p-3.5",
        flash ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="border-b border-zinc-200/80 pb-2 dark:border-zinc-700/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-[color:var(--cab-text)]">
              {mezzoAttrezzaturaTitle(m)}
            </p>
            <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{displayScalar(m.cliente)}</p>
            {hasUtilizzatore(m.utilizzatore) ? (
              <p className="truncate text-xs text-[color:var(--cab-text-muted)]">{m.utilizzatore.trim()}</p>
            ) : null}
            {m.hubSynthetic ? (
              <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">N. lav.</p>
            <span className="mt-0.5 inline-flex min-w-[2rem] justify-center rounded-[var(--ds-radius-lg)] bg-[var(--cab-surface-2)] px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums text-[color:var(--cab-text)]">
              {nLavorazioni}
            </span>
          </div>
        </div>
        {identLine ? (
          <p
            className="mt-1 break-words font-medium tabular-nums text-[11px] leading-snug text-[color:var(--cab-text-muted)]"
            title={identLine}
          >
            {identLine}
          </p>
        ) : null}
      </div>

      <LavorazioneMobileMetaGrid>
        <LavorazioneMobileMetaItem label="Cantiere" value={displayScalar(m.cantiere)} />
        <LavorazioneMobileMetaItem label="Telaio" value={mezzoTelaioMobileValue(m)} />
        <LavorazioneMobileMetaItem label="Ultima lavorazione" value={ultimaLav} className="col-span-2" />
      </LavorazioneMobileMetaGrid>

      <LavorazioneMobileCardFooter
        meta={
          ultimaModifica !== "—" ? (
            <Tooltip content={modificaTooltip ?? undefined} side="top" multiline>
              <div className="min-w-0 cursor-default text-xs font-medium leading-tight text-[color:var(--cab-text-muted)]">
                <p className="min-w-0 truncate tabular-nums">
                  <span className="sr-only">Ultima modifica: </span>
                  {ultimaModifica}
                </p>
                {ultimaModificaAutore !== "—" ? (
                  <p className="min-w-0 truncate">{ultimaModificaAutore}</p>
                ) : null}
              </div>
            </Tooltip>
          ) : null
        }
      >
        <MezzoRowActions m={m} onHub={onHub} />
      </LavorazioneMobileCardFooter>
    </CardMobile>
  );
}

const MezzoRow = memo(MezzoRowInner);

export function MezziTable({
  listLayout,
  rows,
  interventiByMezzoId,
  ultimaModificaInfoByMezzoId,
  inOfficina,
  sortColumn,
  sortPhase,
  onSort,
  flashRowId,
  onHub,
}: MezziTableProps) {
  const renderMezzoRow = useCallback(
    (index: number) => {
      const m = rows[index];
      if (!m) return null;
      return (
        <MezzoRow
          key={m.id}
          m={m}
          interventi={interventiByMezzoId.get(m.id) ?? []}
          inOff={inOfficina(m)}
          flash={flashRowId === m.id}
          onHub={onHub}
        />
      );
    },
    [rows, interventiByMezzoId, inOfficina, flashRowId, onHub],
  );

  return (
    <>
      {listLayout === "desktop" ? (
      <GestionaleListTable
        wrapClassName="mt-0"
        visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
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
        virtualRows={{
          rowCount: rows.length,
          renderRow: renderMezzoRow,
          estimateRowHeight: 56,
        }}
      >
        {null}
      </GestionaleListTable>
      ) : null}

      {listLayout === "mobile" ? (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.length === 0 ? (
          <div className="col-span-full">
            <GestionaleListTableMobileEmpty message="Nessun mezzo corrisponde ai criteri." />
          </div>
        ) : (
          rows.map((m) => (
            <MezzoMobileCard
              key={m.id}
              m={m}
              interventi={interventiByMezzoId.get(m.id) ?? []}
              ultimaModificaInfo={
                ultimaModificaInfoByMezzoId.get(m.id) ?? {
                  iso: "",
                  autore: "",
                  summaryShort: "—",
                  summaryFull: "Nessuna modifica registrata",
                }
              }
              inOff={inOfficina(m)}
              flash={flashRowId === m.id}
              onHub={onHub}
            />
          ))
        )}
      </div>
      ) : null}
    </>
  );
}
