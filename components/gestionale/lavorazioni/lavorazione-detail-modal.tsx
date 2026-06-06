"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { canOpenDocumento, formatDocumentoRigaSintetica, openDocumentoFile } from "@/components/gestionale/documenti/documenti-helpers";
import { LavorazioneCostoDiscreto } from "@/components/gestionale/lavorazioni/lavorazione-costo-discreto";
import { LavorazioneAttivitaPanel } from "@/components/lavorazioni/lavorazione-attivita-panel";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { useLavorazioneCosto } from "@/src/hooks/gestionale/use-lavorazione-costo";
import { useLavorazioneSchedeStoreSync } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { buildLavorazioneAttivitaFeed } from "@/lib/lavorazioni/lavorazione-attivita-feed";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { useAuth } from "@/context/auth-context";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import {
  buildPreventiviArchivioFilterHref,
  buildPreventiviOpenHrefForRecord,
} from "@/lib/preventivi/preventivi-lavorazione-href";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { documentoRowToGestionale, preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { useLavorazioneHub } from "@/src/hooks/gestionale/use-lavorazione-hub";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import {
  erpBtnNeutral,
  erpBtnSoftOrange,
  erpFocus,
  prioritaLabel,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";

type TabId = "panoramica" | "schede" | "movimenti" | "preventivi" | "documenti" | "attivita";

function fmtDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDay(iso: string | null | undefined) {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function LavorazioneDetailModal({ lavorazioneId, onClose }: { lavorazioneId: string; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("panoramica");
  const { authorName, user } = useAuth();
  const globalOpts = useGlobalOptions({ debugTag: "LavorazioneDetailModal" });
  const statiOpts = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const schedeStore = useLavorazioneSchedeStoreSync();
  const schedeBundle = useMemo(
    () => getOrCreateBundle(schedeStore, lavorazioneId),
    [schedeStore, lavorazioneId],
  );
  const hubQuery = useLavorazioneHub(lavorazioneId);
  const hub = hubQuery.data;
  const costoLavorazione = useLavorazioneCosto(lavorazioneId, schedeBundle, {
    enabled: Boolean(hub),
    cliente: schedeBundle.ingresso?.campi.cliente,
  });

  const attivitaFeedInput = useMemo(() => {
    if (!hub) return null;
    return {
      logRows: hub.log,
      schedeRows: hub.schede,
      movimentiRows: hub.movimenti,
      preventiviRows: hub.preventivi,
      documentiRows: hub.documenti,
      lavorazione: hub.lavorazione,
      statiOpts,
      resolveAutore: (row: (typeof hub.log)[number]) => logAutoreLabel(row, user?.id ?? null, authorName),
    };
  }, [hub, statiOpts, user?.id, authorName]);

  const attivitaCount = useMemo(
    () => (attivitaFeedInput ? buildLavorazioneAttivitaFeed(attivitaFeedInput).length : 0),
    [attivitaFeedInput],
  );

  useEffect(() => {
    setTab("panoramica");
  }, [lavorazioneId]);

  const preventiviUi = useMemo(() => {
    if (!hub) return [];
    return hub.preventivi.map((row) => preventivoRowToRecordStub(row, null));
  }, [hub]);

  const documentiUi = useMemo(() => {
    if (!hub) return [];
    return hub.documenti.map(documentoRowToGestionale);
  }, [hub]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: scPage,
    setPage: setScPage,
    pageCount: scPageCount,
    sliceItems: sliceSc,
    showPager: showScPager,
    label: scPagerLabel,
    resetPage: resetScPage,
  } = useClientPagination(hub?.schede.length ?? 0, listPageSize);
  useEffect(() => {
    resetScPage();
  }, [lavorazioneId, hub?.schede.length, listPageSize, resetScPage]);
  const pagedSchede = useMemo(() => sliceSc(hub?.schede ?? []), [hub?.schede, sliceSc, scPage]);

  const {
    page: movPage,
    setPage: setMovPage,
    pageCount: movPageCount,
    sliceItems: sliceMov,
    showPager: showMovPager,
    label: movPagerLabel,
    resetPage: resetMovPage,
  } = useClientPagination(hub?.movimenti.length ?? 0, listPageSize);
  useEffect(() => {
    resetMovPage();
  }, [lavorazioneId, hub?.movimenti.length, listPageSize, resetMovPage]);
  const pagedMov = useMemo(() => sliceMov(hub?.movimenti ?? []), [hub?.movimenti, sliceMov, movPage]);

  const {
    page: pvPage,
    setPage: setPvPage,
    pageCount: pvPageCount,
    sliceItems: slicePv,
    showPager: showPvPager,
    label: pvPagerLabel,
    resetPage: resetPvPage,
  } = useClientPagination(preventiviUi.length, listPageSize);
  useEffect(() => {
    resetPvPage();
  }, [lavorazioneId, preventiviUi.length, listPageSize, resetPvPage]);
  const pagedPv = useMemo(() => slicePv(preventiviUi), [preventiviUi, slicePv, pvPage]);

  const {
    page: docPage,
    setPage: setDocPage,
    pageCount: docPageCount,
    sliceItems: sliceDoc,
    showPager: showDocPager,
    label: docPagerLabel,
    resetPage: resetDocPage,
  } = useClientPagination(documentiUi.length, listPageSize);
  useEffect(() => {
    resetDocPage();
  }, [lavorazioneId, documentiUi.length, listPageSize, resetDocPage]);
  const pagedDoc = useMemo(() => sliceDoc(documentiUi), [documentiUi, sliceDoc, docPage]);

  const tabBtn = (id: TabId, label: string) => {
    const on = tab === id;
    return (
      <button
        type="button"
        key={id}
        onClick={() => setTab(id)}
        className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${on ? "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_15%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"} ${erpFocus}`}
      >
        {label}
      </button>
    );
  };

  const titolo = hub ? `Lavorazione · ${hub.kpi.statoLabel}` : "Lavorazione";
  const sottotitolo = hub
    ? `Ingresso ${fmtDay(hub.lavorazione.data_ingresso)} · Uscita ${fmtDay(hub.lavorazione.data_uscita)}`
    : undefined;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title={titolo}
      subtitle={sottotitolo}
      titleId="lav-hub-title"
    >
        {hubQuery.isError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {hubQuery.error?.message ?? "Errore caricamento hub lavorazione."}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
          {tabBtn("panoramica", "Panoramica")}
          {tabBtn("schede", `Schede (${hub?.kpi.countSchede ?? 0})`)}
          {tabBtn("movimenti", `Movimenti (${hub?.kpi.countMovimenti ?? 0})`)}
          {tabBtn("preventivi", `Preventivi (${hub?.kpi.countPreventivi ?? 0})`)}
          {tabBtn("documenti", `Documenti (${hub?.kpi.countDocumenti ?? 0})`)}
          {tabBtn("attivita", `Attività (${attivitaCount})`)}
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {hubQuery.isLoading && !hub ? <p className="text-sm text-zinc-500">Caricamento…</p> : null}

          {tab === "panoramica" && hub ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Stato</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{hub.kpi.statoLabel}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Priorità</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{prioritaLabel(hub.kpi.priorita)}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Giorni apertura</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {hub.kpi.giorniApertura ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Movimenti magazzino</p>
                  <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                    {hub.kpi.movimentiEntrataCount} in · {hub.kpi.movimentiUscitaCount} out
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Qty uscite</p>
                  <p className="mt-0.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">{hub.kpi.qtyRicambiUscita}</p>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <p className="text-[10px] font-bold uppercase text-zinc-500">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{(hub.lavorazione.note ?? "").trim() || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildPreventiviArchivioFilterHref(
                    hub.lavorazioneId,
                    hub.lavorazione.archived === true ? "storico" : "attiva",
                  )}
                  className={`${erpBtnSoftOrange} inline-flex no-underline`}
                  onClick={onClose}
                >
                  Preventivi collegati
                </Link>
              </div>
              <LavorazioneCostoDiscreto costo={costoLavorazione} />
            </div>
          ) : null}

          {tab === "schede" ? (
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[520px] text-xs`}>
                <GlobalTableHead>
                    <GlobalTableHeadLabel label="Tipo" />
                    <GlobalTableHeadLabel label="Creata" />
                    <GlobalTableHeadLabel label="Aggiornata" />
                </GlobalTableHead>
                <tbody>
                  {(hub?.schede.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-zinc-500">
                        Nessuna scheda collegata.
                      </td>
                    </tr>
                  ) : (
                    pagedSchede.map((s) => (
                      <tr key={s.id} className={dsTableRow}>
                        <td className="px-2 py-2 font-medium capitalize">{s.tipo}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(s.created_at)}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(s.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showScPager ? <TablePagination page={scPage} pageCount={scPageCount} onPageChange={setScPage} label={scPagerLabel} /> : null}
            </div>
          ) : null}

          {tab === "movimenti" ? (
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[520px] text-xs`}>
                <GlobalTableHead>
                    <GlobalTableHeadLabel label="Tipo" />
                    <GlobalTableHeadLabel label="Quantità" />
                    <GlobalTableHeadLabel label="Ricambio" />
                    <GlobalTableHeadLabel label="Quando" />
                </GlobalTableHead>
                <tbody>
                  {(hub?.movimenti.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-zinc-500">
                        Nessun movimento collegato.
                      </td>
                    </tr>
                  ) : (
                    pagedMov.map((m) => (
                      <tr key={m.id} className={dsTableRow}>
                        <td className="px-2 py-2 capitalize">{m.tipo}</td>
                        <td className="px-2 py-2 tabular-nums">{m.quantita}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{m.ricambio_id}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(m.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showMovPager ? <TablePagination page={movPage} pageCount={movPageCount} onPageChange={setMovPage} label={movPagerLabel} /> : null}
            </div>
          ) : null}

          {tab === "preventivi" ? (
            <>
              <ul className="space-y-2">
                {preventiviUi.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nessun preventivo collegato.</li>
                ) : (
                  pagedPv.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {p.numero} · {fmtDt(p.dataCreazione)}
                        </p>
                        <p className="text-xs text-zinc-500">{p.cliente}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <button
                          type="button"
                          className={erpBtnNeutral}
                          onClick={() => openUrlInNewTab(buildPreventiviOpenHrefForRecord(p))}
                        >
                          Dettaglio
                        </button>
                        <button
                          type="button"
                          className={erpBtnSoftOrange}
                          onClick={() =>
                            void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
                              openPreventivoPdfInNewTab(p, "Gestionale"),
                            )
                          }
                        >
                          PDF
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              {showPvPager ? <TablePagination page={pvPage} pageCount={pvPageCount} onPageChange={setPvPage} label={pvPagerLabel} /> : null}
            </>
          ) : null}

          {tab === "documenti" ? (
            <>
              <ul className="space-y-2">
                {documentiUi.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nessun documento sul mezzo collegato.</li>
                ) : (
                  pagedDoc.map((d) => {
                    const canOpen = canOpenDocumento(d);
                    return (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase text-zinc-500">{formatDocumentoRigaSintetica(d)}</p>
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{d.nome}</p>
                        </div>
                        {canOpen ? (
                          <button
                            type="button"
                            className={`${erpBtnNeutral} shrink-0`}
                            onClick={() => void openDocumentoFile(d)}
                          >
                            Apri
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
              {showDocPager ? <TablePagination page={docPage} pageCount={docPageCount} onPageChange={setDocPage} label={docPagerLabel} /> : null}
            </>
          ) : null}

          {tab === "attivita" ? (
            hubQuery.isLoading && !hub ? (
              <p className="text-sm text-zinc-500">Caricamento attività…</p>
            ) : (
              <LavorazioneAttivitaPanel feedInput={attivitaFeedInput} />
            )
          ) : null}
        </div>
    </GestionaleModalShell>
  );
}
