"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { statoPillShellClassDynamic } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { ClientLavorazioneIngressoDialog } from "@/components/lavorazioni-clienti/client-lavorazione-ingresso-dialog";
import {
  IconInfo,
  IconQrCode,
  IconSchedeIngresso,
} from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazionePhotoStrip } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  buildClientPortalRowFields,
  clientPortalDataCompletamentoLabel,
  clientPortalRowMatchesSearch,
  type ClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import { clientLavorazioniDetailPath } from "@/lib/lavorazioni/client-portal-access";
import { filterClientPortalStatiOptions } from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  dsBtnNeutral,
  dsScrollbar,
  dsStackPage,
  dsStickyToolbar,
  dsTable,
  dsTableActionBtnInfo,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionsGroup,
  dsTableActionsGroupStart,
  dsTableEmptyCell,
  dsTableHead,
  dsTableHeadCell,
  dsTableRow,
  dsTableTdActions,
  dsTableWrap,
  dsTypoSectionTitle,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import { useClientLavorazioniListQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioneSchedeStoreSync } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { resolveStatoToDbEnum, statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

const SEARCH_DEBOUNCE_MS = 400;
const lavTableTd = "px-1.5 py-1 align-middle";
const lavTableActionCompact = "!h-8 !w-8 !min-h-8 !min-w-8";

type RowBundle = { row: LavorazioneListRow; fields: ClientPortalRowFields };

function StatoReadOnlyPill({ stato, statiOpts }: { stato: string; statiOpts: { id: string; label: string; color?: string }[] }) {
  const safeStato = resolveStatoToDbEnum(stato);
  const label = statoLavorazioneLabel(safeStato, statiOpts) || safeStato;
  return (
    <span
      className={`${statoPillShellClassDynamic()} inline-flex px-2 py-1 text-xs font-semibold whitespace-nowrap`}
      style={readablePillStyleFromHex(statoDisplayColor(safeStato, statiOpts))}
      title={label}
    >
      {label}
    </span>
  );
}

function ClienteUtilStack({ cliente, utilizzatore }: { cliente: string; utilizzatore: string }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{cliente}</div>
      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{utilizzatore !== "—" ? utilizzatore : "—"}</div>
    </div>
  );
}

function MezzoIdentStack({ targa, matricola, nScuderia }: { targa: string; matricola: string; nScuderia: string }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{targa}</div>
      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{matricola}</div>
      {nScuderia !== "—" ? (
        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">Scud. {nScuderia}</div>
      ) : null}
    </div>
  );
}

function StatoCell({
  row,
  variant,
  statiOpts,
}: {
  row: LavorazioneListRow;
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
}) {
  if (variant === "archive") {
    return (
      <span className="whitespace-nowrap text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
        {clientPortalDataCompletamentoLabel(row)}
      </span>
    );
  }
  return <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />;
}

function RowActions({
  rowId,
  onIngresso,
  onQr,
}: {
  rowId: string;
  onIngresso: () => void;
  onQr: () => void;
}) {
  return (
    <div className={dsTableActionsGroup}>
      <button
        type="button"
        className={`${dsTableActionBtnPrimary} ${lavTableActionCompact}`}
        title="Scheda ingresso"
        aria-label="Scheda ingresso"
        onClick={(e) => {
          e.stopPropagation();
          onIngresso();
        }}
      >
        <IconSchedeIngresso />
      </button>
      <button
        type="button"
        className={`${dsTableActionBtnSecondary} ${lavTableActionCompact}`}
        title="QR lavorazione"
        aria-label="QR lavorazione"
        onClick={(e) => {
          e.stopPropagation();
          onQr();
        }}
      >
        <IconQrCode />
      </button>
      <Link
        href={clientLavorazioniDetailPath(rowId)}
        className={`${dsTableActionBtnInfo} ${lavTableActionCompact} inline-flex items-center justify-center no-underline`}
        title="Timeline e dettaglio"
        aria-label="Timeline e dettaglio"
        onClick={(e) => e.stopPropagation()}
      >
        <IconInfo />
      </Link>
    </div>
  );
}

