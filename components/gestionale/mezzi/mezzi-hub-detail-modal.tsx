"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { erpBtnSoftOrange } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  buildMezziGestionaleLogViewModel,
} from "@/components/gestionale/gestionale-log-ui";
import { canOpenDocumento, formatDocumentoRigaSintetica, openDocumentoFile } from "@/components/gestionale/documenti/documenti-helpers";
import { RecordImageManager } from "@/components/gestionale/media/record-image-manager";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { buildPreventiviArchivioFilterHref, buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import { ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import { hubPanoramicaDisplayValue } from "@/components/design-system/hub-modal-panoramica";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useMezzoHub } from "@/src/hooks/gestionale/use-mezzo-hub";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { LavorazioniModalHeader, LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaField,
  HubModalPanoramicaFieldGrid,
  HubModalPanoramicaFieldGroup,
  HubModalPanoramicaPanel,
  HubModalPanoramicaSummary,
  HubModalPanoramicaSummaryItem,
} from "@/components/design-system/hub-modal-panoramica";
import {
  MEZZI_HUB_TAB_ORDER,
  MezziHubErrorBanner,
  MezziHubFooter,
  MezziHubList,
  MezziHubListItem,
  MezziHubListMeta,
  MezziHubListSubtitle,
  MezziHubListTitle,
  MezziHubQuickLinks,
  MezziHubSyntheticBanner,
  MezziHubTabEmpty,
  MezziHubTabJumpButton,
  MezziHubTimelineKindBadge,
  fmtMezziHubDt,
  type MezziHubTabId,
} from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziHubAttrezzaturePanel } from "@/components/gestionale/mezzi/mezzi-hub-attrezzature-panel";
import {
  dsScrollbar,
  dsTable,
  dsTableRow,
  dsTableWrap,
  dsBtnDanger,
  dsTableActionTextBtn,
  dsTableActionTextBtnPrimary,
} from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import type { CSSProperties } from "react";

const lavorazioneAttivaPillStyle = (active: boolean): CSSProperties | undefined =>
  active
    ? {
        background: "color-mix(in srgb, var(--cab-success) 22%, var(--cab-card))",
        color: "color-mix(in srgb, var(--cab-success) 92%, var(--cab-text))",
      }
    : {
        background: "color-mix(in srgb, var(--cab-surface-2) 88%, var(--cab-card))",
        color: "var(--cab-text-muted)",
      };

