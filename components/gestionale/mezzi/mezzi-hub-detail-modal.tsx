"use client";

import { Tooltip } from "@/components/ui";
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
import { MezziHubLavorazioniPanel } from "@/components/gestionale/mezzi/mezzi-hub-lavorazioni-panel";
import { MezziHubTagliandiTab } from "@/components/gestionale/mezzi/mezzi-hub-tagliandi-tab";
import { MezzoMeteringOriginLink } from "@/components/gestionale/mezzi/mezzo-metering-origin-link";
import { MezzoAnagraficaHistoryEntry } from "@/components/gestionale/mezzi/mezzo-anagrafica-history-entry";
import { MezzoSchedaReadOnlyDrawer } from "@/components/gestionale/mezzi/mezzo-scheda-readonly-drawer";
import { useMezzoSchedeHistory } from "@/src/hooks/gestionale/use-mezzo-schede-history";
import { schedeHistoryBadges } from "@/src/services/domain/mezzo-schede-history.service";
import { useMezzoAnagraficaHistory } from "@/src/hooks/gestionale/use-mezzo-anagrafica-history";
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
import type { SchedaTipo } from "@/types/schede";

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
  initialTab = "panoramica",
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
}: {
  mezzo: MezzoGestito;
  initialTab?: MezziHubTabId;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}) {
  const [tab, setTab] = useState<MezziHubTabId>(initialTab);
  const [schedaDrawer, setSchedaDrawer] = useState<{ lavorazioneId: string; tipo: SchedaTipo } | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [mezzo.id, initialTab]);

  const hubQuery = useMezzoHub(mezzo.id);
  const schedeHistoryQ = useMezzoSchedeHistory(mezzo.id);
  const anagraficaHistoryQ = useMezzoAnagraficaHistory(mezzo.id);
  const schedeHistory = schedeHistoryQ.data ?? [];
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

  const meteringOriginLavorazione = useMemo(() => {
    const id = mezzo.ultimoAggiornamentoDaLavorazioneId?.trim();
    if (!id) return null;
    return sortedLav.find((r) => r.id === id) ?? null;
  }, [mezzo.ultimoAggiornamentoDaLavorazioneId, sortedLav]);

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
      case "tagliandi":
        return "Tagliandi/revisioni";
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
              <Tooltip content={!canEdit
                    ? READONLY_PERMISSION_HINT
                    : mezzo.hubSynthetic
                      ? "Registra il mezzo in anagrafica per abilitare la modifica"
                      : undefined}><button type="button" className={erpBtnSoftOrange} onClick={onEdit} disabled={Boolean(mezzo.hubSynthetic) || !canEdit}>
                Modifica
              </button></Tooltip>
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

            <HubModalPanoramicaFieldGroup title="Metering (cache)">
              <HubModalPanoramicaFieldGrid>
                <HubModalPanoramicaField
                  label="Ultimo km"
                  value={hubPanoramicaDisplayValue(
                    mezzo.ultimoKmRilevato != null
                      ? `${mezzo.ultimoKmRilevato.toLocaleString("it-IT")}${mezzo.ultimoKmData ? ` (${fmtMezziHubDt(mezzo.ultimoKmData)})` : ""}`
                      : undefined,
                  )}
                />
                <HubModalPanoramicaField
                  label="Ultime ore"
                  value={hubPanoramicaDisplayValue(
                    mezzo.ultimoOreRilevate != null
                      ? `${mezzo.ultimoOreRilevate.toLocaleString("it-IT")}${mezzo.ultimoOreData ? ` (${fmtMezziHubDt(mezzo.ultimoOreData)})` : ""}`
                      : undefined,
                  )}
                />
              </HubModalPanoramicaFieldGrid>
              <MezzoMeteringOriginLink
                lavorazioneId={mezzo.ultimoAggiornamentoDaLavorazioneId}
                origine={meteringOriginLavorazione?.origine ?? "attiva"}
                onNavigate={onClose}
              />
            </HubModalPanoramicaFieldGroup>

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
                <HubModalPanoramicaField label="VIN" value={hubPanoramicaDisplayValue(mezzo.vin)} mono />
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
          <MezziHubLavorazioniPanel
            interventi={sortedLav}
            schedeHistory={schedeHistory}
            listPageSize={listPageSize}
            onClose={onClose}
            onOpenScheda={(lavorazioneId, tipo) => setSchedaDrawer({ lavorazioneId, tipo })}
          />
        ) : null}

        {tab === "tagliandi" ? (
          <MezziHubTagliandiTab mezzo={mezzo} canEdit={canEdit} active={tab === "tagliandi"} />
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
          <>
          <GestionaleInfoCard
            title="Storico anagrafica (campo per campo)"
            subtitle={`${anagraficaHistoryQ.data?.length ?? 0} eventi recenti`}
            collapsible
            defaultCollapsed={!(anagraficaHistoryQ.data?.length)}
          >
            {anagraficaHistoryQ.isLoading ? (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento storico…</p>
            ) : (anagraficaHistoryQ.data?.length ?? 0) === 0 ? (
              <GestionaleLogEmpty message="Nessuna variazione anagrafica tracciata (complementare a log_modifiche)." />
            ) : (
              <GestionaleLogList>
                {(anagraficaHistoryQ.data ?? []).map((h) => (
                  <MezzoAnagraficaHistoryEntry key={h.id} entry={h} onNavigate={onClose} />
                ))}
              </GestionaleLogList>
            )}
          </GestionaleInfoCard>
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
          </>
        ) : null}
      </GestionaleModalScrollBody>
      <MezzoSchedaReadOnlyDrawer
        open={schedaDrawer != null}
        lavorazioneId={schedaDrawer?.lavorazioneId ?? null}
        schedaTipo={schedaDrawer?.tipo ?? null}
        onClose={() => setSchedaDrawer(null)}
      />
    </LavorazioniModalShell>
  );
}