function DesktopTable({
  bundles,
  variant,
  statiOpts,
  emptyMessage,
  onIngresso,
  onQr,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  emptyMessage: string;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  const statusHeader = variant === "archive" ? "Data completamento" : "Stato";

  return (
    <div className={`hidden ${dsTableWrap} ${dsScrollbar} md:block`}>
      <table className={`${dsTable} w-full min-w-0 table-fixed text-left text-[13px] leading-snug text-zinc-900 dark:text-zinc-100`}>
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
        </colgroup>
        <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead}`}>
          <tr>
            <th className={dsTableHeadCell}>Data ingresso</th>
            <th className={dsTableHeadCell}>Cliente / Util.</th>
            <th className={dsTableHeadCell}>Cantiere</th>
            <th className={dsTableHeadCell}>Attrezzatura</th>
            <th className={dsTableHeadCell}>Targa / Matr. / Scud.</th>
            <th className={dsTableHeadCell}>Foto</th>
            <th className={dsTableHeadCell}>{statusHeader}</th>
            <th className={dsTableHeadCell}>Addetto</th>
            <th className={`${dsTableHeadCell} text-right`}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {bundles.length === 0 ? (
            <tr className={dsTableRow}>
              <td colSpan={9} className={dsTableEmptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            bundles.map(({ row, fields }) => (
              <tr key={row.id} className={`${dsTableRow} h-14 bg-white dark:bg-zinc-900/40`}>
                <td className={`${lavTableTd} whitespace-nowrap text-xs tabular-nums text-zinc-700 dark:text-zinc-300`}>
                  {fields.dataIngresso}
                </td>
                <td className={lavTableTd}>
                  <ClienteUtilStack cliente={fields.cliente} utilizzatore={fields.utilizzatore} />
                </td>
                <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
                  <span className="line-clamp-2 break-words">{fields.cantiere}</span>
                </td>
                <td className={`${lavTableTd} min-w-0`}>
                  <div className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                    {fields.attrezzatura}
                  </div>
                </td>
                <td className={lavTableTd}>
                  <MezzoIdentStack targa={fields.targa} matricola={fields.matricola} nScuderia={fields.nScuderia} />
                </td>
                <td className={lavTableTd}>
                  <ClientLavorazionePhotoStrip lavorazioneId={row.id} max={3} lazy />
                </td>
                <td className={lavTableTd}>
                  <StatoCell row={row} variant={variant} statiOpts={statiOpts} />
                </td>
                <td className={`${lavTableTd} min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
                  <span className="line-clamp-2 break-words">{fields.addetto}</span>
                </td>
                <td className={dsTableTdActions}>
                  <RowActions rowId={row.id} onIngresso={() => onIngresso(row)} onQr={() => onQr(row)} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({
  bundles,
  variant,
  statiOpts,
  emptyMessage,
  onIngresso,
  onQr,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  emptyMessage: string;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  if (bundles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 md:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {bundles.map(({ row, fields }) => (
        <div
          key={row.id}
          className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-4 shadow-[var(--cab-shadow-sm)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">{fields.attrezzatura}</p>
              <MezzoIdentStack targa={fields.targa} matricola={fields.matricola} nScuderia={fields.nScuderia} />
            </div>
            <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
          </div>
          <div className="mt-2 grid gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Ingresso:</span> {fields.dataIngresso}
            </p>
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Cliente:</span> {fields.cliente}
            </p>
            <p className="text-[11px] text-zinc-500">{fields.utilizzatore}</p>
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Cantiere:</span> {fields.cantiere}
            </p>
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Addetto:</span> {fields.addetto}
            </p>
          </div>
          <div className="mt-2">
            <ClientLavorazionePhotoStrip lavorazioneId={row.id} max={3} lazy={false} sizeClass="h-12 w-12" />
          </div>
          <div className={`mt-3 w-full min-w-0 ${dsTableActionsGroupStart}`}>
            <button
              type="button"
              className={`${dsTableActionBtnPrimary} ${lavTableActionCompact}`}
              title="Scheda ingresso"
              aria-label="Scheda ingresso"
              onClick={() => onIngresso(row)}
            >
              <IconSchedeIngresso />
            </button>
            <button
              type="button"
              className={`${dsTableActionBtnSecondary} ${lavTableActionCompact}`}
              title="QR lavorazione"
              aria-label="QR lavorazione"
              onClick={() => onQr(row)}
            >
              <IconQrCode />
            </button>
            <Link
              href={clientLavorazioniDetailPath(row.id)}
              className={`${dsTableActionBtnInfo} ${lavTableActionCompact} inline-flex items-center justify-center no-underline`}
              title="Timeline e dettaglio"
              aria-label="Timeline e dettaglio"
            >
              <IconInfo />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function LavorazioniSection({
  title,
  subtitle,
  bundles,
  variant,
  statiOpts,
  emptyDefault,
  searchApplied,
  onIngresso,
  onQr,
}: {
  title: string;
  subtitle?: string;
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  emptyDefault: string;
  searchApplied: string;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  const emptyMessage = searchApplied.trim()
    ? "Nessun risultato per la ricerca."
    : emptyDefault;

  return (
    <section className="space-y-3">
      <div>
        <h2 className={dsTypoSectionTitle}>{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
      </div>
      <DesktopTable
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        emptyMessage={emptyMessage}
        onIngresso={onIngresso}
        onQr={onQr}
      />
      <MobileCards
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        emptyMessage={emptyMessage}
        onIngresso={onIngresso}
        onQr={onQr}
      />
    </section>
  );
}

function buildRowBundles(
  rows: LavorazioneListRow[],
  schedeStore: LavorazioneSchedeStore,
  logsByLav: Map<string, LogModificaRow[]>,
  addettiGlobali: readonly string[],
  searchApplied: string,
): RowBundle[] {
  return rows
    .map((row) => ({
      row,
      fields: buildClientPortalRowFields(row, schedeStore, logsByLav.get(row.id) ?? [], addettiGlobali),
    }))
    .filter(({ fields }) => clientPortalRowMatchesSearch(fields, searchApplied));
}

export function ClientLavorazioniView() {
  const access = useClientLavorazioniAccess();
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioniView" });
  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(globalOpts.lavorazioni.stati),
    [globalOpts.lavorazioni.stati],
  );
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const schedeStore = useLavorazioneSchedeStoreSync();
  const listQ = useClientLavorazioniListQuery(access.allowed);
  const logsQ = useLogListQuery({ entita: "lavorazioni", limit: 500 }, { enabled: access.allowed, staleTime: 15_000 });

  const logsByLav = useMemo(() => {
    const map = new Map<string, NonNullable<typeof logsQ.data>>();
    for (const lg of logsQ.data ?? []) {
      const id = lg.entita_id;
      if (!id) continue;
      const arr = map.get(id) ?? [];
      arr.push(lg);
      map.set(id, arr);
    }
    return map;
  }, [logsQ.data]);

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [qrRow, setQrRow] = useState<LavorazioneListRow | null>(null);
  const [ingressoRow, setIngressoRow] = useState<LavorazioneListRow | null>(null);

  const inCorsoBundles = useMemo(
    () => buildRowBundles(listQ.data?.inCorso ?? [], schedeStore, logsByLav, addettiGlobali, searchApplied),
    [listQ.data?.inCorso, schedeStore, logsByLav, addettiGlobali, searchApplied],
  );

  const archivioBundles = useMemo(
    () => buildRowBundles(listQ.data?.archivio ?? [], schedeStore, logsByLav, addettiGlobali, searchApplied),
    [listQ.data?.archivio, schedeStore, logsByLav, addettiGlobali, searchApplied],
  );

  if (access.isLoading) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <p className="text-sm text-zinc-500">Verifica accesso…</p>
        </div>
      </>
    );
  }

  if (!access.allowed) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Non hai permesso per consultare il portale clienti. Contatta un amministratore per abilitare l&apos;accesso da Sicurezza → Accesso Lavorazioni Clienti.
            </p>
            <Link href="/dashboard" className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              Torna alla dashboard
            </Link>
          </ShellCard>
        </div>
      </>
    );
  }

  let bodyContent: ReactNode;
  if (listQ.isLoading) {
    bodyContent = <p className="text-sm text-zinc-500">Caricamento…</p>;
  } else {
    bodyContent = (
      <div className="space-y-8">
        <LavorazioniSection
          title="Lavorazioni in corso"
          subtitle="Specchio live della gestione officina — sola consultazione"
          bundles={inCorsoBundles}
          variant="active"
          statiOpts={statiOpts}
          emptyDefault="Nessuna lavorazione in corso."
          searchApplied={searchApplied}
          onIngresso={setIngressoRow}
          onQr={setQrRow}
        />
        <LavorazioniSection
          title="Lavorazioni completate"
          subtitle="Archivio — visibile dopo archiviazione dalla pagina Lavorazioni"
          bundles={archivioBundles}
          variant="archive"
          statiOpts={statiOpts}
          emptyDefault="Nessuna lavorazione in archivio."
          searchApplied={searchApplied}
          onIngresso={setIngressoRow}
          onQr={setQrRow}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Lavorazioni (Clienti)" />

      <div className={dsStackPage}>
        {listQ.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {listQ.error?.message ?? "Errore caricamento."}
          </div>
        ) : null}

        <div className={dsStickyToolbar}>
          <GestionaleSearchField
            id="client-lavorazioni-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchApplied(searchInput.trim());
              }
            }}
            placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
            aria-label="Cerca lavorazioni clienti"
            wrapperClassName="max-w-xl"
          />
        </div>

        <ShellCard>{bodyContent}</ShellCard>
      </div>

      {qrRow ? (
        <ClientLavorazioneQrDialog
          open
          onClose={() => setQrRow(null)}
          lavorazioneId={qrRow.id}
          refLabel={lavorazioneRefLabel(qrRow.id)}
        />
      ) : null}

      {ingressoRow ? (
        <ClientLavorazioneIngressoDialog
          open
          onClose={() => setIngressoRow(null)}
          row={ingressoRow}
          schedeStore={schedeStore}
          logs={logsByLav.get(ingressoRow.id) ?? []}
          addettiGlobali={addettiGlobali}
        />
      ) : null}
    </>
  );
}