export function MezziHubDetailModal({
  mezzo,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
}: {
  mezzo: MezzoGestito;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}) {
  const [tab, setTab] = useState<MezziHubTabId>("panoramica");

  const hubQuery = useMezzoHub(mezzo.id);
  const hubData = hubQuery.data;
  const interventi = hubData?.interventi ?? [];
  const preventivi = hubData?.preventivi ?? [];
  const documenti = hubData?.documenti ?? [];
  const hubLogEntries = hubData?.log ?? [];
  const timeline = hubData?.timeline ?? [];

  const nPv = hubData?.preventivi.length ?? 0;
  const nDoc = hubData?.documenti.length ?? 0;
  const nTimeline = hubData?.timeline.length ?? 0;

  const sortedLav = useMemo(() => {
    const rows = [...interventi];
    rows.sort((a, b) => new Date(b.dataIngresso).getTime() - new Date(a.dataIngresso).getTime());
    return rows;
  }, [interventi]);

  const sortedPv = useMemo(() => {
    const rows = [...preventivi];
    rows.sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());
    return rows;
  }, [preventivi]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: lavPage,
    setPage: setLavPage,
    pageCount: lavPageCount,
    sliceItems: sliceLav,
    showPager: showLavPager,
    label: lavPagerLabel,
    resetPage: resetLavPage,
  } = useClientPagination(sortedLav.length, listPageSize);
  useEffect(() => {
    resetLavPage();
  }, [mezzo.id, sortedLav.length, listPageSize, resetLavPage]);
  const pagedLav = useMemo(() => sliceLav(sortedLav), [sortedLav, sliceLav, lavPage]);

  const {
    page: pvPage,
    setPage: setPvPage,
    pageCount: pvPageCount,
    sliceItems: slicePv,
    showPager: showPvPager,
    label: pvPagerLabel,
    resetPage: resetPvPage,
  } = useClientPagination(sortedPv.length, listPageSize);
  useEffect(() => {
    resetPvPage();
  }, [mezzo.id, sortedPv.length, listPageSize, resetPvPage]);
  const pagedPv = useMemo(() => slicePv(sortedPv), [sortedPv, slicePv, pvPage]);

  const {
    page: docPage,
    setPage: setDocPage,
    pageCount: docPageCount,
    sliceItems: sliceDoc,
    showPager: showDocPager,
    label: docPagerLabel,
    resetPage: resetDocPage,
  } = useClientPagination(documenti.length, listPageSize);
  useEffect(() => {
    resetDocPage();
  }, [mezzo.id, documenti.length, listPageSize, resetDocPage]);
  const pagedDoc = useMemo(() => sliceDoc(documenti), [documenti, sliceDoc, docPage]);

  const {
    page: hubLogPage,
    setPage: setHubLogPage,
    pageCount: hubLogPageCount,
    sliceItems: sliceHubLog,
    showPager: showHubLogPager,
    label: hubLogPagerLabel,
    resetPage: resetHubLogPage,
  } = useClientPagination(hubLogEntries.length, listPageSize);
  useEffect(() => {
    resetHubLogPage();
  }, [mezzo.id, hubLogEntries.length, listPageSize, resetHubLogPage]);
  const pagedHubLog = useMemo(() => sliceHubLog(hubLogEntries), [hubLogEntries, sliceHubLog, hubLogPage]);

  const {
    page: tlPage,
    setPage: setTlPage,
    pageCount: tlPageCount,
    sliceItems: sliceTl,
    showPager: showTlPager,
    label: tlPagerLabel,
    resetPage: resetTlPage,
  } = useClientPagination(timeline.length, listPageSize);
  useEffect(() => {
    resetTlPage();
  }, [mezzo.id, timeline.length, listPageSize, resetTlPage]);
  const pagedTimeline = useMemo(() => sliceTl(timeline), [timeline, sliceTl, tlPage]);

  const mezzoTabPanelId = `mezzi-hub-panel-${tab}`;
  const mezzoTabLabel = (id: MezziHubTabId) => {
    switch (id) {
      case "panoramica":
        return "Panoramica";
      case "attrezzature":
        return "Attrezzature";
      case "foto":
        return "Foto";
      case "lavorazioni":
        return `Lavorazioni (${interventi.length})`;
      case "timeline":
        return `Timeline (${nTimeline})`;
      case "preventivi":
        return `Preventivi (${nPv})`;
      case "documenti":
        return `Documenti (${nDoc})`;
      case "log":
        return `Log (${hubLogEntries.length})`;
    }
  };

  const mezzoTitolo = `${mezzo.marca} ${mezzo.modello !== "—" ? mezzo.modello : ""}`.trim();
  const mezzoSottotitolo = [
    mezzo.cliente?.trim() && mezzo.cliente !== "—" ? mezzo.cliente : null,
    mezzo.cantiere?.trim() ? mezzo.cantiere : null,
    mezzo.targa?.trim() && mezzo.targa !== "—" ? mezzo.targa : null,
    mezzo.matricola?.trim() && mezzo.matricola !== "—" ? mezzo.matricola : null,
    mezzo.numeroScuderia?.trim() ? `sc. ${mezzo.numeroScuderia}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const footerNode = <MezziHubFooter tab={tab} mezzo={mezzo} onClose={onClose} />;

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      onRequestClose={onClose}
      titleId="mezzi-hub-title"
      footer={footerNode ?? undefined}
      header={
        <LavorazioniModalHeader
          title={mezzoTitolo || "Mezzo"}
          subtitle={mezzoSottotitolo || undefined}
          titleId="mezzi-hub-title"
          onRequestClose={onClose}
          actions={
            <>
              <button
                type="button"
                className={erpBtnSoftOrange}
                onClick={onEdit}
                disabled={Boolean(mezzo.hubSynthetic) || !canEdit}
                title={
                  !canEdit
                    ? READONLY_PERMISSION_HINT
                    : mezzo.hubSynthetic
                      ? "Registra il mezzo in anagrafica per abilitare la modifica"
                      : undefined
                }
              >
                Modifica
              </button>
              {onDelete && !mezzo.hubSynthetic ? (
                <button type="button" className={dsBtnDanger} onClick={onDelete} disabled={!canEdit}>
                  Elimina
                </button>
              ) : null}
            </>
          }
        />
      }
    >
      {hubQuery.isError ? (
        <MezziHubErrorBanner message={hubQuery.error?.message ?? "Errore caricamento hub mezzo."} />
      ) : null}

      <HubModalTabBar aria-label="Sezioni dettaglio mezzo">
        {MEZZI_HUB_TAB_ORDER.map((id) => (
          <HubModalTab
            key={id}
            id={`mezzi-hub-tab-${id}`}
            panelId={tab === id ? mezzoTabPanelId : undefined}
            label={mezzoTabLabel(id)}
            active={tab === id}
            onSelect={() => setTab(id)}
          />
        ))}
      </HubModalTabBar>

      <GestionaleModalScrollBody
        className="p-4"
        role="tabpanel"
        id={mezzoTabPanelId}
        aria-labelledby={`mezzi-hub-tab-${tab}`}
      >
        {hubQuery.isLoading && !hubData ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento dati mezzo…</p>
        ) : null}

        {tab === "panoramica" ? (
          <HubModalPanoramicaPanel>
            {mezzo.hubSynthetic ? <MezziHubSyntheticBanner /> : null}
            {hubData ? (
              <HubModalPanoramicaSummary>
                <MezziHubTabJumpButton onJump={() => setTab("lavorazioni")}>
                  <HubModalPanoramicaSummaryItem
                    label="Lavorazioni"
                    value={String(hubData.kpi.totaleLavorazioni)}
                  />
                </MezziHubTabJumpButton>
                <HubModalPanoramicaSummaryItem
                  label="Lavorazione attiva"
                  value={hubData.kpi.lavorazioneAttiva ? "Sì" : "No"}
                  pillStyle={lavorazioneAttivaPillStyle(hubData.kpi.lavorazioneAttiva)}
                />
                <MezziHubTabJumpButton onJump={() => setTab("preventivi")}>
                  <HubModalPanoramicaSummaryItem label="Preventivi" value={String(hubData.kpi.preventiviCount)} />
                </MezziHubTabJumpButton>
                <MezziHubTabJumpButton onJump={() => setTab("documenti")}>
                  <HubModalPanoramicaSummaryItem label="Documenti" value={String(hubData.kpi.documentiCount)} />
                </MezziHubTabJumpButton>
              </HubModalPanoramicaSummary>
            ) : null}

            <HubModalPanoramicaFieldGroup title="Anagrafica">
              <HubModalPanoramicaFieldGrid>
                <HubModalPanoramicaField label="Cliente" value={hubPanoramicaDisplayValue(mezzo.cliente)} />
                <HubModalPanoramicaField label="Cantiere" value={hubPanoramicaDisplayValue(mezzo.cantiere)} />
                <HubModalPanoramicaField label="Utilizzatore" value={hubPanoramicaDisplayValue(mezzo.utilizzatore)} />
                <HubModalPanoramicaField label="Tipo attrezzatura" value={hubPanoramicaDisplayValue(mezzo.tipoAttrezzatura)} />
                <HubModalPanoramicaField
                  label="Telaio"
                  value={hubPanoramicaDisplayValue(
                    [mezzo.marcaTelaio, mezzo.modelloTelaio].filter((v) => v?.trim() && v !== "—").join(" ") || undefined,
                  )}
                />
                <HubModalPanoramicaField label="Ultima lavorazione" value={ultimaLavorazioneLabel(interventi)} />
              </HubModalPanoramicaFieldGrid>
            </HubModalPanoramicaFieldGroup>

            {mezzo.note?.trim() ? (
              <GestionaleInfoCard title="Note mezzo">
                <p className="whitespace-pre-wrap text-xs leading-snug text-[color:var(--cab-text)]">{mezzo.note.trim()}</p>
              </GestionaleInfoCard>
            ) : null}

            <MezziHubQuickLinks mezzo={mezzo} onClose={onClose} onGoTab={setTab} />
          </HubModalPanoramicaPanel>
        ) : null}

        {tab === "attrezzature" ? (
          <MezziHubAttrezzaturePanel mezzoId={mezzo.id} canEdit={canEdit} />
        ) : null}
        {tab === "foto" ? (
          <RecordImageManager
            scope="mezzi"
            recordId={mezzo.id}
            title="Foto mezzo"
            hubCardLayout
            hubCardShowTitle
            canEdit={canEdit && !mezzo.hubSynthetic}
            onImageEvent={() => void hubQuery.refetch()}
          />
        ) : null}

        {tab === "lavorazioni" ? (
          <GestionaleInfoCard
            title="Lavorazioni collegate"
            subtitle={`${sortedLav.length} ${sortedLav.length === 1 ? "record" : "record"}`}
            collapsible
            defaultCollapsed={sortedLav.length === 0}
            actions={
              sortedLav.length > 0 ? (
                <Link
                  href={buildPreventiviLavorazioneFocusHref(sortedLav[0]!.id, sortedLav[0]!.origine)}
                  className={dsTableActionTextBtn}
                  onClick={onClose}
                >
                  Ultima lavorazione
                </Link>
              ) : null
            }
          >
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[640px] text-xs`}>
                <GlobalTableHead>
                  <GlobalTableHeadLabel label="Ingresso" />
                  <GlobalTableHeadLabel label="Stato" />
                  <GlobalTableHeadLabel label="Descrizione" />
                  <GlobalTableHeadLabel label="" thClassName="w-28" align="right" />
                </GlobalTableHead>
                <tbody>
                  {sortedLav.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-[color:var(--cab-text-muted)]">
                        Nessuna lavorazione collegata.
                      </td>
                    </tr>
                  ) : (
                    pagedLav.map((r) => (
                      <tr key={r.id} className={dsTableRow}>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-[color:var(--cab-text-muted)]">
                          {fmtMezziHubDt(r.dataIngresso)}
                        </td>
                        <td className="px-2 py-2 text-[color:var(--cab-text)]">{r.statoFinale}</td>
                        <td className="max-w-[280px] px-2 py-2 text-[color:var(--cab-text-muted)]">{r.descrizione || "—"}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <div className="flex flex-nowrap justify-end gap-1">
                            <Link
                              href={buildPreventiviLavorazioneFocusHref(r.id, r.origine)}
                              className={dsTableActionTextBtnPrimary}
                              onClick={onClose}
                            >
                              Apri
                            </Link>
                            <Link
                              href={buildPreventiviArchivioFilterHref(r.id, r.origine)}
                              className={dsTableActionTextBtn}
                              onClick={onClose}
                            >
                              Preventivi
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showLavPager ? (
                <TablePagination page={lavPage} pageCount={lavPageCount} onPageChange={setLavPage} label={lavPagerLabel} />
              ) : null}
            </div>
          </GestionaleInfoCard>
        ) : null}

        {tab === "timeline" ? (
          <GestionaleInfoCard
            title="Timeline"
            subtitle={`${timeline.length} eventi ordinati per data`}
            collapsible
            defaultCollapsed={timeline.length === 0}
          >
            {pagedTimeline.length === 0 ? (
              <MezziHubTabEmpty message="Nessun evento in timeline per questo mezzo." />
            ) : (
              <MezziHubList>
                {pagedTimeline.map((ev) => (
                  <MezziHubListItem
                    key={ev.id}
                    actions={
                      ev.ref?.lavorazioneId && ev.ref.origine ? (
                        <>
                          <Link
                            href={buildPreventiviLavorazioneFocusHref(ev.ref.lavorazioneId, ev.ref.origine)}
                            className={dsTableActionTextBtnPrimary}
                            onClick={onClose}
                          >
                            Apri
                          </Link>
                          <Link
                            href={buildPreventiviArchivioFilterHref(ev.ref.lavorazioneId, ev.ref.origine)}
                            className={dsTableActionTextBtn}
                            onClick={onClose}
                          >
                            Preventivi
                          </Link>
                        </>
                      ) : null
                    }
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <MezziHubTimelineKindBadge kind={ev.kind} />
                      <div className="min-w-0 flex-1">
                        <MezziHubListMeta>{fmtMezziHubDt(ev.at)}</MezziHubListMeta>
                        <MezziHubListTitle>
                          {ev.title}
                          {ev.targetBadge ? (
                            <span className="ml-2 rounded bg-[var(--cab-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cab-text-muted)]">
                              {ev.targetBadge}
                            </span>
                          ) : null}
                        </MezziHubListTitle>
                        {ev.subtitle ? <MezziHubListSubtitle>{ev.subtitle}</MezziHubListSubtitle> : null}
                      </div>
                    </div>
                  </MezziHubListItem>
                ))}
              </MezziHubList>
            )}
            {showTlPager ? (
              <TablePagination page={tlPage} pageCount={tlPageCount} onPageChange={setTlPage} label={tlPagerLabel} />
            ) : null}
          </GestionaleInfoCard>
        ) : null}

        {tab === "preventivi" ? (
          <GestionaleInfoCard
            title="Preventivi"
            subtitle={`${sortedPv.length} collegati al mezzo`}
            collapsible
            defaultCollapsed={sortedPv.length === 0}
          >
            {sortedPv.length === 0 ? (
              <MezziHubTabEmpty message="Nessun preventivo collegato a questo mezzo." />
            ) : (
              <MezziHubList>
                {pagedPv.map((p) => (
                  <MezziHubListItem
                    key={p.id}
                    actions={
                      <>
                        <button
                          type="button"
                          className={dsTableActionTextBtn}
                          onClick={() => {
                            const sp = new URLSearchParams();
                            sp.set(Q_PREVENTIVI_OPEN, p.id);
                            openUrlInNewTab(`/preventivi?${sp.toString()}`);
                          }}
                        >
                          Dettaglio
                        </button>
                        <button
                          type="button"
                          className={dsTableActionTextBtnPrimary}
                          onClick={() =>
                            void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
                              openPreventivoPdfInNewTab(p, "Gestionale"),
                            )
                          }
                        >
                          PDF
                        </button>
                      </>
                    }
                  >
                    <MezziHubListTitle>
                      {p.numero} · {fmtMezziHubDt(p.dataCreazione)}
                    </MezziHubListTitle>
                    <MezziHubListSubtitle>{p.cliente}</MezziHubListSubtitle>
                  </MezziHubListItem>
                ))}
              </MezziHubList>
            )}
            {showPvPager ? <TablePagination page={pvPage} pageCount={pvPageCount} onPageChange={setPvPage} label={pvPagerLabel} /> : null}
          </GestionaleInfoCard>
        ) : null}

        {tab === "documenti" ? (
          <GestionaleInfoCard
            title="Documenti"
            subtitle={`${documenti.length} file collegati`}
            collapsible
            defaultCollapsed={documenti.length === 0}
          >
            {documenti.length === 0 ? (
              <MezziHubTabEmpty message="Nessun documento collegato a questo mezzo." />
            ) : (
              <MezziHubList>
                {pagedDoc.map((d) => {
                  const canOpen = canOpenDocumento(d);
                  return (
                    <MezziHubListItem
                      key={d.id}
                      actions={
                        canOpen ? (
                          <button
                            type="button"
                            className={dsTableActionTextBtnPrimary}
                            onClick={() => void openDocumentoFile(d)}
                          >
                            Apri
                          </button>
                        ) : (
                          <span className="text-xs text-[color:var(--cab-text-muted)]">—</span>
                        )
                      }
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                        {formatDocumentoRigaSintetica(d)}
                      </p>
                      <MezziHubListTitle>{d.nome}</MezziHubListTitle>
                    </MezziHubListItem>
                  );
                })}
              </MezziHubList>
            )}
            {showDocPager ? <TablePagination page={docPage} pageCount={docPageCount} onPageChange={setDocPage} label={docPagerLabel} /> : null}
          </GestionaleInfoCard>
        ) : null}

        {tab === "log" ? (
          <GestionaleInfoCard
            title="Log anagrafica"
            subtitle={`${hubLogEntries.length} eventi`}
            collapsible
            defaultCollapsed
          >
            {hubQuery.isLoading && !hubData ? (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento log…</p>
            ) : hubLogEntries.length === 0 ? (
              <GestionaleLogEmpty message="Nessuna modifica anagrafica registrata per questo mezzo." />
            ) : (
              <>
                <GestionaleLogList>
                  {pagedHubLog.map((e) => {
                    const vm = buildMezziGestionaleLogViewModel({
                      tipo: e.tipo,
                      mezzo: e.mezzo,
                      riepilogo: e.riepilogo,
                      autore: e.autore,
                      at: e.at,
                      changes: e.changes,
                    });
                    return (
                      <li key={e.id}>
                        <GestionaleLogEntryFourLines vm={vm} />
                      </li>
                    );
                  })}
                </GestionaleLogList>
                {showHubLogPager ? (
                  <TablePagination
                    page={hubLogPage}
                    pageCount={hubLogPageCount}
                    onPageChange={setHubLogPage}
                    label={hubLogPagerLabel}
                  />
                ) : null}
              </>
            )}
          </GestionaleInfoCard>
        ) : null}
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
