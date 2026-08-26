"use client";

import { useEffect, useMemo, useState } from "react";
import { IconActionButton } from "@/components/design-system";
import { HubIconPencil, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { canOpenDocumento, formatDocumentoRigaSintetica, openDocumentoFile } from "@/components/gestionale/documenti/documenti-helpers";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { buildPdfArtifactUrl } from "@/lib/pdf/request-pdf-artifact";
import { isDeferredPopupBlocked, openDeferredPopup } from "@/lib/browser/popup-guard";
import { Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import { hubPanoramicaDisplayValue } from "@/components/design-system/hub-modal-panoramica";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoUltimaModificaInfo } from "@/lib/mezzi/mezzo-ultima-modifica-info";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useMezzoHub } from "@/src/hooks/gestionale/use-mezzo-hub";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { LavorazioniModalHeader, LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaField,
  HubModalPanoramicaFieldGrid,
  HubModalPanoramicaPanel,
  HubModalPanoramicaStatusPill,
  HubModalPanoramicaSubsection,
  HubModalPanoramicaSummary,
  HubModalPanoramicaSummaryItem,
} from "@/components/design-system/hub-modal-panoramica";
import {
  MEZZI_HUB_TAB_ORDER,
  MezziHubErrorBanner,
  MezziHubList,
  MezziHubListItem,
  MezziHubListSubtitle,
  MezziHubListTitle,
  MezziHubSyntheticBanner,
  MezziHubTabEmpty,
  fmtMezziHubDt,
  type MezziHubTabId,
} from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziHubPanoramicaAttrezzaturaSection } from "@/components/gestionale/mezzi/mezzi-hub-attrezzature-panel";
import { MezziHubLavorazioniSummaryPanel } from "@/components/gestionale/mezzi/mezzi-hub-lavorazioni-summary-panel";
import {
  MezziHubTimelinePanel,
  countMezzoHubTimelineTabEvents,
} from "@/components/gestionale/mezzi/mezzi-hub-timeline-panel";
import { MezziHubTagliandiTab } from "@/components/gestionale/mezzi/mezzi-hub-tagliandi-tab";
import {
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionGlyph,
  dsTableActionTextBtn,
  dsTableActionTextBtnPrimary,
} from "@/lib/ui/design-system";
import dynamic from "next/dynamic";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

const MezzoQrLabelActions = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzo-qr-label-actions").then((m) => ({
      default: m.MezzoQrLabelActions,
    })),
  { ssr: false },
);
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

function mezzoPanoScalar(value: string | undefined | null): string {
  return hubPanoramicaDisplayValue(mezzoPanoScalarRaw(value));
}

function mezzoPanoScalarRaw(value: string | undefined | null): string | undefined {
  const t = value?.trim();
  if (!t || t === "—" || t === "Non assegnata") return undefined;
  return t;
}

function mezzoPanoNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("it-IT");
}

function formatUltimaModificaAnagrafica(
  info: MezzoUltimaModificaInfo | undefined,
  fallbackIso: string | undefined,
): string {
  const iso = (info?.iso || fallbackIso || "").trim();
  if (!iso) return "—";
  const dt = fmtMezziHubDt(iso);
  const autore = info?.autore?.trim();
  return autore ? `${dt} · ${autore}` : dt;
}

export function MezziHubDetailModal({
  mezzo,
  initialTab = "panoramica",
  ultimaModificaInfo,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
  canReadLabels = true,
}: {
  mezzo: MezzoGestito;
  initialTab?: MezziHubTabId;
  ultimaModificaInfo?: MezzoUltimaModificaInfo;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canReadLabels?: boolean;
}) {
  const [tab, setTab] = useState<MezziHubTabId>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [mezzo.id, initialTab]);

  const hubQuery = useMezzoHub(mezzo.id);
  const hubData = hubQuery.data;
  const interventi = hubData?.interventi ?? [];
  const preventivi = hubData?.preventivi ?? [];
  const documenti = hubData?.documenti ?? [];

  const nPv = hubData?.preventivi.length ?? 0;
  const nDoc = hubData?.documenti.length ?? 0;
  const nTimeline = useMemo(
    () => countMezzoHubTimelineTabEvents(hubData, mezzo.id, interventi),
    [hubData, mezzo.id, interventi],
  );

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

  const mezzoTabPanelId = `mezzi-hub-panel-${tab}`;
  const mezzoTabLabel = (id: MezziHubTabId) => {
    switch (id) {
      case "panoramica":
        return "Panoramica";
      case "lavorazioni":
        return `Lavorazioni (${interventi.length})`;
      case "tagliandi":
        return "Tagliandi";
      case "timeline":
        return `Timeline (${nTimeline})`;
      case "preventivi":
        return `Preventivi (${nPv})`;
      case "documenti":
        return `Documenti (${nDoc})`;
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

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      onRequestClose={onClose}
      titleId="mezzi-hub-title"
      header={
        <LavorazioniModalHeader
          title={mezzoTitolo || "Mezzo"}
          subtitle={mezzoSottotitolo || undefined}
          titleId="mezzi-hub-title"
          onRequestClose={onClose}
          actions={
            <>
              <IconActionButton
                label="Modifica"
                tooltipForce
                className={dsTableActionBtnPrimary}
                onClick={onEdit}
                disabled={Boolean(mezzo.hubSynthetic) || !canEdit}
                tooltipContent={
                  !canEdit
                    ? READONLY_PERMISSION_HINT
                    : mezzo.hubSynthetic
                      ? "Registra il mezzo in anagrafica per abilitare la modifica"
                      : undefined
                }
              >
                <HubIconPencil className={dsTableActionGlyph} />
              </IconActionButton>
              {onDelete && !mezzo.hubSynthetic ? (
                <IconActionButton
                  label="Elimina"
                  tooltipForce
                  className={dsTableActionBtnDanger}
                  onClick={onDelete}
                  disabled={!canEdit}
                  tooltipContent={!canEdit ? READONLY_PERMISSION_HINT : undefined}
                >
                  <HubIconTrash className={dsTableActionGlyph} />
                </IconActionButton>
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
              <HubModalPanoramicaSummary ariaLabel="Riepilogo mezzo">
                <HubModalPanoramicaSummaryItem
                  label="Lavorazioni"
                  value={String(hubData.kpi.totaleLavorazioni)}
                  onClick={() => setTab("lavorazioni")}
                  footer={
                    <HubModalPanoramicaStatusPill
                      value={hubData.kpi.lavorazioneAttiva ? "Attiva" : "Nessuna attiva"}
                      pillStyle={lavorazioneAttivaPillStyle(hubData.kpi.lavorazioneAttiva)}
                    />
                  }
                />
                <HubModalPanoramicaSummaryItem
                  label="Tagliandi effettuati"
                  value={String(hubData.kpi.tagliandiEffettuati)}
                  onClick={() => setTab("tagliandi")}
                />
                <HubModalPanoramicaSummaryItem
                  label="Preventivi"
                  value={String(hubData.kpi.preventiviCount)}
                  onClick={() => setTab("preventivi")}
                />
                <HubModalPanoramicaSummaryItem
                  label="Documenti"
                  value={String(hubData.kpi.documentiCount)}
                  onClick={() => setTab("documenti")}
                />
              </HubModalPanoramicaSummary>
            ) : null}

            <div className="space-y-4">
              <HubModalPanoramicaSubsection title="Cliente">
                <HubModalPanoramicaFieldGrid>
                  <HubModalPanoramicaField label="Cliente" value={mezzoPanoScalar(mezzo.cliente)} />
                  <HubModalPanoramicaField label="Cantiere" value={mezzoPanoScalar(mezzo.cantiere)} />
                  <HubModalPanoramicaField label="Utilizzatore" value={mezzoPanoScalar(mezzo.utilizzatore)} />
                </HubModalPanoramicaFieldGrid>
              </HubModalPanoramicaSubsection>

              <HubModalPanoramicaSubsection title="Telaio">
                <HubModalPanoramicaFieldGrid>
                  <HubModalPanoramicaField label="Tipo telaio" value={mezzoPanoScalar(mezzo.tipoTelaio)} />
                  <HubModalPanoramicaField label="Marca telaio" value={mezzoPanoScalar(mezzo.marcaTelaio)} />
                  <HubModalPanoramicaField label="Modello telaio" value={mezzoPanoScalar(mezzo.modelloTelaio)} />
                  <HubModalPanoramicaField label="VIN" value={mezzoPanoScalar(mezzo.vin)} mono />
                  <HubModalPanoramicaField label="Targa" value={mezzoPanoScalar(mezzo.targa)} mono />
                  <HubModalPanoramicaField label="KM" value={mezzoPanoNumber(mezzo.km)} mono />
                </HubModalPanoramicaFieldGrid>
              </HubModalPanoramicaSubsection>

              <HubModalPanoramicaSubsection title="Attrezzatura">
                <MezziHubPanoramicaAttrezzaturaSection mezzo={mezzo} mezzoId={mezzo.id} canEdit={canEdit} />
              </HubModalPanoramicaSubsection>

              <HubModalPanoramicaSubsection title="Altri dati">
                <HubModalPanoramicaFieldGrid>
                  <HubModalPanoramicaField
                    label="Ultima modifica anagrafica"
                    value={formatUltimaModificaAnagrafica(ultimaModificaInfo, mezzo.ultimaModifica)}
                  />
                </HubModalPanoramicaFieldGrid>
              </HubModalPanoramicaSubsection>

              {canReadLabels && !mezzo.hubSynthetic ? (
                <HubModalPanoramicaSubsection title="Etichetta QR portachiavi">
                  <MezzoQrLabelActions
                    mezzoId={mezzo.id}
                    targa={mezzo.targa ?? ""}
                    canRead={canReadLabels}
                    canWrite={canEdit}
                    compact
                  />
                </HubModalPanoramicaSubsection>
              ) : null}
            </div>

            {mezzo.note?.trim() ? (
              <GestionaleInfoCard title="Note mezzo">
                <p className="whitespace-pre-wrap text-xs leading-snug text-[color:var(--cab-text)]">{mezzo.note.trim()}</p>
              </GestionaleInfoCard>
            ) : null}
          </HubModalPanoramicaPanel>
        ) : null}

        {tab === "lavorazioni" ? (
          <MezziHubLavorazioniSummaryPanel
            mezzo={mezzo}
            interventi={sortedLav}
            lavorazioni={hubData?.lavorazioni ?? []}
            listPageSize={listPageSize}
            onClose={onClose}
          />
        ) : null}

        {tab === "tagliandi" ? (
          <MezziHubTagliandiTab mezzo={mezzo} canEdit={canEdit} active={tab === "tagliandi"} />
        ) : null}

        {tab === "timeline" ? (
          <MezziHubTimelinePanel
            mezzoId={mezzo.id}
            hubData={hubData}
            interventi={sortedLav}
            active={tab === "timeline"}
            onClose={onClose}
          />
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
                          onClick={() => {
                            const artifactUrl = buildPdfArtifactUrl("preventivo", {
                              id: p.id,
                              autore: "Gestionale",
                            });
                            const deferredResult = openDeferredPopup({
                              context: "pdf",
                              label: "PDF preventivo",
                              retryUrl: artifactUrl,
                            });
                            if (isDeferredPopupBlocked(deferredResult)) return;
                            void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
                              openPreventivoPdfInNewTab(p, "Gestionale", deferredResult),
                            );
                          }}
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
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
